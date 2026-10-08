import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Clean User Accounts Only...');

  const superAdminPasswordHash = await bcrypt.hash('SuperAdminPassword123!', 10);
  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 10);
  const staffPasswordHash = await bcrypt.hash('StaffPassword123!', 10);
  // const clientPasswordHash = await bcrypt.hash('UserPassword123!', 10);

  // Delete dependent records before deleting demo companies if any exist
  await prisma.invoice.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.bookingStall.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.user.updateMany({
    data: { companyId: null },
  });
  await prisma.company.deleteMany({});

  // 1. SuperAdmin
  await prisma.user.upsert({
    where: { email: 'superadmin@buoyantmedia.com' },
    update: {
      passwordHash: superAdminPasswordHash,
      role: UserRole.SUPERADMIN,
      isActive: true,
    },
    create: {
      email: 'superadmin@buoyantmedia.com',
      passwordHash: superAdminPasswordHash,
      username: 'superadmin',
      name: 'Platform Super Admin',
      phone: '+919876500001',
      role: UserRole.SUPERADMIN,
      spcode: 'SA01',
      isActive: true,
    },
  });

  // 2. Admin User
  await prisma.user.upsert({
    where: { email: 'admin@buoyantmedia.com' },
    update: {
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
    create: {
      email: 'admin@buoyantmedia.com',
      passwordHash: adminPasswordHash,
      username: 'admin',
      name: 'System Admin',
      phone: '+919876500002',
      role: UserRole.ADMIN,
      spcode: 'B001',
      isActive: true,
    },
  });

  // 3. Staff User
  await prisma.user.upsert({
    where: { email: 'staff@buoyantmedia.com' },
    update: {
      passwordHash: staffPasswordHash,
      role: UserRole.STAFF,
      isActive: true,
    },
    create: {
      email: 'staff@buoyantmedia.com',
      passwordHash: staffPasswordHash,
      username: 'staffops',
      name: 'Operations Staff',
      phone: '+919876500003',
      role: UserRole.STAFF,
      spcode: 'ST01',
      isActive: true,
    },
  });

  // 4. Exhibitor Client User (Clean, no pre-created company)
  // await prisma.user.upsert({
  //   where: { email: 'user@buoyantmedia.com' },
  //   update: {
  //     passwordHash: clientPasswordHash,
  //     role: UserRole.CLIENT,
  //     isActive: true,
  //     companyId: null,
  //   },
  //   create: {
  //     email: 'user@buoyantmedia.com',
  //     passwordHash: clientPasswordHash,
  //     username: 'clientuser',
  //     name: 'Demo Exhibitor',
  //     phone: '+919876500004',
  //     role: UserRole.CLIENT,
  //     isActive: true,
  //   },
  // });

  console.log('====================================================');
  console.log('✅ Clean User Account Seeding Complete (No Mock Companies)!');
  console.log('====================================================');
  console.log('Super Admin  : superadmin@buoyantmedia.com / SuperAdminPassword123!');
  console.log('Admin User   : admin@buoyantmedia.com      / AdminPassword123!');
  console.log('Staff User   : staff@buoyantmedia.com      / StaffPassword123!');
  // console.log('Client User  : user@buoyantmedia.com       / UserPassword123!');
  console.log('====================================================');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
