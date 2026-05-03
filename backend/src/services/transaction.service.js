const prisma = require('../config/database');

const getAll = async ({ type, productId, userId, page = 1, limit = 20, startDate, endDate }) => {
  const skip = (page - 1) * limit;
  const where = {};

  if (type) where.type = type;
  if (productId) where.productId = productId;
  if (userId) where.userId = userId;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    transactions,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  };
};

const create = async ({ productId, type, quantity, userId, note, unitPrice }) => {
  // Validate product + inventory exist
  const inventory = await prisma.inventory.findUnique({ where: { productId } });
  if (!inventory) {
    const error = new Error('Product inventory not found');
    error.status = 404;
    throw error;
  }

  // For OUT transactions, check sufficient stock
  if (type === 'OUT' && inventory.quantity < quantity) {
    const error = new Error(`Insufficient stock. Available: ${inventory.quantity}`);
    error.status = 400;
    throw error;
  }

  // Run in a transaction to keep data consistent
  const [transaction] = await prisma.$transaction([
    prisma.transaction.create({
      data: { productId, type, quantity, userId, note, unitPrice },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.inventory.update({
      where: { productId },
      data: {
        quantity: type === 'IN'
          ? inventory.quantity + quantity
          : type === 'OUT'
          ? inventory.quantity - quantity
          : quantity, // ADJUSTMENT sets absolute value
      },
    }),
  ]);

  return transaction;
};

const getById = async (id) => {
  const tx = await prisma.transaction.findUnique({
    where: { id },
    include: {
      product: { include: { category: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!tx) {
    const error = new Error('Transaction not found');
    error.status = 404;
    throw error;
  }
  return tx;
};

module.exports = { getAll, create, getById };
