import { prisma } from '../src/config/db.js';
import { PaymentsService } from '../src/modules/payments/payments.service.js';
import crypto from 'crypto';
import { env } from '../src/config/env.js';

async function runRemainingPaymentTests() {
  console.log('🧪 Starting Remaining-Payment Feature 1 Comprehensive Test Suite...');
  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition: boolean, msg: string) {
    if (!condition) {
      console.error(`❌ FAIL: ${msg}`);
      testsFailed++;
      throw new Error(msg);
    } else {
      console.log(`✅ PASS: ${msg}`);
      testsPassed++;
    }
  }

  // 1. Fetch test companies and users
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const staffUser = await prisma.user.findFirst({ where: { role: 'STAFF' } });
  const clientUser = await prisma.user.findFirst({ where: { role: 'CLIENT', companyId: { not: null } } });
  const otherClientUser = await prisma.user.findFirst({
    where: { role: 'CLIENT', companyId: { not: null, not: clientUser?.companyId } }
  });

  assert(!!adminUser, 'Admin user exists');
  assert(!!staffUser, 'Staff user exists');
  assert(!!clientUser, 'Client user exists with company');
  assert(!!otherClientUser, 'Second client user exists with different company');

  // Find or create test exhibition and stalls
  const expo = await prisma.exhibition.findFirst({ where: { status: 'PUBLISHED' } });
  assert(!!expo, 'Published exhibition exists');

  const floorPlan = await prisma.floorPlan.findFirst({ where: { exhibitionId: expo!.id } });
  assert(!!floorPlan, 'Floor plan exists');

  // Helper to create test stall & booking
  const timestamp = Date.now();
  const testStall = await prisma.stall.create({
    data: {
      floorPlanId: floorPlan!.id,
      stallNumber: `TEST-REM-${timestamp % 100000}`,
      price: 50000,
      areaSqFt: 100,
      width: 60,
      height: 60,
      status: 'AVAILABLE',
    },
  });

  // TEST 1: Fully Unpaid Booking - Authorization & Balance Order
  console.log('\n--- Test 1: Fully Unpaid Booking Balance Order ---');
  const unpaidBooking = await prisma.booking.create({
    data: {
      bookingReference: `BKG-TEST-1-${timestamp % 100000}`,
      companyId: clientUser!.companyId!,
      exhibitionId: expo!.id,
      status: 'PENDING_PAYMENT',
      totalAmount: 50000,
      taxAmount: 9000,
      grandTotal: 59000,
      paidAmount: 0,
      balanceAmount: 59000,
      paymentStatus: 'UNPAID',
      stalls: {
        create: [{ stallId: testStall.id, price: 50000 }],
      },
    },
    include: { stalls: true },
  });

  // Unauthorized client attempt: Other client trying to pay for this booking
  try {
    await PaymentsService.createBalancePaymentOrder(unpaidBooking.id, {
      userId: otherClientUser!.id,
      role: otherClientUser!.role,
      companyId: otherClientUser!.companyId,
      email: otherClientUser!.email,
    });
    assert(false, 'Unauthorized client should be blocked');
  } catch (err: any) {
    assert(err.statusCode === 403, 'Unauthorized client blocked with 403 Forbidden');
  }

  // Authorized client attempt
  const orderClient = await PaymentsService.createBalancePaymentOrder(unpaidBooking.id, {
    userId: clientUser!.id,
    role: clientUser!.role,
    companyId: clientUser!.companyId,
    email: clientUser!.email,
  });
  assert(Number(orderClient.amount) === 59000 * 100, 'Order amount matches grand total in paise (5900000)');
  assert(orderClient.bookingReference === unpaidBooking.bookingReference, 'Order matches booking reference');

  // Authorized Admin attempt
  const orderAdmin = await PaymentsService.createBalancePaymentOrder(unpaidBooking.id, {
    userId: adminUser!.id,
    role: adminUser!.role,
    companyId: adminUser!.companyId,
    email: adminUser!.email,
  });
  assert(!!orderAdmin.razorpayOrderId, 'Admin can generate balance order for client booking');

  // TEST 2: Partially Paid Booking (e.g. ₹59,000 total, ₹20,000 paid, ₹39,000 balance)
  console.log('\n--- Test 2: Partially Paid Booking Balance Order & Authoritative Calculation ---');
  const partialBooking = await prisma.booking.create({
    data: {
      bookingReference: `BKG-TEST-2-${timestamp % 100000}`,
      companyId: clientUser!.companyId!,
      exhibitionId: expo!.id,
      status: 'CONFIRMED',
      totalAmount: 50000,
      taxAmount: 9000,
      grandTotal: 59000,
      paidAmount: 20000,
      balanceAmount: 39000,
      paymentStatus: 'PARTIALLY_PAID',
      stalls: {
        create: [{ stallId: testStall.id, price: 50000 }],
      },
    },
  });

  const partialOrder = await PaymentsService.createBalancePaymentOrder(partialBooking.id, {
    userId: clientUser!.id,
    role: clientUser!.role,
    companyId: clientUser!.companyId,
    email: clientUser!.email,
  });
  assert(Number(partialOrder.amount) === 39000 * 100, 'Balance payment order amount is exactly ₹39,000 in paise');

  // TEST 3: Fully Paid Booking - Should Reject Balance Order
  console.log('\n--- Test 3: Fully Paid Booking Rejection ---');
  const fullyPaidBooking = await prisma.booking.create({
    data: {
      bookingReference: `BKG-TEST-3-${timestamp % 100000}`,
      companyId: clientUser!.companyId!,
      exhibitionId: expo!.id,
      status: 'CONFIRMED',
      totalAmount: 50000,
      taxAmount: 9000,
      grandTotal: 59000,
      paidAmount: 59000,
      balanceAmount: 0,
      paymentStatus: 'PAID_FULL',
      stalls: {
        create: [{ stallId: testStall.id, price: 50000 }],
      },
    },
  });

  try {
    await PaymentsService.createBalancePaymentOrder(fullyPaidBooking.id, {
      userId: clientUser!.id,
      role: clientUser!.role,
      companyId: clientUser!.companyId,
      email: clientUser!.email,
    });
    assert(false, 'Fully paid booking should be rejected');
  } catch (err: any) {
    assert(err.statusCode === 400, 'Fully paid booking rejected with 400 Bad Request');
  }

  // TEST 4: Cancelled or Expired Booking - Should Reject Balance Order
  console.log('\n--- Test 4: Cancelled / Expired Booking Rejection ---');
  const cancelledBooking = await prisma.booking.create({
    data: {
      bookingReference: `BKG-TEST-4-${timestamp % 100000}`,
      companyId: clientUser!.companyId!,
      exhibitionId: expo!.id,
      status: 'CANCELLED',
      totalAmount: 50000,
      taxAmount: 9000,
      grandTotal: 59000,
      paidAmount: 0,
      balanceAmount: 59000,
      paymentStatus: 'UNPAID',
    },
  });

  try {
    await PaymentsService.createBalancePaymentOrder(cancelledBooking.id, {
      userId: clientUser!.id,
      role: clientUser!.role,
      companyId: clientUser!.companyId,
      email: clientUser!.email,
    });
    assert(false, 'Cancelled booking should be rejected');
  } catch (err: any) {
    assert(err.statusCode === 400, 'Cancelled booking rejected with 400 Bad Request');
  }

  // TEST 5: Signature Verification & Concurrency on Balance Payment
  console.log('\n--- Test 5: Invalid Signature Rejection ---');
  try {
    await PaymentsService.verifyAndProcessPayment({
      razorpay_order_id: partialOrder.razorpayOrderId,
      razorpay_payment_id: 'pay_test_fake_123',
      razorpay_signature: 'invalid_forged_signature_hex',
    });
    assert(false, 'Forged signature should fail');
  } catch (err: any) {
    assert(err.statusCode === 400, 'Invalid signature rejected with 400 Bad Request');
  }

  // Clean up test records
  console.log('\n--- Cleaning up test records ---');
  await prisma.payment.deleteMany({
    where: { bookingId: { in: [unpaidBooking.id, partialBooking.id, fullyPaidBooking.id, cancelledBooking.id] } },
  });
  await prisma.bookingStall.deleteMany({
    where: { bookingId: { in: [unpaidBooking.id, partialBooking.id, fullyPaidBooking.id, cancelledBooking.id] } },
  });
  await prisma.booking.deleteMany({
    where: { id: { in: [unpaidBooking.id, partialBooking.id, fullyPaidBooking.id, cancelledBooking.id] } },
  });
  await prisma.stall.delete({ where: { id: testStall.id } });

  console.log(`\n🎉 Summary: ${testsPassed} passed, ${testsFailed} failed.`);
  await prisma.$disconnect();
}

runRemainingPaymentTests().catch(async (e) => {
  console.error('Test error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
