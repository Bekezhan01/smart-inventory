const prisma = require('../config/database');

const getAll = async () => {
  return prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  });
};

const create = async ({ name }) => {
  return prisma.category.create({ data: { name } });
};

const update = async (id, { name }) => {
  return prisma.category.update({ where: { id }, data: { name } });
};

const remove = async (id) => {
  await prisma.category.delete({ where: { id } });
};

module.exports = { getAll, create, update, remove };
