const prisma = require('../config/database');

const normalizeOptionalString = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
};

const normalizeRequiredString = (value) => String(value || '').trim();

const normalizeNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const getAll = async ({ search, categoryId, page = 1, limit = 20, isActive }) => {
  const skip = (page - 1) * limit;
  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        inventory: true,
      },
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  };
};

const getById = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true, inventory: true },
  });
  if (!product) {
    const error = new Error('Product not found');
    error.status = 404;
    throw error;
  }
  return product;
};

const create = async (data) => {
  const productData = {
    name: normalizeRequiredString(data.name),
    sku: normalizeRequiredString(data.sku),
    barcode: normalizeOptionalString(data.barcode),
    price: normalizeNumber(data.price, 0),
    categoryId: normalizeOptionalString(data.categoryId),
    description: normalizeOptionalString(data.description),
    imageUrl: normalizeOptionalString(data.imageUrl),
  };

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: productData,
    });

    await tx.inventory.create({
      data: {
        productId: product.id,
        quantity: normalizeNumber(data.initialQuantity, 0),
        minStock: normalizeNumber(data.minStock, 0),
        maxStock: normalizeNumber(data.maxStock, 1000),
        location: normalizeOptionalString(data.location),
      },
    });

    return tx.product.findUnique({
      where: { id: product.id },
      include: { category: true, inventory: true },
    });
  });
};

const update = async (id, data) => {
  await getById(id);
  return prisma.product.update({
    where: { id },
    data: {
      name: data.name === undefined ? undefined : normalizeRequiredString(data.name),
      sku: data.sku === undefined ? undefined : normalizeRequiredString(data.sku),
      barcode: data.barcode === undefined ? undefined : normalizeOptionalString(data.barcode),
      price: data.price === undefined ? undefined : normalizeNumber(data.price, 0),
      categoryId: data.categoryId === undefined ? undefined : normalizeOptionalString(data.categoryId),
      description: data.description === undefined ? undefined : normalizeOptionalString(data.description),
      imageUrl: data.imageUrl === undefined ? undefined : normalizeOptionalString(data.imageUrl),
      isActive: data.isActive,
    },
    include: { category: true, inventory: true },
  });
};

const remove = async (id) => {
  const product = await getById(id);

  const [transactionsCount, saleItemsCount] = await Promise.all([
    prisma.transaction.count({ where: { productId: id } }),
    prisma.saleItem.count({ where: { productId: id } }),
  ]);

  const hasHistory = transactionsCount > 0 || saleItemsCount > 0;

  if (!hasHistory) {
    await prisma.product.delete({ where: { id } });
    return { mode: 'deleted', productId: id };
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: { isActive: false },
    });

    await tx.inventory.updateMany({
      where: { productId: id },
      data: { quantity: 0 },
    });
  });

  return { mode: 'archived', productId: product.id };
};

module.exports = { getAll, getById, create, update, remove };
