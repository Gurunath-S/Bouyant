import 'dotenv/config';
import {
  PrismaClient,
  UserRole,
  ExhibitionStatus,
  StallCategory,
  StallStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('================================================================');
  console.log('🧹 CLEARING DATABASE & SEEDING EXACT 4 EVENTS & DEMO LOGINS');
  console.log('================================================================');

  // 1. Delete transactional & operational data in safe Foreign Key order
  console.log('🗑️  Deleting notifications...');
  await prisma.notification.deleteMany({});

  console.log('🗑️  Deleting invoices...');
  await prisma.invoice.deleteMany({});

  console.log('🗑️  Deleting payments...');
  await prisma.payment.deleteMany({});

  console.log('🗑️  Deleting booking stalls & bookings...');
  await prisma.bookingStall.deleteMany({});
  await prisma.booking.deleteMany({});

  console.log('🗑️  Deleting stalls & floor plans...');
  await prisma.stall.deleteMany({});
  await prisma.floorPlan.deleteMany({});

  console.log('🗑️  Deleting exhibitions...');
  await prisma.exhibition.deleteMany({});

  console.log('🗑️  Unlinking users from companies & deleting companies...');
  await prisma.user.updateMany({
    data: { companyId: null },
  });
  await prisma.company.deleteMany({});

  // 2. Delete ALL users for a clean slate
  console.log('🗑️  Purging all user accounts...');
  await prisma.user.deleteMany({});

  // 3. Prepare passwords exactly matching client/src/features/auth/pages/LoginPage.tsx
  console.log('\n🔑 Seeding Exact Demo Accounts from Login Page...');
  const adminStaffPasswordHash = await bcrypt.hash('Password123!', 10);
  const clientPasswordHash = await bcrypt.hash('DemoUser123!', 10);

  // 1. Super Admin (Login Page DEMO_ACCOUNTS)
  await prisma.user.create({
    data: {
      email: 'superadmin@buoyantmedia.com',
      passwordHash: adminStaffPasswordHash,
      username: 'superadmin',
      name: 'Platform Super Admin',
      phone: '+919876500001',
      role: UserRole.SUPERADMIN,
      spcode: 'SA01',
      pageAccess: [],
      isActive: true,
    },
  });

  // 2. Exhibition Admin (Login Page DEMO_ACCOUNTS)
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@buoyantmedia.com',
      passwordHash: adminStaffPasswordHash,
      username: 'admin',
      name: 'guru',
      phone: '8838669315',
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

  // 3. Operations Staff (Login Page DEMO_ACCOUNTS)
  await prisma.user.create({
    data: {
      email: 'staff@buoyantmedia.com',
      passwordHash: adminStaffPasswordHash,
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

  // 4. Personal Staff Account (Guru)
  await prisma.user.create({
    data: {
      email: 'guruthedev20@gmail.com',
      passwordHash: adminStaffPasswordHash,
      username: 'gurunath',
      name: 'gurunath',
      phone: '8838669315',
      role: UserRole.STAFF,
      spcode: 'ST00',
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

  // 5. Demo Company for Exhibitor Client
  const demoCompany = await prisma.company.create({
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
      website: 'https://demo-innovations.in',
      spcode: 'CMP01',
      regNo: 'REG-2026-001',
    },
  });

  // 6. Demo Exhibitor Client (Login Page DEMO_ACCOUNTS autofills: username 'demo.client' & PW 'DemoUser123!')
  await prisma.user.create({
    data: {
      email: 'demo@buoyantmedia.com',
      passwordHash: clientPasswordHash,
      username: 'demo.client',
      name: 'Demo Exhibitor',
      phone: '+919876543210',
      role: UserRole.CLIENT,
      companyId: demoCompany.id,
      pageAccess: [],
      isActive: true,
    },
  });

  // 7. Seed EXACT 4 Platform Exhibition Events with Floor Plans & Stalls
  console.log('🎪 Seeding 4 Official Exhibition Events, Floor Plans & Stalls...');

  const eventsData = [
    {
      title: 'Global Tech Expo 2026',
      slug: 'global-tech-expo-2026',
      description: 'The premier international technology, enterprise software, and innovation trade show.',
      venue: 'Metropolitan Convention Center',
      city: 'San Francisco, CA',
      startDate: new Date('2026-11-01T09:00:00Z'),
      endDate: new Date('2026-11-03T18:00:00Z'),
      bookingEndDate: new Date('2026-10-25T23:59:59Z'),
      status: ExhibitionStatus.PUBLISHED,
      bannerUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200',
      totalStalls: 14,
      edition: '10',
      eventCode: 'GT-01',
      spcode: 'ZE05',
      notificationEmails: 'admin@buoyantmedia.com',
      createdByUserId: adminUser.id,
    },
    {
      title: 'Mediccon Expo 2026',
      slug: 'mediccon-expo-2026',
      description: 'International Healthcare, Medical Devices, Diagnostics & Surgical Equipment Trade Fair.',
      venue: 'Codissia Trade Centre (Hall - A & B)',
      city: 'Coimbatore, TN',
      startDate: new Date('2026-11-20T09:00:00Z'),
      endDate: new Date('2026-11-22T18:00:00Z'),
      bookingEndDate: new Date('2026-11-10T23:59:59Z'),
      status: ExhibitionStatus.PUBLISHED,
      bannerUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=1200',
      totalStalls: 14,
      edition: '4',
      eventCode: 'MC-04',
      spcode: 'MC04',
      notificationEmails: 'admin@buoyantmedia.com',
      createdByUserId: adminUser.id,
    },
    {
      title: 'International Auto Expo 2026',
      slug: 'international-auto-expo-2026',
      description: "Asia's largest automotive technology, electric vehicles, and future mobility exhibition.",
      venue: 'BIEC Exhibition Centre',
      city: 'Bengaluru, KA',
      startDate: new Date('2026-12-10T09:00:00Z'),
      endDate: new Date('2026-12-14T18:00:00Z'),
      bookingEndDate: new Date('2026-11-30T23:59:59Z'),
      status: ExhibitionStatus.PUBLISHED,
      bannerUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200',
      totalStalls: 14,
      edition: '6',
      eventCode: 'AE-06',
      spcode: 'AE06',
      notificationEmails: 'admin@buoyantmedia.com',
      createdByUserId: adminUser.id,
    },
    {
      title: 'Clean Energy & Sustainability Summit 2027',
      slug: 'clean-energy-summit-2027',
      description: 'Global renewable energy, solar photovoltaics, battery storage, and green tech conference & expo.',
      venue: 'Pragati Maidan Hall 5',
      city: 'New Delhi, DL',
      startDate: new Date('2027-01-15T09:00:00Z'),
      endDate: new Date('2027-01-18T18:00:00Z'),
      bookingEndDate: new Date('2027-01-05T23:59:59Z'),
      status: ExhibitionStatus.PUBLISHED,
      bannerUrl: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=1200',
      totalStalls: 14,
      edition: '02',
      eventCode: 'CE-02',
      spcode: 'CE02',
      notificationEmails: 'admin@buoyantmedia.com',
      createdByUserId: adminUser.id,
    },
  ];

  const stallsTemplate = [
    // Standard Stalls (A-Row)
    { stallNumber: 'A-101', category: StallCategory.STANDARD, price: 50000, areaSqFt: 100, width: 100, height: 100, xPosition: 50, yPosition: 50 },
    { stallNumber: 'A-102', category: StallCategory.STANDARD, price: 50000, areaSqFt: 100, width: 100, height: 100, xPosition: 180, yPosition: 50 },
    { stallNumber: 'A-103', category: StallCategory.STANDARD, price: 50000, areaSqFt: 100, width: 100, height: 100, xPosition: 310, yPosition: 50 },
    { stallNumber: 'A-104', category: StallCategory.STANDARD, price: 50000, areaSqFt: 100, width: 100, height: 100, xPosition: 440, yPosition: 50 },
    // Premium Stalls (B-Row)
    { stallNumber: 'B-201', category: StallCategory.PREMIUM, price: 75000, areaSqFt: 150, width: 100, height: 100, xPosition: 50, yPosition: 220 },
    { stallNumber: 'B-202', category: StallCategory.PREMIUM, price: 75000, areaSqFt: 150, width: 100, height: 100, xPosition: 220, yPosition: 220 },
    { stallNumber: 'B-203', category: StallCategory.PREMIUM, price: 75000, areaSqFt: 150, width: 100, height: 100, xPosition: 390, yPosition: 220 },
    { stallNumber: 'B-204', category: StallCategory.PREMIUM, price: 75000, areaSqFt: 150, width: 100, height: 100, xPosition: 560, yPosition: 220 },
    // Corner Stalls (C-Row)
    { stallNumber: 'C-301', category: StallCategory.CORNER, price: 90000, areaSqFt: 180, width: 100, height: 100, xPosition: 50, yPosition: 400 },
    { stallNumber: 'C-302', category: StallCategory.CORNER, price: 90000, areaSqFt: 180, width: 100, height: 100, xPosition: 250, yPosition: 400 },
    { stallNumber: 'C-303', category: StallCategory.CORNER, price: 90000, areaSqFt: 180, width: 100, height: 100, xPosition: 450, yPosition: 400 },
    // VIP Island Stalls
    { stallNumber: 'VIP-01', category: StallCategory.ISLAND, price: 150000, areaSqFt: 300, width: 100, height: 100, xPosition: 750, yPosition: 50 },
    { stallNumber: 'VIP-02', category: StallCategory.ISLAND, price: 150000, areaSqFt: 300, width: 100, height: 100, xPosition: 750, yPosition: 280 },
    { stallNumber: 'VIP-03', category: StallCategory.ISLAND, price: 150000, areaSqFt: 300, width: 100, height: 100, xPosition: 750, yPosition: 510 },
  ];

  let totalStallsCreated = 0;

  for (const eventInfo of eventsData) {
    const exhibition = await prisma.exhibition.create({
      data: eventInfo,
    });

    const floorPlan = await prisma.floorPlan.create({
      data: {
        exhibitionId: exhibition.id,
        name: `Main Exhibition Hall - ${eventInfo.title}`,
        width: 1200,
        height: 800,
        gridColumns: 20,
        gridRows: 15,
        isPublished: true,
      },
    });

    for (const s of stallsTemplate) {
      await prisma.stall.create({
        data: {
          floorPlanId: floorPlan.id,
          stallNumber: s.stallNumber,
          category: s.category,
          price: s.price,
          areaSqFt: s.areaSqFt,
          width: s.width,
          height: s.height,
          xPosition: s.xPosition,
          yPosition: s.yPosition,
          status: StallStatus.AVAILABLE,
          heldByUserId: null,
          heldUntil: null,
        },
      });
      totalStallsCreated++;
    }
  }

  console.log('\n================================================================');
  console.log('🎉 DATABASE RESET & SEEDED WITH EXACT 4 EVENTS & DEMO LOGINS!');
  console.log('================================================================');
  console.log('Summary:');
  console.log(`• Exhibitions Seeded  : ${eventsData.length} Published Events (The 4 core events)`);
  console.log(`• Floor Plans Seeded  : ${eventsData.length} Hall Layout Plans`);
  console.log(`• Stalls Seeded       : ${totalStallsCreated} Stalls (All 100% AVAILABLE)`);
  console.log('• Bookings / Invoices : 0 (Clean Slate)');
  console.log('----------------------------------------------------------------');
  console.log('🔑 EXACT LOGIN PAGE CREDENTIALS:');
  console.log('----------------------------------------------------------------');
  console.log('1. Demo Exhibitor (Client) : Username: demo.client         | PW: DemoUser123!');
  console.log('2. Exhibition Admin        : Email: admin@buoyantmedia.com | PW: Password123!');
  console.log('3. Operations Staff        : Email: staff@buoyantmedia.com | PW: Password123!');
  console.log('4. Super Admin             : Email: superadmin@buoyantmedia.com | PW: Password123!');
  console.log('5. Personal Staff Account  : Email: guruthedev20@gmail.com | PW: Password123!');
  console.log('================================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
