const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding started...');

  const hashedPassword = await bcrypt.hash('123456', 10);

  // ADMIN
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@gmail.com',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  // TEST USER
  const user = await prisma.user.upsert({
    where: { email: 'test@gmail.com' },
    update: {},
    create: {
      name: 'Test User',
      email: 'test@gmail.com',
      password: hashedPassword,
      role: 'SELLER',
    },
  });

  console.log('✅ Admin:', admin.email);
  console.log('✅ User:', user.email);
  console.log('🎉 Seeding finished!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
