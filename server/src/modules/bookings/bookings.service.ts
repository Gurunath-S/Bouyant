import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/apiError.js';
import { CreateBookingInput } from './bookings.schemas.js';
import { StallStatus, BookingStatus, PaymentStatus, BookingPaymentStatus, BookingSource } from '@prisma/client';
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
   * Helper: Validates exhibition existence, published status, and booking window
   */
  private static async validateExhibitionBookingWindow(exhibitionId: string, isPrivilegedUser = false) {
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

    // Privileged users (ADMIN, SUPERADMIN, STAFF) can allocate/book stalls during live events (e.g. spot registration)
    if (isPrivilegedUser) {
      return exhibition;
    }

    const now = new Date();
    const eventEndDate = new Date(exhibition.endDate);

    // B. Safety check: Has event already concluded?
    if (now > eventEndDate) {
      throw ApiError.badRequest('This exhibition event has already concluded. Stall bookings are closed.');
    }

    // C. Check cutoff deadline (use custom bookingEndDate if set, otherwise 15-day prior to startDate)
    let bookingCutoffDeadline: Date;
    if (exhibition.bookingEndDate) {
      bookingCutoffDeadline = new Date(exhibition.bookingEndDate);
    } else {
      const eventStartDate = new Date(exhibition.startDate);
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
static async createBooking(
  user: AuthenticatedRequest['user'],
  input: CreateBookingInput
) {
  // ==================================================
  // 1. Validate exhibition booking window
  // ==================================================

  const isPrivilegedUser = ['ADMIN', 'SUPERADMIN', 'STAFF'].includes(user?.role ?? '');

  const exhibition = await BookingsService.validateExhibitionBookingWindow(
    input.exhibitionId,
    isPrivilegedUser
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
  if (user?.role === 'STAFF') {
    const staffSpcode = (user.spcode && user.spcode.trim()) ? user.spcode.trim() : 'ST-STAFF';
    if (company.spcode !== staffSpcode) {
      await prisma.company.update({
        where: { id: company.id },
        data: { spcode: staffSpcode },
      });
      company.spcode = staffSpcode;
    }
  } else if (user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') {
    const adminSpcode = (user.spcode && user.spcode.trim()) ? user.spcode.trim() : (user.role === 'SUPERADMIN' ? 'SA01' : 'AD01');
    const currUpper = (company.spcode || '').toUpperCase();
    if (!currUpper.startsWith('ST') && !currUpper.startsWith('SP') && currUpper !== adminSpcode.toUpperCase()) {
      await prisma.company.update({
        where: { id: company.id },
        data: { spcode: adminSpcode },
      });
      company.spcode = adminSpcode;
    }
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
    input.contactPerson?.trim() ||
    company.contactPerson ||
    (!isPrivilegedUser ? dbUser?.name : null) ||
    'Authorized Representative';

  const snapshotContactEmail =
    input.contactEmail?.trim().toLowerCase() ||
    company.email?.toLowerCase() ||
    (!isPrivilegedUser ? (user?.email?.toLowerCase() || dbUser?.email?.toLowerCase()) : null) ||
    company.email;

  const snapshotContactPhone =
    input.contactPhone?.trim() ||
    company.mobile ||
    (!isPrivilegedUser ? dbUser?.phone : null) ||
    company.mobile;

  const snapshotBillingName = input.billingName?.trim() || company.name;
  const snapshotBillingGst = input.billingGst?.trim().toUpperCase() || company.gstNumber || null;
  const snapshotBillingPan = input.billingPan?.trim().toUpperCase() || company.panNumber || null;
  const snapshotBillingAddress = input.billingAddress?.trim() || company.address;
  const snapshotBillingCity = input.billingCity?.trim() || company.city;
  const snapshotBillingState = input.billingState?.trim() || company.state;
  const snapshotBillingPinCode = input.billingPinCode?.trim() || company.pinCode;
  const snapshotBillingCountry = input.billingCountry?.trim() || company.country || 'India';

  let bookingUserId: string | null = null;

  if (!isPrivilegedUser && dbUser) {
    bookingUserId = dbUser.id;
  } else {
    // When Admin or Staff fills in a booking for a client/exhibitor company,
    // attribute the booking to the exhibitor user of that company rather than the staff/admin!
    const matchedCompanyUser = await prisma.user.findFirst({
      where: {
        companyId: company.id,
        role: 'CLIENT',
        ...(snapshotContactEmail ? { email: { equals: snapshotContactEmail, mode: 'insensitive' as const } } : {}),
      },
      select: { id: true },
    }) || await prisma.user.findFirst({
      where: {
        companyId: company.id,
        role: 'CLIENT',
      },
      select: { id: true },
    });

    if (matchedCompanyUser) {
      bookingUserId = matchedCompanyUser.id;
    }
  }

  // ==================================================
  // 7a. ADMIN DIRECT CONFIRM — bypass Razorpay entirely
  // ==================================================

  const isPartialPayment = input.paymentType?.toUpperCase() === "PARTIAL";

  const nextPaymentDate =
    isPartialPayment && input.paymentReminderDate
      ? new Date(`${input.paymentReminderDate}T00:00:00.000Z`)
      : null;

  // Determine exact actor attribution and booking channel
  let bookingSource: BookingSource = BookingSource.CLIENT_DIRECT;
  if (user?.role === 'SUPERADMIN') {
    bookingSource = BookingSource.SUPERADMIN_MANUAL;
  } else if (user?.role === 'ADMIN') {
    bookingSource = BookingSource.ADMIN_DIRECT;
  } else if (user?.role === 'STAFF') {
    bookingSource = BookingSource.STAFF_ASSISTED;
  }

  const bookedByUserId = user?.userId || null;

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
            bookedByUserId,
            bookingSource,
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
              select: { id: true, name: true, email: true, role: true, spcode: true },
            },
            bookedByUser: {
              select: { id: true, name: true, email: true, role: true, spcode: true },
            },
          },
        });

        // 4. Create offline/admin/staff payment record (no Razorpay)
        const isStaff = user?.role === 'STAFF';
        const defaultMethod = isStaff ? 'OFFLINE_STAFF_DIRECT' : 'ADMIN_DIRECT_ALLOCATION';
        const paymentProvider = isStaff ? 'OFFLINE_STAFF' : 'OFFLINE_ADMIN';
        const paymentMethod = isStaff
          ? (input.paymentMethod && !input.paymentMethod.toUpperCase().includes('ADMIN') ? input.paymentMethod : 'OFFLINE_STAFF_DIRECT')
          : (input.paymentMethod || defaultMethod);

        const paymentRef = generateReference('PAY', 10, false);
        const payment = await tx.payment.create({
          data: {
            paymentReference: paymentRef,
            bookingId: booking.id,
            amount: result.grandTotal,
            currency: 'INR',
            status: PaymentStatus.SUCCESS,
            provider: paymentProvider,
            paymentMethod: paymentMethod,
            paidAt: new Date(),
            nextPaymentDate
          },
        });

        // // 5. Auto-generate invoice
        // const invoiceNum = generateReference('INV', 6);
        // await tx.invoice.create({
        //   data: {
        //     invoiceNumber: invoiceNum,
        //     bookingId: booking.id,
        //     paymentId: payment.id,
        //     companyId: input.companyId,
        //     totalAmount: result.basePrice,
        //     taxAmount: result.bookingTaxAmount,
        //     grandTotal: result.grandTotal,
        //     status: 'PAID',
        //     issueDate: new Date(),
        //   },
        // });

        return {
          ...booking,
          id: booking.id,
          bookingId: booking.id,
          bookingReference: booking.bookingReference,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          paymentId: payment.id,
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
              bookedByUserId,
              bookingSource,

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
                select: { id: true, name: true, email: true, role: true, spcode: true },
              },
              bookedByUser: {
                select: { id: true, name: true, email: true, role: true, spcode: true },
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
              nextPaymentDate
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
    let bookedByUserId: string | undefined;
    let bookingSource: string | undefined;
    let staffSpcode: string | undefined;

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
      bookedByUserId = pageOrOptions.bookedByUserId;
      bookingSource = pageOrOptions.bookingSource;
      staffSpcode = pageOrOptions.staffSpcode;
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
      andConditions.push({
        balanceAmount: { gt: 0 },
        paidAmount: { gt: 0 },
        paymentStatus: { not: 'UNPAID' },
        status: { notIn: ['CANCELLED', 'EXPIRED'] },
      });
    }
    if (exhibitionId && exhibitionId !== 'ALL') {
      andConditions.push({ exhibitionId });
    }
    if (userId && userId !== 'ALL') {
      andConditions.push({ company: { users: { some: { id: userId } } } });
    }
    if (bookedByUserId && bookedByUserId !== 'ALL') {
      const userOrConditions: Prisma.BookingWhereInput[] = [
        { bookedByUserId },
        { AND: [{ bookedByUserId: null }, { userId: bookedByUserId }] },
      ];
      if (staffSpcode && staffSpcode.trim()) {
        const code = staffSpcode.trim();
        userOrConditions.push(
          {
            bookedByUserId: null,
            userId: null,
            company: { spcode: { equals: code, mode: 'insensitive' } },
            NOT: { bookingSource: { in: ['ADMIN_DIRECT', 'SUPERADMIN_MANUAL'] } },
          },
          {
            bookedByUserId: null,
            userId: null,
            payments: { some: { paymentMethod: { contains: code, mode: 'insensitive' } } },
            NOT: { bookingSource: { in: ['ADMIN_DIRECT', 'SUPERADMIN_MANUAL'] } },
          }
        );
      }
      andConditions.push({
        OR: userOrConditions,
      });
    }
    if (bookingSource && bookingSource !== 'ALL') {
      andConditions.push({ bookingSource: bookingSource as any });
    }
    if (registeredByRole && registeredByRole !== 'ALL') {
      if (registeredByRole === 'ADMIN') {
        // ADMIN-registered: explicit bookedByUser role or bookingSource, or legacy attribution
        andConditions.push({
          OR: [
            { bookingSource: { in: ['ADMIN_DIRECT', 'SUPERADMIN_MANUAL'] } },
            { bookedByUser: { role: { in: ['ADMIN', 'SUPERADMIN'] } } },
            { user: { role: { in: ['ADMIN', 'SUPERADMIN'] } } },
            { company: { users: { some: { role: { in: ['ADMIN', 'SUPERADMIN'] } } } } },
            { payments: { some: { OR: [{ provider: 'OFFLINE_ADMIN' }, { paymentMethod: { contains: 'ADMIN', mode: 'insensitive' } }] } } },
            { company: { spcode: { startsWith: 'AD', mode: 'insensitive' } } },
            { company: { spcode: { startsWith: 'SA', mode: 'insensitive' } } },
            { exhibition: { spcode: { startsWith: 'AD', mode: 'insensitive' } } },
            { exhibition: { spcode: { startsWith: 'SA', mode: 'insensitive' } } },
            {
              AND: [
                { NOT: { bookingSource: 'STAFF_ASSISTED' } },
                { NOT: { bookedByUser: { role: 'STAFF' } } },
                { NOT: { payments: { some: { OR: [{ provider: 'OFFLINE_STAFF' }, { paymentMethod: { contains: 'STAFF', mode: 'insensitive' } }] } } } },
                { NOT: { user: { role: 'STAFF' } } },
                { NOT: { company: { spcode: { startsWith: 'SP', mode: 'insensitive' } } } },
                { NOT: { company: { spcode: { startsWith: 'ST', mode: 'insensitive' } } } },
              ],
            },
          ],
        });
      } else if (registeredByRole === 'STAFF') {
        // STAFF-registered: explicit bookedByUser role or STAFF_ASSISTED, or legacy staff attribution
        // Strictly exclude bookings made directly by ADMIN or SUPERADMIN
        andConditions.push({
          AND: [
            { NOT: { bookingSource: { in: ['ADMIN_DIRECT', 'SUPERADMIN_MANUAL'] } } },
            { NOT: { bookedByUser: { role: { in: ['ADMIN', 'SUPERADMIN'] } } } },
            {
              OR: [
                { bookingSource: 'STAFF_ASSISTED' },
                { bookedByUser: { role: 'STAFF' } },
                { user: { role: 'STAFF' } },
                { company: { spcode: { startsWith: 'ST', mode: 'insensitive' } } },
                { company: { spcode: { startsWith: 'SP', mode: 'insensitive' } } },
                { exhibition: { spcode: { startsWith: 'ST', mode: 'insensitive' } } },
                { exhibition: { spcode: { startsWith: 'SP', mode: 'insensitive' } } },
                { payments: { some: { OR: [{ provider: 'OFFLINE_STAFF' }, { paymentMethod: { contains: 'STAFF', mode: 'insensitive' } }] } } },
              ],
            },
          ],
        });
      } else {
        andConditions.push({
          OR: [
            { bookedByUser: { role: registeredByRole as any } },
            { user: { role: registeredByRole as any } },
            { company: { users: { some: { role: registeredByRole as any } } } },
          ],
        });
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

    const [bookings, total, aggregate, totalStallsCount] = await Promise.all([
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
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              spcode: true,
            },
          },
          bookedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              spcode: true,
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
      prisma.booking.aggregate({ where, _sum: { grandTotal: true, paidAmount: true, balanceAmount: true } }),
      prisma.bookingStall.count({ where: { booking: where } }),
    ]);

    const totalValue = Number(aggregate._sum.grandTotal || 0);
    const totalPaidValue = Number(aggregate._sum.paidAmount || 0);
    const totalBalanceValue = Number(aggregate._sum.balanceAmount || 0);

    return {
      bookings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalValue,
        totalPaidValue,
        totalBalanceValue,
        totalStallsCount,
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

  /**
   * Delete an unpaid, cancelled, or expired booking (Super Admin only).
   * Releases associated stalls and removes the booking record.
   */
  static async deleteBooking(bookingId: string) {
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

    const paidAmount = Number(booking.paidAmount || 0);
    const hasSuccessfulPayment = booking.payments?.some((p) => p.status === PaymentStatus.SUCCESS);

    // Safeguard: bookings with actual received payments cannot be deleted
    if (
      paidAmount > 0 ||
      hasSuccessfulPayment ||
      booking.paymentStatus === BookingPaymentStatus.PAID_FULL ||
      booking.paymentStatus === BookingPaymentStatus.PARTIALLY_PAID
    ) {
      throw ApiError.badRequest(
        `Cannot delete booking ${booking.bookingReference} because it has verified received payments (₹${paidAmount.toLocaleString('en-IN')}). Only unpaid, cancelled, or expired bookings can be deleted.`
      );
    }

    // Must be UNPAID, CANCELLED, EXPIRED, or INITIATED
    const eligiblePaymentStatuses: BookingPaymentStatus[] = [BookingPaymentStatus.UNPAID];
    const eligibleBookingStatuses: BookingStatus[] = [
      BookingStatus.CANCELLED,
      BookingStatus.EXPIRED,
      BookingStatus.INITIATED,
      BookingStatus.PENDING_PAYMENT,
      BookingStatus.HELD,
    ];

    if (!eligiblePaymentStatuses.includes(booking.paymentStatus) && !eligibleBookingStatuses.includes(booking.status)) {
      throw ApiError.badRequest(
        `Cannot delete booking with status "${booking.status}" and payment status "${booking.paymentStatus}". Only unpaid or cancelled bookings can be deleted.`
      );
    }

    const stallIds = booking.stalls.map((s) => s.stallId);

    await prisma.$transaction(async (tx) => {
      // 1. Release stalls back to AVAILABLE if not in another active booking
      if (stallIds.length > 0) {
        for (const stallId of stallIds) {
          const otherActive = await tx.bookingStall.findFirst({
            where: {
              stallId,
              bookingId: { not: bookingId },
              booking: {
                status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING_PAYMENT, BookingStatus.HELD] },
              },
            },
          });

          if (!otherActive) {
            await tx.stall.update({
              where: { id: stallId },
              data: {
                status: StallStatus.AVAILABLE,
                heldUntil: null,
                heldByUserId: null,
              },
            });
          }
        }
      }

      // 2. Clean up related records and booking
      await tx.bookingStall.deleteMany({ where: { bookingId } });
      await tx.invoice.deleteMany({ where: { bookingId } });
      await tx.payment.deleteMany({ where: { bookingId } });
      await tx.booking.delete({ where: { id: bookingId } });
    });

    return {
      id: bookingId,
      bookingReference: booking.bookingReference,
      message: `Booking ${booking.bookingReference} deleted successfully.`,
    };
  }
}

