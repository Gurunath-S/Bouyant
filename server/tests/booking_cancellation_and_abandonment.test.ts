import { prisma } from '../src/config/db.js';
import { BookingsService } from '../src/modules/bookings/bookings.service.js';
import { StallsService } from '../src/modules/stalls/stalls.service.js';
import { BookingStatus, StallStatus, BookingPaymentStatus } from '@prisma/client';

async function runTests() {
  console.log('--- Testing Abandoned Booking Cancellation & Stall Release ---');

  const timestamp = Date.now();

  // Find existing client and company
  const clientUser = await prisma.user.findFirst({
    where: { role: 'CLIENT', companyId: { not: null } },
    include: { company: true },
  });

  if (!clientUser || !clientUser.company) {
    throw new Error('Test requires an existing client user with company.');
  }

  const expo = await prisma.exhibition.findFirst({ where: { status: 'PUBLISHED' } });
  if (!expo) {
    throw new Error('Test requires an existing published exhibition.');
  }

  const floorPlan = await prisma.floorPlan.findFirst({ where: { exhibitionId: expo.id } });
  if (!floorPlan) {
    throw new Error('Test requires an existing floor plan.');
  }

  // Create temporary test stalls
  const stall1 = await prisma.stall.create({
    data: {
      floorPlanId: floorPlan.id,
      stallNumber: `T-CAN-1-${timestamp % 100000}`,
      name: 'Stall T1',
      category: 'STANDARD',
      price: 50000,
      areaSqFt: 100,
      width: 10,
      height: 10,
      status: StallStatus.PAYMENT_PENDING,
      heldByUserId: clientUser.id,
      heldUntil: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  const stall2 = await prisma.stall.create({
    data: {
      floorPlanId: floorPlan.id,
      stallNumber: `T-CAN-2-${timestamp % 100000}`,
      name: 'Stall T2',
      category: 'STANDARD',
      price: 60000,
      areaSqFt: 100,
      width: 10,
      height: 10,
      status: StallStatus.PAYMENT_PENDING,
      heldByUserId: clientUser.id,
      heldUntil: new Date(Date.now() - 1000), // Already expired hold
    },
  });

  let booking1Id = '';
  let booking2Id = '';

  try {
    // ----------------------------------------------------
    // Scenario 1: Active Booking Cancellation on Dropped Checkout / Exit
    // ----------------------------------------------------
    console.log('\n--- Test 1: User drops checkout and cancels booking ---');
    const booking1 = await prisma.booking.create({
      data: {
        bookingReference: `BK-TEST-CANCEL-${timestamp % 100000}`,
        companyId: clientUser.company.id,
        exhibitionId: expo.id,
        status: BookingStatus.PENDING_PAYMENT,
        paymentStatus: BookingPaymentStatus.UNPAID,
        totalAmount: 50000,
        taxAmount: 9000,
        grandTotal: 59000,
        balanceAmount: 59000,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        stalls: {
          create: [{ stallId: stall1.id, price: 50000 }],
        },
      },
    });
    booking1Id = booking1.id;

    const cancelResult = await BookingsService.cancelBooking(booking1.id, {
      userId: clientUser.id,
      role: 'CLIENT',
      companyId: clientUser.company.id,
    });

    if (cancelResult.booking.status !== 'CANCELLED') {
      throw new Error(`Expected booking status to be CANCELLED, got ${cancelResult.booking.status}`);
    }
    console.log('✅ PASS: Booking status updated to CANCELLED');

    const updatedStall1 = await prisma.stall.findUnique({ where: { id: stall1.id } });
    if (updatedStall1?.status !== 'AVAILABLE' || updatedStall1?.heldUntil !== null || updatedStall1?.heldByUserId !== null) {
      throw new Error(`Expected stall to be AVAILABLE with cleared hold, got status=${updatedStall1?.status}`);
    }
    console.log('✅ PASS: Stall reset to AVAILABLE with nullified holds');

    // ----------------------------------------------------
    // Scenario 2: Idempotent cancellation
    // ----------------------------------------------------
    console.log('\n--- Test 2: Idempotent cancellation check ---');
    const idempotentResult = await BookingsService.cancelBooking(booking1.id, {
      userId: clientUser.id,
      role: 'CLIENT',
      companyId: clientUser.company.id,
    });
    if (idempotentResult.booking.status !== 'CANCELLED') {
      throw new Error('Idempotent cancellation failed');
    }
    console.log('✅ PASS: Idempotent cancellation succeeded');

    // ----------------------------------------------------
    // Scenario 3: Automatic Hold Expiration cleans up unconfirmed booking
    // ----------------------------------------------------
    console.log('\n--- Test 3: Expired hold worker cleans up unfulfilled booking ---');
    const booking2 = await prisma.booking.create({
      data: {
        bookingReference: `BK-TEST-EXPIRED-${timestamp % 100000}`,
        companyId: clientUser.company.id,
        exhibitionId: expo.id,
        status: BookingStatus.PENDING_PAYMENT,
        paymentStatus: BookingPaymentStatus.UNPAID,
        totalAmount: 60000,
        taxAmount: 10800,
        grandTotal: 70800,
        balanceAmount: 70800,
        expiresAt: new Date(Date.now() - 1000), // Expired
        stalls: {
          create: [{ stallId: stall2.id, price: 60000 }],
        },
      },
    });
    booking2Id = booking2.id;

    const releasedCount = await StallsService.releaseExpiredHolds();
    if (releasedCount < 1) {
      throw new Error(`Expected at least 1 stall released, got ${releasedCount}`);
    }

    const updatedBooking2 = await prisma.booking.findUnique({ where: { id: booking2.id } });
    if (updatedBooking2?.status !== 'CANCELLED') {
      throw new Error(`Expected expired booking to be marked CANCELLED, got ${updatedBooking2?.status}`);
    }
    console.log('✅ PASS: Abandoned expired booking marked CANCELLED');

    const updatedStall2 = await prisma.stall.findUnique({ where: { id: stall2.id } });
    if (updatedStall2?.status !== 'AVAILABLE') {
      throw new Error(`Expected expired stall to be reset to AVAILABLE, got ${updatedStall2?.status}`);
    }
    console.log('✅ PASS: Expired stall reset to AVAILABLE');

    console.log('\n🎉 ALL CANCELLATION & ABANDONMENT TESTS PASSED! (0 failures)');
  } finally {
    // Cleanup
    if (booking1Id || booking2Id) {
      await prisma.bookingStall.deleteMany({
        where: { bookingId: { in: [booking1Id, booking2Id].filter(Boolean) } },
      });
      await prisma.booking.deleteMany({
        where: { id: { in: [booking1Id, booking2Id].filter(Boolean) } },
      });
    }
    await prisma.stall.deleteMany({
      where: { id: { in: [stall1.id, stall2.id] } },
    });
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
