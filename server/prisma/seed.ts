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
      mobile: '+1-555-019-2834',
      email: 'alex.rivera@techcorp.com',
      address: '100 Innovation Way, Suite 400',
      city: 'San Francisco',
      state: 'California',
      gstNumber: '27AAACT1029F1Z5',
      panNumber: 'AAACT1029F',
      industry: 'Enterprise Software & Cloud AI',
      website: 'https://techcorp-global.demo',
      pinCode: "641664",
      country: 'USA',
      tanNumber: 'BOST12345B',
      remarks: 'Healthcare and biotechnology company',
    },
  });

  const company2 = await prisma.company.create({
    data: {
      companyCode: 'CMP-2026-002',
      name: 'Apex BioDynamics Inc.',
      contactPerson: 'Sarah Chen',
      mobile: '+1-555-028-1190',
      email: 'sarah.chen@apexbio.demo',
      address: '450 BioTech Parkway',
      city: 'Boston',
      state: 'Massachusetts',
      gstNumber: '07BBBCA8891G2Z8',
      panNumber: 'BBBCA8891G',
      industry: 'Healthcare & Biotechnology',
      website: 'https://apexbio.demo',
      pinCode: "641001",
      country: 'USA',
      tanNumber: 'SFTT12345A',
      remarks: 'Technology partner',
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

  // 7. Create Floor Plan & Stalls for Exhibition 2: BuildAsia Industrial Summit 2026
  const expo2 = await prisma.exhibition.create({
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
      totalStalls: 12,
    },
  });

  const floorPlan2 = await prisma.floorPlan.create({
    data: {
      exhibitionId: expo2.id,
      name: 'Robotics & Automation Pavilion',
      width: 1000,
      height: 600,
      gridColumns: 4,
      gridRows: 3,
      isPublished: true,
    },
  });

  const stallsData2 = [
    { stallNumber: 'R-101', name: 'Robotics Demo Arena', category: StallCategory.ISLAND, price: 14000.00, areaSqFt: 450, width: 180, height: 130, xPosition: 80, yPosition: 60, status: StallStatus.AVAILABLE },
    { stallNumber: 'R-102', name: 'Smart Factory Suite', category: StallCategory.PREMIUM, price: 9500.00, areaSqFt: 300, width: 150, height: 130, xPosition: 290, yPosition: 60, status: StallStatus.AVAILABLE },
    { stallNumber: 'R-103', name: 'Industrial IoT Hub', category: StallCategory.CORNER, price: 7000.00, areaSqFt: 220, width: 130, height: 130, xPosition: 470, yPosition: 60, status: StallStatus.AVAILABLE },
    { stallNumber: 'R-104', name: 'Automation Alley 1', category: StallCategory.STANDARD, price: 5000.00, areaSqFt: 160, width: 120, height: 130, xPosition: 630, yPosition: 60, status: StallStatus.AVAILABLE },

    { stallNumber: 'R-201', name: 'Machinery Pavilion A', category: StallCategory.PREMIUM, price: 8800.00, areaSqFt: 280, width: 150, height: 120, xPosition: 80, yPosition: 230, status: StallStatus.AVAILABLE },
    { stallNumber: 'R-202', name: 'Machinery Pavilion B', category: StallCategory.STANDARD, price: 5200.00, areaSqFt: 170, width: 120, height: 120, xPosition: 260, yPosition: 230, status: StallStatus.AVAILABLE },
    { stallNumber: 'R-203', name: 'Sensors & Drones Bay', category: StallCategory.STANDARD, price: 5200.00, areaSqFt: 170, width: 120, height: 120, xPosition: 410, yPosition: 230, status: StallStatus.AVAILABLE },
    { stallNumber: 'R-204', name: 'AI Vision Corner', category: StallCategory.CORNER, price: 6800.00, areaSqFt: 200, width: 130, height: 120, xPosition: 560, yPosition: 230, status: StallStatus.AVAILABLE },

    { stallNumber: 'R-301', name: 'Logistics Tech Booth', category: StallCategory.STANDARD, price: 4600.00, areaSqFt: 150, width: 120, height: 110, xPosition: 80, yPosition: 390, status: StallStatus.AVAILABLE },
    { stallNumber: 'R-302', name: '3D Printing Zone', category: StallCategory.CORNER, price: 6200.00, areaSqFt: 190, width: 130, height: 110, xPosition: 230, yPosition: 390, status: StallStatus.AVAILABLE },
    { stallNumber: 'R-303', name: 'Cobot Interactive Lab', category: StallCategory.PREMIUM, price: 9000.00, areaSqFt: 300, width: 160, height: 110, xPosition: 390, yPosition: 390, status: StallStatus.AVAILABLE },
    { stallNumber: 'R-304', name: 'Executive Lounge Bay', category: StallCategory.ISLAND, price: 13500.00, areaSqFt: 420, width: 180, height: 110, xPosition: 580, yPosition: 390, status: StallStatus.AVAILABLE },
  ];

  for (const s of stallsData2) {
    await prisma.stall.create({
      data: { floorPlanId: floorPlan2.id, ...s },
    });
  }

  // 8. Create Exhibition 3: FinTech World Congress 2026
  const expo3 = await prisma.exhibition.create({
    data: {
      title: 'Global FinTech World Congress 2026',
      slug: 'global-fintech-world-congress-2026',
      description: 'The world’s premier gathering for digital banking, paytech innovations, decentralized finance, and crypto regulation leaders.',
      venue: 'Dubai World Trade Centre (DWTC) - Za’abeel Hall 3',
      city: 'Dubai, UAE',
      startDate: new Date('2026-12-05T09:00:00Z'),
      endDate: new Date('2026-12-08T18:00:00Z'),
      status: ExhibitionStatus.PUBLISHED,
      bannerUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=1200',
      totalStalls: 10,
    },
  });

  const floorPlan3 = await prisma.floorPlan.create({
    data: {
      exhibitionId: expo3.id,
      name: 'Main Financial Innovation Hall',
      width: 1100,
      height: 650,
      gridColumns: 5,
      gridRows: 2,
      isPublished: true,
    },
  });

  const stallsData3 = [
    { stallNumber: 'F-101', name: 'PayTech Pavilion 1', category: StallCategory.ISLAND, price: 16000.00, areaSqFt: 500, width: 200, height: 140, xPosition: 70, yPosition: 70, status: StallStatus.AVAILABLE },
    { stallNumber: 'F-102', name: 'NeoBank Showcase', category: StallCategory.PREMIUM, price: 11000.00, areaSqFt: 350, width: 160, height: 140, xPosition: 300, yPosition: 70, status: StallStatus.AVAILABLE },
    { stallNumber: 'F-103', name: 'Blockchain Alley 1', category: StallCategory.CORNER, price: 8500.00, areaSqFt: 240, width: 140, height: 140, xPosition: 490, yPosition: 70, status: StallStatus.AVAILABLE },
    { stallNumber: 'F-104', name: 'DeFi Hub 1', category: StallCategory.STANDARD, price: 5800.00, areaSqFt: 180, width: 120, height: 140, xPosition: 660, yPosition: 70, status: StallStatus.AVAILABLE },
    { stallNumber: 'F-105', name: 'RegTech Solution Booth', category: StallCategory.STANDARD, price: 5800.00, areaSqFt: 180, width: 120, height: 140, xPosition: 810, yPosition: 70, status: StallStatus.AVAILABLE },

    { stallNumber: 'F-201', name: 'Crypto Exchange Stage', category: StallCategory.ISLAND, price: 18000.00, areaSqFt: 550, width: 210, height: 140, xPosition: 70, yPosition: 260, status: StallStatus.AVAILABLE },
    { stallNumber: 'F-202', name: 'InsurTech Hub', category: StallCategory.CORNER, price: 8200.00, areaSqFt: 230, width: 140, height: 140, xPosition: 310, yPosition: 260, status: StallStatus.AVAILABLE },
    { stallNumber: 'F-203', name: 'Cross-Border Payments', category: StallCategory.PREMIUM, price: 10500.00, areaSqFt: 320, width: 150, height: 140, xPosition: 480, yPosition: 260, status: StallStatus.AVAILABLE },
    { stallNumber: 'F-204', name: 'Open Banking Bay', category: StallCategory.STANDARD, price: 6000.00, areaSqFt: 190, width: 120, height: 140, xPosition: 660, yPosition: 260, status: StallStatus.AVAILABLE },
    { stallNumber: 'F-205', name: 'AI Credit Scoring Booth', category: StallCategory.CORNER, price: 7900.00, areaSqFt: 220, width: 130, height: 140, xPosition: 810, yPosition: 260, status: StallStatus.AVAILABLE },
  ];

  for (const s of stallsData3) {
    await prisma.stall.create({
      data: { floorPlanId: floorPlan3.id, ...s },
    });
  }

  // 9. Create Exhibition 4: GreenEnergy & Electric Mobility World 2027
  const expo4 = await prisma.exhibition.create({
    data: {
      title: 'GreenEnergy & Electric Mobility World 2027',
      slug: 'green-energy-ev-mobility-world-2027',
      description: 'The international exposition for renewable energy, solar innovations, EV battery gigafactories, and hydrogen mobility.',
      venue: 'Tokyo International Exhibition Center (Tokyo Big Sight)',
      city: 'Tokyo, Japan',
      startDate: new Date('2027-02-14T09:00:00Z'),
      endDate: new Date('2027-02-17T18:00:00Z'),
      status: ExhibitionStatus.PUBLISHED,
      bannerUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1200',
      totalStalls: 8,
    },
  });

  const floorPlan4 = await prisma.floorPlan.create({
    data: {
      exhibitionId: expo4.id,
      name: 'Clean Tech & EV Pavilion',
      width: 1000,
      height: 550,
      gridColumns: 4,
      gridRows: 2,
      isPublished: true,
    },
  });

  const stallsData4 = [
    { stallNumber: 'E-101', name: 'EV Supercharger Plaza', category: StallCategory.ISLAND, price: 15000.00, areaSqFt: 480, width: 190, height: 130, xPosition: 70, yPosition: 70, status: StallStatus.AVAILABLE },
    { stallNumber: 'E-102', name: 'Solar Cell Technology', category: StallCategory.PREMIUM, price: 9200.00, areaSqFt: 300, width: 150, height: 130, xPosition: 290, yPosition: 70, status: StallStatus.AVAILABLE },
    { stallNumber: 'E-103', name: 'Hydrogen Fuel Cell Arena', category: StallCategory.CORNER, price: 7800.00, areaSqFt: 220, width: 140, height: 130, xPosition: 470, yPosition: 70, status: StallStatus.AVAILABLE },
    { stallNumber: 'E-104', name: 'Battery Recycling Station', category: StallCategory.STANDARD, price: 5400.00, areaSqFt: 170, width: 120, height: 130, xPosition: 640, yPosition: 70, status: StallStatus.AVAILABLE },

    { stallNumber: 'E-201', name: 'Autonomous EV Fleet', category: StallCategory.ISLAND, price: 14500.00, areaSqFt: 460, width: 190, height: 130, xPosition: 70, yPosition: 250, status: StallStatus.AVAILABLE },
    { stallNumber: 'E-202', name: 'Smart Grid Infrastructure', category: StallCategory.CORNER, price: 7500.00, areaSqFt: 210, width: 130, height: 130, xPosition: 290, yPosition: 250, status: StallStatus.AVAILABLE },
    { stallNumber: 'E-203', name: 'Wind Turbine Dynamics', category: StallCategory.STANDARD, price: 5100.00, areaSqFt: 160, width: 120, height: 130, xPosition: 450, yPosition: 250, status: StallStatus.AVAILABLE },
    { stallNumber: 'E-204', name: 'Carbon Offset Solutions', category: StallCategory.STANDARD, price: 5100.00, areaSqFt: 160, width: 120, height: 130, xPosition: 600, yPosition: 250, status: StallStatus.AVAILABLE },
  ];

  for (const s of stallsData4) {
    await prisma.stall.create({
      data: { floorPlanId: floorPlan4.id, ...s },
    });
  }

  // 10. Create Exhibition 5: Mediccon Expo 2026
  const expo5 = await prisma.exhibition.create({
    data: {
      title: 'Mediccon Expo 2026',
      slug: 'mediccon-expo-2026',
      description: 'India premier medical equipment, healthcare technology, and surgical instruments exhibition hosted by Buoyant Media.',
      venue: 'CODISSIA Trade Fair Complex - Hall A',
      city: 'Coimbatore, TN',
      startDate: new Date('2026-11-15T09:00:00Z'),
      endDate: new Date('2026-11-18T18:00:00Z'),
      status: ExhibitionStatus.PUBLISHED,
      bannerUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200',
      totalStalls: 12,
    },
  });

  const floorPlan5 = await prisma.floorPlan.create({
    data: {
      exhibitionId: expo5.id,
      name: 'Medical Equipment & ICU Pavilion',
      width: 1050,
      height: 650,
      gridColumns: 4,
      gridRows: 3,
      isPublished: true,
    },
  });

  const stallsData5 = [
    { stallNumber: 'M-101', name: 'ICU & Surgical Suite', category: StallCategory.ISLAND, price: 12000.00, areaSqFt: 400, width: 160, height: 120, xPosition: 60, yPosition: 50, status: StallStatus.AVAILABLE },
    { stallNumber: 'M-102', name: 'Diagnostic Imaging Hub', category: StallCategory.PREMIUM, price: 8500.00, areaSqFt: 280, width: 140, height: 120, xPosition: 240, yPosition: 50, status: StallStatus.AVAILABLE },
    { stallNumber: 'M-103', name: 'Pharma Automation Corner', category: StallCategory.CORNER, price: 6500.00, areaSqFt: 200, width: 130, height: 120, xPosition: 400, yPosition: 50, status: StallStatus.AVAILABLE },
    { stallNumber: 'M-104', name: 'Hospital Furniture Booth', category: StallCategory.STANDARD, price: 4500.00, areaSqFt: 150, width: 120, height: 120, xPosition: 550, yPosition: 50, status: StallStatus.AVAILABLE },

    { stallNumber: 'M-201', name: 'Telemedicine Pavilion', category: StallCategory.PREMIUM, price: 8500.00, areaSqFt: 280, width: 140, height: 110, xPosition: 60, yPosition: 200, status: StallStatus.AVAILABLE },
    { stallNumber: 'M-202', name: 'Lab Diagnostics Bay', category: StallCategory.STANDARD, price: 4500.00, areaSqFt: 150, width: 120, height: 110, xPosition: 220, yPosition: 200, status: StallStatus.AVAILABLE },
    { stallNumber: 'M-203', name: 'Orthopedic Implants Zone', category: StallCategory.CORNER, price: 6500.00, areaSqFt: 200, width: 130, height: 110, xPosition: 360, yPosition: 200, status: StallStatus.AVAILABLE },
    { stallNumber: 'M-204', name: 'Dental Equipment Booth', category: StallCategory.STANDARD, price: 4500.00, areaSqFt: 150, width: 120, height: 110, xPosition: 510, yPosition: 200, status: StallStatus.AVAILABLE },

    { stallNumber: 'M-301', name: 'Biomedical Waste Tech', category: StallCategory.STANDARD, price: 4200.00, areaSqFt: 140, width: 120, height: 110, xPosition: 60, yPosition: 330, status: StallStatus.AVAILABLE },
    { stallNumber: 'M-302', name: 'Oxygen & Gas Systems', category: StallCategory.CORNER, price: 6000.00, areaSqFt: 180, width: 130, height: 110, xPosition: 200, yPosition: 330, status: StallStatus.AVAILABLE },
    { stallNumber: 'M-303', name: 'Robotic Surgery Arena', category: StallCategory.ISLAND, price: 13500.00, areaSqFt: 450, width: 180, height: 110, xPosition: 350, yPosition: 330, status: StallStatus.AVAILABLE },
    { stallNumber: 'M-304', name: 'Ayush & Herbal Expo', category: StallCategory.STANDARD, price: 4200.00, areaSqFt: 140, width: 120, height: 110, xPosition: 550, yPosition: 330, status: StallStatus.AVAILABLE },
  ];

  for (const s of stallsData5) {
    await prisma.stall.create({
      data: { floorPlanId: floorPlan5.id, ...s },
    });
  }

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
