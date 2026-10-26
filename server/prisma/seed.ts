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
      totalStalls: 187,
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
      totalStalls: 187,
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
      totalStalls: 187,
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
      totalStalls: 187,
      edition: '02',
      eventCode: 'CE-02',
      spcode: 'CE02',
      notificationEmails: 'admin@buoyantmedia.com',
      createdByUserId: adminUser.id,
    },
  ];

  const stallsTemplate = [
    { stallNumber: "A-101", name: "Stall A-101", category: StallCategory.STANDARD, price: 50000, areaSqFt: 86, width: 40, height: 80, xPosition: 2050, yPosition: 570 },
    { stallNumber: "A-102", name: "Stall A-102", category: StallCategory.STANDARD, price: 50000, areaSqFt: 86, width: 40, height: 80, xPosition: 2050, yPosition: 650 },
    { stallNumber: "A-103", name: "Stall A-103", category: StallCategory.STANDARD, price: 50000, areaSqFt: 86, width: 40, height: 80, xPosition: 2050, yPosition: 730 },
    { stallNumber: "A-104", name: "Stall A-104", category: StallCategory.STANDARD, price: 50000, areaSqFt: 86, width: 40, height: 80, xPosition: 2050, yPosition: 810 },
    { stallNumber: "C-1", name: "Stall C-1", category: StallCategory.CORNER, price: 90000, areaSqFt: 339, width: 180, height: 70, xPosition: 300, yPosition: 650 },
    { stallNumber: "A-105", name: "Stall A-105", category: StallCategory.STANDARD, price: 50000, areaSqFt: 86, width: 40, height: 80, xPosition: 2050, yPosition: 890 },
    { stallNumber: "A-106", name: "Stall A-106", category: StallCategory.STANDARD, price: 50000, areaSqFt: 86, width: 40, height: 80, xPosition: 2050, yPosition: 960 },
    { stallNumber: "A-107", name: "Stall A-107", category: StallCategory.STANDARD, price: 50000, areaSqFt: 86, width: 40, height: 80, xPosition: 2050, yPosition: 1040 },
    { stallNumber: "A-108", name: "Stall A-108", category: StallCategory.STANDARD, price: 50000, areaSqFt: 86, width: 40, height: 80, xPosition: 2050, yPosition: 1120 },
    { stallNumber: "A-109", name: "Stall A-109", category: StallCategory.STANDARD, price: 50000, areaSqFt: 86, width: 40, height: 80, xPosition: 2050, yPosition: 1200 },
    { stallNumber: "A-110", name: "Stall A-110", category: StallCategory.STANDARD, price: 50000, areaSqFt: 86, width: 40, height: 80, xPosition: 2090, yPosition: 570 },
    { stallNumber: "A-111", name: "Stall A-111", category: StallCategory.STANDARD, price: 50000, areaSqFt: 86, width: 40, height: 80, xPosition: 2090, yPosition: 650 },
    { stallNumber: "A-112", name: "Stall A-112", category: StallCategory.STANDARD, price: 50000, areaSqFt: 86, width: 40, height: 80, xPosition: 2090, yPosition: 730 },
    { stallNumber: "A-113", name: "Stall A-113", category: StallCategory.STANDARD, price: 50000, areaSqFt: 86, width: 40, height: 80, xPosition: 2090, yPosition: 810 },
    { stallNumber: "A-114", name: "Stall A-114", category: StallCategory.STANDARD, price: 50000, areaSqFt: 86, width: 40, height: 80, xPosition: 2090, yPosition: 890 },
    { stallNumber: "A-115", name: "Stall A-115", category: StallCategory.STANDARD, price: 50000, areaSqFt: 86, width: 40, height: 80, xPosition: 2090, yPosition: 960 },
    { stallNumber: "A-116", name: "Stall A-116", category: StallCategory.STANDARD, price: 50000, areaSqFt: 86, width: 40, height: 80, xPosition: 2090, yPosition: 1040 },
    { stallNumber: "A-117", name: "Stall A-117", category: StallCategory.STANDARD, price: 50000, areaSqFt: 86, width: 40, height: 80, xPosition: 2090, yPosition: 1120 },
    { stallNumber: "A-118", name: "Stall A-118", category: StallCategory.STANDARD, price: 50000, areaSqFt: 86, width: 40, height: 80, xPosition: 2090, yPosition: 1200 },
    { stallNumber: "A-120", name: "Stall A-120", category: StallCategory.STANDARD, price: 50000, areaSqFt: 86, width: 40, height: 80, xPosition: 2190, yPosition: 650 },
    { stallNumber: "A-121", name: "Stall A-121", category: StallCategory.STANDARD, price: 50000, areaSqFt: 86, width: 40, height: 80, xPosition: 2190, yPosition: 730 },
    { stallNumber: "A-122", name: "Stall A-122", category: StallCategory.STANDARD, price: 50000, areaSqFt: 86, width: 40, height: 80, xPosition: 2190, yPosition: 810 },
    { stallNumber: "A-123", name: "Stall A-123", category: StallCategory.STANDARD, price: 50000, areaSqFt: 86, width: 40, height: 80, xPosition: 2190, yPosition: 880 },
    { stallNumber: "A-124", name: "Stall A-124", category: StallCategory.STANDARD, price: 50000, areaSqFt: 86, width: 40, height: 80, xPosition: 2190, yPosition: 960 },
    { stallNumber: "A-125", name: "Stall A-125", category: StallCategory.STANDARD, price: 50000, areaSqFt: 86, width: 40, height: 80, xPosition: 2190, yPosition: 1040 },
    { stallNumber: "A-126", name: "Stall A-126", category: StallCategory.STANDARD, price: 50000, areaSqFt: 86, width: 40, height: 80, xPosition: 2190, yPosition: 1120 },
    { stallNumber: "C-2", name: "Stall C-2", category: StallCategory.CORNER, price: 90000, areaSqFt: 358, width: 190, height: 70, xPosition: 610, yPosition: 650 },
    { stallNumber: "C-3", name: "Stall C-3", category: StallCategory.CORNER, price: 90000, areaSqFt: 490, width: 130, height: 140, xPosition: 420, yPosition: 880 },
    { stallNumber: "C-4", name: "Stall C-4", category: StallCategory.CORNER, price: 90000, areaSqFt: 490, width: 130, height: 140, xPosition: 610, yPosition: 880 },
    { stallNumber: "C-5", name: "Stall C-5", category: StallCategory.CORNER, price: 90000, areaSqFt: 490, width: 130, height: 140, xPosition: 740, yPosition: 880 },
    { stallNumber: "C-6", name: "Stall C-6", category: StallCategory.CORNER, price: 90000, areaSqFt: 242, width: 60, height: 150, xPosition: 1080, yPosition: 800 },
    { stallNumber: "C-7", name: "Stall C-7", category: StallCategory.CORNER, price: 90000, areaSqFt: 242, width: 60, height: 150, xPosition: 1080, yPosition: 1100 },
    { stallNumber: "C-8", name: "Stall C-8", category: StallCategory.CORNER, price: 90000, areaSqFt: 560, width: 130, height: 160, xPosition: 230, yPosition: 1090 },
    { stallNumber: "C-9", name: "Stall C-9", category: StallCategory.CORNER, price: 90000, areaSqFt: 560, width: 130, height: 160, xPosition: 360, yPosition: 1090 },
    { stallNumber: "C-10", name: "Stall C-10", category: StallCategory.CORNER, price: 90000, areaSqFt: 560, width: 130, height: 160, xPosition: 550, yPosition: 1090 },
    { stallNumber: "C-11", name: "Stall C-11", category: StallCategory.CORNER, price: 90000, areaSqFt: 1009, width: 250, height: 150, xPosition: 300, yPosition: 1320 },
    { stallNumber: "C-12", name: "Stall C-12", category: StallCategory.CORNER, price: 90000, areaSqFt: 525, width: 130, height: 150, xPosition: 610, yPosition: 1320 },
    { stallNumber: "C-13", name: "Stall C-13", category: StallCategory.CORNER, price: 90000, areaSqFt: 525, width: 130, height: 150, xPosition: 740, yPosition: 1320 },
    { stallNumber: "C-14", name: "Stall C-14", category: StallCategory.CORNER, price: 90000, areaSqFt: 767, width: 190, height: 150, xPosition: 240, yPosition: 1550 },
    { stallNumber: "C-15", name: "Stall C-15", category: StallCategory.CORNER, price: 90000, areaSqFt: 1049, width: 260, height: 150, xPosition: 480, yPosition: 1550 },
    { stallNumber: "C-16", name: "Stall C-16", category: StallCategory.CORNER, price: 90000, areaSqFt: 1049, width: 260, height: 150, xPosition: 800, yPosition: 1550 },
    { stallNumber: "C-17", name: "Stall C-17", category: StallCategory.CORNER, price: 90000, areaSqFt: 517, width: 120, height: 160, xPosition: 990, yPosition: 1320 },
    { stallNumber: "C-18", name: "Stall C-18", category: StallCategory.CORNER, price: 90000, areaSqFt: 242, width: 60, height: 150, xPosition: 1160, yPosition: 1020 },
    { stallNumber: "C-19", name: "Stall C-19", category: StallCategory.CORNER, price: 90000, areaSqFt: 242, width: 60, height: 150, xPosition: 1290, yPosition: 1020 },
    { stallNumber: "C-20", name: "Stall C-20", category: StallCategory.CORNER, price: 90000, areaSqFt: 242, width: 60, height: 150, xPosition: 1350, yPosition: 1020 },
    { stallNumber: "C-21", name: "Stall C-21", category: StallCategory.CORNER, price: 90000, areaSqFt: 484, width: 120, height: 150, xPosition: 1480, yPosition: 1020 },
    { stallNumber: "C-22", name: "Stall C-22", category: StallCategory.CORNER, price: 90000, areaSqFt: 242, width: 60, height: 150, xPosition: 1480, yPosition: 870 },
    { stallNumber: "C-23", name: "Stall C-23", category: StallCategory.CORNER, price: 90000, areaSqFt: 242, width: 60, height: 150, xPosition: 1540, yPosition: 870 },
    { stallNumber: "C-24", name: "Stall C-24", category: StallCategory.CORNER, price: 90000, areaSqFt: 242, width: 60, height: 150, xPosition: 1290, yPosition: 800 },
    { stallNumber: "C-25", name: "Stall C-25", category: StallCategory.CORNER, price: 90000, areaSqFt: 242, width: 60, height: 150, xPosition: 1350, yPosition: 800 },
    { stallNumber: "C-26", name: "Stall C-26", category: StallCategory.CORNER, price: 90000, areaSqFt: 484, width: 120, height: 150, xPosition: 1290, yPosition: 650 },
    { stallNumber: "C-27", name: "Stall C-27", category: StallCategory.CORNER, price: 90000, areaSqFt: 484, width: 120, height: 150, xPosition: 1290, yPosition: 280 },
    { stallNumber: "C-28", name: "Stall C-28", category: StallCategory.CORNER, price: 90000, areaSqFt: 484, width: 120, height: 150, xPosition: 1290, yPosition: 430 },
    { stallNumber: "C-29", name: "Stall C-29", category: StallCategory.CORNER, price: 90000, areaSqFt: 484, width: 120, height: 150, xPosition: 1670, yPosition: 280 },
    { stallNumber: "C-30", name: "Stall C-30", category: StallCategory.CORNER, price: 90000, areaSqFt: 113, width: 60, height: 70, xPosition: 1480, yPosition: 730 },
    { stallNumber: "C-31", name: "Stall C-31", category: StallCategory.CORNER, price: 90000, areaSqFt: 113, width: 60, height: 70, xPosition: 1540, yPosition: 730 },
    { stallNumber: "C-32", name: "Stall C-32", category: StallCategory.CORNER, price: 90000, areaSqFt: 242, width: 60, height: 150, xPosition: 1670, yPosition: 500 },
    { stallNumber: "C-33", name: "Stall C-33", category: StallCategory.CORNER, price: 90000, areaSqFt: 242, width: 60, height: 150, xPosition: 1730, yPosition: 500 },
    { stallNumber: "C-34", name: "Stall C-34", category: StallCategory.CORNER, price: 90000, areaSqFt: 113, width: 60, height: 70, xPosition: 1860, yPosition: 880 },
    { stallNumber: "C-35", name: "Stall C-35", category: StallCategory.CORNER, price: 90000, areaSqFt: 113, width: 60, height: 70, xPosition: 1920, yPosition: 880 },
    { stallNumber: "C-36", name: "Stall C-36", category: StallCategory.CORNER, price: 90000, areaSqFt: 113, width: 60, height: 70, xPosition: 1860, yPosition: 1020 },
    { stallNumber: "C-37", name: "Stall C-37", category: StallCategory.CORNER, price: 90000, areaSqFt: 113, width: 60, height: 70, xPosition: 1920, yPosition: 1020 },
    { stallNumber: "C-38", name: "Stall C-38", category: StallCategory.CORNER, price: 90000, areaSqFt: 113, width: 60, height: 70, xPosition: 1860, yPosition: 1090 },
    { stallNumber: "C-39", name: "Stall C-39", category: StallCategory.CORNER, price: 90000, areaSqFt: 113, width: 60, height: 70, xPosition: 1920, yPosition: 1090 },
    { stallNumber: "C-40", name: "Stall C-40", category: StallCategory.CORNER, price: 90000, areaSqFt: 75, width: 40, height: 70, xPosition: 2050, yPosition: 280 },
    { stallNumber: "C-41", name: "Stall C-41", category: StallCategory.CORNER, price: 90000, areaSqFt: 75, width: 40, height: 70, xPosition: 2090, yPosition: 280 },
    { stallNumber: "C-42", name: "Stall C-42", category: StallCategory.CORNER, price: 90000, areaSqFt: 75, width: 40, height: 70, xPosition: 2050, yPosition: 350 },
    { stallNumber: "C-43", name: "Stall C-43", category: StallCategory.CORNER, price: 90000, areaSqFt: 75, width: 40, height: 70, xPosition: 2090, yPosition: 350 },
    { stallNumber: "C-44", name: "Stall C-44", category: StallCategory.CORNER, price: 90000, areaSqFt: 75, width: 40, height: 70, xPosition: 2050, yPosition: 500 },
    { stallNumber: "C-45", name: "Stall C-45", category: StallCategory.CORNER, price: 90000, areaSqFt: 75, width: 40, height: 70, xPosition: 2090, yPosition: 500 },
    { stallNumber: "C-46", name: "Stall C-46", category: StallCategory.CORNER, price: 90000, areaSqFt: 75, width: 40, height: 70, xPosition: 2190, yPosition: 350 },
    { stallNumber: "C-47", name: "Stall C-47", category: StallCategory.CORNER, price: 90000, areaSqFt: 75, width: 40, height: 70, xPosition: 2190, yPosition: 580 },
    { stallNumber: "P-1", name: "Stall P-1", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1670, yPosition: 650 },
    { stallNumber: "P-2", name: "Stall P-2", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1730, yPosition: 650 },
    { stallNumber: "P-3", name: "Stall P-3", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1670, yPosition: 730 },
    { stallNumber: "P-4", name: "Stall P-4", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1730, yPosition: 730 },
    { stallNumber: "P-5", name: "Stall P-5", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1670, yPosition: 800 },
    { stallNumber: "P-6", name: "Stall P-6", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1730, yPosition: 800 },
    { stallNumber: "P-7", name: "Stall P-7", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1670, yPosition: 880 },
    { stallNumber: "P-8", name: "Stall P-8", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1730, yPosition: 880 },
    { stallNumber: "P-9", name: "Stall P-9", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1670, yPosition: 950 },
    { stallNumber: "P-10", name: "Stall P-10", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1730, yPosition: 950 },
    { stallNumber: "P-11", name: "Stall P-11", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1670, yPosition: 1030 },
    { stallNumber: "P-12", name: "Stall P-12", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1730, yPosition: 1030 },
    { stallNumber: "P-13", name: "Stall P-13", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1670, yPosition: 1100 },
    { stallNumber: "P-14", name: "Stall P-14", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1730, yPosition: 1100 },
    { stallNumber: "P-15", name: "Stall P-15", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1670, yPosition: 1180 },
    { stallNumber: "P-16", name: "Stall P-16", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1730, yPosition: 1180 },
    { stallNumber: "P-17", name: "Stall P-17", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1350, yPosition: 1170 },
    { stallNumber: "P-18", name: "Stall P-18", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1420, yPosition: 1260 },
    { stallNumber: "P-19", name: "Stall P-19", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1480, yPosition: 1260 },
    { stallNumber: "P-20", name: "Stall P-20", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1540, yPosition: 1260 },
    { stallNumber: "P-21", name: "Stall P-21", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1600, yPosition: 1260 },
    { stallNumber: "P-22", name: "Stall P-22", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1800, yPosition: 1260 },
    { stallNumber: "P-23", name: "Stall P-23", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1860, yPosition: 1260 },
    { stallNumber: "P-24", name: "Stall P-24", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1920, yPosition: 1260 },
    { stallNumber: "P-25", name: "Stall P-25", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1980, yPosition: 1260 },
    { stallNumber: "P-26", name: "Stall P-26", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1860, yPosition: 730 },
    { stallNumber: "P-27", name: "Stall P-27", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1920, yPosition: 730 },
    { stallNumber: "P-28", name: "Stall P-28", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1860, yPosition: 800 },
    { stallNumber: "P-29", name: "Stall P-29", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1920, yPosition: 800 },
    { stallNumber: "P-30", name: "Stall P-30", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1860, yPosition: 580 },
    { stallNumber: "P-31", name: "Stall P-31", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1920, yPosition: 580 },
    { stallNumber: "P-32", name: "Stall P-32", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1860, yPosition: 650 },
    { stallNumber: "P-33", name: "Stall P-33", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1920, yPosition: 650 },
    { stallNumber: "P-34", name: "Stall P-34", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1860, yPosition: 420 },
    { stallNumber: "P-35", name: "Stall P-35", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1920, yPosition: 420 },
    { stallNumber: "P-36", name: "Stall P-36", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1860, yPosition: 500 },
    { stallNumber: "P-37", name: "Stall P-37", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1920, yPosition: 500 },
    { stallNumber: "P-38", name: "Stall P-38", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1860, yPosition: 280 },
    { stallNumber: "P-39", name: "Stall P-39", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1920, yPosition: 280 },
    { stallNumber: "P-40", name: "Stall P-40", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1860, yPosition: 350 },
    { stallNumber: "P-41", name: "Stall P-41", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1920, yPosition: 350 },
    { stallNumber: "P-44", name: "Stall P-44", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1860, yPosition: 210 },
    { stallNumber: "P-45", name: "Stall P-45", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1920, yPosition: 210 },
    { stallNumber: "P-46", name: "Stall P-46", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1990, yPosition: 130 },
    { stallNumber: "P-47", name: "Stall P-47", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 2050, yPosition: 130 },
    { stallNumber: "P-48", name: "Stall P-48", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 2110, yPosition: 130 },
    { stallNumber: "P-49", name: "Stall P-49", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1600, yPosition: 130 },
    { stallNumber: "P-50", name: "Stall P-50", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1660, yPosition: 130 },
    { stallNumber: "P-51", name: "Stall P-51", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1720, yPosition: 130 },
    { stallNumber: "P-52", name: "Stall P-52", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1790, yPosition: 130 },
    { stallNumber: "P-42", name: "Stall P-42", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1480, yPosition: 430 },
    { stallNumber: "P-43", name: "Stall P-43", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1540, yPosition: 430 },
    { stallNumber: "P-53", name: "Stall P-53", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1480, yPosition: 270 },
    { stallNumber: "P-54", name: "Stall P-54", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1540, yPosition: 270 },
    { stallNumber: "P-55", name: "Stall P-55", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1480, yPosition: 350 },
    { stallNumber: "P-56", name: "Stall P-56", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1540, yPosition: 350 },
    { stallNumber: "P-57", name: "Stall P-57", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1480, yPosition: 200 },
    { stallNumber: "P-58", name: "Stall P-58", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1540, yPosition: 200 },
    { stallNumber: "P-59", name: "Stall P-59", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1480, yPosition: 580 },
    { stallNumber: "P-60", name: "Stall P-60", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1540, yPosition: 580 },
    { stallNumber: "P-61", name: "Stall P-61", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1480, yPosition: 510 },
    { stallNumber: "P-62", name: "Stall P-62", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1540, yPosition: 510 },
    { stallNumber: "P-63", name: "Stall P-63", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1480, yPosition: 650 },
    { stallNumber: "P-64", name: "Stall P-64", category: StallCategory.PREMIUM, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 1540, yPosition: 650 },
    { stallNumber: "A-127", name: "Stall A-127", category: StallCategory.STANDARD, price: 50000, areaSqFt: 86, width: 40, height: 80, xPosition: 2190, yPosition: 200 },
    { stallNumber: "A-128", name: "Stall A-128", category: StallCategory.STANDARD, price: 50000, areaSqFt: 86, width: 40, height: 80, xPosition: 2190, yPosition: 280 },
    { stallNumber: "C-48", name: "Stall C-48", category: StallCategory.CORNER, price: 90000, areaSqFt: 538, width: 250, height: 80, xPosition: 800, yPosition: 1770 },
    { stallNumber: "I-1", name: "Stall I-1", category: StallCategory.ISLAND, price: 50000, areaSqFt: 245, width: 130, height: 70, xPosition: 170, yPosition: 650 },
    { stallNumber: "I-2", name: "Stall I-2", category: StallCategory.ISLAND, price: 50000, areaSqFt: 226, width: 60, height: 140, xPosition: 110, yPosition: 730 },
    { stallNumber: "I-3", name: "Stall I-3", category: StallCategory.ISLAND, price: 50000, areaSqFt: 226, width: 60, height: 140, xPosition: 110, yPosition: 1030 },
    { stallNumber: "I-4", name: "Stall I-4", category: StallCategory.ISLAND, price: 50000, areaSqFt: 226, width: 60, height: 140, xPosition: 110, yPosition: 1180 },
    { stallNumber: "I-15", name: "Stall I-15", category: StallCategory.ISLAND, price: 50000, areaSqFt: 258, width: 60, height: 160, xPosition: 930, yPosition: 790 },
    { stallNumber: "I-16", name: "Stall I-16", category: StallCategory.ISLAND, price: 50000, areaSqFt: 242, width: 60, height: 150, xPosition: 930, yPosition: 950 },
    { stallNumber: "I-17", name: "Stall I-17", category: StallCategory.ISLAND, price: 50000, areaSqFt: 242, width: 60, height: 150, xPosition: 930, yPosition: 1100 },
    { stallNumber: "I-18", name: "Stall I-18", category: StallCategory.ISLAND, price: 50000, areaSqFt: 226, width: 60, height: 140, xPosition: 930, yPosition: 1250 },
    { stallNumber: "I-19", name: "Stall I-19", category: StallCategory.ISLAND, price: 50000, areaSqFt: 258, width: 60, height: 160, xPosition: 930, yPosition: 1390 },
    { stallNumber: "I-5", name: "Stall I-5", category: StallCategory.ISLAND, price: 50000, areaSqFt: 226, width: 60, height: 140, xPosition: 110, yPosition: 1470 },
    { stallNumber: "I-6", name: "Stall I-6", category: StallCategory.ISLAND, price: 50000, areaSqFt: 210, width: 130, height: 60, xPosition: 170, yPosition: 880 },
    { stallNumber: "I-7", name: "Stall I-7", category: StallCategory.ISLAND, price: 50000, areaSqFt: 208, width: 121, height: 64, xPosition: 300, yPosition: 878 },
    { stallNumber: "I-8", name: "Stall I-8", category: StallCategory.ISLAND, price: 50000, areaSqFt: 226, width: 120, height: 70, xPosition: 300, yPosition: 950 },
    { stallNumber: "I-9", name: "Stall I-9", category: StallCategory.ISLAND, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 172, yPosition: 948 },
    { stallNumber: "I-10", name: "Stall I-10", category: StallCategory.ISLAND, price: 50000, areaSqFt: 113, width: 60, height: 70, xPosition: 240, yPosition: 950 },
    { stallNumber: "I-11", name: "Stall I-11", category: StallCategory.ISLAND, price: 50000, areaSqFt: 226, width: 120, height: 70, xPosition: 680, yPosition: 1100 },
    { stallNumber: "I-12", name: "Stall I-12", category: StallCategory.ISLAND, price: 50000, areaSqFt: 226, width: 120, height: 70, xPosition: 800, yPosition: 1100 },
    { stallNumber: "I-13", name: "Stall I-13", category: StallCategory.ISLAND, price: 50000, areaSqFt: 226, width: 120, height: 70, xPosition: 680, yPosition: 1180 },
    { stallNumber: "I-14", name: "Stall I-14", category: StallCategory.ISLAND, price: 50000, areaSqFt: 226, width: 120, height: 70, xPosition: 800, yPosition: 1180 },
    { stallNumber: "I-20", name: "Stall I-20", category: StallCategory.ISLAND, price: 50000, areaSqFt: 245, width: 130, height: 70, xPosition: 170, yPosition: 1330 },
    { stallNumber: "I-21", name: "Stall I-21", category: StallCategory.ISLAND, price: 50000, areaSqFt: 245, width: 130, height: 70, xPosition: 170, yPosition: 1400 },
    { stallNumber: "I-22", name: "Stall I-22", category: StallCategory.ISLAND, price: 50000, areaSqFt: 245, width: 130, height: 70, xPosition: 170, yPosition: 1770 },
    { stallNumber: "I-23", name: "Stall I-23", category: StallCategory.ISLAND, price: 50000, areaSqFt: 245, width: 130, height: 70, xPosition: 300, yPosition: 1770 },
    { stallNumber: "I-24", name: "Stall I-24", category: StallCategory.ISLAND, price: 50000, areaSqFt: 245, width: 130, height: 70, xPosition: 430, yPosition: 1770 },
    { stallNumber: "I-25", name: "Stall I-25", category: StallCategory.ISLAND, price: 50000, areaSqFt: 245, width: 130, height: 70, xPosition: 560, yPosition: 1770 },
    { stallNumber: "I-26", name: "Stall I-26", category: StallCategory.ISLAND, price: 50000, areaSqFt: 207, width: 110, height: 70, xPosition: 690, yPosition: 1770 },
    { stallNumber: "I-27", name: "Stall I-27", category: StallCategory.ISLAND, price: 50000, areaSqFt: 242, width: 60, height: 150, xPosition: 110, yPosition: 1620 },
    { stallNumber: "I-28", name: "Stall I-28", category: StallCategory.ISLAND, price: 50000, areaSqFt: 245, width: 130, height: 70, xPosition: 800, yPosition: 650 },
    { stallNumber: "I-29", name: "Stall I-29", category: StallCategory.ISLAND, price: 50000, areaSqFt: 245, width: 130, height: 70, xPosition: 930, yPosition: 650 },
    { stallNumber: "I-30", name: "Stall I-30", category: StallCategory.ISLAND, price: 50000, areaSqFt: 242, width: 60, height: 150, xPosition: 1080, yPosition: 950 },
    { stallNumber: "I-31", name: "Stall I-31", category: StallCategory.ISLAND, price: 50000, areaSqFt: 242, width: 60, height: 150, xPosition: 1160, yPosition: 870 },
    { stallNumber: "I-32", name: "Stall I-32", category: StallCategory.ISLAND, price: 50000, areaSqFt: 242, width: 60, height: 150, xPosition: 1160, yPosition: 720 },
    { stallNumber: "I-33", name: "Stall I-33", category: StallCategory.ISLAND, price: 50000, areaSqFt: 242, width: 60, height: 150, xPosition: 1160, yPosition: 580 },
    { stallNumber: "I-34", name: "Stall I-34", category: StallCategory.ISLAND, price: 50000, areaSqFt: 242, width: 60, height: 150, xPosition: 1160, yPosition: 430 },
    { stallNumber: "I-35", name: "Stall I-35", category: StallCategory.ISLAND, price: 50000, areaSqFt: 242, width: 60, height: 150, xPosition: 1160, yPosition: 280 },
    { stallNumber: "I-36", name: "Stall I-36", category: StallCategory.ISLAND, price: 50000, areaSqFt: 129, width: 60, height: 80, xPosition: 1160, yPosition: 200 },
    { stallNumber: "I-37", name: "Stall I-37", category: StallCategory.ISLAND, price: 50000, areaSqFt: 280, width: 130, height: 80, xPosition: 1220, yPosition: 120 },
    { stallNumber: "I-38", name: "Stall I-38", category: StallCategory.ISLAND, price: 50000, areaSqFt: 242, width: 60, height: 150, xPosition: 1290, yPosition: 1170 },
    { stallNumber: "F-1", name: "Stall F-1", category: StallCategory.STANDARD, price: 50000, areaSqFt: 129, width: 60, height: 80, xPosition: 2280, yPosition: 190 },
    { stallNumber: "F-2", name: "Stall F-2", category: StallCategory.STANDARD, price: 50000, areaSqFt: 129, width: 60, height: 80, xPosition: 2350, yPosition: 190 },
    { stallNumber: "F-3", name: "Stall F-3", category: StallCategory.STANDARD, price: 50000, areaSqFt: 129, width: 60, height: 80, xPosition: 2420, yPosition: 190 },
    { stallNumber: "F-4", name: "Stall F-4", category: StallCategory.STANDARD, price: 50000, areaSqFt: 129, width: 60, height: 80, xPosition: 2420, yPosition: 270 },
    { stallNumber: "F-5", name: "Stall F-5", category: StallCategory.STANDARD, price: 50000, areaSqFt: 129, width: 60, height: 80, xPosition: 2420, yPosition: 350 },
    { stallNumber: "F-6", name: "Stall F-6", category: StallCategory.STANDARD, price: 50000, areaSqFt: 129, width: 60, height: 80, xPosition: 2420, yPosition: 430 },
    { stallNumber: "F-7", name: "Stall F-7", category: StallCategory.STANDARD, price: 50000, areaSqFt: 129, width: 60, height: 80, xPosition: 2420, yPosition: 510 },
    { stallNumber: "F-8", name: "Stall F-8", category: StallCategory.STANDARD, price: 50000, areaSqFt: 129, width: 60, height: 80, xPosition: 2420, yPosition: 590 },
    { stallNumber: "F-9", name: "Stall F-9", category: StallCategory.STANDARD, price: 50000, areaSqFt: 129, width: 60, height: 80, xPosition: 2420, yPosition: 670 },
    { stallNumber: "F-10", name: "Stall F-10", category: StallCategory.STANDARD, price: 50000, areaSqFt: 129, width: 60, height: 80, xPosition: 2420, yPosition: 750 },
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
        width: 3200,
        height: 2000,
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
          name: s.name,
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
