const prisma = require('../config/database');

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
  const product = await prisma.product.create({
    data: {
      name: data.name,
      sku: data.sku,
      barcode: data.barcode,
      price: data.price,
      categoryId: data.categoryId,
      description: data.description,
      imageUrl: data.imageUrl,
    },
    include: { category: true },
  });

  // Auto-create inventory record
  await prisma.inventory.create({
    data: {
      productId: product.id,
      quantity: data.initialQuantity || 0,
      minStock: data.minStock || 0,
      maxStock: data.maxStock || 1000,
      location: data.location,
    },
  });

  return prisma.product.findUnique({
    where: { id: product.id },
    include: { category: true, inventory: true },
  });
};

const update = async (id, data) => {
  await getById(id);
  return prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      sku: data.sku,
      barcode: data.barcode,
      price: data.price,
      categoryId: data.categoryId,
      description: data.description,
      imageUrl: data.imageUrl,
      isActive: data.isActive,
    },
    include: { category: true, inventory: true },
  });
};

const remove = async (id) => {
  await getById(id);
  await prisma.product.delete({ where: { id } });
};

module.exports = { getAll, getById, create, update, remove };
