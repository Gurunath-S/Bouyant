import {
  PrismaClient,
  UserRole,
  BookingStatus,
  BookingPaymentStatus,
  PaymentStatus,
  InvoiceStatus,
  StallStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Platform Users & Realistic Exhibitor Directory...');

  const superAdminPasswordHash = await bcrypt.hash('SuperAdminPassword123!', 10);
  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 10);
  const staffPasswordHash = await bcrypt.hash('StaffPassword123!', 10);
  const clientPasswordHash = await bcrypt.hash('UserPassword123!', 10);

  // Clean dependent records before seeding demo data
  await prisma.invoice.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.bookingStall.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.user.updateMany({
    data: { companyId: null },
  });
  await prisma.company.deleteMany({});

  // Reset stall statuses to AVAILABLE
  await prisma.stall.updateMany({
    data: {
      status: StallStatus.AVAILABLE,
      heldByUserId: null,
      heldUntil: null,
    },
  });

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

  // 4. Create Companies
  console.log('🏢 Creating Exhibitor Companies...');

  // Company 1: Fully Paid Exhibitor
  const company1 = await prisma.company.create({
    data: {
      companyCode: 'CMP-1001',
      name: 'Apex Industrial Robotics Ltd',
      contactPerson: 'Rajesh Kumar',
      mobile: '+919876543210',
      email: 'contact@apexrobotics.in',
      address: 'Plot 42, Electronic City Phase 1',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560100',
      country: 'India',
      gstNumber: '29ABCDE1234F1Z5',
      panNumber: 'ABCDE1234F',
      industry: 'Robotics & Automation',
      website: 'https://apexrobotics.in',
      spcode: 'AR01',
      regNo: 'REG-2026-001',
    },
  });

  // Company 2: Partially Paid Exhibitor
  const company2 = await prisma.company.create({
    data: {
      companyCode: 'CMP-1002',
      name: 'BioMed Diagnostics & Instruments Corp',
      contactPerson: 'Dr. Priya Sharma',
      mobile: '+919876543211',
      email: 'priya@biomedinstruments.com',
      address: '12 Meditech Park, Guindy',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pinCode: '600032',
      country: 'India',
      gstNumber: '33BCDEF2345G1Z6',
      panNumber: 'BCDEF2345G',
      industry: 'Medical Devices',
      website: 'https://biomedinstruments.com',
      spcode: 'BM02',
      regNo: 'REG-2026-002',
    },
  });

  // Company 3: Payment Pending / Unpaid Exhibitor
  const company3 = await prisma.company.create({
    data: {
      companyCode: 'CMP-1003',
      name: 'Nova Clean Energy Solutions Pvt Ltd',
      contactPerson: 'Amit Patel',
      mobile: '+919876543212',
      email: 'amit@novacleanenergy.in',
      address: '88 Solar Hub, SG Highway',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pinCode: '380015',
      country: 'India',
      gstNumber: '24CDEFG3456H1Z7',
      panNumber: 'CDEFG3456H',
      industry: 'Renewable Energy',
      website: 'https://novacleanenergy.in',
      spcode: 'NC03',
      regNo: 'REG-2026-003',
    },
  });

  // Company 4: Unregistered / No Bookings (Directory only)
  const company4 = await prisma.company.create({
    data: {
      companyCode: 'CMP-1004',
      name: 'Vanguard Global Logistics Ltd',
      contactPerson: 'Sunita Menon',
      mobile: '+919876543213',
      email: 'sunita@vanguardlogistics.in',
      address: '500 Cargo Complex, Andheri East',
      city: 'Mumbai',
      state: 'Maharashtra',
      pinCode: '400069',
      country: 'India',
      gstNumber: '27DEFGH4567I1Z8',
      panNumber: 'DEFGH4567I',
      industry: 'Logistics & Supply Chain',
      website: 'https://vanguardlogistics.in',
      spcode: 'VL04',
      regNo: 'REG-2026-004',
    },
  });

  // Company 5: Another Paid Company in a different expo + Pending GST
  const company5 = await prisma.company.create({
    data: {
      companyCode: 'CMP-1005',
      name: 'Quantum Mobility Systems',
      contactPerson: 'Vikram Singhania',
      mobile: '+919876543214',
      email: 'vikram@quantumauto.com',
      address: '7 Auto Cluster, Chakan',
      city: 'Pune',
      state: 'Maharashtra',
      pinCode: '410501',
      country: 'India',
      gstNumber: null, // Tests pending GST filter
      panNumber: 'EFGHI5678J',
      industry: 'Automotive',
      website: 'https://quantumauto.com',
      spcode: 'QA05',
      regNo: 'REG-2026-005',
    },
  });

  // 5. Exhibitor Client User (Linked to Company 1)
  await prisma.user.upsert({
    where: { email: 'user@buoyantmedia.com' },
    update: {
      passwordHash: clientPasswordHash,
      role: UserRole.CLIENT,
      isActive: true,
      companyId: company1.id,
    },
    create: {
      email: 'user@buoyantmedia.com',
      passwordHash: clientPasswordHash,
      username: 'clientuser',
      name: 'Demo Exhibitor',
      phone: '+919876500004',
      role: UserRole.CLIENT,
      companyId: company1.id,
      isActive: true,
    },
  });

  // 6. Create Bookings linked to Exhibitions and Stalls
  console.log('🎟️ Creating Realistic Bookings and Payments...');

  const globalTechExpo = await prisma.exhibition.findFirst({
    where: { title: { contains: 'Global Tech Expo' } },
    include: {
      floorPlans: {
        include: {
          stalls: { orderBy: { stallNumber: 'asc' } },
        },
      },
    },
  });

  const medicconExpo = await prisma.exhibition.findFirst({
    where: { title: { contains: 'Mediccon' } },
    include: {
      floorPlans: {
        include: {
          stalls: { orderBy: { stallNumber: 'asc' } },
        },
      },
    },
  });

  if (globalTechExpo && globalTechExpo.floorPlans[0]?.stalls?.length >= 3) {
    const stalls = globalTechExpo.floorPlans[0].stalls;

    // Booking 1: Apex Industrial Robotics (Paid Full)
    const stall1 = stalls[0];
    const b1 = await prisma.booking.create({
      data: {
        bookingReference: 'BK-GT01-001',
        companyId: company1.id,
        exhibitionId: globalTechExpo.id,
        status: BookingStatus.CONFIRMED,
        totalAmount: 50000,
        taxAmount: 9000,
        grandTotal: 59000,
        paidAmount: 59000,
        balanceAmount: 0,
        paymentStatus: BookingPaymentStatus.PAID_FULL,
        stalls: {
          create: [{ stallId: stall1.id, price: 50000 }],
        },
      },
    });

    await prisma.stall.update({
      where: { id: stall1.id },
      data: { status: StallStatus.BOOKED },
    });

    const p1 = await prisma.payment.create({
      data: {
        paymentReference: 'PAY-GT01-001',
        bookingId: b1.id,
        amount: 59000,
        currency: 'INR',
        status: PaymentStatus.SUCCESS,
        provider: 'RAZORPAY',
        paymentMethod: 'ONLINE',
        paidAt: new Date(),
      },
    });

    await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2026-001',
        bookingId: b1.id,
        paymentId: p1.id,
        companyId: company1.id,
        totalAmount: 50000,
        taxAmount: 9000,
        grandTotal: 59000,
        status: InvoiceStatus.PAID,
      },
    });

    // Booking 2: BioMed Diagnostics (Partially Paid)
    const stall2 = stalls[1];
    const b2 = await prisma.booking.create({
      data: {
        bookingReference: 'BK-GT01-002',
        companyId: company2.id,
        exhibitionId: globalTechExpo.id,
        status: BookingStatus.CONFIRMED,
        totalAmount: 75000,
        taxAmount: 13500,
        grandTotal: 88500,
        paidAmount: 40000,
        balanceAmount: 48500,
        paymentStatus: BookingPaymentStatus.PARTIALLY_PAID,
        stalls: {
          create: [{ stallId: stall2.id, price: 75000 }],
        },
      },
    });

    await prisma.stall.update({
      where: { id: stall2.id },
      data: { status: StallStatus.BOOKED },
    });

    const p2 = await prisma.payment.create({
      data: {
        paymentReference: 'PAY-GT01-002',
        bookingId: b2.id,
        amount: 40000,
        currency: 'INR',
        status: PaymentStatus.SUCCESS,
        provider: 'BANK_TRANSFER',
        paymentMethod: 'NEFT',
        paidAt: new Date(),
      },
    });

    await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2026-002',
        bookingId: b2.id,
        paymentId: p2.id,
        companyId: company2.id,
        totalAmount: 75000,
        taxAmount: 13500,
        grandTotal: 88500,
        status: InvoiceStatus.ISSUED,
      },
    });

    // Booking 3: Nova Clean Energy (Unpaid / Payment Pending)
    const stall3 = stalls[2];
    const b3 = await prisma.booking.create({
      data: {
        bookingReference: 'BK-GT01-003',
        companyId: company3.id,
        exhibitionId: globalTechExpo.id,
        status: BookingStatus.PENDING_PAYMENT,
        totalAmount: 50000,
        taxAmount: 9000,
        grandTotal: 59000,
        paidAmount: 0,
        balanceAmount: 59000,
        paymentStatus: BookingPaymentStatus.UNPAID,
        stalls: {
          create: [{ stallId: stall3.id, price: 50000 }],
        },
      },
    });

    await prisma.stall.update({
      where: { id: stall3.id },
      data: { status: StallStatus.RESERVED },
    });

    await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2026-003',
        bookingId: b3.id,
        companyId: company3.id,
        totalAmount: 50000,
        taxAmount: 9000,
        grandTotal: 59000,
        status: InvoiceStatus.ISSUED,
      },
    });
  }

  if (medicconExpo && medicconExpo.floorPlans[0]?.stalls?.length >= 1) {
    const medStall = medicconExpo.floorPlans[0].stalls[0];

    // Booking 4: Quantum Mobility Systems (Paid Full in Mediccon)
    const b4 = await prisma.booking.create({
      data: {
        bookingReference: 'BK-MC04-001',
        companyId: company5.id,
        exhibitionId: medicconExpo.id,
        status: BookingStatus.CONFIRMED,
        totalAmount: 50000,
        taxAmount: 9000,
        grandTotal: 59000,
        paidAmount: 59000,
        balanceAmount: 0,
        paymentStatus: BookingPaymentStatus.PAID_FULL,
        stalls: {
          create: [{ stallId: medStall.id, price: 50000 }],
        },
      },
    });

    await prisma.stall.update({
      where: { id: medStall.id },
      data: { status: StallStatus.BOOKED },
    });

    const p4 = await prisma.payment.create({
      data: {
        paymentReference: 'PAY-MC04-001',
        bookingId: b4.id,
        amount: 59000,
        currency: 'INR',
        status: PaymentStatus.SUCCESS,
        provider: 'RAZORPAY',
        paymentMethod: 'ONLINE',
        paidAt: new Date(),
      },
    });

    await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2026-004',
        bookingId: b4.id,
        paymentId: p4.id,
        companyId: company5.id,
        totalAmount: 50000,
        taxAmount: 9000,
        grandTotal: 59000,
        status: InvoiceStatus.PAID,
      },
    });
  }

  console.log('====================================================');
  console.log('✅ Seeding Complete: 5 Companies, 4 Bookings, 3 Payments');
  console.log('====================================================');
  console.log('Super Admin  : superadmin@buoyantmedia.com / SuperAdminPassword123!');
  console.log('Admin User   : admin@buoyantmedia.com      / AdminPassword123!');
  console.log('Staff User   : staff@buoyantmedia.com      / StaffPassword123!');
  console.log('Client User  : user@buoyantmedia.com       / UserPassword123!');
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
