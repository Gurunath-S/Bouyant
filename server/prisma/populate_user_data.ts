import {
  PrismaClient,
  BookingStatus,
  BookingPaymentStatus,
  PaymentStatus,
  InvoiceStatus,
  StallStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Adding rich sample data for user@buoyantmedia.com (Bookings, Stalls, Payments, Invoices, Notifications)...');

  // 1. Find user@buoyantmedia.com
  const user = await prisma.user.findUnique({
    where: { email: 'user@buoyantmedia.com' },
    include: { company: true },
  });

  if (!user || !user.company) {
    console.error('❌ user@buoyantmedia.com or company not found.');
    return;
  }

  // 2. Find Global Tech Expo 2026
  const globalTechExpo = await prisma.exhibition.findFirst({
    where: { title: { contains: 'Global Tech Expo', mode: 'insensitive' } },
    include: { floorPlans: { include: { stalls: true } } },
  });

  // 3. Find AutoTech & EV Expo 2026
  const evExpo = await prisma.exhibition.findFirst({
    where: { title: { contains: 'AutoTech', mode: 'insensitive' } },
    include: { floorPlans: { include: { stalls: true } } },
  });

  if (!globalTechExpo) {
    console.error('❌ Global Tech Expo 2026 not found.');
    return;
  }

  const gteStalls = globalTechExpo.floorPlans.flatMap((fp) => fp.stalls);
  const availableGteStalls = gteStalls.filter((s) => s.status === StallStatus.AVAILABLE);

  // --- BOOKING 1: Confirmed Booking on Global Tech Expo 2026 ---
  const stall1 = availableGteStalls[0] || gteStalls[2];
  if (stall1) {
    const total = Number(stall1.price) || 120000;
    const tax = Math.round(total * 0.18);
    const grandTotal = total + tax;

    const b1 = await prisma.booking.create({
      data: {
        bookingReference: 'BK-BM-2026-001',
        userId: user.id,
        companyId: user.company.id,
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
      data: { bookingId: b1.id, stallId: stall1.id, price: total },
    });

    await prisma.stall.update({
      where: { id: stall1.id },
      data: { status: StallStatus.BOOKED_CONFIRMED },
    });

    const p1 = await prisma.payment.create({
      data: {
        paymentReference: 'PAY-BM-001-A',
        bookingId: b1.id,
        userId: user.id,
        amount: grandTotal,
        status: PaymentStatus.SUCCESS,
        provider: 'RAZORPAY',
        transactionId: 'txn_rzp_bm_70001',
        razorpayOrderId: 'order_bm_70001',
        razorpayPaymentId: 'pay_bm_70001',
        paidAt: new Date('2026-09-18T11:20:00Z'),
      },
    });

    await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2026-BM-001',
        bookingId: b1.id,
        paymentId: p1.id,
        companyId: user.company.id,
        totalAmount: total,
        taxAmount: tax,
        grandTotal: grandTotal,
        status: InvoiceStatus.PAID,
        issueDate: new Date('2026-09-18T11:25:00Z'),
      },
    });

    console.log(`✅ Created Confirmed Booking BK-BM-2026-001 for ${stall1.stallNumber} (Invoice: INV-2026-BM-001)`);
  }

  // --- BOOKING 2: Pending Payment Booking on AutoTech EV Summit ---
  if (evExpo) {
    const evStalls = evExpo.floorPlans.flatMap((fp) => fp.stalls);
    const evStall = evStalls.find((s) => s.status === StallStatus.AVAILABLE) || evStalls[1];

    if (evStall) {
      const total = Number(evStall.price) || 85000;
      const tax = Math.round(total * 0.18);
      const grandTotal = total + tax;
      const paidPartial = Math.round(grandTotal * 0.5);
      const balance = grandTotal - paidPartial;

      const b2 = await prisma.booking.create({
        data: {
          bookingReference: 'BK-BM-2026-002',
          userId: user.id,
          companyId: user.company.id,
          exhibitionId: evExpo.id,
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
        data: { bookingId: b2.id, stallId: evStall.id, price: total },
      });

      await prisma.stall.update({
        where: { id: evStall.id },
        data: { status: StallStatus.PAYMENT_PENDING },
      });

      const p2 = await prisma.payment.create({
        data: {
          paymentReference: 'PAY-BM-002-A',
          bookingId: b2.id,
          userId: user.id,
          amount: paidPartial,
          status: PaymentStatus.SUCCESS,
          provider: 'RAZORPAY',
          transactionId: 'txn_rzp_bm_70002',
          razorpayOrderId: 'order_bm_70002',
          razorpayPaymentId: 'pay_bm_70002',
          paidAt: new Date('2026-09-24T16:10:00Z'),
        },
      });

      await prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-2026-BM-002',
          bookingId: b2.id,
          paymentId: p2.id,
          companyId: user.company.id,
          totalAmount: total,
          taxAmount: tax,
          grandTotal: grandTotal,
          status: InvoiceStatus.ISSUED,
          issueDate: new Date('2026-09-24T16:15:00Z'),
        },
      });

      console.log(`✅ Created Pending Payment Booking BK-BM-2026-002 for ${evStall.stallNumber} (Invoice: INV-2026-BM-002)`);
    }
  }

  // --- 4. Create Notifications for user@buoyantmedia.com ---
  await prisma.notification.createMany({
    data: [
      {
        userId: user.id,
        title: 'Booking Confirmed! 🎉',
        message: 'Your stall reservation for Global Tech Expo 2026 (Ref: BK-BM-2026-001) has been officially confirmed.',
        type: 'SUCCESS',
        isRead: false,
      },
      {
        userId: user.id,
        title: 'Official Tax Invoice Issued 📄',
        message: 'Invoice INV-2026-BM-001 for ₹1,41,600 has been generated and is available in your Billing Portal.',
        type: 'INFO',
        isRead: false,
      },
      {
        userId: user.id,
        title: 'Payment Received - Installment 1',
        message: 'First installment payment of ₹50,150 for AutoTech EV Expo (Ref: BK-BM-2026-002) was successfully processed via Razorpay.',
        type: 'INFO',
        isRead: true,
      },
      {
        userId: user.id,
        title: 'Pending Balance Reminder ⏰',
        message: 'Remaining balance of ₹50,150 for AutoTech EV Expo is due before November 01, 2026.',
        type: 'WARNING',
        isRead: false,
      },
    ],
  });

  console.log('✅ Created 4 notifications for user@buoyantmedia.com');
  console.log('🎉 Done! user@buoyantmedia.com now has bookings, invoices, stall reservations, payments & notifications.');
}

main()
  .catch((e) => {
    console.error('❌ Error populating user data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
