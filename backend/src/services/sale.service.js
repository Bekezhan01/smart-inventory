const prisma = require('../config/database');

const createSale = async ({ sellerId, items, discount = 0, paymentMethod = 'cash', note }) => {
  // Validate all products and check stock
  const productIds = items.map((i) => i.productId);
  const inventories = await prisma.inventory.findMany({
    where: { productId: { in: productIds } },
    include: { product: true },
  });

  const invMap = Object.fromEntries(inventories.map((i) => [i.productId, i]));

  let totalAmount = 0;
  const enrichedItems = items.map((item) => {
    const inv = invMap[item.productId];
    if (!inv) throw Object.assign(new Error(`Товар не найден: ${item.productId}`), { status: 404 });
    if (inv.quantity < item.quantity) {
      throw Object.assign(
        new Error(`Недостаточно товара "${inv.product.name}". Доступно: ${inv.quantity}`),
        { status: 400 }
      );
    }
    const unitPrice = Number(inv.product.price);
    const subtotal  = unitPrice * item.quantity;
    totalAmount += subtotal;
    return { ...item, unitPrice, subtotal };
  });

  totalAmount = Math.max(0, totalAmount - Number(discount));

  // Run all DB writes in a transaction
  const sale = await prisma.$transaction(async (tx) => {
    const newSale = await tx.sale.create({
      data: {
        sellerId,
        totalAmount,
        discount,
        paymentMethod,
        note,
        items: {
          create: enrichedItems.map((i) => ({
            productId: i.productId,
            quantity:  i.quantity,
            unitPrice: i.unitPrice,
            subtotal:  i.subtotal,
          })),
        },
      },
      include: { items: { include: { product: true } }, seller: { select: { name: true } } },
    });

    // Deduct inventory + record transactions
    for (const item of enrichedItems) {
      await tx.inventory.update({
        where: { productId: item.productId },
        data:  { quantity: { decrement: item.quantity } },
      });
      await tx.transaction.create({
        data: {
          productId: item.productId,
          type:      'SALE',
          quantity:  item.quantity,
          userId:    sellerId,
          saleId:    newSale.id,
          unitPrice: item.unitPrice,
          note:      `Продажа #${newSale.id.slice(0, 8)}`,
        },
      });
    }

    return newSale;
  });

  return sale;
};

const getSales = async ({ sellerId, page = 1, limit = 20, startDate, endDate }) => {
  const skip  = (page - 1) * limit;
  const where = {};
  if (sellerId) where.sellerId = sellerId;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate)   where.createdAt.lte = new Date(endDate);
  }

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: {
        items: { include: { product: { select: { name: true, sku: true } } } },
        seller: { select: { name: true, email: true } },
      },
      skip, take: Number(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.sale.count({ where }),
  ]);
  return { sales, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } };
};

const getSaleById = async (id) => {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      items: { include: { product: { include: { category: true } } } },
      seller: { select: { name: true, email: true } },
    },
  });
  if (!sale) throw Object.assign(new Error('Продажа не найдена'), { status: 404 });
  return sale;
};

const getSalesSummary = async (sellerId) => {
  const today   = new Date(); today.setHours(0,0,0,0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [todayAgg, monthAgg, todayCount, monthCount] = await Promise.all([
    prisma.sale.aggregate({ where: { sellerId, status: 'completed', createdAt: { gte: today } },      _sum: { totalAmount: true } }),
    prisma.sale.aggregate({ where: { sellerId, status: 'completed', createdAt: { gte: monthStart } }, _sum: { totalAmount: true } }),
    prisma.sale.count({ where: { sellerId, createdAt: { gte: today } } }),
    prisma.sale.count({ where: { sellerId, createdAt: { gte: monthStart } } }),
  ]);

  return {
    todayRevenue:  Number(todayAgg._sum.totalAmount  || 0),
    monthRevenue:  Number(monthAgg._sum.totalAmount  || 0),
    todaySales:    todayCount,
    monthSales:    monthCount,
  };
};

module.exports = { createSale, getSales, getSaleById, getSalesSummary };
