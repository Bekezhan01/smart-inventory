require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Инициализация базы данных...');

  // ── Users ─────────────────────────────────────────────────────────────────
  const adminPass    = await bcrypt.hash('admin123', 12);
  const operPass     = await bcrypt.hash('operator123', 12);
  const sellerPin    = await bcrypt.hash('1234', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@stockos.com' },
    update: {},
    create: { name: 'Главный администратор', email: 'admin@stockos.com', password: adminPass, role: 'ADMIN' },
  });

  const operator = await prisma.user.upsert({
    where: { email: 'operator@stockos.com' },
    update: {},
    create: { name: 'Складской оператор', email: 'operator@stockos.com', password: operPass, role: 'OPERATOR' },
  });

  const seller = await prisma.user.upsert({
    where: { email: 'seller@stockos.com' },
    update: {},
    create: {
      name: 'Продавец Иван',
      email: 'seller@stockos.com',
      password: await bcrypt.hash('seller123', 12),
      role: 'SELLER',
      pinHash: sellerPin,
      pinEnabled: true,
    },
  });

  // ── Categories ────────────────────────────────────────────────────────────
  const cats = await Promise.all([
    prisma.category.upsert({ where: { name: 'Электроника' },       update: {}, create: { name: 'Электроника' } }),
    prisma.category.upsert({ where: { name: 'Одежда' },            update: {}, create: { name: 'Одежда' } }),
    prisma.category.upsert({ where: { name: 'Продукты питания' },  update: {}, create: { name: 'Продукты питания' } }),
    prisma.category.upsert({ where: { name: 'Канцтовары' },        update: {}, create: { name: 'Канцтовары' } }),
    prisma.category.upsert({ where: { name: 'Инструменты' },       update: {}, create: { name: 'Инструменты' } }),
  ]);

  // ── Products ──────────────────────────────────────────────────────────────
  const productData = [
    { name: 'Ноутбук Pro X1',       sku: 'ELEC-001', price: 89999,  catIdx: 0, qty: 25,  min: 5,   loc: 'A1' },
    { name: 'Беспроводная мышь',    sku: 'ELEC-002', price: 1499,   catIdx: 0, qty: 150, min: 20,  loc: 'A2' },
    { name: 'USB-C Хаб 7-в-1',      sku: 'ELEC-003', price: 2999,   catIdx: 0, qty: 80,  min: 10,  loc: 'A3' },
    { name: 'Механическая клавиатура', sku: 'ELEC-004', price: 7999, catIdx: 0, qty: 3,   min: 5,   loc: 'A4' },
    { name: 'Футболка мужская (M)',  sku: 'CLO-001',  price: 999,   catIdx: 1, qty: 200, min: 30,  loc: 'B1' },
    { name: 'Джинсы женские (32)',   sku: 'CLO-002',  price: 3499,  catIdx: 1, qty: 0,   min: 10,  loc: 'B2' },
    { name: 'Кроссовки 42р',        sku: 'CLO-003',  price: 5499,  catIdx: 1, qty: 45,  min: 8,   loc: 'B3' },
    { name: 'Вода минеральная 1.5л', sku: 'FB-001',   price: 89,    catIdx: 2, qty: 500, min: 100, loc: 'C1' },
    { name: 'Кофе в зёрнах 1кг',    sku: 'FB-002',   price: 1199,  catIdx: 2, qty: 2,   min: 10,  loc: 'C2' },
    { name: 'Бумага А4 (500л)',      sku: 'OFF-001',  price: 549,   catIdx: 3, qty: 300, min: 50,  loc: 'D1' },
    { name: 'Ручки шариковые (10шт)',sku: 'OFF-002',  price: 249,   catIdx: 3, qty: 400, min: 50,  loc: 'D2' },
    { name: 'Дрель аккумуляторная', sku: 'TOOL-001', price: 8999,  catIdx: 4, qty: 12,  min: 3,   loc: 'E1' },
  ];

  for (const d of productData) {
    const product = await prisma.product.upsert({
      where: { sku: d.sku },
      update: {},
      create: { name: d.name, sku: d.sku, price: d.price, categoryId: cats[d.catIdx].id },
    });
    await prisma.inventory.upsert({
      where: { productId: product.id },
      update: {},
      create: { productId: product.id, quantity: d.qty, minStock: d.min, maxStock: d.qty * 5 + 100, location: d.loc },
    });
  }

  // ── Sample transactions ───────────────────────────────────────────────────
  const products = await prisma.product.findMany({ take: 5 });
  for (let i = 0; i < 15; i++) {
    const product = products[i % products.length];
    const inv     = await prisma.inventory.findUnique({ where: { productId: product.id } });
    const type    = i % 3 === 0 ? 'IN' : 'OUT';
    const qty     = Math.floor(Math.random() * 8) + 1;
    if (type === 'OUT' && inv.quantity < qty) continue;
    await prisma.transaction.create({
      data: {
        productId: product.id, type, quantity: qty, userId: operator.id,
        note: `Тестовая операция ${i + 1}`,
        createdAt: new Date(Date.now() - Math.random() * 30 * 86400000),
      },
    });
  }

  console.log('✅ База данных готова!');
  console.log('─────────────────────────────────────────────');
  console.log('👤 Admin:    admin@stockos.com    / admin123');
  console.log('👤 Operator: operator@stockos.com / operator123');
  console.log('👤 Seller:   seller@stockos.com   / PIN: 1234  (или Face ID)');
  console.log('─────────────────────────────────────────────');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
