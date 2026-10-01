import {
  PrismaClient,
  UserRole,
  StallCategory,
  StallStatus,
  ExhibitionStatus,
  BookingStatus,
  BookingPaymentStatus,
  PaymentStatus,
  InvoiceStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedFreshData() {
  console.log('🌱 Starting fresh data seeding with 3 new events, exhibitors, bookings, payments, and invoices...');

  const passwordHash = await bcrypt.hash('ExhibitorPass123!', 10);

  // 1. Fetch Global Tech Expo 2026 (the preserved event)
  const globalTechExpo = await prisma.exhibition.findFirst({
    where: { title: { contains: 'Global Tech Expo', mode: 'insensitive' } },
    include: {
      floorPlans: {
        include: { stalls: true },
      },
    },
  });

  if (!globalTechExpo) {
    console.error('❌ Preserved Global Tech Expo 2026 not found.');
    return;
  }

  console.log(`📌 Found preserved event: "${globalTechExpo.title}" (${globalTechExpo.id})`);

  // 2. Create 3 New Events with distinct statuses (PUBLISHED, DRAFT, COMPLETED)
  const newEvents = [
    {
      title: 'AutoTech & EV India Summit 2026',
      slug: 'autotech-ev-india-2026',
      description: 'South Asia’s premier trade fair for electric vehicles, automotive technology, battery innovations, and charging infrastructure.',
      venue: 'BIEC - Bangalore International Exhibition Centre',
      city: 'Bengaluru',
      startDate: new Date('2026-11-10T09:00:00Z'),
      endDate: new Date('2026-11-13T18:00:00Z'),
      status: ExhibitionStatus.PUBLISHED,
      edition: '11',
      eventCode: 'EV',
      spcode: 'ZE06',
      totalStalls: 30,
      bannerUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=80',
    },
    {
      title: 'MediPharma Expo & Health Summit 2027',
      slug: 'medipharma-health-summit-2027',
      description: 'International exhibition on pharmaceutical machinery, medical devices, laboratory tech, and healthcare innovation.',
      venue: 'Pragati Maidan - Hall 5 & 6',
      city: 'New Delhi',
      startDate: new Date('2027-01-15T09:00:00Z'),
      endDate: new Date('2027-01-18T18:00:00Z'),
      status: ExhibitionStatus.DRAFT,
      edition: '12',
      eventCode: 'MP',
      spcode: 'ZE07',
      totalStalls: 25,
      bannerUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80',
    },
    {
      title: 'Renewable Energy Expo 2026',
      slug: 'renewable-energy-expo-2026',
      description: 'Clean energy trade fair showcasing solar PV modules, wind turbines, hydrogen fuel cells, and smart grid systems.',
      venue: 'Chennai Trade Centre - Complex A',
      city: 'Chennai',
      startDate: new Date('2026-08-05T09:00:00Z'),
      endDate: new Date('2026-08-08T18:00:00Z'),
      status: ExhibitionStatus.COMPLETED,
      edition: '09',
      eventCode: 'RE',
      spcode: 'ZE04',
      totalStalls: 20,
      bannerUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80',
    },
  ];

  const createdExhibitions: any[] = [globalTechExpo];

  for (const ev of newEvents) {
    const existing = await prisma.exhibition.findFirst({ where: { slug: ev.slug } });
    if (existing) {
      createdExhibitions.push(existing);
      continue;
    }

    const expo = await prisma.exhibition.create({
      data: {
        title: ev.title,
        slug: ev.slug,
        description: ev.description,
        venue: ev.venue,
        city: ev.city,
        startDate: ev.startDate,
        endDate: ev.endDate,
        status: ev.status,
        edition: ev.edition,
        eventCode: ev.eventCode,
        spcode: ev.spcode,
        totalStalls: ev.totalStalls,
        bannerUrl: ev.bannerUrl,
      },
    });

    // Create a floor plan for each new event
    const floorPlan = await prisma.floorPlan.create({
      data: {
        exhibitionId: expo.id,
        name: 'Main Exhibition Hall Plan',
        width: 1200,
        height: 800,
        gridColumns: 20,
        gridRows: 15,
        isPublished: true,
      },
    });

    // Create sample stalls for this floor plan
    const stallCategories = [StallCategory.STANDARD, StallCategory.PREMIUM, StallCategory.CORNER, StallCategory.ISLAND];
    const prices = [50000, 75000, 95000, 150000];

    const stallsData = [];
    for (let i = 1; i <= ev.totalStalls; i++) {
      const catIdx = i % 4;
      stallsData.push({
        floorPlanId: floorPlan.id,
        stallNumber: `${ev.eventCode}-${String(i).padStart(2, '0')}`,
        category: stallCategories[catIdx],
        price: prices[catIdx],
        areaSqFt: 100 + catIdx * 50,
        width: 10,
        height: 10,
        xPosition: (i % 5) * 12,
        yPosition: Math.floor(i / 5) * 12,
        status: StallStatus.AVAILABLE,
      });
    }

    await prisma.stall.createMany({ data: stallsData });

    const fullExpo = await prisma.exhibition.findUnique({
      where: { id: expo.id },
      include: { floorPlans: { include: { stalls: true } } },
    });
    createdExhibitions.push(fullExpo);
    console.log(`✅ Created Exhibition: "${expo.title}" (${expo.status}) with ${ev.totalStalls} stalls.`);
  }

  // 3. Create Exhibitor Companies & Users
  const exhibitorData = [
    {
      companyCode: 'CMP-NEXUS',
      name: 'Nexus AI Solutions Pvt Ltd',
      contactPerson: 'Aarav Sharma',
      mobile: '+91-9876511111',
      email: 'aarav@nexustech.io',
      address: 'Tech Park Tower B, Whitefield',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560066',
      gstNumber: '29AAAAA1111A1Z5',
      panNumber: 'AAAAA1111A',
      industry: 'Artificial Intelligence & Cloud',
      userEmail: 'aarav@nexustech.io',
      userName: 'Aarav Sharma',
      spcode: 'EX-001',
    },
    {
      companyCode: 'CMP-QUANTUM',
      name: 'Quantum EV & Mobility Systems',
      contactPerson: 'Priya Patel',
      mobile: '+91-9876522222',
      email: 'priya@quantumev.in',
      address: 'MIDC Electronics Zone, Hinjewadi',
      city: 'Pune',
      state: 'Maharashtra',
      pinCode: '411057',
      gstNumber: '27BBBBB2222B2Z6',
      panNumber: 'BBBBB2222B',
      industry: 'Automotive & Electric Vehicles',
      userEmail: 'priya@quantumev.in',
      userName: 'Priya Patel',
      spcode: 'EX-002',
    },
    {
      companyCode: 'CMP-BIOCARE',
      name: 'Biocare Pharma Technologies',
      contactPerson: 'Rohan Verma',
      mobile: '+91-9876533333',
      email: 'r.verma@biocarepharma.com',
      address: 'Okhla Industrial Estate Phase III',
      city: 'New Delhi',
      state: 'Delhi',
      pinCode: '110020',
      gstNumber: '07CCCCC3333C3Z7',
      panNumber: 'CCCCC3333C',
      industry: 'Pharmaceutical Machinery',
      userEmail: 'r.verma@biocarepharma.com',
      userName: 'Rohan Verma',
      spcode: 'EX-003',
    },
    {
      companyCode: 'CMP-SUNGRID',
      name: 'SunGrid Solar Solutions India',
      contactPerson: 'Ananya Rao',
      mobile: '+91-9876544444',
      email: 'ananya@sungrid.co.in',
      address: 'Ambattur Industrial Estate',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pinCode: '600058',
      gstNumber: '33DDDDD4444D4Z8',
      panNumber: 'DDDDD4444D',
      industry: 'Renewable Solar Energy',
      userEmail: 'ananya@sungrid.co.in',
      userName: 'Ananya Rao',
      spcode: 'EX-004',
    },
  ];

  const createdEntities: any[] = [];

  for (const ed of exhibitorData) {
    let company = await prisma.company.findFirst({ where: { companyCode: ed.companyCode } });
    if (!company) {
      company = await prisma.company.create({
        data: {
          companyCode: ed.companyCode,
          name: ed.name,
          contactPerson: ed.contactPerson,
          mobile: ed.mobile,
          email: ed.email,
          address: ed.address,
          city: ed.city,
          state: ed.state,
          pinCode: ed.pinCode,
          country: 'India',
          gstNumber: ed.gstNumber,
          panNumber: ed.panNumber,
          industry: ed.industry,
          spcode: ed.spcode,
        },
      });
    }

    let user = await prisma.user.findUnique({ where: { email: ed.userEmail } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: ed.userEmail,
          passwordHash: passwordHash,
          name: ed.userName,
          phone: ed.mobile,
          role: UserRole.CLIENT,
          companyId: company.id,
          spcode: ed.spcode,
        },
      });
    }

    createdEntities.push({ company, user });
    console.log(`👤 Created Exhibitor: "${ed.name}" (${ed.userEmail})`);
  }

  // 4. Create Bookings, Stalls Assignment, Payments & Invoices
  console.log('📦 Creating bookings, payment transactions, and generated invoices...');

  // Event 0: Global Tech Expo 2026 (Preserved)
  const gteStalls = globalTechExpo.floorPlans.flatMap((fp: any) => fp.stalls);
  const gteStall1 = gteStalls[0] || gteStalls.find((s: any) => s.stallNumber === 'GT-01');
  const gteStall2 = gteStalls[1] || gteStalls.find((s: any) => s.stallNumber === 'GT-02');

  // Booking 1: Confirmed Full Payment on Global Tech Expo
  if (gteStall1) {
    const total = Number(gteStall1.price) || 120000;
    const tax = Math.round(total * 0.18);
    const grandTotal = total + tax;

    const b1 = await prisma.booking.create({
      data: {
        bookingReference: 'BK-GTE-2026-001',
        userId: createdEntities[0].user.id,
        companyId: createdEntities[0].company.id,
        exhibitionId: globalTechExpo.id,
        status: BookingStatus.CONFIRMED,
        paymentStatus: BookingPaymentStatus.PAID_FULL,
        totalAmount: total,
        taxAmount: tax,
        grandTotal: grandTotal,
        paidAmount: grandTotal,
        balanceAmount: 0,
      },
    });

    await prisma.bookingStall.create({
      data: { bookingId: b1.id, stallId: gteStall1.id, price: total },
    });

    await prisma.stall.update({
      where: { id: gteStall1.id },
      data: { status: StallStatus.BOOKED_CONFIRMED },
    });

    const p1 = await prisma.payment.create({
      data: {
        paymentReference: 'PAY-GTE-001-A',
        bookingId: b1.id,
        userId: createdEntities[0].user.id,
        amount: grandTotal,
        status: PaymentStatus.SUCCESS,
        provider: 'RAZORPAY',
        transactionId: 'txn_rzp_gte_10001',
        razorpayOrderId: 'order_gte_10001',
        razorpayPaymentId: 'pay_gte_10001',
        paidAt: new Date('2026-09-15T10:30:00Z'),
      },
    });

    await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2026-GTE-001',
        bookingId: b1.id,
        paymentId: p1.id,
        companyId: createdEntities[0].company.id,
        totalAmount: total,
        taxAmount: tax,
        grandTotal: grandTotal,
        status: InvoiceStatus.PAID,
        issueDate: new Date('2026-09-15T10:35:00Z'),
      },
    });

    console.log(`  └─ Created Confirmed Booking ${b1.bookingReference} with Paid Invoice INV-2026-GTE-001`);
  }

  // Booking 2: Pending Partial Payment on Global Tech Expo
  if (gteStall2) {
    const total = Number(gteStall2.price) || 95000;
    const tax = Math.round(total * 0.18);
    const grandTotal = total + tax;
    const paidPartial = Math.round(grandTotal * 0.4);
    const balance = grandTotal - paidPartial;

    const b2 = await prisma.booking.create({
      data: {
        bookingReference: 'BK-GTE-2026-002',
        userId: createdEntities[1].user.id,
        companyId: createdEntities[1].company.id,
        exhibitionId: globalTechExpo.id,
        status: BookingStatus.PENDING_PAYMENT,
        paymentStatus: BookingPaymentStatus.PARTIALLY_PAID,
        totalAmount: total,
        taxAmount: tax,
        grandTotal: grandTotal,
        paidAmount: paidPartial,
        balanceAmount: balance,
      },
    });

    await prisma.bookingStall.create({
      data: { bookingId: b2.id, stallId: gteStall2.id, price: total },
    });

    await prisma.stall.update({
      where: { id: gteStall2.id },
      data: { status: StallStatus.PAYMENT_PENDING },
    });

    const p2 = await prisma.payment.create({
      data: {
        paymentReference: 'PAY-GTE-002-A',
        bookingId: b2.id,
        userId: createdEntities[1].user.id,
        amount: paidPartial,
        status: PaymentStatus.SUCCESS,
        provider: 'RAZORPAY',
        transactionId: 'txn_rzp_gte_10002',
        razorpayOrderId: 'order_gte_10002',
        razorpayPaymentId: 'pay_gte_10002',
        paidAt: new Date('2026-09-20T14:15:00Z'),
      },
    });

    await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2026-GTE-002',
        bookingId: b2.id,
        paymentId: p2.id,
        companyId: createdEntities[1].company.id,
        totalAmount: total,
        taxAmount: tax,
        grandTotal: grandTotal,
        status: InvoiceStatus.ISSUED,
        issueDate: new Date('2026-09-20T14:20:00Z'),
      },
    });

    console.log(`  └─ Created Pending Payment Booking ${b2.bookingReference} with Issued Invoice INV-2026-GTE-002`);
  }

  // Booking 3: AutoTech EV Expo Booking (Confirmed)
  const autoTechExpo = createdExhibitions.find((e) => e.eventCode === 'EV');
  if (autoTechExpo && autoTechExpo.floorPlans?.[0]?.stalls?.[0]) {
    const stall = autoTechExpo.floorPlans[0].stalls[0];
    const total = 75000;
    const tax = 13500;
    const grandTotal = 88500;

    const b3 = await prisma.booking.create({
      data: {
        bookingReference: 'BK-EV-2026-101',
        userId: createdEntities[1].user.id,
        companyId: createdEntities[1].company.id,
        exhibitionId: autoTechExpo.id,
        status: BookingStatus.CONFIRMED,
        paymentStatus: BookingPaymentStatus.PAID_FULL,
        totalAmount: total,
        taxAmount: tax,
        grandTotal: grandTotal,
        paidAmount: grandTotal,
        balanceAmount: 0,
      },
    });

    await prisma.bookingStall.create({
      data: { bookingId: b3.id, stallId: stall.id, price: total },
    });

    await prisma.stall.update({
      where: { id: stall.id },
      data: { status: StallStatus.BOOKED_CONFIRMED },
    });

    const p3 = await prisma.payment.create({
      data: {
        paymentReference: 'PAY-EV-101-A',
        bookingId: b3.id,
        userId: createdEntities[1].user.id,
        amount: grandTotal,
        status: PaymentStatus.SUCCESS,
        provider: 'RAZORPAY',
        transactionId: 'txn_rzp_ev_20001',
        razorpayOrderId: 'order_ev_20001',
        razorpayPaymentId: 'pay_ev_20001',
        paidAt: new Date('2026-09-22T11:00:00Z'),
      },
    });

    await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2026-EV-101',
        bookingId: b3.id,
        paymentId: p3.id,
        companyId: createdEntities[1].company.id,
        totalAmount: total,
        taxAmount: tax,
        grandTotal: grandTotal,
        status: InvoiceStatus.PAID,
        issueDate: new Date('2026-09-22T11:05:00Z'),
      },
    });

    console.log(`  └─ Created Confirmed Booking ${b3.bookingReference} for AutoTech EV Expo`);
  }

  // Booking 4: Completed Renewable Energy Expo Booking
  const renewExpo = createdExhibitions.find((e) => e.eventCode === 'RE');
  if (renewExpo && renewExpo.floorPlans?.[0]?.stalls?.[0]) {
    const stall = renewExpo.floorPlans[0].stalls[0];
    const total = 95000;
    const tax = 17100;
    const grandTotal = 112100;

    const b4 = await prisma.booking.create({
      data: {
        bookingReference: 'BK-RE-2026-005',
        userId: createdEntities[3].user.id,
        companyId: createdEntities[3].company.id,
        exhibitionId: renewExpo.id,
        status: BookingStatus.CONFIRMED,
        paymentStatus: BookingPaymentStatus.PAID_FULL,
        totalAmount: total,
        taxAmount: tax,
        grandTotal: grandTotal,
        paidAmount: grandTotal,
        balanceAmount: 0,
      },
    });

    await prisma.bookingStall.create({
      data: { bookingId: b4.id, stallId: stall.id, price: total },
    });

    await prisma.stall.update({
      where: { id: stall.id },
      data: { status: StallStatus.BOOKED_CONFIRMED },
    });

    const p4 = await prisma.payment.create({
      data: {
        paymentReference: 'PAY-RE-005-A',
        bookingId: b4.id,
        userId: createdEntities[3].user.id,
        amount: grandTotal,
        status: PaymentStatus.SUCCESS,
        provider: 'RAZORPAY',
        transactionId: 'txn_rzp_re_30001',
        razorpayOrderId: 'order_re_30001',
        razorpayPaymentId: 'pay_re_30001',
        paidAt: new Date('2026-07-28T09:30:00Z'),
      },
    });

    await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2026-RE-005',
        bookingId: b4.id,
        paymentId: p4.id,
        companyId: createdEntities[3].company.id,
        totalAmount: total,
        taxAmount: tax,
        grandTotal: grandTotal,
        status: InvoiceStatus.PAID,
        issueDate: new Date('2026-07-28T09:35:00Z'),
      },
    });

    console.log(`  └─ Created Completed Booking ${b4.bookingReference} for Renewable Energy Expo`);
  }

  console.log('🎉 Successfully populated fresh database with 3 new exhibitions, exhibitor companies, bookings, payments & invoices!');
}

seedFreshData()
  .catch((e) => {
    console.error('❌ Failed to seed fresh data:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
