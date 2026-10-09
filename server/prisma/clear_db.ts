import { PrismaClient, UserRole, ExhibitionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Clearing local database and seeding clean initial accounts & exhibitions...');

  // 1. Delete transactional & operational data in safe FK order
  console.log('🗑️ Deleting notifications...');
  await prisma.notification.deleteMany({});

  console.log('🗑️ Deleting invoices...');
  await prisma.invoice.deleteMany({});

  console.log('🗑️ Deleting payments...');
  await prisma.payment.deleteMany({});

  console.log('🗑️ Deleting booking stalls & bookings...');
  await prisma.bookingStall.deleteMany({});
  await prisma.booking.deleteMany({});

  console.log('🗑️ Deleting stalls & floor plans...');
  await prisma.stall.deleteMany({});
  await prisma.floorPlan.deleteMany({});

  console.log('🗑️ Deleting exhibitions...');
  await prisma.exhibition.deleteMany({});

  console.log('🗑️ Unlinking and clearing companies & client users...');
  await prisma.user.updateMany({
    data: { companyId: null },
  });
  await prisma.company.deleteMany({});

  // 2. Delete non-admin client accounts
  await prisma.user.deleteMany({
    where: {
      role: UserRole.CLIENT,
    },
  });

  // 3. Seed clean system users (SuperAdmin, Admin, Staff)
  console.log('🌱 Creating Clean System Admin Accounts...');
  const superAdminPasswordHash = await bcrypt.hash('SuperAdminPassword123!', 10);
  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 10);
  const staffPasswordHash = await bcrypt.hash('StaffPassword123!', 10);

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
      username: 'adminops',
      name: 'Event Operations Admin',
      phone: '+919876500002',
      role: UserRole.ADMIN,
      spcode: 'AD01',
      isActive: true,
    },
  });

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

  // 4. Seed 4 Exhibition Events with Floor Plans and Stalls
  console.log('🎪 Creating 4 Platform Exhibition Events & Floor Plans...');

  const eventsData = [
    {
      title: 'Global Tech Expo 2026',
      slug: 'global-tech-expo-2026',
      description: 'The premier international technology and innovation trade show.',
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
    },
    {
      title: 'Mediccon Expo 2026',
      slug: 'mediccon-expo-2026',
      description: 'International Healthcare, Medical Devices & Surgical Equipment Trade Fair.',
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
    },
    {
      title: 'International Auto Expo 2026',
      slug: 'international-auto-expo-2026',
      description: "Asia's largest automotive technology, electric vehicles, and mobility exhibition.",
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
    },
    {
      title: 'Clean Energy & Sustainability Summit 2027',
      slug: 'clean-energy-summit-2027',
      description: 'Global renewable energy, solar power, and green tech conference & expo.',
      venue: 'Pragati Maidan Hall 5',
      city: 'New Delhi, DL',
      startDate: new Date('2027-01-15T09:00:00Z'),
      endDate: new Date('2027-01-18T18:00:00Z'),
      bookingEndDate: new Date('2027-01-05T23:59:59Z'),
      status: ExhibitionStatus.PUBLISHED,
      bannerUrl: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=1200',
      totalStalls: 14,
      edition: '2',
      eventCode: 'CE-02',
      spcode: 'CE02',
      notificationEmails: 'admin@buoyantmedia.com',
    },
  ];

  const stallsTemplate = [
    // Standard Stalls
    { stallNumber: 'A-101', category: 'STANDARD', price: 50000, areaSqFt: 100, xPosition: 50, yPosition: 50 },
    { stallNumber: 'A-102', category: 'STANDARD', price: 50000, areaSqFt: 100, xPosition: 180, yPosition: 50 },
    { stallNumber: 'A-103', category: 'STANDARD', price: 50000, areaSqFt: 100, xPosition: 310, yPosition: 50 },
    { stallNumber: 'A-104', category: 'STANDARD', price: 50000, areaSqFt: 100, xPosition: 440, yPosition: 50 },
    // Premium Stalls
    { stallNumber: 'B-201', category: 'PREMIUM', price: 75000, areaSqFt: 150, xPosition: 50, yPosition: 220 },
    { stallNumber: 'B-202', category: 'PREMIUM', price: 75000, areaSqFt: 150, xPosition: 220, yPosition: 220 },
    { stallNumber: 'B-203', category: 'PREMIUM', price: 75000, areaSqFt: 150, xPosition: 390, yPosition: 220 },
    { stallNumber: 'B-204', category: 'PREMIUM', price: 75000, areaSqFt: 150, xPosition: 560, yPosition: 220 },
    // Corner Stalls
    { stallNumber: 'C-301', category: 'CORNER', price: 90000, areaSqFt: 180, xPosition: 50, yPosition: 400 },
    { stallNumber: 'C-302', category: 'CORNER', price: 90000, areaSqFt: 180, xPosition: 250, yPosition: 400 },
    { stallNumber: 'C-303', category: 'CORNER', price: 90000, areaSqFt: 180, xPosition: 450, yPosition: 400 },
    // Island Stalls
    { stallNumber: 'VIP-01', category: 'ISLAND', price: 150000, areaSqFt: 300, xPosition: 750, yPosition: 50 },
    { stallNumber: 'VIP-02', category: 'ISLAND', price: 150000, areaSqFt: 300, xPosition: 750, yPosition: 280 },
    { stallNumber: 'VIP-03', category: 'ISLAND', price: 150000, areaSqFt: 300, xPosition: 750, yPosition: 510 },
  ];

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
          category: s.category as any,
          price: s.price,
          areaSqFt: s.areaSqFt,
          xPosition: s.xPosition,
          yPosition: s.yPosition,
          status: 'AVAILABLE',
        },
      });
    }
  }

  console.log('====================================================');
  console.log('🎉 4 Exhibition Events & Database Reset Successfully!');
  console.log('====================================================');
  console.log('Super Admin : superadmin@buoyantmedia.com / SuperAdminPassword123!');
  console.log('Admin User  : admin@buoyantmedia.com      / AdminPassword123!');
  console.log('Staff User  : staff@buoyantmedia.com      / StaffPassword123!');
  console.log('====================================================');
}

main()
  .catch((e) => {
    console.error('❌ Clear DB error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
