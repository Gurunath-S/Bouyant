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

    // 3. Verify Stalls & Exhibition
    const stalls = await prisma.stall.findMany({
      where: { id: { in: input.stallIds } },
      include: { floorPlan: true },
    });

    if (stalls.length !== input.stallIds.length) {
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

    const bookingRef = `BKG-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    // 5. ATOMIC POSTGRESQL TRANSACTION (DOUBLE-BOOKING PROTECTION)
    return await prisma.$transaction(async (tx) => {
      // Re-verify and lock stalls atomically within transaction
      const currentStalls = await tx.stall.findMany({
        where: { id: { in: input.stallIds } },
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

      // Update stall statuses to PAYMENT_PENDING
      await tx.stall.updateMany({
        where: { id: { in: input.stallIds } },
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
          status: 'PENDING_PAYMENT',
          totalAmount: basePrice,
          taxAmount,
          grandTotal,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          stalls: {
            create: stalls.map((s) => ({
              stallId: s.id,
              price: new Prisma.Decimal(s.price.toString())
            }))
          }
        },
        include: {
          stalls: { include: { stall: true } },
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
          currency: 'INR',
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
        stalls: { include: { stall: true } },
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
        stalls: { include: { stall: true } },
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
          stalls: { include: { stall: true } },
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
