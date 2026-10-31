import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/apiError.js';
import { Prisma, PaymentStatus,PaymentMode } from '@prisma/client';
import crypto from "crypto";
import { env } from '../../config/env.js';
import { razorpay } from '../../config/razorpay.js';
import { TokenPayload } from '../../utils/jwt.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { generateReference } from '../../utils/reference.js';
import { normalizePagination } from '../../utils/pagination.js';
import { updateBookingPaymentReminder } from '../../services/paymentReminder.service.js'
import {PaymentNotificationService} from '../../services/paymentNotification.service.js'

import { BookingsService } from '../bookings/bookings.service.js';
export class PaymentsService {


  /**
   * VERIFY PAYMENT SERVER-SIDE
   */
 static async verifyAndProcessPayment(data: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  skipSignatureCheck?: boolean;
}) {
  // =========================================================
  // 1. BASIC INPUT VALIDATION
  // =========================================================

  if (
    !data.razorpay_order_id ||
    !data.razorpay_payment_id ||
    (!data.skipSignatureCheck && !data.razorpay_signature)
  ) {
    throw ApiError.badRequest(
      'Razorpay payment details are required.'
    );
  }

  // =========================================================
  // 2. FIND OUR PAYMENT
  // =========================================================

  const payment = await prisma.payment.findUnique({
    where: {
      razorpayOrderId: data.razorpay_order_id,
    },
  });

  if (!payment) {
    throw ApiError.notFound(
      'Payment record not found for this Razorpay order.'
    );
  }

  // =========================================================
  // 3. IDEMPOTENCY CHECK
  //
  // If this exact payment was already processed successfully,
  // don't process the booking again.
  // =========================================================

  if (payment.status === 'SUCCESS') {
    return {
      success: true,
      message: 'Payment has already been processed.',
      data: {
        paymentId: payment.id,
        bookingId: payment.bookingId,
        paymentStatus: 'SUCCESS',
      },
    };
  }

  // Only PENDING payment can continue.
  if (payment.status !== 'PENDING') {
    throw ApiError.badRequest(
      `Payment verification is not allowed because payment status is ${payment.status}.`
    );
  }

  // =========================================================
  // 4. VERIFY RAZORPAY SIGNATURE
  // =========================================================

  if (!data.skipSignatureCheck) {
    const signatureBody =
      `${data.razorpay_order_id}|${data.razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac(
        'sha256',
        env.RAZORPAY_API_SECRET
      )
      .update(signatureBody)
      .digest('hex');

    const receivedSignature = data.razorpay_signature;

    const expectedBuffer = Buffer.from(
      expectedSignature,
      'utf8'
    );

    const receivedBuffer = Buffer.from(
      receivedSignature,
      'utf8'
    );

    const isAuthentic =
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(
        expectedBuffer,
        receivedBuffer
      );

    if (!isAuthentic) {
      throw ApiError.badRequest(
        'Payment signature verification failed.'
      );
    }
  }

  // =========================================================
  // 5. FETCH PAYMENT FROM RAZORPAY
  //
  // Never trust only the frontend response.
  // Ask Razorpay for the actual payment information.
  // =========================================================

  let razorpayPayment;

  try {
    razorpayPayment =
      await razorpay.payments.fetch(
        data.razorpay_payment_id
      );
  } catch (_error) {
    throw ApiError.internal(
      'Unable to verify the payment with the payment gateway.'
    );
  }

  // =========================================================
  // 6. VERIFY PAYMENT BELONGS TO OUR RAZORPAY ORDER
  // =========================================================

  if (
    razorpayPayment.order_id !==
    payment.razorpayOrderId
  ) {
    throw ApiError.badRequest(
      'Razorpay payment does not belong to this order.'
    );
  }

  // =========================================================
  // 7. VERIFY CURRENCY
  // =========================================================

  if (razorpayPayment.currency !== 'INR') {
    throw ApiError.badRequest(
      'Invalid payment currency.'
    );
  }

  // =========================================================
  // 8. VERIFY AMOUNT
  //
  // payment.amount comes from OUR database.
  // Never trust amount from frontend.
  // =========================================================

  const expectedAmountPaise = new Prisma.Decimal(
    payment.amount.toString()
  )
    .mul(100)
    .toNumber();

  if (
    razorpayPayment.amount !==
    expectedAmountPaise
  ) {
    throw ApiError.badRequest(
      'Payment amount does not match the expected payment amount.'
    );
  }

  // =========================================================
  // 9. HANDLE FAILED PAYMENT
  // =========================================================

  if (razorpayPayment.status === 'failed') {
    return await prisma.$transaction(
      async (tx) => {
        const currentPayment =
          await tx.payment.findUnique({
            where: {
              id: payment.id,
            },
          });

        if (!currentPayment) {
          throw ApiError.notFound(
            'Payment record not found.'
          );
        }

        // Another request may have already succeeded.
        if (currentPayment.status === 'SUCCESS') {
          return {
            success: true,
            message:
              'Payment has already been processed.',
            data: {
              paymentId: currentPayment.id,
              bookingId:
                currentPayment.bookingId,
              paymentStatus: 'SUCCESS',
            },
          };
        }

        if (currentPayment.status !== 'PENDING') {
          throw ApiError.badRequest(
            `Payment is already ${currentPayment.status}.`
          );
        }

        // -----------------------------------------------------
        // Get booking
        // -----------------------------------------------------

	      const booking =
	        await tx.booking.findUnique({
	          where: {
	            id: currentPayment.bookingId,
	          },
	          include: {
	            company: {
	              include: {
	                users: {
	                  select: {
	                    id: true,
	                  },
	                },
	              },
	            },
	            stalls: {
	              include: {
	                stall: true,
	              },
	            },
	          },
	        });

        if (!booking) {
          throw ApiError.notFound(
            'Booking not found.'
          );
        }

        // -----------------------------------------------------
        // Mark payment failed
        // -----------------------------------------------------

        const updatedPayment =
          await tx.payment.updateMany({
            where: {
              id: currentPayment.id,
              status: 'PENDING',
            },
            data: {
              status: 'FAILED',
              razorpayPaymentId:
                data.razorpay_payment_id,
              razorpaySignature:
                data.razorpay_signature,
              failureReason:
                razorpayPayment.error_description ||
                'Razorpay payment failed.',
            },
          });

        if (updatedPayment.count !== 1) {
          throw ApiError.conflict(
            'Payment was already processed.'
          );
        }

        // -----------------------------------------------------
        // IMPORTANT:
        //
        // Do NOT immediately release the stall if your
        // business rule is to keep the 15-minute hold.
        //
        // Keep:
        // Booking = PENDING_PAYMENT
        // Stall   = PAYMENT_PENDING
        //
        // The expiry mechanism will release it later.
        // -----------------------------------------------------

        return {
          success: false,
          message:
            'Payment failed. Your payment attempt was unsuccessful. The stall hold remains active until it expires.',
          data: {
            paymentId: currentPayment.id,
            bookingId: booking.id,
            paymentStatus: 'FAILED',
            bookingStatus: booking.status,
            balanceAmount:
              booking.balanceAmount,
          },
        };
      },
      {
        timeout: 10000,
      }
    );
  }

  // =========================================================
  // 10. ONLY CAPTURED PAYMENT CAN CONFIRM BOOKING
  // =========================================================

  if (razorpayPayment.status !== 'captured') {
    throw ApiError.badRequest(
      `Payment is not captured. Current status: ${razorpayPayment.status}`
    );
  }

  // =========================================================
  // 11. FINAL DATABASE TRANSACTION
  // =========================================================

  const result = await prisma.$transaction(
    async (tx) => {
      // =====================================================
      // Re-read Payment inside transaction
      // =====================================================

      const currentPayment =
        await tx.payment.findUnique({
          where: {
            id: payment.id,
          },
        });

      if (!currentPayment) {
        throw ApiError.notFound(
          'Payment record not found.'
        );
      }

      // =====================================================
      // IDEMPOTENCY
      // =====================================================

      if (currentPayment.status === 'SUCCESS') {
        return {
          response: {
            success: true,
            message:
              'Payment has already been processed.',
            data: {
              paymentId: currentPayment.id,
              bookingId:
                currentPayment.bookingId,
              paymentStatus: 'SUCCESS',
            },
          },
          emailData: null,
        };
      }

      if (currentPayment.status !== 'PENDING') {
        throw ApiError.badRequest(
          `Payment is already ${currentPayment.status}.`
        );
      }

      // =====================================================
      // GET BOOKING
      // =====================================================

      const booking =
        await tx.booking.findUnique({
          where: {
            id: currentPayment.bookingId,
          },
          include: {
            company: {
              include: {
                users: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                  },
                },
              },
            },
            stalls: {
              include: {
                stall: true,
              },
            },
            exhibition: {
              include: {
                createdBy: true,
              },
            },
          },
        });

      if (!booking) {
        throw ApiError.notFound(
          'Booking not found.'
        );
      }

      // =====================================================
      // BOOKING STATE VALIDATION
      // =====================================================

      // If Razorpay captured the payment, allow completing the booking
      // even if the 30s background cron briefly marked it EXPIRED,
      // or if it was already CONFIRMED with partial payment.
      if (
        booking.status !== 'PENDING_PAYMENT' &&
        booking.status !== 'EXPIRED' &&
        booking.status !== 'CONFIRMED'
      ) {
        throw ApiError.conflict(
          `Booking cannot be completed because its current status is ${booking.status}.`
        );
      }

      const stallIds =
        booking.stalls.map(
          (item) => item.stallId
        );

      // 1. Fetch current live stall records within transaction
      const freshStalls = await tx.stall.findMany({
        where: { id: { in: stallIds } },
      });

      if (freshStalls.length !== stallIds.length) {
        throw ApiError.notFound('One or more stalls associated with this booking no longer exist.');
      }

      // 2. Prevent Double Booking: Check if any stall was booked by another confirmed booking
      const conflictingBooked = await tx.bookingStall.findMany({
        where: {
          stallId: { in: stallIds },
          bookingId: { not: booking.id },
          booking: {
            status: 'CONFIRMED',
          },
        },
        include: { stall: true },
      });

      if (conflictingBooked.length > 0) {
        const conflictStallNumbers = conflictingBooked
          .map((b) => b.stall?.stallNumber || b.stallId)
          .join(', ');
        throw ApiError.conflict(
          `Double Booking Conflict: Stall(s) ${conflictStallNumbers} were confirmed for another client.`
        );
      }

      // 3. For UNPAID initial payment, ensure stalls are not actively held by an unrelated third-party
      if (booking.paymentStatus === 'UNPAID') {
        const companyUserIds = new Set(
          (booking.company.users || []).map((companyUser) => companyUser.id)
        );

        // Admins, SuperAdmins, and Staff are privileged users who can initiate/hold bookings
        const privilegedUsers = await tx.user.findMany({
          where: { role: { in: ['ADMIN', 'SUPERADMIN', 'STAFF'] } },
          select: { id: true },
        });
        const privilegedUserIds = new Set(privilegedUsers.map((u) => u.id));

        const now = new Date();

        for (const stall of freshStalls) {
          // If stall is held by another active user whose hold timer is still running
          const isHeldByAnother =
            stall.heldByUserId &&
            !companyUserIds.has(stall.heldByUserId) &&
            !privilegedUserIds.has(stall.heldByUserId);

          const isHoldActive = stall.heldUntil && stall.heldUntil.getTime() > now.getTime();

          if (
            (stall.status === 'TEMPORARILY_HELD' || stall.status === 'PAYMENT_PENDING') &&
            isHeldByAnother &&
            isHoldActive
          ) {
            throw ApiError.conflict(
              `Stall ${stall.stallNumber} is currently held by another user. Cannot confirm booking.`
            );
          }
        }
      }

      // =====================================================
      // CALCULATE BALANCE
      // =====================================================

      const paymentAmount =
        new Prisma.Decimal(
          currentPayment.amount.toString()
        );

      const grandTotal = new Prisma.Decimal(booking.grandTotal.toString());
      const currentPaid = new Prisma.Decimal(booking.paidAmount?.toString() || '0');
      let currentBalance = new Prisma.Decimal(
        booking.balanceAmount?.toString() || '0'
      );

      // Reconcile currentBalance if uninitialized or non-positive while grandTotal - currentPaid > 0
      if (currentBalance.lessThanOrEqualTo(0)) {
        const calculated = grandTotal.minus(currentPaid);
        if (calculated.greaterThan(0)) {
          currentBalance = calculated;
        }
      }

      // Prevent payment from exceeding balance.
      if (
        paymentAmount.greaterThan(
          currentBalance
        )
      ) {
        throw ApiError.badRequest(
          'Payment amount exceeds the remaining booking balance.'
        );
      }

      const remainingBalance =
        currentBalance.minus(
          paymentAmount
        );

      const finalBalance =
        remainingBalance.lessThan(0)
          ? new Prisma.Decimal(0)
          : remainingBalance;

      const bookingIsFullyPaid =
        finalBalance.equals(0);

      // =====================================================
      // ATOMIC PAYMENT STATE CHANGE
      // =====================================================

      const paymentUpdate =
        await tx.payment.updateMany({
          where: {
            id: currentPayment.id,
            status: 'PENDING',
          },
          data: {
            status: 'SUCCESS',
            razorpayPaymentId:
              data.razorpay_payment_id,
            razorpaySignature:
              data.razorpay_signature,
            paidAt:  new Date(),
          },
        });

      // =====================================================
      // CONCURRENCY PROTECTION
      // =====================================================

      if (paymentUpdate.count !== 1) {
        throw ApiError.conflict(
          'This payment has already been processed.'
        );
      }

      // =====================================================
      // UPDATE BOOKING
      // =====================================================

      const newPaidAmount = new Prisma.Decimal(booking.paidAmount?.toString() || '0').add(paymentAmount);

      const updatedBooking = await tx.booking.update({
        where: {
          id: booking.id,
        },
        data: {
          paidAmount: newPaidAmount,
          balanceAmount: finalBalance,
          status:
            bookingIsFullyPaid
              ? 'CONFIRMED'
              : (booking.status === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING_PAYMENT'),
          paymentStatus:
            bookingIsFullyPaid
              ? 'PAID_FULL'
              : 'PARTIALLY_PAID',
        },
      });

      // =====================================================
      // FIRST SUCCESSFUL PAYMENT → CONFIRM ALL STALLS
      // =====================================================

      if (booking.paymentStatus === 'UNPAID') {
        const stallUpdate =
          await tx.stall.updateMany({
            where: {
              id: {
                in: stallIds,
              },
              status: {
                in: ['AVAILABLE', 'TEMPORARILY_HELD', 'PAYMENT_PENDING', 'BLOCKED'],
              },
            },
            data: {
              status: 'BOOKED_CONFIRMED',
              heldUntil: null,
              heldByUserId: null,
            },
          });

        if (stallUpdate.count !== stallIds.length) {
          throw ApiError.conflict(
            'One or more stalls could not be confirmed.'
          );
        }
      }
    
      const invoice = await BookingsService.createInvoice(tx,booking,currentPayment,paymentAmount);
      try {
        await updateBookingPaymentReminder(
          tx,
          updatedBooking.id,
          currentPayment.id,
          bookingIsFullyPaid ? null : (currentPayment.nextPaymentDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)),
          updatedBooking.balanceAmount
        );
      } catch (reminderErr: any) {
        console.warn('Payment reminder scheduling warning (non-fatal):', reminderErr?.message || reminderErr);
      }
      // =====================================================
      // RESPONSE
      // =====================================================

      const response = {
        success: true,

        message: bookingIsFullyPaid
          ? 'Payment successful. Booking confirmed.'
          : 'Payment successful. Remaining balance is pending.',

        data: {
          paymentId:
            currentPayment.id,

          paymentReference:
            currentPayment.paymentReference,

          paymentStatus:
            'SUCCESS',

          bookingId:
            booking.id,

          bookingStatus:
            bookingIsFullyPaid
              ? 'CONFIRMED'
              : 'PENDING_PAYMENT',

          paidAmount:
            paymentAmount,

          balanceAmount:
            finalBalance,

          paidAt: new Date()
        },
      };

      return {
        response,
        emailData: {
          booking,
          payment: currentPayment,
          paymentAmount,
          finalBalance,
          newPaidAmount,
          isInitialPayment: booking.paymentStatus === 'UNPAID',
          invoice: invoice,
        },
      };
    },
    {
      timeout: 10000,
    }
  );

  // OUT OF BAND SIDE-EFFECTS (AFTER DB TRANSACTION COMMITS)
 
if (result.emailData) {
  const {
    booking,
    payment,
    invoice,
    paymentAmount,
    finalBalance,
    newPaidAmount,
    isInitialPayment,
  } = result.emailData;

  void PaymentNotificationService.sendPaymentEmails({
    booking,
    payment,
    invoice,
    paymentAmount,
    finalBalance,
    newPaidAmount,
    isInitialPayment,
  });
}


  return result.response;
}



static async createBalancePaymentOrder(
  bookingId: string,
  user?: TokenPayload,
  customAmount?: number,
  nextDueDate?: string
) {
  // -----------------------------------------
  // 1. Validate bookingId
  // -----------------------------------------

  if (!bookingId) {
    throw ApiError.badRequest(
      'Booking ID is required.'
    );
  }

  // -----------------------------------------
  // 2. Find booking
  // -----------------------------------------

  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },

    include: {
      company: true,
      exhibition: true,
      stalls: {
        include: {
          stall: true,
        },
      },
    },
  });

  if (!booking) {
    throw ApiError.notFound(
      'Booking not found.'
    );
  }

  const canManagePayments = [
    'ADMIN',
    'SUPERADMIN',
    'STAFF',
  ].includes(user?.role ?? '');

  if (!user) {
    throw ApiError.unauthorized('Authentication is required to create a balance payment order.');
  }

  if (!canManagePayments && booking.companyId !== user.companyId) {
    throw ApiError.forbidden('You can only pay the balance for your own booking.');
  }

  // -----------------------------------------
  // 3. Validate booking status
  // -----------------------------------------

  if (booking.status === 'CANCELLED' || booking.status === 'EXPIRED') {
    throw ApiError.badRequest(
      `Balance payment is not allowed for booking with status ${booking.status}.`
    );
  }

  if (
    booking.status !== 'PENDING_PAYMENT' &&
    booking.status !== 'CONFIRMED' &&
    booking.status !== 'HELD' &&
    booking.status !== 'INITIATED'
  ) {
    throw ApiError.badRequest(
      `Balance payment is not allowed for booking with status ${booking.status}.`
    );
  }

  // -----------------------------------------
  // 4. Validate authoritative balance amount
  // -----------------------------------------

  const grandTotal = new Prisma.Decimal(booking.grandTotal.toString());
  const paidAmount = new Prisma.Decimal(booking.paidAmount?.toString() || '0');
  let balanceAmount = new Prisma.Decimal(booking.balanceAmount?.toString() || '0');

  if (balanceAmount.lessThanOrEqualTo(0)) {
    const calculatedBalance = grandTotal.minus(paidAmount);
    if (calculatedBalance.greaterThan(0)) {
      balanceAmount = calculatedBalance;
    }
  }

  if (balanceAmount.lessThanOrEqualTo(0) || booking.paymentStatus === 'PAID_FULL') {
    throw ApiError.badRequest(
      'No balance amount is pending for this booking.'
    );
  }

  // -----------------------------------------
  // 5. Validate stalls
  // -----------------------------------------

  if (!booking.stalls.length) {
    throw ApiError.badRequest(
      'No stalls are associated with this booking.'
    );
  }

  // Verify no stalls were booked by another confirmed booking
  const stallIds = booking.stalls.map((s) => s.stallId);
  const conflictingBooked = await prisma.bookingStall.findMany({
    where: {
      stallId: { in: stallIds },
      bookingId: { not: booking.id },
      booking: { status: 'CONFIRMED' },
    },
    include: { stall: true },
  });

  if (conflictingBooked.length > 0) {
    const conflictStallNumbers = conflictingBooked
      .map((b) => b.stall?.stallNumber || b.stallId)
      .join(', ');
    throw ApiError.conflict(
      `Stall(s) ${conflictStallNumbers} were confirmed for another client.`
    );
  }

  const blockedStall = booking.stalls.find(
    (item) => item.stall.status === 'BLOCKED'
  );

  if (blockedStall && !canManagePayments) {
    throw ApiError.badRequest(
      `Stall ${blockedStall.stall.stallNumber} is blocked and unavailable for balance payment.`
    );
  }

  // -----------------------------------------
  // 6. Determine Payable Amount & Partial Status
  // -----------------------------------------

  let payableAmount = balanceAmount;
  if (customAmount !== undefined && customAmount !== null && !isNaN(customAmount)) {
    const requested = new Prisma.Decimal(customAmount);
    if (requested.lessThanOrEqualTo(0)) {
      throw ApiError.badRequest('Payment amount must be greater than zero.');
    }
    if (requested.greaterThan(balanceAmount)) {
      throw ApiError.badRequest(
        `Payment amount of ₹${requested.toNumber().toLocaleString('en-IN')} cannot exceed the remaining balance of ₹${balanceAmount.toNumber().toLocaleString('en-IN')}.`
      );
    }
    payableAmount = requested;
  }

  const isPartial = payableAmount.lessThan(balanceAmount);

  // -----------------------------------------
  // 7. Create Razorpay Order
  // -----------------------------------------

  let razorpayOrder;

  try {
    razorpayOrder = await razorpay.orders.create({
      amount: Math.round(payableAmount.mul(100).toNumber()),
      currency: 'INR',
      receipt: `BAL-${booking.bookingReference}`.substring(0, 40),
      notes: {
        bookingId: booking.id,
        bookingReference: booking.bookingReference,
        paymentType: isPartial ? 'PARTIAL_BALANCE' : 'BALANCE',
        companyId: booking.companyId,
        payerUserId: user.userId,
        payerRole: user.role,
        ...(nextDueDate ? { nextDueDate } : {}),
      },
    });
  } catch (error: any) {
    console.error('Razorpay order creation failed:', error?.message || error);
    throw ApiError.internal(
      'Payment gateway is currently unavailable. Please try again later.'
    );
  }

  // -----------------------------------------
  // 8. Create Payment record
  // -----------------------------------------
  const paymentReference = generateReference('PAY', 6);
  const installmentTypeStr = isPartial
    ? (nextDueDate ? `PARTIAL_BALANCE|DUE:${nextDueDate}` : 'PARTIAL_BALANCE')
    : 'BALANCE';

  const payment = await prisma.payment.create({
    data: {
      paymentReference,
      bookingId: booking.id,
      amount: payableAmount,
      currency: 'INR',
      status: 'PENDING',
      provider: 'RAZORPAY',
      paymentMode:PaymentMode.ONLINE_RAZORPAY,
      razorpayOrderId: razorpayOrder.id,
      installmentType: installmentTypeStr,
      nextPaymentDate: isPartial
        ? (nextDueDate ? new Date(`${nextDueDate}T00:00:00.000Z`) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000))
        : null,
    },
  });

  // -----------------------------------------
  // 9. Return Razorpay details
  // -----------------------------------------

  return {
    bookingId: booking.id,
    bookingReference: booking.bookingReference,
    paymentId: payment.id,
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    keyId: env.RAZORPAY_API_KEY,
    razorpayKeyId: env.RAZORPAY_API_KEY,
    balanceAmount,
    payableAmount,
    isPartial,
    remainingAfterPayment: balanceAmount.minus(payableAmount),
    nextDueDate: nextDueDate || null,
  };
}

  static async listPayments(
    options?: {
      page?: number | string;
      limit?: number | string;
      search?: string;
      status?: string;
      method?: string;
    } | number,
    limitArg?: number
  ) {
    let rawPage: any = 1;
    let rawLimit: any = 50;
    let search = '';
    let status: string | undefined;
    let method: string | undefined;

    if (options && typeof options === 'object') {
      rawPage = options.page;
      rawLimit = options.limit;
      search = options.search || '';
      status = options.status;
      method = options.method;
    } else {
      rawPage = options || 1;
      rawLimit = limitArg || 50;
    }

    const { page, limit: take, skip } = normalizePagination(rawPage, rawLimit, 10, 100);
    const andConditions: Prisma.PaymentWhereInput[] = [];

    // Filter by status if specified
    if (status && status !== 'ALL') {
      andConditions.push({ status: status as any });
    }

    // Filter by payment method or plan
    if (method && method !== 'ALL') {
      if (method === 'FULL') {
        andConditions.push({
          OR: [{ installmentType: null }, { installmentType: 'FULL' }],
        });
      } else if (method === 'PARTIAL') {
        andConditions.push({
          installmentType: { not: null, notIn: ['FULL'] },
        });
      } else {
        andConditions.push({ paymentMethod: method });
      }
    }

    // Search filter: paymentReference, bookingReference, paymentMethod
    if (search && search.trim()) {
      const q = search.trim();
      andConditions.push({
        OR: [
          { paymentReference: { contains: q, mode: 'insensitive' } },
          { paymentMethod: { contains: q, mode: 'insensitive' } },
          { booking: { bookingReference: { contains: q, mode: 'insensitive' } } },
        ],
      });
    }

    const where: Prisma.PaymentWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

    const [total, payments, aggregate] = await prisma.$transaction([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        take,
        skip,
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          booking: {
            include: {
              stalls: { include: { stall: true } },
              company: true,
            },
          },
        },
      }),
      prisma.payment.aggregate({ where, _sum: { amount: true } }),
    ]);

    const totalFilteredAmount = Number(aggregate._sum.amount || 0);

    return {
      payments,
      total,
      page,
      limit: take,
      totalPages: Math.ceil(total / take),
      totalFilteredAmount,
    };
  }

  static async handleWebhook(body: any, signature: string | undefined) {
    if (!signature) {
      throw ApiError.badRequest('Missing Razorpay webhook signature header.');
    }

    const secret = (process.env.RAZORPAY_WEBHOOK_SECRET || env.RAZORPAY_API_SECRET || '').trim();
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    const expectedSignature = crypto.createHmac('sha256', secret).update(bodyStr).digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const receivedBuf = Buffer.from(signature, 'utf8');

    if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
      throw ApiError.badRequest('Invalid Razorpay webhook signature.');
    }

    const event = typeof body === 'string' ? JSON.parse(body) : body;
    const paymentEntity = event?.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;
    const paymentId = paymentEntity?.id;

    if (!orderId || !paymentId) {
      return { success: true, message: 'Event acknowledged (no payment/order payload).' };
    }

    const payment = await prisma.payment.findUnique({
      where: { razorpayOrderId: orderId },
    });

    if (!payment) {
      return { success: true, message: 'No local payment record found for order.' };
    }

    if (payment.status === 'SUCCESS') {
      return { success: true, message: 'Payment already processed successfully.' };
    }

    return await this.verifyAndProcessPayment({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      skipSignatureCheck: true,
    });
  }

  /**
   * Delete an unpaid, failed, or cancelled payment attempt (Super Admin only).
   */
  static async deletePayment(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          select: {
            id: true,
            bookingReference: true,
            paidAmount: true,
            paymentStatus: true,
          },
        },
        invoice: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!payment) {
      throw ApiError.notFound('Payment record not found.');
    }

    // Safeguard: Successful payments cannot be deleted
    if (payment.status === PaymentStatus.SUCCESS) {
      throw ApiError.badRequest(
        `Cannot delete payment ${payment.paymentReference} because it is marked as SUCCESS. Verified revenue records cannot be deleted.`
      );
    }

    // Only allow deletion of FAILED, CANCELLED, or PENDING payments
    const eligibleStatuses: PaymentStatus[] = [
      PaymentStatus.FAILED,
      PaymentStatus.CANCELLED,
      PaymentStatus.PENDING,
    ];

    if (!eligibleStatuses.includes(payment.status)) {
      throw ApiError.badRequest(
        `Cannot delete payment with status "${payment.status}". Only pending, failed, or cancelled payment attempts can be deleted.`
      );
    }

    await prisma.$transaction(async (tx) => {
      // 1. If an invoice was attached to this failed/pending attempt, unlink it
      if (payment.invoice) {
        await tx.invoice.update({
          where: { id: payment.invoice.id },
          data: { paymentId: null },
        });
      }

      // 2. Delete payment record
      await tx.payment.delete({
        where: { id: paymentId },
      });
    });

    return {
      id: paymentId,
      paymentReference: payment.paymentReference,
      message: `Payment record ${payment.paymentReference} deleted successfully.`,
    };
  }


    static async cashPayment(input: {
  bookingId: string;
  amount: number;
  nextDueDate?: string;
  user: {
    role: string;
  };
}) {
  const { bookingId, amount, nextDueDate } = input;

  // 1. Validate amount
  if (!Number.isFinite(amount) || amount <= 0) {
    throw ApiError.badRequest(
      'Cash payment amount must be greater than zero.'
    );
  }

  // 2. Validate staff role
  const allowedRoles = ['SUPERADMIN', 'ADMIN', 'STAFF'];

  if (!allowedRoles.includes(input.user.role)) {
    throw ApiError.forbidden(
      'Only SuperAdmin, Admin, and Staff can record cash payments.'
    );
  }

  // 3. Validate next due date format and actual date
  let nextPaymentDate: Date | null = null;

  if (nextDueDate !== undefined) {
    const parsedDate = new Date(
      `${nextDueDate}T00:00:00.000Z`
    );

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(nextDueDate) ||
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== nextDueDate
    ) {
      throw ApiError.badRequest(
        'Invalid next payment due date.'
      );
    }
     nextPaymentDate = parsedDate;
  }

  // 4. Process cash payment inside a transaction
  const result = await prisma.$transaction(
    async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          stalls: {
            include: {
              stall: true,
            },
          },
        },
      });

      if (!booking) {
        throw ApiError.notFound('Booking not found.');
      }

      // 5. Validate booking status
      if (
        booking.status === 'CANCELLED' ||
        booking.status === 'EXPIRED'
      ) {
        throw ApiError.badRequest(
          `Cannot record payment for a ${booking.status.toLowerCase()} booking.`
        );
      }

     if (booking.status !== 'PENDING_PAYMENT') {
        throw ApiError.badRequest(
          'Balance payment is allowed only for bookings with PENDING_PAYMENT status.'
        );
      }

      if (booking.stalls.length === 0) {
        throw ApiError.badRequest(
          'No stalls are associated with this booking.'
        );
      }

      // 6. Calculate the current balance
      const paidAmount = Number(booking.paidAmount);
      const remainingBalance = Number(booking.balanceAmount);

      if (remainingBalance <= 0) {
        throw ApiError.badRequest(
          'This booking has no remaining balance.'
        );
      }

      // Work in paise to avoid floating-point comparison issues.
      const amountInPaise = Math.round(amount * 100);
      const balanceInPaise = Math.round(remainingBalance * 100);

      if (
        !Number.isSafeInteger(amountInPaise) ||
        amountInPaise <= 0
      ) {
        throw ApiError.badRequest(
          'Invalid cash payment amount.'
        );
      }

      if (amountInPaise > balanceInPaise) {
        throw ApiError.badRequest(
          `Cash amount cannot exceed the remaining balance of ₹${remainingBalance.toFixed(2)}.`
        );
      }

      // 7. Calculate the updated payment totals
      const newPaidAmount = (Math.round(paidAmount * 100) + amountInPaise) / 100;

      const newBalanceAmount =(balanceInPaise - amountInPaise) / 100;

      const isFullyPaid = newBalanceAmount === 0;

      const isPartial = amountInPaise < newBalanceAmount;
      const installmentTypeStr = isPartial
    ? (nextDueDate ? `PARTIAL_BALANCE|DUE:${nextDueDate}` : 'PARTIAL_BALANCE')
    : 'BALANCE';
      // 10. Create a successful cash payment record
      const payment = await tx.payment.create({
        data: {
          paymentReference: generateReference('PAY', 6),
          bookingId: booking.id,
          amount,
          currency: 'INR',
          status: PaymentStatus.SUCCESS,
          provider: 'OFFLINE_ADMIN',
          paymentMode:PaymentMode.CASH,
          paymentMethod:'DIRECT_ADMIN',
          installmentType: installmentTypeStr,
          nextPaymentDate: isFullyPaid
            ? null
            : nextPaymentDate,
          paidAt: new Date(),
        },
      });

      // 11. Update booking totals and status
     // 11. Update booking totals and status
          const updatedBooking = await tx.booking.update({
              where: {
                id: booking.id,
              },
            data: {
              paidAmount: newPaidAmount,
              balanceAmount: newBalanceAmount,
              paymentStatus: isFullyPaid
                ? 'PAID_FULL'
                : 'PARTIALLY_PAID',
              status: isFullyPaid
                ? 'CONFIRMED'
                : 'PENDING_PAYMENT',
              expiresAt: isFullyPaid
                ? null
                : booking.expiresAt,
            },
              include: {
                stalls: {
                  include: {
                    stall: true,
                  },
                },
              },
            });
        
        // 12. Create invoice for this payment
          const invoice = await BookingsService.createInvoice(
            tx,
            booking,
            payment,
            new Prisma.Decimal(amount)
          );

        // 13. Schedule or cancel payment reminders
        await updateBookingPaymentReminder(
          tx,
          updatedBooking.id,
          payment.id,
          isFullyPaid ? null : payment.nextPaymentDate,
          updatedBooking.balanceAmount
        );

       return {
              payment,
              booking: updatedBooking,
              invoice,
              isFullyPaid,
              emailData: {
              booking: updatedBooking,
              payment,
              invoice,

              // Amount received in this transaction only
              paymentAmount: new Prisma.Decimal(amount),

              // Remaining balance after this payment
              finalBalance: new Prisma.Decimal(newBalanceAmount),

              // Cumulative amount paid after this payment
              newPaidAmount: new Prisma.Decimal(newPaidAmount),

              // Check the booking's payment status before this transaction
              isInitialPayment: false,
            },
                        };
                },
            {
              timeout: 10000,
              isolationLevel: 'Serializable',
            }
          );
          
// Send email/WhatsApp notifications after transaction commit
  // Send email notification after transaction commit
  if (result.emailData) {
     void PaymentNotificationService
     .sendPaymentEmails(result.emailData)
     .catch((err: unknown) => {
      console.error('Cash payment email failed:', err);
    });
}
    // }
  // 14. Return the result after the transaction commits
  return {
    success: true,
    message: result.isFullyPaid
      ? 'Cash payment recorded successfully. Booking is fully paid and confirmed.'
      : 'Partial cash payment recorded successfully. Remaining balance is pending.',
    data: {
      paymentId: result.payment.id,
      paymentReference: result.payment.paymentReference,
      paymentMethod: result.payment.paymentMethod,
      paymentStatus: result.payment.status,
      paidThisTransaction: Number(result.payment.amount),
      totalPaidAmount: Number(result.booking.paidAmount),
      balanceAmount: Number(result.booking.balanceAmount),
      bookingId: result.booking.id,
      bookingStatus: result.booking.status,
      bookingPaymentStatus: result.booking.paymentStatus,
      nextPaymentDate:
        result.payment.nextPaymentDate,
      paidAt: result.payment.paidAt,
    },
  };
}

}

