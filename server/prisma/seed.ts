import { PrismaClient, UserRole, StallCategory, StallStatus, ExhibitionStatus, BookingStatus, PaymentStatus, InvoiceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for Buoyant Media...');

  // Clean existing tables
  await prisma.notification.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.stall.deleteMany();
  await prisma.floorPlan.deleteMany();
  await prisma.exhibition.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  // 1. Create Companies
  const company1 = await prisma.company.create({
    data: {
      companyCode: 'CMP-2026-001',
      name: 'TechCorp Global Solutions',
      contactPerson: 'Alex Rivera',
      designation: 'Director of Business Development',
      mobile: '+1-555-019-2834',
      email: 'alex.rivera@techcorp.com',
      address: '100 Innovation Way, Suite 400',
      city: 'San Francisco',
      state: 'California',
      gstNumber: '27AAACT1029F1Z5',
      panNumber: 'AAACT1029F',
      industry: 'Enterprise Software & Cloud AI',
      category: 'Exhibitor - Technology Partner',
      website: 'https://techcorp-global.demo',
    },
  });

  const company2 = await prisma.company.create({
    data: {
      companyCode: 'CMP-2026-002',
      name: 'Apex BioDynamics Inc.',
      contactPerson: 'Sarah Chen',
      designation: 'Head of Operations',
      mobile: '+1-555-028-1190',
      email: 'sarah.chen@apexbio.demo',
      address: '450 BioTech Parkway',
      city: 'Boston',
      state: 'Massachusetts',
      gstNumber: '07BBBCA8891G2Z8',
      panNumber: 'BBBCA8891G',
      industry: 'Healthcare & Biotechnology',
      category: 'Exhibitor - Gold Sponsor',
      website: 'https://apexbio.demo',
    },
  });

  // 2. Create Password Hashes
  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 10);
  const clientPasswordHash = await bcrypt.hash('ClientPassword123!', 10);

  // 3. Create Users
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@buoyantmedia.com',
      passwordHash: adminPasswordHash,
      name: 'Elena Rostova (Admin)',
      phone: '+1-800-BUOYANT',
      role: UserRole.ADMIN,
    },
  });

  const clientUser = await prisma.user.create({
    data: {
      email: 'client@techcorp.com',
      passwordHash: clientPasswordHash,
      name: 'Alex Rivera',
      phone: '+1-555-019-2834',
      role: UserRole.CLIENT,
      companyId: company1.id,
    },
  });

  console.log(`👤 Users seeded: Admin (${adminUser.email}), Client (${clientUser.email})`);

  // 4. Create Exhibition 1: Global Tech Expo 2026
  const expo1 = await prisma.exhibition.create({
    data: {
      title: 'Global Tech Expo 2026',
      slug: 'global-tech-expo-2026',
      description: 'The world premier B2B technology summit showcasing enterprise AI, SaaS innovations, and cloud infrastructure leaders.',
      venue: 'Metropolitan Convention Center - Hall A & B',
      city: 'San Francisco, CA',
      startDate: new Date('2026-10-12T09:00:00Z'),
      endDate: new Date('2026-10-15T18:00:00Z'),
      status: ExhibitionStatus.PUBLISHED,
      bannerUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200',
      totalStalls: 24,
    },
  });

  // 5. Create Floor Plan for Expo 1
  const floorPlan1 = await prisma.floorPlan.create({
    data: {
      exhibitionId: expo1.id,
      name: 'Hall A - Main Exhibition Canvas',
      width: 1200,
      height: 700,
      gridColumns: 6,
      gridRows: 4,
      isPublished: true,
    },
  });

  // 6. Create Stalls grid for Floor Plan 1
  const stallsData = [
    // Row 1 - Premium Island Stalls
    { stallNumber: 'A-101', name: 'Island Suite A1', category: StallCategory.ISLAND, price: 12000.00, areaSqFt: 400, width: 160, height: 120, xPosition: 60, yPosition: 50, status: StallStatus.AVAILABLE },
    { stallNumber: 'A-102', name: 'Island Suite A2', category: StallCategory.ISLAND, price: 12000.00, areaSqFt: 400, width: 160, height: 120, xPosition: 240, yPosition: 50, status: StallStatus.BOOKED_CONFIRMED },
    { stallNumber: 'A-103', name: 'Corner Booth 1', category: StallCategory.CORNER, price: 7500.00, areaSqFt: 250, width: 140, height: 120, xPosition: 420, yPosition: 50, status: StallStatus.TEMPORARILY_HELD, heldUntil: new Date(Date.now() + 10 * 60 * 1000) },
    { stallNumber: 'A-104', name: 'Corner Booth 2', category: StallCategory.CORNER, price: 7500.00, areaSqFt: 250, width: 140, height: 120, xPosition: 580, yPosition: 50, status: StallStatus.AVAILABLE },
    { stallNumber: 'A-105', name: 'Premium Pavilion', category: StallCategory.PREMIUM, price: 9000.00, areaSqFt: 300, width: 150, height: 120, xPosition: 740, yPosition: 50, status: StallStatus.AVAILABLE },
    { stallNumber: 'A-106', name: 'VIP Entrance Booth', category: StallCategory.PREMIUM, price: 9500.00, areaSqFt: 300, width: 150, height: 120, xPosition: 910, yPosition: 50, status: StallStatus.BLOCKED },

    // Row 2 - Standard & Corner Stalls
    { stallNumber: 'B-201', name: 'Standard Stall B1', category: StallCategory.STANDARD, price: 4500.00, areaSqFt: 150, width: 120, height: 100, xPosition: 60, yPosition: 210, status: StallStatus.AVAILABLE },
    { stallNumber: 'B-202', name: 'Standard Stall B2', category: StallCategory.STANDARD, price: 4500.00, areaSqFt: 150, width: 120, height: 100, xPosition: 200, yPosition: 210, status: StallStatus.AVAILABLE },
    { stallNumber: 'B-203', name: 'Standard Stall B3', category: StallCategory.STANDARD, price: 4500.00, areaSqFt: 150, width: 120, height: 100, xPosition: 340, yPosition: 210, status: StallStatus.AVAILABLE },
    { stallNumber: 'B-204', name: 'Standard Stall B4', category: StallCategory.STANDARD, price: 4500.00, areaSqFt: 150, width: 120, height: 100, xPosition: 480, yPosition: 210, status: StallStatus.AVAILABLE },
    { stallNumber: 'B-205', name: 'Corner Stall B5', category: StallCategory.CORNER, price: 6000.00, areaSqFt: 200, width: 130, height: 100, xPosition: 620, yPosition: 210, status: StallStatus.AVAILABLE },
    { stallNumber: 'B-206', name: 'Premium Stall B6', category: StallCategory.PREMIUM, price: 8000.00, areaSqFt: 250, width: 140, height: 100, xPosition: 770, yPosition: 210, status: StallStatus.AVAILABLE },

    // Row 3 - Tech Innovation Alley
    { stallNumber: 'C-301', name: 'Innovation Hub C1', category: StallCategory.STANDARD, price: 4000.00, areaSqFt: 120, width: 120, height: 100, xPosition: 60, yPosition: 340, status: StallStatus.AVAILABLE },
    { stallNumber: 'C-302', name: 'Innovation Hub C2', category: StallCategory.STANDARD, price: 4000.00, areaSqFt: 120, width: 120, height: 100, xPosition: 200, yPosition: 340, status: StallStatus.AVAILABLE },
    { stallNumber: 'C-303', name: 'Innovation Hub C3', category: StallCategory.STANDARD, price: 4000.00, areaSqFt: 120, width: 120, height: 100, xPosition: 340, yPosition: 340, status: StallStatus.AVAILABLE },
    { stallNumber: 'C-304', name: 'Innovation Hub C4', category: StallCategory.STANDARD, price: 4000.00, areaSqFt: 120, width: 120, height: 100, xPosition: 480, yPosition: 340, status: StallStatus.AVAILABLE },
    { stallNumber: 'C-305', name: 'Corner Hub C5', category: StallCategory.CORNER, price: 5500.00, areaSqFt: 180, width: 130, height: 100, xPosition: 620, yPosition: 340, status: StallStatus.AVAILABLE },
    { stallNumber: 'C-306', name: 'Corner Hub C6', category: StallCategory.CORNER, price: 5500.00, areaSqFt: 180, width: 130, height: 100, xPosition: 770, yPosition: 340, status: StallStatus.AVAILABLE },

    // Row 4 - Enterprise Zone
    { stallNumber: 'D-401', name: 'Enterprise Suite D1', category: StallCategory.PREMIUM, price: 8500.00, areaSqFt: 280, width: 150, height: 110, xPosition: 60, yPosition: 470, status: StallStatus.AVAILABLE },
    { stallNumber: 'D-402', name: 'Enterprise Suite D2', category: StallCategory.PREMIUM, price: 8500.00, areaSqFt: 280, width: 150, height: 110, xPosition: 230, yPosition: 470, status: StallStatus.AVAILABLE },
    { stallNumber: 'D-403', name: 'Grand Island D3', category: StallCategory.ISLAND, price: 15000.00, areaSqFt: 500, width: 220, height: 110, xPosition: 400, yPosition: 470, status: StallStatus.AVAILABLE },
    { stallNumber: 'D-404', name: 'Standard Suite D4', category: StallCategory.STANDARD, price: 4800.00, areaSqFt: 160, width: 130, height: 110, xPosition: 640, yPosition: 470, status: StallStatus.AVAILABLE },
    { stallNumber: 'D-405', name: 'Standard Suite D5', category: StallCategory.STANDARD, price: 4800.00, areaSqFt: 160, width: 130, height: 110, xPosition: 790, yPosition: 470, status: StallStatus.AVAILABLE },
    { stallNumber: 'D-406', name: 'Executive Corner', category: StallCategory.CORNER, price: 7000.00, areaSqFt: 220, width: 140, height: 110, xPosition: 940, yPosition: 470, status: StallStatus.AVAILABLE },
  ];

  for (const s of stallsData) {
    await prisma.stall.create({
      data: {
        floorPlanId: floorPlan1.id,
        ...s,
      },
    });
  }

  // Find stall A-102 (booked) to create a sample booking record
  const bookedStall = await prisma.stall.findFirst({
    where: { floorPlanId: floorPlan1.id, stallNumber: 'A-102' },
  });

  if (bookedStall) {
    const booking = await prisma.booking.create({
      data: {
        bookingReference: 'BKG-2026-8849',
        userId: clientUser.id,
        companyId: company1.id,
        exhibitionId: expo1.id,
        stallId: bookedStall.id,
        status: BookingStatus.CONFIRMED,
        totalAmount: 12000.00,
        taxAmount: 2160.00,
        grandTotal: 14160.00,
      },
    });

    const payment = await prisma.payment.create({
      data: {
        paymentReference: 'PAY-99201',
        bookingId: booking.id,
        userId: clientUser.id,
        amount: 14160.00,
        currency: 'USD',
        status: PaymentStatus.SUCCESS,
        provider: 'STRIPE_SIMULATOR',
        transactionId: 'txn_mock_883019284',
        paymentMethod: 'CREDIT_CARD_VISA',
        paidAt: new Date(),
      },
    });

    await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2026-0042',
        bookingId: booking.id,
        paymentId: payment.id,
        companyId: company1.id,
        totalAmount: 12000.00,
        taxAmount: 2160.00,
        grandTotal: 14160.00,
        status: InvoiceStatus.PAID,
        issueDate: new Date(),
      },
    });

    await prisma.notification.create({
      data: {
        userId: clientUser.id,
        title: 'Booking Confirmed!',
        message: 'Your stall reservation for A-102 (Island Suite A2) at Global Tech Expo 2026 is confirmed.',
        type: 'SUCCESS',
      },
    });
  }

  // 7. Create Exhibition 2: BuildAsia Industrial Summit 2026
  await prisma.exhibition.create({
    data: {
      title: 'BuildAsia Industrial & Robotics Summit 2026',
      slug: 'buildasia-industrial-summit-2026',
      description: 'The premier exhibition for heavy machinery, smart automation, robotics, and industrial IoT solutions.',
      venue: 'Suntec International Convention Centre',
      city: 'Singapore',
      startDate: new Date('2026-11-20T09:00:00Z'),
      endDate: new Date('2026-11-23T18:00:00Z'),
      status: ExhibitionStatus.PUBLISHED,
      bannerUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200',
      totalStalls: 16,
    },
  });

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
