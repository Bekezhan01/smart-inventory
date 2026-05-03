const prisma = require('../config/database');

const getDashboardStats = async () => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalProducts,
    activeProducts,
    allInventory,
    recentTransactions,
    weeklyIn,
    weeklyOut,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.inventory.findMany({ include: { product: true } }),
    prisma.transaction.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      include: { product: true, user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.transaction.aggregate({
      where: { type: 'IN', createdAt: { gte: sevenDaysAgo } },
      _sum: { quantity: true },
    }),
    prisma.transaction.aggregate({
      where: { type: 'OUT', createdAt: { gte: sevenDaysAgo } },
      _sum: { quantity: true },
    }),
  ]);

  const lowStock = allInventory.filter((i) => i.quantity <= i.minStock).length;
  const outOfStock = allInventory.filter((i) => i.quantity === 0).length;
  const totalInventoryValue = allInventory.reduce(
    (sum, i) => sum + Number(i.product.price) * i.quantity,
    0
  );

  return {
    totalProducts,
    activeProducts,
    lowStock,
    outOfStock,
    totalInventoryValue,
    recentTransactions,
    weeklyIn: weeklyIn._sum.quantity || 0,
    weeklyOut: weeklyOut._sum.quantity || 0,
  };
};

const getTransactionReport = async ({ startDate, endDate, groupBy = 'day' }) => {
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  const transactions = await prisma.transaction.findMany({
    where: { createdAt: { gte: start, lte: end } },
    include: { product: { select: { name: true, sku: true } } },
    orderBy: { createdAt: 'asc' },
  });

  // Group by date
  const grouped = {};
  transactions.forEach((tx) => {
    let key;
    const d = new Date(tx.createdAt);
    if (groupBy === 'month') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } else if (groupBy === 'week') {
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else {
      key = d.toISOString().split('T')[0];
    }

    if (!grouped[key]) grouped[key] = { date: key, in: 0, out: 0, adjustment: 0, total: 0 };
    if (tx.type === 'IN') grouped[key].in += tx.quantity;
    if (tx.type === 'OUT') grouped[key].out += tx.quantity;
    if (tx.type === 'ADJUSTMENT') grouped[key].adjustment += tx.quantity;
    grouped[key].total++;
  });

  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
};

const getTopProducts = async ({ limit = 10, type = 'OUT', days = 30 }) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const result = await prisma.transaction.groupBy({
    by: ['productId'],
    where: { type, createdAt: { gte: since } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: Number(limit),
  });

  const productIds = result.map((r) => r.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, sku: true, price: true },
  });

  return result.map((r) => {
    const product = products.find((p) => p.id === r.productId);
    return { ...product, totalQuantity: r._sum.quantity };
  });
};

const getInventoryReport = async () => {
  const inventory = await prisma.inventory.findMany({
    include: { product: { include: { category: true } } },
  });

  const byCategory = {};
  inventory.forEach((item) => {
    const cat = item.product.category?.name || 'Uncategorized';
    if (!byCategory[cat]) byCategory[cat] = { category: cat, items: 0, totalQuantity: 0, totalValue: 0 };
    byCategory[cat].items++;
    byCategory[cat].totalQuantity += item.quantity;
    byCategory[cat].totalValue += Number(item.product.price) * item.quantity;
  });

  return {
    byCategory: Object.values(byCategory),
    items: inventory.map((i) => ({
      ...i,
      isLowStock: i.quantity <= i.minStock,
      value: Number(i.product.price) * i.quantity,
    })),
  };
};

/**
 * Simple demand forecasting using moving average
 * Predicts next 7-day demand based on past 30 days of OUT transactions
 */
const getDemandForecast = async ({ productId, days = 30 }) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const where = { type: 'OUT', createdAt: { gte: since } };
  if (productId) where.productId = productId;

  const transactions = await prisma.transaction.findMany({
    where,
    include: { product: { select: { id: true, name: true, sku: true } } },
    orderBy: { createdAt: 'asc' },
  });

  // Group by product and calculate daily averages
  const byProduct = {};
  transactions.forEach((tx) => {
    if (!byProduct[tx.productId]) {
      byProduct[tx.productId] = { product: tx.product, dailyQuantities: {}, totalOut: 0 };
    }
    const day = tx.createdAt.toISOString().split('T')[0];
    byProduct[tx.productId].dailyQuantities[day] = (byProduct[tx.productId].dailyQuantities[day] || 0) + tx.quantity;
    byProduct[tx.productId].totalOut += tx.quantity;
  });

  const forecasts = await Promise.all(
    Object.values(byProduct).map(async ({ product, dailyQuantities, totalOut }) => {
      const quantities = Object.values(dailyQuantities);
      const avgDailyDemand = quantities.length > 0 ? totalOut / days : 0;
      const forecastNext7Days = Math.round(avgDailyDemand * 7);

      // Get current inventory
      const inv = await prisma.inventory.findUnique({ where: { productId: product.id } });
      const currentStock = inv?.quantity || 0;
      const daysOfStock = avgDailyDemand > 0 ? Math.floor(currentStock / avgDailyDemand) : 999;

      // Trend: compare last 7 days vs 7 days before
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const recentEntries = Object.entries(dailyQuantities).filter(([d]) => new Date(d) >= sevenDaysAgo);
      const olderEntries = Object.entries(dailyQuantities).filter(([d]) => new Date(d) >= fourteenDaysAgo && new Date(d) < sevenDaysAgo);
      const recentSum = recentEntries.reduce((s, [, v]) => s + v, 0);
      const olderSum = olderEntries.reduce((s, [, v]) => s + v, 0);

      let trend = 'stable';
      if (recentSum > olderSum * 1.2) trend = 'increasing';
      else if (recentSum < olderSum * 0.8) trend = 'decreasing';

      return {
        product,
        currentStock,
        avgDailyDemand: Number(avgDailyDemand.toFixed(2)),
        forecastNext7Days,
        daysOfStock,
        trend,
        needsReorder: daysOfStock < 14,
      };
    })
  );

  return forecasts.sort((a, b) => (a.daysOfStock || 999) - (b.daysOfStock || 999));
};

module.exports = { getDashboardStats, getTransactionReport, getTopProducts, getInventoryReport, getDemandForecast };
