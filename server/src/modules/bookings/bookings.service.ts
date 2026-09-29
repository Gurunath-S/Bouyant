import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/apiError.js';
import { CreateBookingInput } from './bookings.schemas.js';
import { StallsService } from '../stalls/stalls.service.js';
import { StallStatus,BookingStatus,PaymentStatus} from '@prisma/client';
import { Prisma,Stall} from '@prisma/client';
import { generateReference } from '../../utils/reference.js';
import { AuthenticatedRequest } from '../../middlewares/auth.js';
import { razorpay } from '../../config/razorpay.js';
import { env } from '../../config/env.js';
export class BookingsService {
  /**
   * CREATE BOOKING WITH STRICT CONCURRENCY & AUTHORITATIVE SERVER PRICING
   */
  // static async createBooking(userId: string, input: CreateBookingInput) {
  //   // 1. Release expired holds first
  //   await StallsService.releaseExpiredHolds();

  //   // 2. Resolve target User & Company
  //   const user = await prisma.user.findUnique({
  //     where: { id: userId },
  //     include: { company: true },
  //   });

  //   if (!user) throw ApiError.notFound('User account not found.');

  //   const targetCompanyId = input.companyId || user.companyId;
  //   if (!targetCompanyId) {
  //     throw ApiError.badRequest('Please complete your Company Profile before making a stall booking.');
  //   }

  //   // Verify Exhibition status & current upcoming active event rule
  //   const exhibition = await prisma.exhibition.findUnique({
  //     where: { id: input.exhibitionId },
  //   });
  //   if (!exhibition) throw ApiError.notFound('Exhibition event not found.');

  //   const now = new Date();

  //   // SINGLE ACTIVE UPCOMING EVENT RULE:
  //   // Only the single current active published upcoming exhibition allows bookings
  //   const currentUpcomingEvent = await prisma.exhibition.findFirst({
  //     where: {
  //       status: 'PUBLISHED',
  //       endDate: { gte: now },
  //     },
  //     orderBy: { startDate: 'asc' },
  //   });

  //   if (currentUpcomingEvent && exhibition.id !== currentUpcomingEvent.id) {
  //     throw ApiError.badRequest(
  //       `Stall bookings are strictly restricted to the current upcoming event ("${currentUpcomingEvent.title}"). Bookings for this exhibition are closed.`
  //     );
  //   }

  //   if (exhibition.status === 'COMPLETED') {
  //     throw ApiError.badRequest('This exhibition has concluded. Stall bookings are closed.');
  //   }
  //   if (exhibition.status === 'CANCELLED') {
  //     throw ApiError.badRequest('This exhibition is cancelled. Stall bookings are not accepted.');
  //   }
  //   const isAdminUser = user.role === 'ADMIN' || user.role === 'SUPERADMIN';
  //   if (exhibition.status === 'DRAFT' && !isAdminUser) {
  //     throw ApiError.badRequest('This exhibition is in draft mode and not yet published for booking.');
  //   }

  //   const bookingDeadline = exhibition.bookingEndDate
  //     ? new Date(exhibition.bookingEndDate)
  //     : new Date(exhibition.startDate.getTime() - 15 * 24 * 60 * 60 * 1000);

  //   if (now > bookingDeadline) {
  //     throw ApiError.badRequest(
  //       `Stall bookings for this exhibition closed on ${bookingDeadline.toLocaleDateString()}. New reservations are no longer accepted.`
  //     );
  //   }

  //   if (now > exhibition.endDate) {
  //     throw ApiError.badRequest('This exhibition event has ended. Stall bookings are closed.');
  //   }

  //   // Sort stall IDs deterministically to prevent multi-stall deadlocks (PostgreSQL 40P01)
  //   const sortedStallIds = [...input.stallIds].sort();

  //   // 1. Idempotency Check: Return existing booking if idempotencyKey is provided
  //   if (input.idempotencyKey) {
  //     const existingIdempotentBooking = await prisma.booking.findUnique({
  //       where: { idempotencyKey: input.idempotencyKey },
  //       include: {
  //         stalls: { include: { stall: true } },
  //         exhibition: true,
  //         company: true,
  //         user: { select: { id: true, name: true, email: true, role: true, spcode: true } },
  //       },
  //     });
  //     if (existingIdempotentBooking) {
  //       return existingIdempotentBooking;
  //     }
  //   }

  //   // 2. Prevent duplicate active pending booking for the exact same stalls by the same user
  //   const existingActiveBooking = await prisma.booking.findFirst({
  //     where: {
  //       userId,
  //       status: { in: ['INITIATED', 'PENDING_PAYMENT'] },
  //       stalls: { some: { stallId: { in: sortedStallIds } } },
  //     },
  //     include: {
  //       stalls: { include: { stall: true } },
  //       exhibition: true,
  //       company: true,
  //       user: { select: { id: true, name: true, email: true, role: true, spcode: true } },
  //     },
  //   });
  //   if (existingActiveBooking) {
  //     return existingActiveBooking;
  //   }

  //   // 3. Verify Stalls & Exhibition
  //   const stalls = await prisma.stall.findMany({
  //     where: { id: { in: sortedStallIds } },
  //     include: { floorPlan: true },
  //   });

  //   if (stalls.length !== sortedStallIds.length) {
  //     throw ApiError.notFound('One or more target stalls not found.');
  //   }

  //   for (const stall of stalls) {
  //     if (stall.floorPlan.exhibitionId !== input.exhibitionId) {
  //       throw ApiError.badRequest(`Stall ${stall.stallNumber} does not belong to this exhibition event.`);
  //     }
  //     if (stall.status === 'BOOKED_CONFIRMED' || stall.status === 'BLOCKED') {
  //       throw ApiError.conflict(`Stall ${stall.stallNumber} is no longer available for booking.`);
  //     }
  //     if (stall.status === 'TEMPORARILY_HELD' && stall.heldByUserId && stall.heldByUserId !== userId) {
  //       throw ApiError.conflict(`Stall ${stall.stallNumber} is currently held by another user. Please select another stall.`);
  //     }
  //   }

  //   // 4. Server-calculated Authoritative Pricing
  //   const basePrice = stalls.reduce((sum, stall) => sum.add(new Prisma.Decimal(stall.price.toString())), new Prisma.Decimal(0));
  //   const taxRate = new Prisma.Decimal('0.18'); // 18% Tax / GST
  //   const taxAmount = basePrice.mul(taxRate);
  //   const grandTotal = basePrice.add(taxAmount);

  //   const bookingRef = generateReference('BKG', 6);

  //   // 5. ATOMIC POSTGRESQL TRANSACTION WITH DETERMINISTIC SORTED LOCK ORDER
  //   return await prisma.$transaction(async (tx) => {
  //     // Re-verify and lock stalls atomically within transaction using sorted IDs
  //     const currentStalls = await tx.stall.findMany({
  //       where: { id: { in: sortedStallIds } },
  //       orderBy: { id: 'asc' }, // Explicit deterministic lock order
  //     });

  //     for (const currentStall of currentStalls) {
  //       if (currentStall.status === 'BOOKED_CONFIRMED' || currentStall.status === 'BLOCKED') {
  //         throw ApiError.conflict(`Double Booking Conflict: Stall ${currentStall.stallNumber} was confirmed by another client moments ago.`);
  //       }
  //       if (
  //         currentStall.status === 'TEMPORARILY_HELD' &&
  //         currentStall.heldByUserId &&
  //         currentStall.heldByUserId !== userId
  //       ) {
  //         throw ApiError.conflict(`Stall Hold Conflict: Another client has held Stall ${currentStall.stallNumber}.`);
  //       }
  //     }

  //     const isAdminUser = user.role === 'ADMIN' || user.role === 'SUPERADMIN';
  //     const isDirectConfirm = input.confirmDirectly && isAdminUser;

  //     if (isDirectConfirm) {
  //       // Direct Admin Allocation: atomically update only if available/held
  //       const updateResult = await tx.stall.updateMany({
  //         where: {
  //           id: { in: sortedStallIds },
  //           OR: [
  //             { status: 'AVAILABLE' },
  //             { status: 'TEMPORARILY_HELD' },
  //           ],
  //         },
  //         data: {
  //           status: 'BOOKED_CONFIRMED',
  //           heldUntil: null,
  //           heldByUserId: null,
  //         },
  //       });

  //       if (updateResult.count !== sortedStallIds.length) {
  //         throw ApiError.conflict('Double Booking Conflict: One or more selected stalls were booked or held by another user just now.');
  //       }

  //       const booking = await tx.booking.create({
  //         data: {
  //           bookingReference: bookingRef,
  //           idempotencyKey: input.idempotencyKey || null,
  //           userId,
  //           companyId: targetCompanyId,
  //           exhibitionId: input.exhibitionId,
  //           status: 'CONFIRMED',
  //           paymentStatus: 'PAID_FULL',
  //           totalAmount: basePrice,
  //           taxAmount,
  //           grandTotal,
  //           paidAmount: grandTotal,
  //           balanceAmount: new Prisma.Decimal(0),
  //           stalls: {
  //             create: stalls.map((s) => ({
  //               stallId: s.id,
  //               price: new Prisma.Decimal(s.price.toString()),
  //             })),
  //           },
  //         },
  //         include: {
  //           stalls: { include: { stall: true } },
  //           exhibition: true,
  //           company: true,
  //           user: { select: { id: true, name: true, email: true, role: true, spcode: true } },
  //         },
  //       });

  //       // Create Payment Record for Admin Allocation
  //       const paymentRef = generateReference('PAY', 8, false);
  //       const payment = await tx.payment.create({
  //         data: {
  //           paymentReference: paymentRef,
  //           bookingId: booking.id,
  //           userId,
  //           amount: grandTotal,
  //           currency: 'INR',
  //           status: 'SUCCESS',
  //           provider: 'OFFLINE_ADMIN',
  //           paymentMethod: input.paymentMethod || 'ADMIN_DIRECT_ALLOCATION',
  //           paidAt: new Date(),
  //         },
  //       });

  //       // Generate Invoice
  //       const invoiceNum = generateReference('INV', 6);
  //       await tx.invoice.create({
  //         data: {
  //           invoiceNumber: invoiceNum,
  //           bookingId: booking.id,
  //           paymentId: payment.id,
  //           companyId: targetCompanyId,
  //           totalAmount: basePrice,
  //           taxAmount,
  //           grandTotal,
  //           status: 'PAID',
  //           issueDate: new Date(),
  //         },
  //       });

  //       return booking;
  //     }

  //     // Standard / Client Hold Flow: Atomically claim stalls for payment pending using sorted IDs
  //     const updateResult = await tx.stall.updateMany({
  //       where: {
  //         id: { in: sortedStallIds },
  //         OR: [
  //           { status: 'AVAILABLE' },
  //           { status: 'TEMPORARILY_HELD', heldByUserId: userId },
  //         ],
  //       },
  //       data: {
  //         status: 'PAYMENT_PENDING',
  //         heldUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 mins to complete payment
  //         heldByUserId: userId,
  //       },
  //     });

  //     if (updateResult.count !== sortedStallIds.length) {
  //       throw ApiError.conflict('Double Booking Conflict: One or more selected stalls are no longer available for booking.');
  //     }

  //     // Create Booking record with Idempotency Key
  //     const booking = await tx.booking.create({
  //       data: {
  //         bookingReference: bookingRef,
  //         idempotencyKey: input.idempotencyKey || null,
  //         userId,
  //         companyId: targetCompanyId,
  //         exhibitionId: input.exhibitionId,
  //         status: 'PENDING_PAYMENT',
  //         totalAmount: basePrice,
  //         taxAmount,
  //         grandTotal,
  //         expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  //         stalls: {
  //           create: stalls.map((s) => ({
  //             stallId: s.id,
  //             price: new Prisma.Decimal(s.price.toString()),
  //           })),
  //         },
  //       },
  //       include: {
  //         stalls: { include: { stall: true } },
  //         exhibition: true,
  //         company: true,
  //         user: { select: { id: true, name: true, email: true, role: true, spcode: true } },
  //       },
  //     });

  //     // Initialize Payment Record
  //     const paymentRef = generateReference('PAY', 8, false);
  //     await tx.payment.create({
  //       data: {
  //         paymentReference: paymentRef,
  //         bookingId: booking.id,
  //         userId,
  //         amount: grandTotal,
  //         currency: 'INR',
  //         status: 'PENDING',
  //         provider: 'RAZORPAY',
  //       },
  //     });

  //     return booking;
  //   });
  // }

   /*
   Booking Calculation 
   */

  static calculate(
    stalls: Stall[],
    user: AuthenticatedRequest['user'],
    input: CreateBookingInput
  ) {
    // 1. Calculate TOTAL booking base price
    const basePrice = stalls.reduce(
      (sum, stall) =>
        sum.add(new Prisma.Decimal(stall.price.toString())),
      new Prisma.Decimal(0)
    );

    // --------------------------------------------------
    // 2. Check discount permission
    // --------------------------------------------------

    const canApplyDiscount = [
      'ADMIN',
      'SUPERADMIN',
      'STAFF',
    ].includes(user?.role ?? '');

    let discountAmount = new Prisma.Decimal(0);

    if (input.discountAmount !== undefined) {
      if (!canApplyDiscount) {
        throw ApiError.forbidden(
          'You are not authorized to apply a discount.'
        );
      }

      const requestedDiscount = new Prisma.Decimal(
        input.discountAmount
      );

      if (requestedDiscount.lt(0)) {
        throw ApiError.badRequest(
          'Discount amount cannot be negative.'
        );
      }

      // IMPORTANT:
      // Discount is compared with FULL booking base price
      if (requestedDiscount.gte(basePrice)) {
        throw ApiError.badRequest(
          'Discount cannot be greater than or equal to the booking amount.'
        );
      }

      discountAmount = requestedDiscount;
    }

    // --------------------------------------------------
    // 3. Calculate FULL BOOKING GRAND TOTAL
    // --------------------------------------------------

    const discountedBookingAmount = basePrice.sub(
      discountAmount
    );

    const taxRate = new Prisma.Decimal('0.18');

    const bookingTaxAmount = discountedBookingAmount.mul(
      taxRate
    );

    const grandTotal = discountedBookingAmount.add(
      bookingTaxAmount
    );

    // --------------------------------------------------
    // 4. Determine CURRENT PAYMENT amount
    // --------------------------------------------------

    let paymentBaseAmount = basePrice;

    if (input.paymentType === 'Partial') {
      if (input.percentage === undefined) {
        throw ApiError.badRequest(
          'Percentage is required for partial payment.'
        );
      }

      const percentage = new Prisma.Decimal(input.percentage);

      paymentBaseAmount = basePrice
        .mul(percentage)
        .div(100);
    }

    // --------------------------------------------------
    // 5. Apply discount to CURRENT PAYMENT
    // --------------------------------------------------

    const discountedAmount = paymentBaseAmount.sub(
      discountAmount
    );

    // --------------------------------------------------
    // 6. GST for CURRENT PAYMENT
    // --------------------------------------------------

    const taxAmount = discountedAmount.mul(taxRate);

    // --------------------------------------------------
    // 7. CURRENT PAYMENT AMOUNT
    // --------------------------------------------------

    const payableAmount = discountedAmount.add(
      taxAmount
    );

    return {
      basePrice,

      // Full booking values
      discountAmount,
      discountedBookingAmount,
      bookingTaxAmount,
      grandTotal,

      // Current transaction values
      paymentBaseAmount,
      discountedAmount,
      taxAmount,
      payableAmount,
    };
  }

private static validateStalls(
  stalls: Array<{
    id: string;
    stallNumber: string;
    status: string;
    heldUntil: Date | null;
    floorPlan: {
      exhibitionId: string;
    };
  }>,
  exhibitionId: string,
  user: AuthenticatedRequest['user']
) {
  const canBookBlockedStalls = [
    'ADMIN',
    'SUPERADMIN',
    'STAFF',
  ].includes(user?.role ?? '');

  for (const stall of stalls) {
    // Exhibition validation
    if (stall.floorPlan.exhibitionId !== exhibitionId) {
      throw ApiError.badRequest(
        `Stall ${stall.stallNumber} does not belong to this exhibition event.`
      );
    }

    // BOOKED_CONFIRMED is always unavailable
    if (stall.status === 'BOOKED_CONFIRMED') {
      throw ApiError.conflict(
        `Stall ${stall.stallNumber} is already booked.`
      );
    }

    // BLOCKED can be booked only by ADMIN/SUPERADMIN/STAFF
    if (stall.status === 'BLOCKED' && !canBookBlockedStalls) {
      throw ApiError.conflict(
        `Stall ${stall.stallNumber} is blocked and cannot be booked.`
      );
    }

    // Check active payment hold
    if (stall.status === 'PAYMENT_PENDING') {
      const isExpired =
        !stall.heldUntil ||
        stall.heldUntil.getTime() <= Date.now();

      if (!isExpired) {
        throw ApiError.conflict(
          `Stall ${stall.stallNumber} is currently being held for another booking.`
        );
      }
    }
  }
}
  /**
   * Helper: Validates exhibition existence, published status, and 15-day pre-event cutoff
   */
  private static async validateExhibitionBookingWindow(exhibitionId: string) {
    const exhibition = await prisma.exhibition.findUnique({
      where: { id: exhibitionId },
    });

    if (!exhibition) {
      throw ApiError.notFound('Exhibition event not found.');
    }

    // A. Block if DRAFT, CANCELLED, or COMPLETED (Only PUBLISHED exhibitions can be booked)
    if (exhibition.status === 'DRAFT') {
      throw ApiError.badRequest('This exhibition is still in draft mode and not yet open for stall bookings.');
    }

    if (exhibition.status === 'CANCELLED') {
      throw ApiError.badRequest('This exhibition event has been cancelled. Stall bookings are closed.');
    }

    if (exhibition.status === 'COMPLETED') {
      throw ApiError.badRequest('This exhibition event is already completed. Stall bookings are closed.');
    }

    const now = new Date();
    const eventStartDate = new Date(exhibition.startDate);

    // B. Safety check: Has event already started or completed?
    if (now >= eventStartDate) {
      throw ApiError.badRequest('This exhibition event has already started. Stall bookings are closed.');
    }

    // C. Strict 15-day cutoff: (startDate - 15 days in milliseconds)
    const bookingCutoffDeadline = new Date(eventStartDate.getTime() - 15 * 24 * 60 * 60 * 1000);
    bookingCutoffDeadline.setHours(23, 59, 59, 999); // <--- (Allows booking until 11:59:59 PM of that day)

    // D. Block booking if current date has crossed the 15-day cutoff
    if (now > bookingCutoffDeadline) {
      const formattedDeadline = bookingCutoffDeadline.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      throw ApiError.badRequest(
        `Stall booking for this exhibition is closed. The deadline was ${formattedDeadline} (bookings strictly close 15 days prior to event start).`
      );
    }

    return exhibition;
  }


  /**
   * CREATE BOOKING WITH STRICT CONCURRENCY & AUTHORITATIVE SERVER PRICING
   */
//   static async createBooking(user: AuthenticatedRequest['user'], input: CreateBookingInput) {

//     // 1. Release expired holds first
//     // await StallsService.releaseExpiredHolds();

//     // 2. Verify Exhibition & 15-Day Booking Window (Helper)

//     await BookingsService.validateExhibitionBookingWindow(input.exhibitionId);

//     const company = await prisma.company.findUnique({
//       where: { id: input.companyId },
//     });

//     if (!company) {
//       throw ApiError.badRequest(
//         'Company not found. Please complete your Company Profile before making a stall booking.'
//       );
//     }
//     // 4. Verify Stalls & Exhibition

//     const stalls = await prisma.stall.findMany({
//       where: { id: { in: input.stallIds } },
//       include: { floorPlan: true },
//     });

//     if (stalls.length !== input.stallIds.length) {
//       throw ApiError.notFound('One or more target stalls not found.');
//     }

//     for (const stall of stalls) {
//       if (stall.floorPlan.exhibitionId !== input.exhibitionId) {
//         throw ApiError.badRequest(`Stall ${stall.stallNumber} does not belong to this exhibition event.`);
//       }
//       if (stall.status === 'BOOKED_CONFIRMED' || stall.status === 'BLOCKED') {
//         throw ApiError.conflict(`Stall ${stall.stallNumber} is no longer available for booking.`);
//       }

//       // if (stall.status === 'TEMPORARILY_HELD' && stall.heldByUserId && stall.heldByUserId !== input.companyId) {
//       //   throw ApiError.conflict(`Stall ${stall.stallNumber} is currently held by another user. Please select another stall.`);
//       // }
//     }

//     // 5. Server-calculated Authoritative Pricing

//     const result = BookingsService.calculate(stalls, user, input);

//     const bookingRef = `BKG-2026-${Math.floor(1000 + Math.random() * 9000)}`;

//     // // 6. ATOMIC POSTGRESQL TRANSACTION (DOUBLE-BOOKING PROTECTION)

//     return await prisma.$transaction(async (tx) => {

//       // Re-verify and lock stalls atomically within transaction

//       const currentStalls = await tx.stall.findMany({
//         where: { id: { in: input.stallIds } },
//       });

//       for (const currentStall of currentStalls) {
//         if (currentStall.status === 'BOOKED_CONFIRMED' || currentStall.status === 'BLOCKED') {
//           throw ApiError.conflict(`Double Booking Conflict: Stall ${currentStall.stallNumber} was confirmed by another client moments ago.`);
//         }
//         // if (
//         //   currentStall.status === 'TEMPORARILY_HELD' &&
//         //   currentStall.heldByUserId &&
//         //   currentStall.heldByUserId !== input.companyId
//         // ) {
//         //   throw ApiError.conflict(`Stall Hold Conflict: Another client has held Stall ${currentStall.stallNumber}.`);
//         // }
//       }

//       // Update stall statuses to PAYMENT_PENDING
//       await tx.stall.updateMany({
//         where: { id: { in: input.stallIds } },
//         data: {
//           status:"PAYMENT_PENDING",
//           heldUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 mins to complete payment
//           heldByUserId: input.companyId,
//         },
//       });

//       // Create Booking record

//       // Store the remaining balance after each successful payment.
//       // Subtract the current payment amount from the balance and update the remaining amount.
//       // If the balance becomes 0, mark the booking as fully paid;
//       // otherwise, store the remaining balance for the next payment.

//       const booking = await tx.booking.create({
//         data: {
//           bookingReference: bookingRef,
//           companyId: input.companyId,
//           exhibitionId: input.exhibitionId,
//           status: 'PENDING_PAYMENT',
//           totalAmount: result.basePrice,
//           taxAmount: result.bookingTaxAmount,
//           grandTotal: result.grandTotal,
//           balanceAmount: result.grandTotal,
//           discountAmount: input.discountAmount,
//           discountType: input.discountType,
//           expiresAt: new Date(Date.now() + 15 * 60 * 1000),
//           stalls: {
//             create: stalls.map((s) => ({
//               stallId: s.id,
//               price: new Prisma.Decimal(s.price.toString())
//             }))
//           }
//         },
//         include: {
//           stalls: { include: { stall: true } },
//           exhibition: true,
//           company: true,

//         },
//       });

//       // razorpay orderCreation  
//       const razorpayAmount = result.payableAmount.mul(100).toNumber();

//       const razorpayOrder = await razorpay.orders.create({
//         amount: razorpayAmount,
//         currency: 'INR',
//         receipt: bookingRef,
//       });

//       // Initialize Payment Record
//       // const paymentRef = `PAY-${Math.floor(10000 + Math.random() * 90000)}`;
//       // await tx.payment.create({
//       //   data: {
//       //     paymentReference: paymentRef,
//       //     bookingId: booking.id,
//       //     amount: grandTotal,
//       //     currency: 'INR',
//       //     status: 'PENDING',
//       //     provider: 'RAZORPAY',
//       //   },
//       // });

//       return {
//   booking,
//   razorpayOrderId: razorpayOrder.id,
//   razorpayKeyId: "rzp_test_TUQoPoDakOeGn7",
//   amount: razorpayOrder.amount,
//   currency: razorpayOrder.currency,
// };
//     });
//   }
static async createBooking(
  user: AuthenticatedRequest['user'],
  input: CreateBookingInput
) {
  // ==================================================
  // 1. Validate exhibition booking window
  // ==================================================

  await BookingsService.validateExhibitionBookingWindow(
    input.exhibitionId
  );

  // ==================================================
  // 2. Validate company
  // ==================================================

  const company = await prisma.company.findUnique({
    where: {
      id: input.companyId,
    },
  });

  if (!company) {
    throw ApiError.badRequest(
      'Company not found. Please complete your Company Profile before making a stall booking.'
    );
  }

  // ==================================================
  // 3. Get selected stalls
  // ==================================================

  const stalls = await prisma.stall.findMany({
    where: {
      id: {
        in: input.stallIds,
      },
    },
    include: {
      floorPlan: true,
    },
  });

  if (stalls.length !== input.stallIds.length) {
    throw ApiError.notFound(
      'One or more selected stalls were not found.'
    );
  }

  // ==================================================
  // 4. Validate stall exhibition
  // ==================================================

  for (const stall of stalls) {
    if (stall.floorPlan.exhibitionId !== input.exhibitionId) {
      throw ApiError.badRequest(
        `Stall ${stall.id} does not belong to the selected exhibition.`
      );
    }
  }

  // ==================================================
  // 5. Validate stall status
  //
  // TESTING FLOW:
  //
  // AVAILABLE          -> allow
  // TEMPORARILY_HELD    -> allow
  //
  // BLOCKED:
  // ADMIN/SUPERADMIN/STAFF -> allow
  // NORMAL USER            -> reject
  // ==================================================

  const canBookBlockedStalls = [
    'ADMIN',
    'SUPERADMIN',
    'STAFF',
  ].includes(user?.role ?? '');

  for (const stall of stalls) {

    const isPaymentPending =
      stall.status === StallStatus.TEMPORARILY_HELD;

    const isBlocked =
      stall.status === StallStatus.BLOCKED;

    if (isPaymentPending) {
      continue;
    }

    if (isBlocked && canBookBlockedStalls) {
      continue;
    }

    throw ApiError.conflict(
      `Stall ${stall.id} is currently ${stall.status}.`
    );
  }

  // ==================================================
  // 6. Server-side price calculation
  // ==================================================

  const result = BookingsService.calculate(
    stalls,
    user,
    input
  );
 
  // ==================================================
  // 7. Generate booking reference
  // ==================================================

  const bookingRef = `BKG-2026-${crypto
    .randomUUID()
    .replace(/-/g, '')
    .substring(0, 10)
    .toUpperCase()}`;

  // ==================================================
  // 8. Existing hold timer
  //
  // IMPORTANT:
  // For this testing version we are NOT creating a
  // new Redis hold here.
  //
  // If stall is already PAYMENT_PENDING, we keep it.
  // ==================================================

  const existingPaymentPendingStall =
    stalls.find(
      (stall) =>
        stall.status === StallStatus.TEMPORARILY_HELD
    );

  const holdUntil =
    existingPaymentPendingStall?.heldUntil ??
    new Date(Date.now() + 15 * 60 * 1000);

  // ==================================================
  // 9. DATABASE TRANSACTION
  // ==================================================

  const transactionResult =
    await prisma.$transaction(
      async (tx) => {
        // ----------------------------------------------
        // Re-fetch stalls inside transaction
        // ----------------------------------------------

        const currentStalls =
          await tx.stall.findMany({
            where: {
              id: {
                in: input.stallIds,
              },
            },
            include: {
              floorPlan: true,
            },
          });

        if (
          currentStalls.length !==
          input.stallIds.length
        ) {
          throw ApiError.notFound(
            'One or more selected stalls no longer exist.'
          );
        }

        // ----------------------------------------------
        // Validate exhibition again
        // ----------------------------------------------

        for (const stall of currentStalls) {
          if (
            stall.floorPlan.exhibitionId !==
            input.exhibitionId
          ) {
            throw ApiError.badRequest(
              `Stall ${stall.id} does not belong to the selected exhibition.`
            );
          }
        }

        // ----------------------------------------------
        // Validate current status again
        //
        // AVAILABLE
        // PAYMENT_PENDING
        // BLOCKED for admin/staff
        // ----------------------------------------------

        for (const stall of currentStalls) {
     
          const isPaymentPending =
            stall.status ===
            StallStatus.TEMPORARILY_HELD;

          const isBlocked =
            stall.status === StallStatus.BLOCKED;

          if (isPaymentPending) {
            continue;
          }

          if (isBlocked && canBookBlockedStalls) {
            continue;
          }

          throw ApiError.conflict(
            `Stall ${stall.id} is no longer available for booking.`
          );
        }

        // ----------------------------------------------
        // IMPORTANT:
        //
        // We are NOT changing the stall to
        // PAYMENT_PENDING again here.
        //
        // The stall is already PAYMENT_PENDING
        // from your previous flow.
        //
        // For testing, we only make sure the stall
        // is in an acceptable state.
        // ----------------------------------------------

        // ----------------------------------------------
        // Create Booking
        // ----------------------------------------------

        const booking =
          await tx.booking.create({
            data: {
              bookingReference: bookingRef,

              companyId:
                input.companyId,

              exhibitionId:
                input.exhibitionId,

              status:
                BookingStatus.PENDING_PAYMENT,

              totalAmount:
                result.basePrice,

              taxAmount:
                result.bookingTaxAmount,

              grandTotal:
                result.grandTotal,

              balanceAmount:
                result.grandTotal,

              discountAmount:
                input.discountAmount,

              discountType:
                input.discountType,

              expiresAt:
                holdUntil,

              stalls: {
                create:
                  currentStalls.map(
                    (stall) => ({
                      stallId: stall.id,

                      price:
                        new Prisma.Decimal(
                          stall.price.toString()
                        ),
                    })
                  ),
              },
            },

            include: {
              stalls: {
                include: {
                  stall: true,
                },
              },

              exhibition: true,

              company: true,
            },
          });

        // ----------------------------------------------
        // Create Payment
        //
        // Razorpay order does not exist yet.
        // ----------------------------------------------

        const paymentReference =
          `PAY-${crypto
            .randomUUID()
            .replace(/-/g, '')
            .substring(0, 12)
            .toUpperCase()}`;

        const payment =
          await tx.payment.create({
            data: {
              paymentReference,

              bookingId:
                booking.id,

              amount:
                result.payableAmount,

              currency:
                'INR',

              status:
                PaymentStatus.PENDING,

              provider:"RAZORPAY",

              razorpayOrderId:null,
            },
          });

        return {
          booking,
          payment,
          currentStalls,
        };
      },
      {
        timeout: 10000,
      }
    );

  // ==================================================
  // 10. Create Razorpay Order
  // ==================================================

  const razorpayAmount =
    result.payableAmount
      .mul(100)
      .toNumber();

  let razorpayOrder;

  try {
    razorpayOrder =
      await razorpay.orders.create({
        amount:
          razorpayAmount,

        currency:
          'INR',

        receipt:
          transactionResult.booking
            .bookingReference,

        notes: {
          bookingReference:
            transactionResult.booking
              .bookingReference,

          bookingId:
            transactionResult.booking.id,

          paymentId:
            transactionResult.payment.id,

          exhibitionId:
            input.exhibitionId,

          companyId:
            input.companyId,
        },
      });
  } catch (error) {
   
    throw ApiError.internal(
      'Payment gateway is currently unavailable. Please try again before the stall hold expires.'
    );
  }

  // ==================================================
  // 11. Save Razorpay Order ID
  // ==================================================

  try {
    const updatedPayment =
      await prisma.payment.update({
        where: {
          id:
            transactionResult.payment.id,
        },

        data: {
          razorpayOrderId:
            razorpayOrder.id,
        },
      });

    // ==================================================
    // 12. Return response
    // ==================================================

    return {
      success: true,

      message:
        'Booking and payment order created successfully.',

      data: {
        bookingId:
          transactionResult.booking.id,

        bookingReference:
          transactionResult.booking
            .bookingReference,

        paymentId:
          updatedPayment.id,

        razorpayOrderId:
          razorpayOrder.id,

        razorpayKeyId:env.RAZORPAY_API_KEY,

        amount:
          razorpayOrder.amount,

        currency:
          razorpayOrder.currency,
      },
    };
  } catch (error) {
   
    throw ApiError.internal(
      'Razorpay order was created, but we could not save the payment information. Please contact support.'
    );
  }
}


  static async getUserBookings(companyId: string) {
    return await prisma.booking.findMany({
      where: { companyId},
      orderBy: { createdAt: 'desc' },
      include: {
        stalls: { include: { stall: true } },
        exhibition: true,
        company: true,
        payments: true,
        invoices: true,
      },
    });
  }

  static async getBookingById(bookingId: string, userId?: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        stalls: { include: { stall: true } },
        exhibition: true,
        company: true,
        payments: true,
        invoices: true,
        // user: { select: { id: true, name: true, email: true, role: true, spcode: true } },
      },
    });

    if (!booking) throw ApiError.notFound('Booking record not found.');
    // if (userId && booking.userId !== userId) {
    //   throw ApiError.forbidden('Not authorized to access this booking record.');
    // }

    return booking;
  }

  static async listAllBookings(
    page = 1,
    limit = 20,
    status?: string,
    registeredByRole?: string,
    exhibitionId?: string
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (exhibitionId) where.exhibitionId = exhibitionId;
    if (registeredByRole) {
      if (registeredByRole === 'ADMIN') {
        where.user = { role: { in: ['ADMIN', 'SUPERADMIN'] } };
      } else {
        where.user = { role: registeredByRole };
      }
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          stalls: { include: { stall: true } },
          exhibition: {
            select: {
              id: true,
              title: true,
              slug: true,
              edition: true,
              eventCode: true,
              city: true,
              venue: true,
              startDate: true,
              endDate: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
              companyCode: true,
              contactPerson: true,
              mobile: true,
              email: true,
              city: true,
              gstNumber: true,
            },
          },
          payments: {
            select: {
              status: true,
              paymentReference: true,
              provider: true,
              amount: true,
              paidAt: true,
            },
          },
          invoices: { select: { id: true, invoiceNumber: true, status: true } },
          // user: { select: { id: true, name: true, email: true, role: true, spcode: true } },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    return {
      bookings,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
