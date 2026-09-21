import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding SuperAdmin, Admin, Staff, and Client accounts...');

  const superAdminPasswordHash = await bcrypt.hash('SuperAdminPassword123!', 10);
  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 10);
  const staffPasswordHash = await bcrypt.hash('StaffPassword123!', 10);
  const userPasswordHash = await bcrypt.hash('UserPassword123!', 10);

  // 1. Single Platform-Level Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@buoyantmedia.com' },
    update: {
      passwordHash: superAdminPasswordHash,
      role: UserRole.SUPERADMIN,
      isActive: true,
    },
    create: {
      email: 'superadmin@buoyantmedia.com',
      passwordHash: superAdminPasswordHash,
      name: 'Platform Super Admin',
      phone: '+1-800-SUPERADM',
      role: UserRole.SUPERADMIN,
      spcode: 'SA01',
      isActive: true,
    },
  });

  // 2. Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@buoyantmedia.com' },
    update: {
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
    create: {
      email: 'admin@buoyantmedia.com',
      passwordHash: adminPasswordHash,
      name: 'System Admin',
      phone: '+1-800-BUOYANT',
      role: UserRole.ADMIN,
      spcode: 'B001',
      isActive: true,
    },
  });

  // 3. Staff User
  const staff = await prisma.user.upsert({
    where: { email: 'staff@buoyantmedia.com' },
    update: {
      passwordHash: staffPasswordHash,
      role: UserRole.STAFF,
      isActive: true,
    },
    create: {
      email: 'staff@buoyantmedia.com',
      passwordHash: staffPasswordHash,
      name: 'Operations Staff',
      phone: '+1-800-STAFFOPS',
      role: UserRole.STAFF,
      spcode: 'ST01',
      isActive: true,
    },
  });

  // 4. Regular Client User
  const clientUser = await prisma.user.upsert({
    where: { email: 'user@buoyantmedia.com' },
    update: {
      passwordHash: userPasswordHash,
      role: UserRole.CLIENT,
      isActive: true,
    },
    create: {
      email: 'user@buoyantmedia.com',
      passwordHash: userPasswordHash,
      name: 'Client User',
      phone: '+1-800-CLIENT',
      role: UserRole.CLIENT,
      isActive: true,
    },
  });

  console.log('✅ Accounts provisioned successfully:');
  console.log('----------------------------------------------------');
  console.log('👑 Super Admin:');
  console.log(`   Email:    ${superAdmin.email}`);
  console.log(`   Password: SuperAdminPassword123!`);
  console.log(`   Role:     ${superAdmin.role}`);
  console.log(`   SP Code:  ${superAdmin.spcode}`);
  console.log('----------------------------------------------------');
  console.log('🛡️ Admin:');
  console.log(`   Email:    ${admin.email}`);
  console.log(`   Password: AdminPassword123!`);
  console.log(`   Role:     ${admin.role}`);
  console.log(`   SP Code:  ${admin.spcode}`);
  console.log('----------------------------------------------------');
  console.log('📋 Staff:');
  console.log(`   Email:    ${staff.email}`);
  console.log(`   Password: StaffPassword123!`);
  console.log(`   Role:     ${staff.role}`);
  console.log(`   SP Code:  ${staff.spcode}`);
  console.log('----------------------------------------------------');
  console.log('👤 Client:');
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
