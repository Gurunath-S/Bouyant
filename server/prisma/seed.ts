import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Admin and User accounts...');

  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 10);
  const userPasswordHash = await bcrypt.hash('UserPassword123!', 10);

  // 1. Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@buoyantmedia.com' },
    update: {
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
    },
    create: {
      email: 'admin@buoyantmedia.com',
      passwordHash: adminPasswordHash,
      name: 'System Admin',
      phone: '+1-800-BUOYANT',
      role: UserRole.ADMIN,
      spcode: 'B001',
    },
  });

  // 2. Regular Client User
  const clientUser = await prisma.user.upsert({
    where: { email: 'user@buoyantmedia.com' },
    update: {
      passwordHash: userPasswordHash,
      role: UserRole.CLIENT,
    },
    create: {
      email: 'user@buoyantmedia.com',
      passwordHash: userPasswordHash,
      name: 'Client User',
      phone: '+1-800-CLIENT',
      role: UserRole.CLIENT,
    },
  });

  console.log('✅ Accounts created/updated successfully:');
  console.log('----------------------------------------------------');
  console.log('👑 Admin Account:');
  console.log(`   Email:    ${admin.email}`);
  console.log(`   Password: AdminPassword123!`);
  console.log(`   Role:     ${admin.role}`);
  console.log('----------------------------------------------------');
  console.log('👤 Client User:');
  console.log(`   Email:    ${clientUser.email}`);
  console.log(`   Password: UserPassword123!`);
  console.log(`   Role:     ${clientUser.role}`);
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
