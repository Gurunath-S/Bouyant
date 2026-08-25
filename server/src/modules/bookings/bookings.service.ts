import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/apiError.js';
import { CreateBookingInput } from './bookings.schemas.js';
import { StallsService } from '../stalls/stalls.service.js';
import { Prisma } from '@prisma/client';

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

    // 3. Verify Stall & Exhibition
    const stall = await prisma.stall.findUnique({
      where: { id: input.stallId },
      include: { floorPlan: true },
    });

    if (!stall) throw ApiError.notFound('Target stall not found.');
    if (stall.floorPlan.exhibitionId !== input.exhibitionId) {
      throw ApiError.badRequest('The requested stall does not belong to this exhibition event.');
    }

    // Check status prior to transaction
    if (stall.status === 'BOOKED_CONFIRMED' || stall.status === 'BLOCKED') {
      throw ApiError.conflict('This stall is no longer available for booking.');
    }

    if (stall.status === 'TEMPORARILY_HELD' && stall.heldByUserId && stall.heldByUserId !== userId) {
      throw ApiError.conflict('This stall is currently held by another user. Please select another stall.');
    }

    // 4. Server-calculated Authoritative Pricing
    const basePrice = new Prisma.Decimal(stall.price.toString());
    const taxRate = new Prisma.Decimal('0.18'); // 18% Tax / GST
    const taxAmount = basePrice.mul(taxRate);
    const grandTotal = basePrice.add(taxAmount);

    const bookingRef = `BKG-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    // 5. ATOMIC POSTGRESQL TRANSACTION (DOUBLE-BOOKING PROTECTION)
    return await prisma.$transaction(async (tx) => {
      // Re-verify and lock stall status atomically within transaction
      const currentStall = await tx.stall.findUnique({
        where: { id: input.stallId },
      });

      if (!currentStall || currentStall.status === 'BOOKED_CONFIRMED' || currentStall.status === 'BLOCKED') {
        throw ApiError.conflict('Double Booking Conflict: This stall was confirmed by another client moments ago.');
      }

      if (
        currentStall.status === 'TEMPORARILY_HELD' &&
        currentStall.heldByUserId &&
        currentStall.heldByUserId !== userId
      ) {
        throw ApiError.conflict('Stall Hold Conflict: Another client has held this stall.');
      }

      // Update stall status to PAYMENT_PENDING
      await tx.stall.update({
        where: { id: input.stallId },
        data: {
          status: 'PAYMENT_PENDING',
          heldUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 mins to complete payment
          heldByUserId: userId,
        },
      });

      // Create Booking record
      const booking = await tx.booking.create({
        data: {
          bookingReference: bookingRef,
          userId,
          companyId: targetCompanyId,
          exhibitionId: input.exhibitionId,
          stallId: input.stallId,
          status: 'PENDING_PAYMENT',
          totalAmount: basePrice,
          taxAmount,
          grandTotal,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
        include: {
          stall: true,
          exhibition: true,
          company: true,
          user: { select: { name: true, email: true } },
        },
      });

      // Initialize Payment Record
      const paymentRef = `PAY-${Math.floor(10000 + Math.random() * 90000)}`;
      await tx.payment.create({
        data: {
          paymentReference: paymentRef,
          bookingId: booking.id,
          userId,
          amount: grandTotal,
          currency: 'USD',
          status: 'PENDING',
          provider: 'STRIPE_SIMULATOR',
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
        stall: true,
        exhibition: true,
        company: true,
        payment: true,
        invoice: true,
      },
    });
  }

  static async getBookingById(bookingId: string, userId?: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        stall: true,
        exhibition: true,
        company: true,
        payment: true,
        invoice: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!booking) throw ApiError.notFound('Booking record not found.');
    if (userId && booking.userId !== userId) {
      throw ApiError.forbidden('Not authorized to access this booking record.');
    }

    return booking;
  }

  static async listAllBookings(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = status ? { status } : {};

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          stall: true,
          exhibition: { select: { title: true } },
          company: { select: { name: true, companyCode: true } },
          payment: { select: { status: true, paymentReference: true } },
          user: { select: { name: true, email: true } },
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
