import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

if (!process.env.DATABASE_URL) {
  console.error('\n❌ ERROR: DATABASE_URL is not set or is commented out in server/.env');
  console.error('Please uncomment or set your DATABASE_URL in server/.env before seeding.\n');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log('================================================================');
  console.log('👤 SEEDING ONLY ESSENTIAL USER CREDENTIALS (NO DELETIONS)');
  console.log('================================================================');

  const defaultPasswordHash = await bcrypt.hash('Password123!', 10);
  const demoClientPasswordHash = await bcrypt.hash('DemoUser123!', 10);

  // 1. Ensure a Demo Exhibitor Company exists (Non-destructive)
  let demoCompany = await prisma.company.findFirst({
    where: {
      OR: [
        { companyCode: 'CMP-DEMO' },
        { email: 'demo.company@buoyantmedia.com' },
        { mobile: '+919876543210' },
      ],
    },
  });

  if (!demoCompany) {
    demoCompany = await prisma.company.create({
      data: {
        companyCode: 'CMP-DEMO',
        name: 'Demo Innovations Pvt Ltd',
        contactPerson: 'Demo Exhibitor',
        mobile: '+919876543210',
        email: 'demo.company@buoyantmedia.com',
        address: 'Plot 101, Tech Park Phase 1',
        city: 'Bengaluru',
        state: 'Karnataka',
        pinCode: '560001',
        country: 'India',
        industry: 'Information Technology',
      },
    });
    console.log('🏢 Created Demo Exhibitor Company:', demoCompany.name);
  } else {
    console.log('🏢 Found Existing Demo Company:', demoCompany.name);
  }

  // 2. Super Admin Account
  console.log('👑 Upserting Super Admin...');
  await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {
      passwordHash: defaultPasswordHash,
      role: UserRole.SUPERADMIN,
      isActive: true,
      spcode: 'SA01',
    },
    create: {
      email: 'superadmin@buoyantmedia.com',
      passwordHash: defaultPasswordHash,
      username: 'superadmin',
      name: 'Platform Super Admin',
      phone: '+919876500001',
      role: UserRole.SUPERADMIN,
      spcode: 'SA01',
      pageAccess: [],
      isActive: true,
    },
  });

  // 3. Exhibition Admin Account
  console.log('🛡️ Upserting Exhibition Admin...');
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash: defaultPasswordHash,
      role: UserRole.ADMIN,
      isActive: true,
      spcode: 'AD01',
      pageAccess: [
        'dashboard',
        'event_register',
        'events_floorplans',
        'companies',
        'bookings',
        'payments',
        'reports',
      ],
    },
    create: {
      email: 'admin@buoyantmedia.com',
      passwordHash: defaultPasswordHash,
      username: 'admin',
      name: 'Exhibition Admin',
      phone: '+919876500002',
      role: UserRole.ADMIN,
      spcode: 'AD01',
      pageAccess: [
        'dashboard',
        'event_register',
        'events_floorplans',
        'companies',
        'bookings',
        'payments',
        'reports',
      ],
      isActive: true,
    },
  });

  // 4. Operations Staff Account
  console.log('👷 Upserting Operations Staff...');
  await prisma.user.upsert({
    where: { username: 'staffops' },
    update: {
      passwordHash: defaultPasswordHash,
      role: UserRole.STAFF,
      isActive: true,
      spcode: 'ST01',
      pageAccess: [
        'dashboard',
        'event_register',
        'companies',
        'bookings',
        'payments',
      ],
    },
    create: {
      email: 'staff@buoyantmedia.com',
      passwordHash: defaultPasswordHash,
      username: 'staffops',
      name: 'Operations Staff',
      phone: '+919876500003',
      role: UserRole.STAFF,
      spcode: 'ST01',
      pageAccess: [
        'dashboard',
        'event_register',
        'companies',
        'bookings',
        'payments',
      ],
      isActive: true,
    },
  });

  // 5. Demo Exhibitor (Client User)
  console.log('👤 Upserting Demo Exhibitor (Client)...');
  await prisma.user.upsert({
    where: { username: 'demo_user' },
    update: {
      passwordHash: demoClientPasswordHash,
      role: UserRole.CLIENT,
      companyId: demoCompany.id,
      isActive: true,
    },
    create: {
      email: 'demo@buoyantmedia.com',
      passwordHash: demoClientPasswordHash,
      username: 'demo_user',
      name: 'Demo Exhibitor',
      phone: '+919876543210',
      role: UserRole.CLIENT,
      companyId: demoCompany.id,
      pageAccess: [],
      isActive: true,
    },
  });

  // Secondary demo account: user@buoyantmedia.com
  await prisma.user.upsert({
    where: { username: 'clientuser' },
    update: {
      passwordHash: demoClientPasswordHash,
      role: UserRole.CLIENT,
      companyId: demoCompany.id,
      isActive: true,
    },
    create: {
      email: 'user@buoyantmedia.com',
      passwordHash: demoClientPasswordHash,
      username: 'clientuser',
      name: 'Demo Client User',
      phone: '+919876500004',
      role: UserRole.CLIENT,
      companyId: demoCompany.id,
      pageAccess: [],
      isActive: true,
    },
  });

  console.log('================================================================');
  console.log('✅ ESSENTIAL USERS READY FOR LOGIN:');
  console.log('1. Super Admin : superadmin@buoyantmedia.com  | Password123!');
  console.log('2. Admin User  : admin@buoyantmedia.com       | Password123!');
  console.log('3. Staff User  : staff@buoyantmedia.com       | Password123!');
  console.log('4. Demo Client : demo@buoyantmedia.com        | DemoUser123!');
  console.log('================================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ User Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
