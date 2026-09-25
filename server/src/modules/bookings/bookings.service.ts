import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/apiError.js';
import { CreateBookingInput } from './bookings.schemas.js';
import { StallsService } from '../stalls/stalls.service.js';
import { Prisma } from '@prisma/client';
import { generateReference } from '../../utils/reference.js';

export class BookingsService {
  /**
   * CREATE BOOKING WITH STRICT CONCURRENCY & AUTHORITATIVE SERVER PRICING
   */
  static async createBooking(userId: string, input: CreateBookingInput) {
    // 1. Release expired holds first
    await StallsService.releaseExpiredHolds();

    // 2. Resolve target User & Company
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user) throw ApiError.notFound('User account not found.');

    const targetCompanyId = input.companyId || user.companyId;
    if (!targetCompanyId) {
      throw ApiError.badRequest('Please complete your Company Profile before making a stall booking.');
    }

    // Verify Exhibition status & current upcoming active event rule
    const exhibition = await prisma.exhibition.findUnique({
      where: { id: input.exhibitionId },
    });
    if (!exhibition) throw ApiError.notFound('Exhibition event not found.');

    const now = new Date();

    // SINGLE ACTIVE UPCOMING EVENT RULE:
    // Only the single current active published upcoming exhibition allows bookings
    const currentUpcomingEvent = await prisma.exhibition.findFirst({
      where: {
        status: 'PUBLISHED',
        endDate: { gte: now },
      },
      orderBy: { startDate: 'asc' },
    });

    if (currentUpcomingEvent && exhibition.id !== currentUpcomingEvent.id) {
      throw ApiError.badRequest(
        `Stall bookings are strictly restricted to the current upcoming event ("${currentUpcomingEvent.title}"). Bookings for this exhibition are closed.`
      );
    }

    if (exhibition.status === 'COMPLETED') {
      throw ApiError.badRequest('This exhibition has concluded. Stall bookings are closed.');
    }
    if (exhibition.status === 'CANCELLED') {
      throw ApiError.badRequest('This exhibition is cancelled. Stall bookings are not accepted.');
    }
    const isAdminUser = user.role === 'ADMIN' || user.role === 'SUPERADMIN';
    if (exhibition.status === 'DRAFT' && !isAdminUser) {
      throw ApiError.badRequest('This exhibition is in draft mode and not yet published for booking.');
    }

    const bookingDeadline = exhibition.bookingEndDate
      ? new Date(exhibition.bookingEndDate)
      : new Date(exhibition.startDate.getTime() - 15 * 24 * 60 * 60 * 1000);

    if (now > bookingDeadline) {
      throw ApiError.badRequest(
        `Stall bookings for this exhibition closed on ${bookingDeadline.toLocaleDateString()}. New reservations are no longer accepted.`
      );
    }

    if (now > exhibition.endDate) {
      throw ApiError.badRequest('This exhibition event has ended. Stall bookings are closed.');
    }

    // Sort stall IDs deterministically to prevent multi-stall deadlocks (PostgreSQL 40P01)
    const sortedStallIds = [...input.stallIds].sort();

    // 1. Idempotency Check: Return existing booking if idempotencyKey is provided
    if (input.idempotencyKey) {
      const existingIdempotentBooking = await prisma.booking.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: {
          stalls: { include: { stall: true } },
          exhibition: true,
          company: true,
          user: { select: { id: true, name: true, email: true, role: true, spcode: true } },
        },
      });
      if (existingIdempotentBooking) {
        return existingIdempotentBooking;
      }
    }

    // 2. Prevent duplicate active pending booking for the exact same stalls by the same user
    const existingActiveBooking = await prisma.booking.findFirst({
      where: {
        userId,
        status: { in: ['INITIATED', 'PENDING_PAYMENT'] },
        stalls: { some: { stallId: { in: sortedStallIds } } },
      },
      include: {
        stalls: { include: { stall: true } },
        exhibition: true,
        company: true,
        user: { select: { id: true, name: true, email: true, role: true, spcode: true } },
      },
    });
    if (existingActiveBooking) {
      return existingActiveBooking;
    }

    // 3. Verify Stalls & Exhibition
    const stalls = await prisma.stall.findMany({
      where: { id: { in: sortedStallIds } },
      include: { floorPlan: true },
    });

    if (stalls.length !== sortedStallIds.length) {
      throw ApiError.notFound('One or more target stalls not found.');
    }

    for (const stall of stalls) {
      if (stall.floorPlan.exhibitionId !== input.exhibitionId) {
        throw ApiError.badRequest(`Stall ${stall.stallNumber} does not belong to this exhibition event.`);
      }
      if (stall.status === 'BOOKED_CONFIRMED' || stall.status === 'BLOCKED') {
        throw ApiError.conflict(`Stall ${stall.stallNumber} is no longer available for booking.`);
      }
      if (stall.status === 'TEMPORARILY_HELD' && stall.heldByUserId && stall.heldByUserId !== userId) {
        throw ApiError.conflict(`Stall ${stall.stallNumber} is currently held by another user. Please select another stall.`);
      }
    }

    // 4. Server-calculated Authoritative Pricing
    const basePrice = stalls.reduce((sum, stall) => sum.add(new Prisma.Decimal(stall.price.toString())), new Prisma.Decimal(0));
    const taxRate = new Prisma.Decimal('0.18'); // 18% Tax / GST
    const taxAmount = basePrice.mul(taxRate);
    const grandTotal = basePrice.add(taxAmount);

    const bookingRef = generateReference('BKG', 6);

    // 5. ATOMIC POSTGRESQL TRANSACTION WITH DETERMINISTIC SORTED LOCK ORDER
    return await prisma.$transaction(async (tx) => {
      // Re-verify and lock stalls atomically within transaction using sorted IDs
      const currentStalls = await tx.stall.findMany({
        where: { id: { in: sortedStallIds } },
        orderBy: { id: 'asc' }, // Explicit deterministic lock order
      });

      for (const currentStall of currentStalls) {
        if (currentStall.status === 'BOOKED_CONFIRMED' || currentStall.status === 'BLOCKED') {
          throw ApiError.conflict(`Double Booking Conflict: Stall ${currentStall.stallNumber} was confirmed by another client moments ago.`);
        }
        if (
          currentStall.status === 'TEMPORARILY_HELD' &&
          currentStall.heldByUserId &&
          currentStall.heldByUserId !== userId
        ) {
          throw ApiError.conflict(`Stall Hold Conflict: Another client has held Stall ${currentStall.stallNumber}.`);
        }
      }

      const isAdminUser = user.role === 'ADMIN' || user.role === 'SUPERADMIN';
      const isDirectConfirm = input.confirmDirectly && isAdminUser;

      if (isDirectConfirm) {
        // Direct Admin Allocation: atomically update only if available/held
        const updateResult = await tx.stall.updateMany({
          where: {
            id: { in: sortedStallIds },
            OR: [
              { status: 'AVAILABLE' },
              { status: 'TEMPORARILY_HELD' },
            ],
          },
          data: {
            status: 'BOOKED_CONFIRMED',
            heldUntil: null,
            heldByUserId: null,
          },
        });

        if (updateResult.count !== sortedStallIds.length) {
          throw ApiError.conflict('Double Booking Conflict: One or more selected stalls were booked or held by another user just now.');
        }

        const booking = await tx.booking.create({
          data: {
            bookingReference: bookingRef,
            idempotencyKey: input.idempotencyKey || null,
            userId,
            companyId: targetCompanyId,
            exhibitionId: input.exhibitionId,
            status: 'CONFIRMED',
            paymentStatus: 'PAID_FULL',
            totalAmount: basePrice,
            taxAmount,
            grandTotal,
            paidAmount: grandTotal,
            balanceAmount: new Prisma.Decimal(0),
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
            user: { select: { id: true, name: true, email: true, role: true, spcode: true } },
          },
        });

        // Create Payment Record for Admin Allocation
        const paymentRef = generateReference('PAY', 8, false);
        const payment = await tx.payment.create({
          data: {
            paymentReference: paymentRef,
            bookingId: booking.id,
            userId,
            amount: grandTotal,
            currency: 'INR',
            status: 'SUCCESS',
            provider: 'OFFLINE_ADMIN',
            paymentMethod: input.paymentMethod || 'ADMIN_DIRECT_ALLOCATION',
            paidAt: new Date(),
          },
        });

        // Generate Invoice
        const invoiceNum = generateReference('INV', 6);
        await tx.invoice.create({
          data: {
            invoiceNumber: invoiceNum,
            bookingId: booking.id,
            paymentId: payment.id,
            companyId: targetCompanyId,
            totalAmount: basePrice,
            taxAmount,
            grandTotal,
            status: 'PAID',
            issueDate: new Date(),
          },
        });

        return booking;
      }

      // Standard / Client Hold Flow: Atomically claim stalls for payment pending using sorted IDs
      const updateResult = await tx.stall.updateMany({
        where: {
          id: { in: sortedStallIds },
          OR: [
            { status: 'AVAILABLE' },
            { status: 'TEMPORARILY_HELD', heldByUserId: userId },
          ],
        },
        data: {
          status: 'PAYMENT_PENDING',
          heldUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 mins to complete payment
          heldByUserId: userId,
        },
      });

      if (updateResult.count !== sortedStallIds.length) {
        throw ApiError.conflict('Double Booking Conflict: One or more selected stalls are no longer available for booking.');
      }

      // Create Booking record with Idempotency Key
      const booking = await tx.booking.create({
        data: {
          bookingReference: bookingRef,
          idempotencyKey: input.idempotencyKey || null,
          userId,
          companyId: targetCompanyId,
          exhibitionId: input.exhibitionId,
          status: 'PENDING_PAYMENT',
          totalAmount: basePrice,
          taxAmount,
          grandTotal,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
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
          user: { select: { id: true, name: true, email: true, role: true, spcode: true } },
        },
      });

      // Initialize Payment Record
      const paymentRef = generateReference('PAY', 8, false);
      await tx.payment.create({
        data: {
          paymentReference: paymentRef,
          bookingId: booking.id,
          userId,
          amount: grandTotal,
          currency: 'INR',
          status: 'PENDING',
          provider: 'RAZORPAY',
        },
      });

      return booking;
    });
  }

  static async getUserBookings(userId: string) {
    return await prisma.booking.findMany({
      where: { userId },
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
        user: { select: { id: true, name: true, email: true, role: true, spcode: true } },
      },
    });

    if (!booking) throw ApiError.notFound('Booking record not found.');
    if (userId && booking.userId !== userId) {
      throw ApiError.forbidden('Not authorized to access this booking record.');
    }

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
          user: { select: { id: true, name: true, email: true, role: true, spcode: true } },
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
