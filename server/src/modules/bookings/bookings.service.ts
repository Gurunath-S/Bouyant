import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/apiError.js';
import { CreateBookingInput } from './bookings.schemas.js';
import { StallStatus, BookingStatus, PaymentStatus, BookingPaymentStatus } from '@prisma/client';
import { Prisma,Stall} from '@prisma/client';
import { AuthenticatedRequest } from '../../middlewares/auth.js';
import { razorpay } from '../../config/razorpay.js';
import { env } from '../../config/env.js';
import { normalizePagination } from '../../utils/pagination.js';
import { generateReference } from '../../utils/reference.js';
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
    // 2. Determine payment base amount (partial advance or full)
    // --------------------------------------------------
    const isPartial = input.paymentType === 'PARTIAL';
    let paymentBaseAmount = basePrice;

    if (isPartial) {
      if (input.percentage === undefined) {
        throw ApiError.badRequest(
          'Percentage is required for partial payment.'
        );
      }

      const percentage = new Prisma.Decimal(input.percentage);
      paymentBaseAmount = basePrice
        .mul(percentage)
        .div(100)
        .toDecimalPlaces(2);
    }

    // --------------------------------------------------
    // 3. Check discount permission and calculate on payable base
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

      const rawDiscount = new Prisma.Decimal(
        input.discountAmount
      );

      if (rawDiscount.lt(0)) {
        throw ApiError.badRequest(
          'Discount amount cannot be negative.'
        );
      }

      if (input.discountType === 'PERCENT') {
        if (rawDiscount.gt(100)) {
          throw ApiError.badRequest(
            'Discount percentage cannot exceed 100%.'
          );
        }
        discountAmount = paymentBaseAmount
          .mul(rawDiscount)
          .div(100)
          .toDecimalPlaces(2);
      } else {
        if (rawDiscount.gte(paymentBaseAmount)) {
          throw ApiError.badRequest(
            'Discount cannot be greater than or equal to the payable base amount.'
          );
        }
        discountAmount = rawDiscount;
      }
    }

    // --------------------------------------------------
    // 4. Tax and Current Payable Calculation
    // --------------------------------------------------
    const taxRate = new Prisma.Decimal('0.18');

    const discountedAmount = paymentBaseAmount.sub(discountAmount);
    const taxAmount = discountedAmount.mul(taxRate).toDecimalPlaces(2);
    const payableAmount = discountedAmount.add(taxAmount);

    // --------------------------------------------------
    // 5. Full booking values & Remaining balance
    // --------------------------------------------------
    const unpaidBase = isPartial ? basePrice.sub(paymentBaseAmount) : new Prisma.Decimal(0);
    const unpaidTax = unpaidBase.mul(taxRate).toDecimalPlaces(2);
    const remainingBalance = unpaidBase.add(unpaidTax);

    const discountedBookingAmount = basePrice.sub(discountAmount);
    const bookingTaxAmount = taxAmount.add(unpaidTax);
    const grandTotal = payableAmount.add(remainingBalance);

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
      remainingBalance,
    };
  }

private static validateStalls(
  stalls: Array<{
    id: string;
    stallNumber: string;
    status: string;
    heldUntil: Date | null;
    heldByUserId?: string | null;
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
    if (stall.status === 'PAYMENT_PENDING' || stall.status === 'TEMPORARILY_HELD') {
      const isHeldByThisUser = Boolean(stall.heldByUserId && stall.heldByUserId === user?.userId);
      const isExpired =
        !stall.heldUntil ||
        stall.heldUntil.getTime() <= Date.now();

      if (!isExpired && !isHeldByThisUser) {
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
    if (!exhibitionId) {
      throw ApiError.badRequest('Exhibition ID or slug is required.');
    }

    const exhibition = await prisma.exhibition.findFirst({
      where: {
        OR: [
          { id: exhibitionId },
          { slug: exhibitionId },
        ],
      },
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

    // C. Check cutoff deadline (use custom bookingEndDate if set, otherwise 15-day prior to startDate)
    let bookingCutoffDeadline: Date;
    if (exhibition.bookingEndDate) {
      bookingCutoffDeadline = new Date(exhibition.bookingEndDate);
    } else {
      bookingCutoffDeadline = new Date(eventStartDate.getTime() - 15 * 24 * 60 * 60 * 1000);
      bookingCutoffDeadline.setHours(23, 59, 59, 999);
    }

    // D. Block booking if current date has crossed the cutoff deadline
    if (now > bookingCutoffDeadline) {
      const formattedDeadline = bookingCutoffDeadline.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      throw ApiError.badRequest(
        `Stall booking for this exhibition is closed. The deadline was ${formattedDeadline}.`
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

  const exhibition = await BookingsService.validateExhibitionBookingWindow(
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

	  const isPrivilegedUser = ['ADMIN', 'SUPERADMIN', 'STAFF'].includes(user?.role ?? '');

	  // Admin/Staff/SuperAdmin can skip Razorpay and directly confirm with an offline payment record
	  const isDirectConfirm = !!(input.confirmDirectly && isPrivilegedUser);

	  if (user && !isPrivilegedUser && user.companyId !== input.companyId) {
	    throw ApiError.forbidden('You can only create bookings for your own company.');
	  }

  // ==================================================
  // 2b. Staff Attribution — stamp company.spcode
  //
  // Staff users don't belong to exhibitor companies, so
  // we track their bookings via company.spcode.
  // Always stamp when acting user is STAFF, using their
  // personal spcode (e.g. ST01) or a generic 'ST-STAFF'
  // if the account has no spcode assigned yet.
  // We only overwrite if the company doesn't already carry
  // a staff-attributed spcode (startsWith 'ST').
  // ==================================================
  if (
    user?.role === 'STAFF' &&
    !company.spcode?.toUpperCase().startsWith('ST')
  ) {
    await prisma.company.update({
      where: { id: company.id },
      data: { spcode: user.spcode ?? 'ST-STAFF' },
    });
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
    if (stall.floorPlan.exhibitionId !== exhibition.id) {
      throw ApiError.badRequest(
        `Stall ${stall.id} does not belong to the selected exhibition.`
      );
    }
  }

  // ==================================================
  // 5. Validate stall status
  //
	  // AVAILABLE          -> allow
	  // TEMPORARILY_HELD   -> allow only for the same user
	  // BLOCKED:
	  // ADMIN/SUPERADMIN/STAFF -> allow
	  // NORMAL USER            -> reject
  // ==================================================

	  const canBookBlockedStalls = isPrivilegedUser;

  for (const stall of stalls) {
    const isAvailable = stall.status === StallStatus.AVAILABLE;
    const isHeldByUser =
      (stall.status === StallStatus.TEMPORARILY_HELD || stall.status === StallStatus.PAYMENT_PENDING) &&
      Boolean(stall.heldByUserId && user?.userId && stall.heldByUserId === user.userId);
    const isExpiredHold =
      (stall.status === StallStatus.TEMPORARILY_HELD || stall.status === StallStatus.PAYMENT_PENDING) &&
      stall.heldUntil &&
      stall.heldUntil.getTime() <= Date.now();
    const isBlocked = stall.status === StallStatus.BLOCKED;

    if (isAvailable || isHeldByUser || isExpiredHold) {
      continue;
    }

    if (isBlocked && canBookBlockedStalls) {
      continue;
    }

    throw ApiError.conflict(
      `Stall ${stall.name || stall.stallNumber || stall.id} is currently ${stall.status}.`
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
  // 6b. Resolve Booking Snapshots (Phase 2.3)
  //
  // Captures the point-in-time representative contact details
  // and legal billing entity details without modifying Company.
  // User ID is strictly derived from verified database identity.
  // Never pass an unverified or stale user ID that could violate Booking_userId_fkey.
  // ==================================================
  let dbUser: { id: string; name: string; phone: string | null; email: string } | null = null;
  if (user?.userId) {
    dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { id: true, name: true, phone: true, email: true },
    });
  }

  const snapshotContactPerson =
    input.contactPerson?.trim() || dbUser?.name || company.contactPerson;
  const snapshotContactEmail =
    input.contactEmail?.trim().toLowerCase() ||
    user?.email?.toLowerCase() ||
    dbUser?.email?.toLowerCase() ||
    company.email;
  const snapshotContactPhone =
    input.contactPhone?.trim() || dbUser?.phone || company.mobile;

  const snapshotBillingName = input.billingName?.trim() || company.name;
  const snapshotBillingGst = input.billingGst?.trim().toUpperCase() || company.gstNumber || null;
  const snapshotBillingPan = input.billingPan?.trim().toUpperCase() || company.panNumber || null;
  const snapshotBillingAddress = input.billingAddress?.trim() || company.address;
  const snapshotBillingCity = input.billingCity?.trim() || company.city;
  const snapshotBillingState = input.billingState?.trim() || company.state;
  const snapshotBillingPinCode = input.billingPinCode?.trim() || company.pinCode;
  const snapshotBillingCountry = input.billingCountry?.trim() || company.country || 'India';

  let bookingUserId: string | null = dbUser ? dbUser.id : null;

  // If no authenticated user matched, but this is a guest booking for an existing company,
  // associate the booking with the company's exhibitor account matching the snapshot contact email/phone
  if (!bookingUserId && snapshotContactEmail) {
    const matchedCompanyUser = await prisma.user.findFirst({
      where: {
        companyId: company.id,
        email: snapshotContactEmail.toLowerCase(),
      },
      select: { id: true, phone: true },
    });
    if (matchedCompanyUser) {
      const cleanInputDigits = snapshotContactPhone?.replace(/\D/g, '').slice(-10);
      const cleanUserDigits = matchedCompanyUser.phone?.replace(/\D/g, '').slice(-10);
      if (!cleanInputDigits || !cleanUserDigits || cleanInputDigits === cleanUserDigits) {
        bookingUserId = matchedCompanyUser.id;
      }
    }
  }

  // ==================================================
  // 7a. ADMIN DIRECT CONFIRM — bypass Razorpay entirely
  // ==================================================

  if (isDirectConfirm) {
    const adminBookingRef = `BKG-2026-${crypto
      .randomUUID()
      .replace(/-/g, '')
      .substring(0, 10)
      .toUpperCase()}`;

    return await prisma.$transaction(
      async (tx) => {
        // 1. Mark stalls as confirmed immediately
        await tx.stall.updateMany({
          where: { id: { in: input.stallIds } },
          data: {
            status: StallStatus.BOOKED_CONFIRMED,
            heldUntil: null,
            heldByUserId: null,
          },
        });

        // 2. Cancel any previous PENDING_PAYMENT booking for these stalls
        await tx.booking.updateMany({
          where: {
            companyId: input.companyId,
            exhibitionId: exhibition.id,
            status: BookingStatus.PENDING_PAYMENT,
            stalls: { some: { stallId: { in: input.stallIds } } },
          },
          data: { status: BookingStatus.CANCELLED },
        });

        // 3. Create confirmed booking with point-in-time snapshots
        const booking = await tx.booking.create({
          data: {
            bookingReference: adminBookingRef,
            companyId: input.companyId,
            exhibitionId: exhibition.id,
            userId: bookingUserId,
            contactPerson: snapshotContactPerson,
            contactEmail: snapshotContactEmail,
            contactPhone: snapshotContactPhone,
            billingName: snapshotBillingName,
            billingGst: snapshotBillingGst,
            billingPan: snapshotBillingPan,
            billingAddress: snapshotBillingAddress,
            billingCity: snapshotBillingCity,
            billingState: snapshotBillingState,
            billingPinCode: snapshotBillingPinCode,
            billingCountry: snapshotBillingCountry,
            status: BookingStatus.CONFIRMED,
            paymentStatus: BookingPaymentStatus.PAID_FULL,
            totalAmount: result.basePrice,
            taxAmount: result.bookingTaxAmount,
            grandTotal: result.grandTotal,
            paidAmount: result.grandTotal,
            balanceAmount: new Prisma.Decimal(0),
            discountAmount: result.discountAmount,
            discountType: input.discountType,
            stalls: {
              create: stalls.map((s) => ({
                stallId: s.id,
                price: new Prisma.Decimal(s.price.toString()),
              })),
            },
          },
          include: {
            stalls: { include: { stall: true } },
            exhibition: true,
            company: true,
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        });

        // 4. Create offline/admin payment record (no Razorpay)
        const paymentRef = generateReference('PAY', 10, false);
        const payment = await tx.payment.create({
          data: {
            paymentReference: paymentRef,
            bookingId: booking.id,
            amount: result.grandTotal,
            currency: 'INR',
            status: PaymentStatus.SUCCESS,
            provider: 'OFFLINE_ADMIN',
            paymentMethod: input.paymentMethod || 'ADMIN_DIRECT_ALLOCATION',
            paidAt: new Date(),
          },
        });

        // 5. Auto-generate invoice
        const invoiceNum = generateReference('INV', 6);
        await tx.invoice.create({
          data: {
            invoiceNumber: invoiceNum,
            bookingId: booking.id,
            paymentId: payment.id,
            companyId: input.companyId,
            totalAmount: result.basePrice,
            taxAmount: result.bookingTaxAmount,
            grandTotal: result.grandTotal,
            status: 'PAID',
            issueDate: new Date(),
          },
        });

        return {
          success: true,
          message: 'Booking confirmed and allocated directly by admin. No payment gateway required.',
          data: {
            bookingId: booking.id,
            bookingReference: booking.bookingReference,
            paymentId: payment.id,
            paymentStatus: 'SUCCESS',
            bookingStatus: 'CONFIRMED',
          },
        };
      },
      { timeout: 15000 }
    );
  }

  // ==================================================
  // 7. Generate booking reference (standard Razorpay flow)
  // ==================================================

  const bookingRef = `BKG-2026-${crypto
    .randomUUID()
    .replace(/-/g, '')
    .substring(0, 10)
    .toUpperCase()}`;

	  // ==================================================
	  // 8. Assign a fresh full 15-minute hold timer for payment
	  // ==================================================

	  const holdUntil = new Date(Date.now() + 15 * 60 * 1000);

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
            exhibition.id
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
        // PAYMENT_PENDING / TEMPORARILY_HELD for user or company
        // BLOCKED for admin/staff
        // ----------------------------------------------

        const companyUsers = await tx.user.findMany({
          where: { companyId: input.companyId },
          select: { id: true },
        });
        const companyUserIds = companyUsers.map((u) => u.id);

        for (const stall of currentStalls) {
          const isAvailable = stall.status === StallStatus.AVAILABLE;
          const isHeldByUserOrCompany =
            (stall.status === StallStatus.TEMPORARILY_HELD || stall.status === StallStatus.PAYMENT_PENDING) &&
            Boolean(stall.heldByUserId && ((user?.userId && stall.heldByUserId === user.userId) || (bookingUserId && stall.heldByUserId === bookingUserId) || companyUserIds.includes(stall.heldByUserId)));
          const isExpiredHold =
            (stall.status === StallStatus.TEMPORARILY_HELD || stall.status === StallStatus.PAYMENT_PENDING) &&
            stall.heldUntil &&
            stall.heldUntil.getTime() <= Date.now();
          const isBlocked = stall.status === StallStatus.BLOCKED;

          if (isAvailable || isHeldByUserOrCompany || isExpiredHold) {
            continue;
          }

          if ((isBlocked || stall.status === StallStatus.TEMPORARILY_HELD || stall.status === StallStatus.PAYMENT_PENDING) && canBookBlockedStalls) {
            continue;
          }

          throw ApiError.conflict(
            `Stall ${stall.name || stall.stallNumber || stall.id} is no longer available for booking.`
          );
        }

        // ----------------------------------------------
        // Atomically claim stalls for the payment window
        // ----------------------------------------------
        const stallUpdate = await tx.stall.updateMany({
          where: {
            id: {
              in: input.stallIds,
            },
            OR: [
              { status: StallStatus.AVAILABLE },
              {
                status: { in: [StallStatus.TEMPORARILY_HELD, StallStatus.PAYMENT_PENDING] },
                heldByUserId: { in: [...(user?.userId ? [user.userId] : []), ...(bookingUserId ? [bookingUserId] : []), ...companyUserIds] },
              },
              {
                status: { in: [StallStatus.TEMPORARILY_HELD, StallStatus.PAYMENT_PENDING] },
                heldUntil: { lte: new Date() },
              },
              ...(canBookBlockedStalls
                ? [
                    { status: StallStatus.BLOCKED },
                    { status: StallStatus.TEMPORARILY_HELD },
                    { status: StallStatus.PAYMENT_PENDING },
                  ]
                : []),
            ],
          },
          data: {
            status: StallStatus.PAYMENT_PENDING,
            heldUntil: holdUntil,
            heldByUserId: bookingUserId,
          },
        });

        if (stallUpdate.count !== input.stallIds.length) {
          throw ApiError.conflict(
            'One or more selected stalls were reserved by another user. Please refresh and choose available stalls.'
          );
        }

        // Cancel any previous unfulfilled PENDING_PAYMENT booking for this company & exhibition to avoid orphaned duplicates when re-trying/switching payment plan
        await tx.booking.updateMany({
          where: {
            companyId: input.companyId,
            exhibitionId: exhibition.id,
            status: BookingStatus.PENDING_PAYMENT,
            stalls: {
              some: {
                stallId: { in: input.stallIds },
              },
            },
          },
          data: {
            status: BookingStatus.CANCELLED,
          },
        });

        // ----------------------------------------------
        // Create Booking
        // ----------------------------------------------

        const booking =
          await tx.booking.create({
            data: {
              bookingReference: bookingRef,
              companyId: input.companyId,
              exhibitionId: exhibition.id,
              userId: bookingUserId,

              // Representative/Contact Details Snapshot (Phase 2.3)
              contactPerson: snapshotContactPerson,
              contactEmail: snapshotContactEmail,
              contactPhone: snapshotContactPhone,

              // Billing/Legal Details Snapshot (Phase 2.3)
              billingName: snapshotBillingName,
              billingGst: snapshotBillingGst,
              billingPan: snapshotBillingPan,
              billingAddress: snapshotBillingAddress,
              billingCity: snapshotBillingCity,
              billingState: snapshotBillingState,
              billingPinCode: snapshotBillingPinCode,
              billingCountry: snapshotBillingCountry,

              status: BookingStatus.PENDING_PAYMENT,
              totalAmount: result.basePrice,
              taxAmount: result.bookingTaxAmount,
              grandTotal: result.grandTotal,
              balanceAmount: result.grandTotal,
              discountAmount: result.discountAmount,
              discountType: input.discountType,
              expiresAt: holdUntil,

              stalls: {
                create: currentStalls.map((stall) => ({
                  stallId: stall.id,
                  price: new Prisma.Decimal(stall.price.toString()),
                })),
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
              user: {
                select: { id: true, name: true, email: true, role: true },
              },
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
  } catch (_error) {
   
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
  } catch (_error) {
   
    throw ApiError.internal(
      'Razorpay order was created, but we could not save the payment information. Please contact support.'
    );
  }
}


  static async getUserBookings(userOrCompanyId?: AuthenticatedRequest['user'] | string | null) {
    if (!userOrCompanyId) {
      return [];
    }

    if (typeof userOrCompanyId === 'string') {
      return await prisma.booking.findMany({
        where: { companyId: userOrCompanyId },
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

    const user = userOrCompanyId;
    if (user.role === 'CLIENT') {
      if (!user.companyId) {
        return [];
      }
      const userEmail = user.email?.trim().toLowerCase();
      return await prisma.booking.findMany({
        where: {
          companyId: user.companyId,
          OR: [
            { userId: user.userId },
            ...(userEmail
              ? [
                  {
                    userId: null,
                    contactEmail: { equals: userEmail, mode: 'insensitive' as const },
                  },
                ]
              : []),
          ],
        },
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

    // For ADMIN / STAFF / SUPERADMIN or other roles
    const whereClause: Prisma.BookingWhereInput = user.companyId
      ? { companyId: user.companyId }
      : { userId: user.userId };

    return await prisma.booking.findMany({
      where: whereClause,
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

  static async getBookingById(
    bookingId: string,
    userOrCompanyId?: AuthenticatedRequest['user'] | string | null
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        stalls: { include: { stall: true } },
        exhibition: true,
        company: true,
        payments: true,
        invoices: true,
      },
    });

    if (!booking) throw ApiError.notFound('Booking record not found.');

    if (userOrCompanyId) {
      if (typeof userOrCompanyId === 'string') {
        if (booking.companyId !== userOrCompanyId) {
          throw ApiError.forbidden('Not authorized to access this booking record.');
        }
      } else {
        const user = userOrCompanyId;
        const isPrivileged =
          user.role === 'ADMIN' || user.role === 'SUPERADMIN' || user.role === 'STAFF';

        if (!isPrivileged) {
          const isCompanyMatch = Boolean(user.companyId && booking.companyId === user.companyId);
          const userEmail = user.email?.trim().toLowerCase();
          const bookingEmail = booking.contactEmail?.trim().toLowerCase();
          const isOwner =
            booking.userId === user.userId ||
            (!booking.userId &&
              Boolean(bookingEmail) &&
              Boolean(userEmail) &&
              bookingEmail === userEmail);

          if (!isCompanyMatch || !isOwner) {
            throw ApiError.forbidden('Not authorized to access this booking record.');
          }
        }
      }
    }

    return booking;
  }

  static async getPublicBookingSummary(bookingIdOrRef: string) {
    const booking = await prisma.booking.findFirst({
      where: {
        OR: [
          { id: bookingIdOrRef },
          { bookingReference: bookingIdOrRef },
        ],
      },
      select: {
        id: true,
        bookingReference: true,
        status: true,
        paymentStatus: true,
        totalAmount: true,
        taxAmount: true,
        grandTotal: true,
        paidAmount: true,
        balanceAmount: true,
        createdAt: true,
        company: {
          select: {
            name: true,
            email: true,
            mobile: true,
            contactPerson: true,
            address: true,
            city: true,
            state: true,
            country: true,
            gstNumber: true,
          },
        },
        exhibition: {
          select: {
            title: true,
            venue: true,
            city: true,
            startDate: true,
            endDate: true,
          },
        },
        stalls: {
          select: {
            price: true,
            stall: {
              select: {
                id: true,
                stallNumber: true,
                areaSqFt: true,
                category: true,
              },
            },
          },
        },
        payments: {
          select: {
            paymentReference: true,
            status: true,
            amount: true,
            paidAt: true,
          },
        },
        invoices: {
          select: {
            invoiceNumber: true,
            status: true,
          },
        },
      },
    });

    if (!booking) throw ApiError.notFound('Booking confirmation summary not found.');
    return booking;
  }

  static async listAllBookings(
    pageOrOptions?: any,
    limitArg?: number,
    statusArg?: string,
    registeredByRoleArg?: string,
    exhibitionIdArg?: string
  ) {
    let rawPage: any = 1;
    let rawLimit: any = 20;
    let search = '';
    let status: string | undefined;
    let paymentStatus: string | undefined;
    let hasBalanceOnly: boolean | string | undefined;
    let registeredByRole: string | undefined;
    let exhibitionId: string | undefined;
    let userId: string | undefined;

    if (pageOrOptions && typeof pageOrOptions === 'object') {
      rawPage = pageOrOptions.page;
      rawLimit = pageOrOptions.limit;
      search = pageOrOptions.search || '';
      status = pageOrOptions.status;
      paymentStatus = pageOrOptions.paymentStatus;
      hasBalanceOnly = pageOrOptions.hasBalanceOnly;
      registeredByRole = pageOrOptions.registeredByRole;
      exhibitionId = pageOrOptions.exhibitionId;
      userId = pageOrOptions.userId;
    } else {
      rawPage = pageOrOptions || 1;
      rawLimit = limitArg || 20;
      status = statusArg;
      registeredByRole = registeredByRoleArg;
      exhibitionId = exhibitionIdArg;
    }

    const { page, limit, skip } = normalizePagination(rawPage, rawLimit, 20, 100);
    const andConditions: Prisma.BookingWhereInput[] = [];

    if (status && status !== 'ALL') {
      andConditions.push({ status: status as any });
    }
    if (paymentStatus && paymentStatus !== 'ALL') {
      andConditions.push({ paymentStatus: paymentStatus as any });
    }
    if (hasBalanceOnly === true || hasBalanceOnly === 'true') {
      andConditions.push({ balanceAmount: { gt: 0 }, status: { not: 'CANCELLED' } });
    }
    if (exhibitionId && exhibitionId !== 'ALL') {
      andConditions.push({ exhibitionId });
    }
    if (userId && userId !== 'ALL') {
      andConditions.push({ company: { users: { some: { id: userId } } } });
    }
    if (registeredByRole && registeredByRole !== 'ALL') {
      if (registeredByRole === 'ADMIN') {
        // ADMIN-registered: company has an ADMIN or SUPERADMIN user linked to it.
        andConditions.push({ company: { users: { some: { role: { in: ['ADMIN', 'SUPERADMIN'] } } } } });
      } else if (registeredByRole === 'STAFF') {
        // STAFF-registered: staff members don't belong to exhibitor companies.
        // Attribution is tracked via company.spcode which is set to the staff member's spcode
        // (e.g. ST00, ST01, ST02, ST03…) when they register an exhibitor.
        // We also fall back to exhibition.spcode for events submitted by staff.
        andConditions.push({
          OR: [
            { company: { spcode: { startsWith: 'ST', mode: 'insensitive' } } },
            { exhibition: { spcode: { startsWith: 'ST', mode: 'insensitive' } } },
          ],
        });
      } else {
        andConditions.push({ company: { users: { some: { role: registeredByRole as any } } } });
      }
    }
    if (search && search.trim()) {
      const q = search.trim();
      andConditions.push({
        OR: [
          { bookingReference: { contains: q, mode: 'insensitive' } },
          { company: { name: { contains: q, mode: 'insensitive' } } },
          { company: { contactPerson: { contains: q, mode: 'insensitive' } } },
          { exhibition: { title: { contains: q, mode: 'insensitive' } } },
          { stalls: { some: { stall: { stallNumber: { contains: q, mode: 'insensitive' } } } } },
        ],
      });
    }

    const where: Prisma.BookingWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

    const [bookings, total, aggregate] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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
        },
      }),
      prisma.booking.count({ where }),
      prisma.booking.aggregate({ where, _sum: { grandTotal: true, paidAmount: true } }),
    ]);

    const totalValue = Number(aggregate._sum.grandTotal || 0);
    const totalPaidValue = Number(aggregate._sum.paidAmount || 0);

    return {
      bookings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalValue,
        totalPaidValue,
      },
    };
  }

  /**
   * CANCEL A BOOKING & RELEASE ASSOCIATED STALLS
   * Called when checkout is abandoned/dropped, user clicks exit/back, or cancels voluntarily.
   */
  static async cancelBooking(
    bookingId: string,
    user?: AuthenticatedRequest['user'],
    _reason?: string
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        stalls: { include: { stall: true } },
        payments: true,
      },
    });

    if (!booking) {
      throw ApiError.notFound('Booking not found.');
    }

    // If already cancelled, return success idempotently
    if (booking.status === BookingStatus.CANCELLED) {
      return {
        booking,
        releasedStallCount: 0,
        message: 'Booking is already cancelled.',
      };
    }

    // Only allow cancellation of unconfirmed bookings, OR if user is ADMIN / SUPERADMIN / STAFF
    const isPrivileged =
      user?.role === 'ADMIN' || user?.role === 'SUPERADMIN' || user?.role === 'STAFF';

    // Check ownership before status checks so unauthorized users get 403 Forbidden instead of 400 Bad Request
    if (user && !isPrivileged) {
      const isCompanyMatch = Boolean(user.companyId && booking.companyId === user.companyId);
      const userEmail = user.email?.trim().toLowerCase();
      const bookingEmail = booking.contactEmail?.trim().toLowerCase();
      const isOwner =
        booking.userId === user.userId ||
        (!booking.userId &&
          Boolean(bookingEmail) &&
          Boolean(userEmail) &&
          bookingEmail === userEmail);

      if (!isCompanyMatch || !isOwner) {
        throw ApiError.forbidden('You do not have permission to cancel this booking.');
      }
    }

    if (booking.status === BookingStatus.CONFIRMED && !isPrivileged) {
      throw ApiError.badRequest(
        'Confirmed bookings cannot be cancelled via checkout. Please contact the exhibition administrator.'
      );
    }

    const stallIds = booking.stalls.map((s) => s.stallId);

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Mark booking as CANCELLED
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
        },
      });

      // 2. Release stalls back to AVAILABLE (only if not already booked confirmed)
      if (stallIds.length > 0) {
        await tx.stall.updateMany({
          where: {
            id: { in: stallIds },
            status: {
              in: [
                StallStatus.PAYMENT_PENDING,
                StallStatus.TEMPORARILY_HELD,
                StallStatus.BOOKING_IN_PROGRESS,
              ],
            },
          },
          data: {
            status: StallStatus.AVAILABLE,
            heldUntil: null,
            heldByUserId: null,
          },
        });
      }

      // 3. Mark any PENDING payment records as FAILED
      await tx.payment.updateMany({
        where: {
          bookingId: booking.id,
          status: PaymentStatus.PENDING,
        },
        data: {
          status: PaymentStatus.FAILED,
        },
      });

      return updatedBooking;
    });

    return {
      booking: updated,
      releasedStallCount: stallIds.length,
      message: 'Booking cancelled and stalls released successfully.',
    };
  }

  /**
   * Idempotent backfill for historical bookings missing snapshot data.
   * Uses current master company profile and associated primary user as best-effort fallback.
   * Only updates bookings where billingName or contactEmail is currently NULL.
   * Preserves existing booking, invoice, and payment records without data mutation.
   */
  static async backfillHistoricalSnapshots(): Promise<{ totalProcessed: number; updated: number }> {
    const unbackfilled = await prisma.booking.findMany({
      where: {
        OR: [
          { billingName: null },
          { contactEmail: null },
        ],
      },
      include: {
        company: {
          include: {
            users: {
              where: { isActive: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    let updated = 0;

    for (const b of unbackfilled) {
      if (!b.company) continue;

      const comp = b.company;
      const primaryUser = comp.users.length === 1
        ? comp.users[0]
        : (comp.users.find((u) => u.email.toLowerCase() === comp.email.toLowerCase()) || comp.users[0]);

      await prisma.booking.update({
        where: { id: b.id },
        data: {
          contactPerson: b.contactPerson ?? primaryUser?.name ?? comp.contactPerson,
          contactEmail: b.contactEmail ?? primaryUser?.email ?? comp.email,
          contactPhone: b.contactPhone ?? primaryUser?.phone ?? comp.mobile,

          billingName: b.billingName ?? comp.name,
          billingGst: b.billingGst ?? comp.gstNumber,
          billingPan: b.billingPan ?? comp.panNumber,
          billingAddress: b.billingAddress ?? comp.address,
          billingCity: b.billingCity ?? comp.city,
          billingState: b.billingState ?? comp.state,
          billingPinCode: b.billingPinCode ?? comp.pinCode,
          billingCountry: b.billingCountry ?? comp.country ?? 'India',

          userId: b.userId ?? primaryUser?.id ?? null,
        },
      });

      updated++;
    }

    return { totalProcessed: unbackfilled.length, updated };
  }
}

