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

interface StallConfig {
  stallNumber: string;
  name: string;
  category: StallCategory;
  price: number;
  areaSqFt: number;
  width: number;
  height: number;
  xPosition: number;
  yPosition: number;
}

// 1. Generate Global Tech Expo 2026 stalls (60 stalls)
function generateTechExpoStalls(): StallConfig[] {
  const stalls: StallConfig[] = [];

  // Top Row: TECH-A01 to TECH-A10 (Standard)
  for (let i = 1; i <= 10; i++) {
    stalls.push({
      stallNumber: `TECH-A${i < 10 ? '0' + i : i}`,
      name: `Tech Startup Pod A${i}`,
      category: StallCategory.STANDARD,
      price: 50000,
      areaSqFt: 100,
      width: 70,
      height: 65,
      xPosition: 120 + (i - 1) * 90,
      yPosition: 80,
    });
  }

  // Left Column: TECH-C01 to TECH-C05 (Corner)
  for (let i = 1; i <= 5; i++) {
    stalls.push({
      stallNumber: `TECH-C0${i}`,
      name: `Corner AI Lab C${i}`,
      category: StallCategory.CORNER,
      price: 90000,
      areaSqFt: 150,
      width: 85,
      height: 75,
      xPosition: 120,
      yPosition: 180 + (i - 1) * 95,
    });
  }

  // Right Column: TECH-C06 to TECH-C10 (Corner)
  for (let i = 6; i <= 10; i++) {
    stalls.push({
      stallNumber: `TECH-C${i < 10 ? '0' + i : i}`,
      name: `Corner Cyber Pavilion C${i}`,
      category: StallCategory.CORNER,
      price: 90000,
      areaSqFt: 150,
      width: 85,
      height: 75,
      xPosition: 935,
      yPosition: 180 + (i - 6) * 95,
    });
  }

  // Center Islands: 2 Grand Tech Island Stages
  stalls.push({
    stallNumber: 'TECH-ISL-01',
    name: 'Cloud & AI Innovation Arena 1',
    category: StallCategory.ISLAND,
    price: 160000,
    areaSqFt: 400,
    width: 170,
    height: 150,
    xPosition: 330,
    yPosition: 260,
  });

  stalls.push({
    stallNumber: 'TECH-ISL-02',
    name: 'Enterprise BigData Arena 2',
    category: StallCategory.ISLAND,
    price: 160000,
    areaSqFt: 400,
    width: 170,
    height: 150,
    xPosition: 640,
    yPosition: 260,
  });

  // Middle Top Row: TECH-A11 to TECH-A16 (Standard)
  for (let i = 1; i <= 6; i++) {
    const num = 10 + i;
    stalls.push({
      stallNumber: `TECH-A${num}`,
      name: `SaaS Pavilion A${num}`,
      category: StallCategory.STANDARD,
      price: 50000,
      areaSqFt: 100,
      width: 70,
      height: 65,
      xPosition: 300 + (i - 1) * 90,
      yPosition: 170,
    });
  }

  // Middle Bottom Row: TECH-A17 to TECH-A22 (Standard)
  for (let i = 1; i <= 6; i++) {
    const num = 16 + i;
    stalls.push({
      stallNumber: `TECH-A${num}`,
      name: `DevOps Pavilion A${num}`,
      category: StallCategory.STANDARD,
      price: 50000,
      areaSqFt: 100,
      width: 70,
      height: 65,
      xPosition: 300 + (i - 1) * 90,
      yPosition: 440,
    });
  }

  // Bottom Row: TECH-P01 to TECH-P10 (Premium)
  for (let i = 1; i <= 10; i++) {
    stalls.push({
      stallNumber: `TECH-P${i < 10 ? '0' + i : i}`,
      name: `Enterprise Suite P${i}`,
      category: StallCategory.PREMIUM,
      price: 75000,
      areaSqFt: 130,
      width: 80,
      height: 70,
      xPosition: 120 + (i - 1) * 90,
      yPosition: 535,
    });
  }

  // Far Bottom Row: TECH-P11 to TECH-P20 (Premium)
  for (let i = 1; i <= 10; i++) {
    const num = 10 + i;
    stalls.push({
      stallNumber: `TECH-P${num}`,
      name: `FinTech Suite P${num}`,
      category: StallCategory.PREMIUM,
      price: 75000,
      areaSqFt: 130,
      width: 80,
      height: 70,
      xPosition: 120 + (i - 1) * 90,
      yPosition: 625,
    });
  }

  return stalls;
}

// 2. Generate Mediccon Expo 2026 stalls (72 stalls)
function generateMedicconStalls(): StallConfig[] {
  const stalls: StallConfig[] = [];

  // Top Row: MED-A01 to MED-A12 (Pharma Standard)
  for (let i = 1; i <= 12; i++) {
    stalls.push({
      stallNumber: `MED-A${i < 10 ? '0' + i : i}`,
      name: `Pharma Research A${i}`,
      category: StallCategory.STANDARD,
      price: 45000,
      areaSqFt: 90,
      width: 65,
      height: 60,
      xPosition: 90 + (i - 1) * 85,
      yPosition: 70,
    });
  }

  // 4 VIP Medical Diagnostics Island Pavilions
  const islands = [
    { num: 'MED-VIP-01', name: 'MRI & Imaging Pavilion', x: 250, y: 180 },
    { num: 'MED-VIP-02', name: 'Surgical Robotics Pavilion', x: 650, y: 180 },
    { num: 'MED-VIP-03', name: 'Cardiology Devices Pavilion', x: 250, y: 360 },
    { num: 'MED-VIP-04', name: 'Genomics & Biotech Pavilion', x: 650, y: 360 },
  ];
  for (const isl of islands) {
    stalls.push({
      stallNumber: isl.num,
      name: isl.name,
      category: StallCategory.ISLAND,
      price: 140000,
      areaSqFt: 350,
      width: 150,
      height: 120,
      xPosition: isl.x,
      yPosition: isl.y,
    });
  }

  // Left Wing: MED-C01 to MED-C07 (Corner Suites)
  for (let i = 1; i <= 7; i++) {
    stalls.push({
      stallNumber: `MED-C0${i}`,
      name: `Diagnostics Suite C0${i}`,
      category: StallCategory.CORNER,
      price: 85000,
      areaSqFt: 140,
      width: 75,
      height: 70,
      xPosition: 90,
      yPosition: 160 + (i - 1) * 80,
    });
  }

  // Right Wing: MED-C08 to MED-C14 (Corner Suites)
  for (let i = 8; i <= 14; i++) {
    stalls.push({
      stallNumber: `MED-C${i < 10 ? '0' + i : i}`,
      name: `Ortho Devices C${i}`,
      category: StallCategory.CORNER,
      price: 85000,
      areaSqFt: 140,
      width: 75,
      height: 70,
      xPosition: 970,
      yPosition: 160 + (i - 8) * 80,
    });
  }

  // Center Inner Columns: MED-B01 to MED-B12 (Premium Equipment)
  for (let i = 1; i <= 6; i++) {
    stalls.push({
      stallNumber: `MED-B0${i}`,
      name: `Hospital Beds & ICU B0${i}`,
      category: StallCategory.PREMIUM,
      price: 65000,
      areaSqFt: 120,
      width: 75,
      height: 60,
      xPosition: 440,
      yPosition: 160 + (i - 1) * 75,
    });
  }
  for (let i = 7; i <= 12; i++) {
    stalls.push({
      stallNumber: `MED-B${i < 10 ? '0' + i : i}`,
      name: `Surgical Instruments B${i}`,
      category: StallCategory.PREMIUM,
      price: 65000,
      areaSqFt: 120,
      width: 75,
      height: 60,
      xPosition: 535,
      yPosition: 160 + (i - 7) * 75,
    });
  }

  // Bottom Row 1: MED-B13 to MED-B24 (Premium Clinic Equipment)
  for (let i = 13; i <= 24; i++) {
    stalls.push({
      stallNumber: `MED-B${i}`,
      name: `Dental & Eye Equipment B${i}`,
      category: StallCategory.PREMIUM,
      price: 65000,
      areaSqFt: 120,
      width: 65,
      height: 60,
      xPosition: 90 + (i - 13) * 80,
      yPosition: 540,
    });
  }

  // Bottom Row 2: MED-A13 to MED-A30 (Standard Biotech)
  for (let i = 13; i <= 30; i++) {
    stalls.push({
      stallNumber: `MED-A${i}`,
      name: `Laboratory Glassware A${i}`,
      category: StallCategory.STANDARD,
      price: 45000,
      areaSqFt: 90,
      width: 60,
      height: 55,
      xPosition: 90 + ((i - 13) % 12) * 80,
      yPosition: i <= 24 ? 620 : 690,
    });
  }

  return stalls;
}

// 3. Generate International Auto Expo 2026 stalls (44 stalls)
function generateAutoExpoStalls(): StallConfig[] {
  const stalls: StallConfig[] = [];

  // 6 Massive OEM & EV Launch Island Arenas
  const autoIslands = [
    { num: 'AUTO-EV-01', name: 'Tesla & Next-Gen EV Arena', x: 120, y: 100 },
    { num: 'AUTO-EV-02', name: 'BMW Electric Pavilion', x: 440, y: 100 },
    { num: 'AUTO-EV-03', name: 'Mercedes-Benz EQ Launchpad', x: 760, y: 100 },
    { num: 'AUTO-EV-04', name: 'Tata Motors EV World', x: 120, y: 320 },
    { num: 'AUTO-EV-05', name: 'Hyundai Ioniq Experience', x: 440, y: 320 },
    { num: 'AUTO-EV-06', name: 'Mahindra Born Electric', x: 760, y: 320 },
  ];
  for (const isl of autoIslands) {
    stalls.push({
      stallNumber: isl.num,
      name: isl.name,
      category: StallCategory.ISLAND,
      price: 220000,
      areaSqFt: 500,
      width: 220,
      height: 160,
      xPosition: isl.x,
      yPosition: isl.y,
    });
  }

  // 10 Corner Concept & Supercar Lounges
  for (let i = 1; i <= 5; i++) {
    stalls.push({
      stallNumber: `AUTO-C0${i}`,
      name: `Hypercar Lounge C0${i}`,
      category: StallCategory.CORNER,
      price: 110000,
      areaSqFt: 250,
      width: 100,
      height: 85,
      xPosition: 1050,
      yPosition: 80 + (i - 1) * 110,
    });
  }
  for (let i = 6; i <= 10; i++) {
    stalls.push({
      stallNumber: `AUTO-C${i < 10 ? '0' + i : i}`,
      name: `Autonomous Driving Tech C${i}`,
      category: StallCategory.CORNER,
      price: 110000,
      areaSqFt: 250,
      width: 100,
      height: 85,
      xPosition: 1180,
      yPosition: 80 + (i - 6) * 110,
    });
  }

  // 14 Premium OEM Tier-1 Component Stalls
  for (let i = 1; i <= 14; i++) {
    stalls.push({
      stallNumber: `AUTO-P${i < 10 ? '0' + i : i}`,
      name: `Battery & Motor Tier-1 P${i}`,
      category: StallCategory.PREMIUM,
      price: 85000,
      areaSqFt: 180,
      width: 85,
      height: 75,
      xPosition: 100 + (i - 1) * 90,
      yPosition: 530,
    });
  }

  // 14 Standard Accessories & Telematics Booths
  for (let i = 1; i <= 14; i++) {
    stalls.push({
      stallNumber: `AUTO-S${i < 10 ? '0' + i : i}`,
      name: `Connected Fleet Booth S${i}`,
      category: StallCategory.STANDARD,
      price: 60000,
      areaSqFt: 120,
      width: 75,
      height: 65,
      xPosition: 100 + (i - 1) * 90,
      yPosition: 635,
    });
  }

  return stalls;
}

// 4. Generate Clean Energy & Sustainability Summit 2027 stalls (54 stalls)
function generateCleanEnergyStalls(): StallConfig[] {
  const stalls: StallConfig[] = [];

  // 3 Grand Green Island Pavilions
  const energyIslands = [
    { num: 'GREEN-ISL-01', name: 'MegaWatt Solar Farm Expo', x: 200, y: 120 },
    { num: 'GREEN-ISL-02', name: 'Offshore Wind Energy Hub', x: 500, y: 120 },
    { num: 'GREEN-ISL-03', name: 'Green Hydrogen Gigafactory', x: 800, y: 120 },
  ];
  for (const isl of energyIslands) {
    stalls.push({
      stallNumber: isl.num,
      name: isl.name,
      category: StallCategory.ISLAND,
      price: 130000,
      areaSqFt: 380,
      width: 180,
      height: 140,
      xPosition: isl.x,
      yPosition: isl.y,
    });
  }

  // 12 Eco Corner Pavilions (6 on left, 6 on right)
  for (let i = 1; i <= 6; i++) {
    stalls.push({
      stallNumber: `ECO-C0${i}`,
      name: `Smart Grid Tech C0${i}`,
      category: StallCategory.CORNER,
      price: 75000,
      areaSqFt: 130,
      width: 80,
      height: 70,
      xPosition: 80,
      yPosition: 100 + (i - 1) * 90,
    });
  }
  for (let i = 7; i <= 12; i++) {
    stalls.push({
      stallNumber: `ECO-C${i < 10 ? '0' + i : i}`,
      name: `Carbon Capture Tech C${i}`,
      category: StallCategory.CORNER,
      price: 75000,
      areaSqFt: 130,
      width: 80,
      height: 70,
      xPosition: 1040,
      yPosition: 100 + (i - 7) * 90,
    });
  }

  // 18 Solar Battery Premium Booths (Double row)
  for (let i = 1; i <= 9; i++) {
    stalls.push({
      stallNumber: `SOLAR-P0${i}`,
      name: `Lithium Storage Cell P0${i}`,
      category: StallCategory.PREMIUM,
      price: 60000,
      areaSqFt: 110,
      width: 75,
      height: 65,
      xPosition: 200 + (i - 1) * 88,
      yPosition: 320,
    });
  }
  for (let i = 10; i <= 18; i++) {
    stalls.push({
      stallNumber: `SOLAR-P${i}`,
      name: `Solid State Battery P${i}`,
      category: StallCategory.PREMIUM,
      price: 60000,
      areaSqFt: 110,
      width: 75,
      height: 65,
      xPosition: 200 + (i - 10) * 88,
      yPosition: 410,
    });
  }

  // 21 Sustainable Bio-Materials Standard Stalls
  for (let i = 1; i <= 21; i++) {
    stalls.push({
      stallNumber: `BIO-A${i < 10 ? '0' + i : i}`,
      name: `Bio-Plastic & Recycled Pack A${i}`,
      category: StallCategory.STANDARD,
      price: 42000,
      areaSqFt: 85,
      width: 70,
      height: 60,
      xPosition: 80 + ((i - 1) % 11) * 88,
      yPosition: i <= 11 ? 530 : 615,
    });
  }

  return stalls;
}

async function main() {
  console.log('================================================================');
  console.log('🧹 COMPLETE DB PURGE & SEEDING CLEAN SLATE (EXACT DEMO LOGINS & 4 UNIQUE EXHIBITIONS)');
  console.log('================================================================');

  // 1. Purge everything in safe dependency order
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
  await prisma.user.updateMany({ data: { companyId: null } });
  await prisma.company.deleteMany({});

  console.log('🗑️  Purging all user accounts...');
  await prisma.user.deleteMany({});

  // 2. Prepare Password Hashes
  console.log('\n🔑 Seeding Exact Demo Accounts from Login Page...');
  const standardPasswordHash = await bcrypt.hash('Password123!', 10);
  const clientPasswordHash = await bcrypt.hash('DemoUser123!', 10);

  // 1. Super Admin (Login Page DEMO_ACCOUNTS)
  await prisma.user.create({
    data: {
      email: 'superadmin@buoyantmedia.com',
      passwordHash: standardPasswordHash,
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
      passwordHash: standardPasswordHash,
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
      passwordHash: standardPasswordHash,
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
      passwordHash: standardPasswordHash,
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

  // 6. Demo Exhibitor Client (Login Page DEMO_ACCOUNTS)
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

  // 3. Define the 4 Events with their distinct Stalls
  console.log('\n🎪 Seeding 4 Official Events with Unique Floor Plans & Stalls...');

  const techStalls = generateTechExpoStalls();
  const medStalls = generateMedicconStalls();
  const autoStalls = generateAutoExpoStalls();
  const greenStalls = generateCleanEnergyStalls();

  const events = [
    {
      title: 'Global Tech Expo 2026',
      slug: 'global-tech-expo-2026',
      description: 'The premier international technology, enterprise cloud, AI, and cybersecurity trade show.',
      venue: 'Bangalore International Exhibition Centre (BIEC)',
      city: 'Bengaluru, Karnataka',
      startDate: new Date('2027-05-15T09:30:00Z'),
      endDate: new Date('2027-05-19T18:30:00Z'),
      bookingEndDate: new Date('2027-05-10T23:59:59Z'),
      status: ExhibitionStatus.PUBLISHED,
      bannerUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200',
      totalStalls: techStalls.length,
      edition: '10',
      eventCode: 'GT-01',
      spcode: 'ZE05',
      notificationEmails: 'admin@buoyantmedia.com',
      createdByUserId: adminUser.id,
      stalls: techStalls,
    },
    {
      title: 'Mediccon Expo 2026',
      slug: 'mediccon-expo-2026',
      description: 'International Healthcare, Medical Devices, Diagnostics & Surgical Equipment Trade Fair.',
      venue: 'CODISSIA Trade Fair Centre (Halls A & B)',
      city: 'Coimbatore, Tamil Nadu',
      startDate: new Date('2027-07-20T10:00:00Z'),
      endDate: new Date('2027-07-23T17:30:00Z'),
      bookingEndDate: new Date('2027-07-15T23:59:59Z'),
      status: ExhibitionStatus.PUBLISHED,
      bannerUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=1200',
      totalStalls: medStalls.length,
      edition: '04',
      eventCode: 'MC-04',
      spcode: 'MC04',
      notificationEmails: 'admin@buoyantmedia.com',
      createdByUserId: adminUser.id,
      stalls: medStalls,
    },
    {
      title: 'International Auto Expo 2026',
      slug: 'international-auto-expo-2026',
      description: "Asia's largest automotive technology, electric vehicles, and future mobility exhibition.",
      venue: 'Pragati Maidan Arena Hall 1-4',
      city: 'New Delhi, Delhi',
      startDate: new Date('2027-09-18T09:00:00Z'),
      endDate: new Date('2027-09-22T19:00:00Z'),
      bookingEndDate: new Date('2027-09-12T23:59:59Z'),
      status: ExhibitionStatus.PUBLISHED,
      bannerUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200',
      totalStalls: autoStalls.length,
      edition: '06',
      eventCode: 'AE-06',
      spcode: 'AE06',
      notificationEmails: 'admin@buoyantmedia.com',
      createdByUserId: adminUser.id,
      stalls: autoStalls,
    },
    {
      title: 'Clean Energy & Sustainability Summit 2027',
      slug: 'clean-energy-summit-2027',
      description: 'Global renewable energy, solar photovoltaics, battery storage, and green tech conference & expo.',
      venue: 'HITEX Exhibition Centre (Hall 2)',
      city: 'Hyderabad, Telangana',
      startDate: new Date('2027-11-20T08:30:00Z'),
      endDate: new Date('2027-11-24T17:00:00Z'),
      bookingEndDate: new Date('2027-11-15T23:59:59Z'),
      status: ExhibitionStatus.PUBLISHED,
      bannerUrl: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=1200',
      totalStalls: greenStalls.length,
      edition: '02',
      eventCode: 'CE-02',
      spcode: 'CE02',
      notificationEmails: 'admin@buoyantmedia.com',
      createdByUserId: adminUser.id,
      stalls: greenStalls,
    },
  ];

  let grandTotalStalls = 0;

  for (const ev of events) {
    const { stalls: eventStalls, ...eventData } = ev;

    const createdEvent = await prisma.exhibition.create({
      data: eventData,
    });

    const floorPlan = await prisma.floorPlan.create({
      data: {
        exhibitionId: createdEvent.id,
        name: `Floor Plan - ${createdEvent.title}`,
        width: 1300,
        height: 780,
        gridColumns: 20,
        gridRows: 15,
        isPublished: true,
      },
    });

    for (const s of eventStalls) {
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
      grandTotalStalls++;
    }

    console.log(`  ✓ Seeded: ${createdEvent.title} (${eventStalls.length} stalls, e.g. ${eventStalls[0].stallNumber})`);
  }

  console.log('\n================================================================');
  console.log('✅ DATABASE SUCCESSFULLY RESET & FRESHLY POPULATED!');
  console.log('================================================================');
}

main()
  .catch((e) => {
    console.error('❌ Reset & Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
