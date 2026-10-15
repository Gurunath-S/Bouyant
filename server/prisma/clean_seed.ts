import { PrismaClient, UserRole, ExhibitionStatus, StallCategory, StallStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('================================================================');
  console.log('🧹 CLEAN PRODUCTION-GRADE SEEDING PROCESS STARTED');
  console.log('================================================================');

  // 1. DELETE ALL TRANSACTIONAL AND DEMO DATA IN STRICT FOREIGN KEY ORDER
  console.log('🗑️  Deleting notifications, invoices, and payments...');
  await prisma.notification.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.payment.deleteMany({});

  console.log('🗑️  Deleting bookings & booking stall reservations...');
  await prisma.bookingStall.deleteMany({});
  await prisma.booking.deleteMany({});

  console.log('🗑️  Deleting previous stalls and floor plans...');
  await prisma.stall.deleteMany({});
  await prisma.floorPlan.deleteMany({});

  console.log('🗑️  Deleting previous exhibitions...');
  await prisma.exhibition.deleteMany({});

  console.log('🗑️  Unlinking users from companies and deleting demo companies...');
  await prisma.user.updateMany({
    data: { companyId: null },
  });
  await prisma.company.deleteMany({});

  console.log('🗑️  Purging demo client user accounts...');
  await prisma.user.deleteMany({
    where: {
      role: UserRole.CLIENT,
    },
  });

  // 2. PREPARE UNIVERSAL SECURE HASHES FOR ACCOUNTS
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 3. SEED ADMINISTRATIVE USERS (Superadmins, Admins, Staff)
  console.log('👑 Seeding Administrative Users (SuperAdmins, Admins, Staff)...');

  // SuperAdmins
  const superAdmin1 = await prisma.user.upsert({
    where: { email: 'superadmin@buoyantmedia.com' },
    update: {
      passwordHash,
      role: UserRole.SUPERADMIN,
      isActive: true,
      spcode: 'SA01',
    },
    create: {
      email: 'superadmin@buoyantmedia.com',
      passwordHash,
      username: 'superadmin',
      name: 'Platform Super Admin',
      phone: '+919876500001',
      role: UserRole.SUPERADMIN,
      spcode: 'SA01',
      pageAccess: [],
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'governance@buoyantmedia.com' },
    update: {
      passwordHash,
      role: UserRole.SUPERADMIN,
      isActive: true,
      spcode: 'SA02',
    },
    create: {
      email: 'governance@buoyantmedia.com',
      passwordHash,
      username: 'governance_admin',
      name: 'Governance & Compliance Lead',
      phone: '+919876500010',
      role: UserRole.SUPERADMIN,
      spcode: 'SA02',
      pageAccess: [],
      isActive: true,
    },
  });

  // Admins
  const primaryAdmin = await prisma.user.upsert({
    where: { email: 'admin@buoyantmedia.com' },
    update: {
      passwordHash,
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
      passwordHash,
      username: 'guru_bhai',
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

  const regionalAdmins = [
    { email: 'admin.mumbai@buoyantmedia.com', username: 'admin_mumbai', name: 'West Regional Admin', phone: '+919876500011', spcode: 'B002' },
    { email: 'admin.delhi@buoyantmedia.com', username: 'admin_delhi', name: 'North Regional Admin', phone: '+919876500012', spcode: 'B003' },
    { email: 'admin.bangalore@buoyantmedia.com', username: 'admin_bangalore', name: 'South Regional Admin', phone: '+919876500013', spcode: 'B004' },
  ];

  for (const adm of regionalAdmins) {
    await prisma.user.upsert({
      where: { email: adm.email },
      update: { passwordHash, role: UserRole.ADMIN, isActive: true },
      create: {
        email: adm.email,
        passwordHash,
        username: adm.username,
        name: adm.name,
        phone: adm.phone,
        role: UserRole.ADMIN,
        spcode: adm.spcode,
        pageAccess: [],
        isActive: true,
      },
    });
  }

  // Staff Users
  await prisma.user.upsert({
    where: { email: 'guruthedev20@gmail.com' },
    update: {
      passwordHash,
      role: UserRole.STAFF,
      isActive: true,
      pageAccess: [
        'dashboard',
        'event_register',
        'companies',
        'bookings',
        'payments',
      ],
    },
    create: {
      email: 'guruthedev20@gmail.com',
      passwordHash,
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

  const staffMembers = [
    { email: 'staff@buoyantmedia.com', username: 'staffops', name: 'Operations Staff', phone: '+919876500003', spcode: 'ST01' },
    { email: 'ops.rahul@buoyantmedia.com', username: 'ops_rahul', name: 'Rahul Varma (Ops)', phone: '+919876500021', spcode: 'ST02' },
    { email: 'ops.ananya@buoyantmedia.com', username: 'ops_ananya', name: 'Ananya Sen (Floor Mgr)', phone: '+919876500022', spcode: 'ST03' },
  ];

  for (const st of staffMembers) {
    await prisma.user.upsert({
      where: { email: st.email },
      update: { passwordHash, role: UserRole.STAFF, isActive: true },
      create: {
        email: st.email,
        passwordHash,
        username: st.username,
        name: st.name,
        phone: st.phone,
        role: UserRole.STAFF,
        spcode: st.spcode,
        pageAccess: [],
        isActive: true,
      },
    });
  }

  // 4. SEED ONE SINGLE EXAMPLE CLIENT ACCOUNT & REGISTERED COMPANY
  console.log('🏢 Seeding One Example Exhibitor Client Company & Account...');
  const sampleCompany = await prisma.company.create({
    data: {
      companyCode: 'CMP-1001',
      name: 'Acme Innovations & Technologies Pvt Ltd',
      contactPerson: 'Dr. Ramesh Kumar',
      mobile: '+919876543210',
      email: 'client@acmetech.com',
      address: 'Plot 42, Electronic City Phase 1',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560100',
      country: 'India',
      gstNumber: '29ABCDE1234F1Z5',
      panNumber: 'ABCDE1234F',
      industry: 'Healthcare & Medical Devices',
      website: 'https://acmetech.in',
      spcode: 'CMP01',
      regNo: 'REG-2026-001',
    },
  });

  await prisma.user.create({
    data: {
      email: 'client@acmetech.com',
      passwordHash,
      username: 'acme_client',
      name: 'Dr. Ramesh Kumar',
      phone: '+919876543210',
      role: UserRole.CLIENT,
      companyId: sampleCompany.id,
      pageAccess: [],
      isActive: true,
    },
  });

  const demoPasswordHash = await bcrypt.hash('DemoUser123!', 10);
  await prisma.user.create({
    data: {
      email: 'demo@buoyantmedia.com',
      passwordHash: demoPasswordHash,
      username: 'demo_user',
      name: 'Demo Exhibitor',
      phone: '+919876543210',
      role: UserRole.CLIENT,
      companyId: sampleCompany.id,
      pageAccess: [],
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      email: 'user@buoyantmedia.com',
      passwordHash: demoPasswordHash,
      username: 'client_user',
      name: 'Demo Client User',
      phone: '+919876500004',
      role: UserRole.CLIENT,
      companyId: sampleCompany.id,
      pageAccess: [],
      isActive: true,
    },
  });

  // 5. SEED ALL 4 CURRENT EVENTS WITH FLOOR PLANS & STALLS (ALL STALLS AVAILABLE)
  console.log('🎪 Seeding 4 Official Platform Exhibition Events, Floor Plans & Stalls...');

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
      createdByUserId: primaryAdmin.id,
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
      createdByUserId: primaryAdmin.id,
    },
    {
      title: 'International Auto Expo 2026',
      slug: 'international-auto-expo-2026',
      description: "Asia's largest automotive technology, electric vehicles, powertrain, and mobility exhibition.",
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
      createdByUserId: primaryAdmin.id,
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
      edition: '2',
      eventCode: 'CE-02',
      spcode: 'CE02',
      notificationEmails: 'admin@buoyantmedia.com',
      createdByUserId: primaryAdmin.id,
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
    }
  }

  console.log('\n================================================================');
  console.log('✅ DATABASE RESET & CLEAN SEED APPLIED SUCCESSFULLY!');
  console.log('================================================================');
  console.log('Summary:');
  console.log('• Exhibitions Seeded  : 4 Published Events');
  console.log('• Floor Plans Seeded  : 4 Published Hall Layouts');
  console.log('• Total Stalls Seeded : 56 (All 100% AVAILABLE)');
  console.log('• Bookings / Invoices : 0 (Clean Slate, No Demo Orders)');
  console.log('• Client Accounts     : 1 Example Exhibitor Account & Company');
  console.log('----------------------------------------------------------------');
  console.log('Credentials (Password: Password123! for all accounts):');
  console.log('1. Super Admin : superadmin@buoyantmedia.com  | Password123!');
  console.log('2. Super Admin : governance@buoyantmedia.com  | Password123!');
  console.log('3. Admin User  : admin@buoyantmedia.com       | Password123! (guru / AD01)');
  console.log('4. Staff User  : guruthedev20@gmail.com       | Password123! (gurunath / ST00)');
  console.log('5. Staff User  : staff@buoyantmedia.com       | Password123! (staffops / ST01)');
  console.log('6. Client User : client@acmetech.com          | Password123! (CMP-1001)');
  console.log('================================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Clean Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
