const prisma = require('../config/database');

const getAll = async ({ location, lowStock, page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;
  const where = {};
  if (location) where.location = { contains: location, mode: 'insensitive' };
  if (lowStock === 'true') {
    where.quantity = { lte: prisma.inventory.fields.minStock };
  }

  const [items, total] = await Promise.all([
    prisma.inventory.findMany({
      where,
      include: {
        product: { include: { category: true } },
      },
      skip,
      take: Number(limit),
      orderBy: { product: { name: 'asc' } },
    }),
    prisma.inventory.count({ where }),
  ]);

  // Add low stock flag
  const enriched = items.map((item) => ({
    ...item,
    isLowStock: item.quantity <= item.minStock,
    isOverStock: item.quantity >= item.maxStock,
  }));

  return {
    inventory: enriched,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  };
};

const getByProductId = async (productId) => {
  const item = await prisma.inventory.findUnique({
    where: { productId },
    include: { product: { include: { category: true } } },
  });
  if (!item) {
    const error = new Error('Inventory record not found');
    error.status = 404;
    throw error;
  }
  return item;
};

const update = async (productId, data) => {
  return prisma.inventory.update({
    where: { productId },
    data: {
      quantity: data.quantity,
      minStock: data.minStock,
      maxStock: data.maxStock,
      location: data.location,
    },
    include: { product: true },
  });
};

const getLowStockAlerts = async () => {
  const items = await prisma.inventory.findMany({
    include: { product: { include: { category: true } } },
  });
  return items.filter((item) => item.quantity <= item.minStock);
};

const getSummary = async () => {
  const [total, lowStockItems, allInventory] = await Promise.all([
    prisma.inventory.count(),
    prisma.inventory.findMany({ include: { product: true } }),
    prisma.inventory.findMany({ include: { product: true } }),
  ]);

  const lowStock = lowStockItems.filter((i) => i.quantity <= i.minStock).length;
  const outOfStock = allInventory.filter((i) => i.quantity === 0).length;
  const totalValue = allInventory.reduce((sum, i) => {
    return sum + Number(i.product.price) * i.quantity;
  }, 0);

  return { totalProducts: total, lowStock, outOfStock, totalValue };
};

module.exports = { getAll, getByProductId, update, getLowStockAlerts, getSummary };
