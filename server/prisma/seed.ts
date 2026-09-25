import { PrismaClient, UserRole, StallCategory, StallStatus, ExhibitionStatus, BookingStatus, BookingPaymentStatus, PaymentStatus, InvoiceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding SuperAdmin, Admin, Staff, and Client accounts with sample bookings & transactions...');

  const superAdminPasswordHash = await bcrypt.hash('SuperAdminPassword123!', 10);
  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 10);
  const staffPasswordHash = await bcrypt.hash('StaffPassword123!', 10);
  const userPasswordHash = await bcrypt.hash('UserPassword123!', 10);

  // 1. Single Platform-Level Super Admin
  const superAdmin = await prisma.user.upsert({
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
      phone: '+91-9876500001',
      role: UserRole.SUPERADMIN,
      spcode: 'SA01',
      isActive: true,
    },
  });

  // 2. Admin User
  const admin = await prisma.user.upsert({
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
      phone: '+91-9876500002',
      role: UserRole.ADMIN,
      spcode: 'B001',
      isActive: true,
    },
  });

  // 3. Staff User
  const staff = await prisma.user.upsert({
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
      phone: '+91-9876500003',
      role: UserRole.STAFF,
      spcode: 'ST01',
      isActive: true,
    },
  });

  // 4. Company for Client User
  let company = await prisma.company.findFirst({
    where: {
      OR: [
        { email: 'user@buoyantmedia.com' },
        { companyCode: 'CMP-BM001' },
      ],
    },
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        companyCode: 'CMP-BM001',
        name: 'Buoyant Media Tech Solutions Pvt Ltd',
        contactPerson: 'Client User',
        mobile: '+91-9876543210',
        email: 'user@buoyantmedia.com',
        address: 'Suite 402, Buoyant Media Tower, Bandra Kurla Complex',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400051',
        country: 'India',
        gstNumber: '27BUOYM1234A1Z5',
        panNumber: 'BUOYM1234A',
        industry: 'Information Technology & Media',
        website: 'https://buoyantmedia.com',
      },
    });
  } else {
    company = await prisma.company.update({
      where: { id: company.id },
      data: {
        name: 'Buoyant Media Tech Solutions Pvt Ltd',
        contactPerson: 'Client User',
        mobile: '+91-9876543210',
        address: 'Suite 402, Buoyant Media Tower, Bandra Kurla Complex',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400051',
        country: 'India',
        industry: 'Information Technology & Media',
        website: 'https://buoyantmedia.com',
      },
    });
  }

  // 5. Regular Client User
  const clientUser = await prisma.user.upsert({
    where: { email: 'user@buoyantmedia.com' },
    update: {
      passwordHash: userPasswordHash,
      role: UserRole.CLIENT,
      username: 'clientuser',
      companyId: company.id,
      isActive: true,
    },
    create: {
      email: 'user@buoyantmedia.com',
      passwordHash: userPasswordHash,
      username: 'clientuser',
      name: 'Client User',
      phone: '+91-9876543210',
      role: UserRole.CLIENT,
      companyId: company.id,
      isActive: true,
    },
  });

  // 6. Create / Upsert Exhibition
  const exhibition = await prisma.exhibition.upsert({
    where: { slug: 'autotech-expo-2026' },
    update: {
      status: ExhibitionStatus.PUBLISHED,
    },
    create: {
      title: 'AutoTech Expo 2026',
      slug: 'autotech-expo-2026',
      description: 'Premier International Automotive & Mobility Innovation Exhibition',
      venue: 'Bombay Exhibition Centre',
      city: 'Mumbai',
      startDate: new Date('2026-11-15T10:00:00Z'),
      endDate: new Date('2026-11-18T18:00:00Z'),
      bookingEndDate: new Date('2026-11-10T23:59:59Z'),
      status: ExhibitionStatus.PUBLISHED,
      bannerUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200',
      totalStalls: 4,
      edition: '10',
      eventCode: 'AT26',
      createdByUserId: admin.id,
    },
  });

  // 7. FloorPlan & Stalls
  let floorPlan = await prisma.floorPlan.findFirst({
    where: { exhibitionId: exhibition.id },
  });

  if (!floorPlan) {
    floorPlan = await prisma.floorPlan.create({
      data: {
        exhibitionId: exhibition.id,
        name: 'Grand Pavilion Hall 1',
        width: 1200,
        height: 800,
        isPublished: true,
      },
    });
  }

  const stall1 = await prisma.stall.upsert({
    where: { floorPlanId_stallNumber: { floorPlanId: floorPlan.id, stallNumber: 'A-101' } },
    update: { status: StallStatus.BOOKED_CONFIRMED },
    create: {
      floorPlanId: floorPlan.id,
      stallNumber: 'A-101',
      name: 'Premium Pavilion Corner A101',
      category: StallCategory.PREMIUM,
      price: 100000,
      areaSqFt: 150,
      status: StallStatus.BOOKED_CONFIRMED,
    },
  });

  const stall2 = await prisma.stall.upsert({
    where: { floorPlanId_stallNumber: { floorPlanId: floorPlan.id, stallNumber: 'A-102' } },
    update: { status: StallStatus.BOOKED_CONFIRMED },
    create: {
      floorPlanId: floorPlan.id,
      stallNumber: 'A-102',
      name: 'Island Innovation Hub A102',
      category: StallCategory.ISLAND,
      price: 200000,
      areaSqFt: 300,
      status: StallStatus.BOOKED_CONFIRMED,
    },
  });

  const stall3 = await prisma.stall.upsert({
    where: { floorPlanId_stallNumber: { floorPlanId: floorPlan.id, stallNumber: 'B-201' } },
    update: { status: StallStatus.PAYMENT_PENDING },
    create: {
      floorPlanId: floorPlan.id,
      stallNumber: 'B-201',
      name: 'Standard Booth B201',
      category: StallCategory.STANDARD,
      price: 50000,
      areaSqFt: 100,
      status: StallStatus.PAYMENT_PENDING,
      heldByUserId: clientUser.id,
      heldUntil: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  // 8. Bookings & Financial Records for Client User
  // Booking 1: Confirmed & Paid in Full
  const booking1 = await prisma.booking.upsert({
    where: { bookingReference: 'BK-2026-8801' },
    update: {
      status: BookingStatus.CONFIRMED,
      paymentStatus: BookingPaymentStatus.PAID_FULL,
    },
    create: {
      bookingReference: 'BK-2026-8801',
      userId: clientUser.id,
      companyId: company.id,
      exhibitionId: exhibition.id,
      status: BookingStatus.CONFIRMED,
      totalAmount: 100000,
      taxAmount: 18000,
      grandTotal: 118000,
      paidAmount: 118000,
      balanceAmount: 0,
      paymentStatus: BookingPaymentStatus.PAID_FULL,
    },
  });

  await prisma.bookingStall.upsert({
    where: { bookingId_stallId: { bookingId: booking1.id, stallId: stall1.id } },
    update: {},
    create: {
      bookingId: booking1.id,
      stallId: stall1.id,
      price: 100000,
    },
  });

  const payment1 = await prisma.payment.upsert({
    where: { paymentReference: 'PAY-8801' },
    update: { status: PaymentStatus.SUCCESS },
    create: {
      paymentReference: 'PAY-8801',
      bookingId: booking1.id,
      userId: clientUser.id,
      amount: 118000,
      currency: 'INR',
      status: PaymentStatus.SUCCESS,
      provider: 'RAZORPAY',
      transactionId: 'txn_live_8801_success',
      paymentMethod: 'CREDIT_CARD_VISA',
      paidAt: new Date(),
    },
  });

  await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2026-8801' },
    update: { status: InvoiceStatus.PAID },
    create: {
      invoiceNumber: 'INV-2026-8801',
      bookingId: booking1.id,
      paymentId: payment1.id,
      companyId: company.id,
      totalAmount: 100000,
      taxAmount: 18000,
      grandTotal: 118000,
      status: InvoiceStatus.PAID,
      issueDate: new Date(),
    },
  });

  // Booking 2: Confirmed & Partially Paid (Installment Plan)
  const booking2 = await prisma.booking.upsert({
    where: { bookingReference: 'BK-2026-8802' },
    update: {
      status: BookingStatus.CONFIRMED,
      paymentStatus: BookingPaymentStatus.PARTIALLY_PAID,
    },
    create: {
      bookingReference: 'BK-2026-8802',
      userId: clientUser.id,
      companyId: company.id,
      exhibitionId: exhibition.id,
      status: BookingStatus.CONFIRMED,
      totalAmount: 200000,
      taxAmount: 36000,
      grandTotal: 236000,
      paidAmount: 118000,
      balanceAmount: 118000,
      paymentStatus: BookingPaymentStatus.PARTIALLY_PAID,
    },
  });

  await prisma.bookingStall.upsert({
    where: { bookingId_stallId: { bookingId: booking2.id, stallId: stall2.id } },
    update: {},
    create: {
      bookingId: booking2.id,
      stallId: stall2.id,
      price: 200000,
    },
  });

  const payment2 = await prisma.payment.upsert({
    where: { paymentReference: 'PAY-8802' },
    update: { status: PaymentStatus.SUCCESS },
    create: {
      paymentReference: 'PAY-8802',
      bookingId: booking2.id,
      userId: clientUser.id,
      amount: 118000,
      currency: 'INR',
      status: PaymentStatus.SUCCESS,
      provider: 'RAZORPAY',
      transactionId: 'txn_live_8802_partial',
      installmentType: 'PARTIAL_50',
      paymentMethod: 'UPI_RAZORPAY',
      paidAt: new Date(),
    },
  });

  await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2026-8802' },
    update: { status: InvoiceStatus.ISSUED },
    create: {
      invoiceNumber: 'INV-2026-8802',
      bookingId: booking2.id,
      paymentId: payment2.id,
      companyId: company.id,
      totalAmount: 200000,
      taxAmount: 36000,
      grandTotal: 236000,
      status: InvoiceStatus.ISSUED,
      issueDate: new Date(),
    },
  });

  // Booking 3: Pending Payment (Active Hold)
  const booking3 = await prisma.booking.upsert({
    where: { bookingReference: 'BK-2026-8803' },
    update: {
      status: BookingStatus.PENDING_PAYMENT,
      paymentStatus: BookingPaymentStatus.UNPAID,
    },
    create: {
      bookingReference: 'BK-2026-8803',
      userId: clientUser.id,
      companyId: company.id,
      exhibitionId: exhibition.id,
      status: BookingStatus.PENDING_PAYMENT,
      totalAmount: 50000,
      taxAmount: 9000,
      grandTotal: 59000,
      paidAmount: 0,
      balanceAmount: 59000,
      paymentStatus: BookingPaymentStatus.UNPAID,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  await prisma.bookingStall.upsert({
    where: { bookingId_stallId: { bookingId: booking3.id, stallId: stall3.id } },
    update: {},
    create: {
      bookingId: booking3.id,
      stallId: stall3.id,
      price: 50000,
    },
  });

  // 9. Sample Notifications for Client User
  await prisma.notification.deleteMany({
    where: { userId: clientUser.id },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: clientUser.id,
        title: 'Booking Confirmed - Stall A-101',
        message: 'Your stall A-101 for AutoTech Expo 2026 is confirmed. Tax invoice INV-2026-8801 generated.',
        type: 'SUCCESS',
      },
      {
        userId: clientUser.id,
        title: '50% Installment Received - Stall A-102',
        message: 'First installment of ₹1,18,000 received for Stall A-102. Balance ₹1,18,000 due before expo date.',
        type: 'INFO',
      },
      {
        userId: clientUser.id,
        title: 'Reservation Active - Stall B-201',
        message: 'Stall B-201 is temporarily held for 15 minutes. Complete payment to secure booking.',
        type: 'WARNING',
      },
    ],
  });

  console.log('✅ Accounts & Sample Data provisioned successfully:');
  console.log('----------------------------------------------------');
  console.log('👤 Client User Data Seeded:');
  console.log(`   Email:        ${clientUser.email}`);
  console.log(`   Password:     UserPassword123!`);
  console.log(`   Company:      ${company.name}`);
  console.log(`   Bookings:     BK-2026-8801 (PAID), BK-2026-8802 (PARTIAL), BK-2026-8803 (PENDING)`);
  console.log(`   Stalls:       A-101, A-102, B-201`);
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
