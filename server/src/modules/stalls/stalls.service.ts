import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/apiError.js';
import { env } from '../../config/env.js';
import { CreateStallInput, UpdateStallInput } from './stalls.schemas.js';

export class StallsService {
  /**
   * Automatically release stalls whose TEMPORARILY_HELD timer has expired.
   */
  static async releaseExpiredHolds() {
    const now = new Date();
    return await prisma.$transaction(async (tx) => {
      // 1. Find stalls with expired hold timers (TEMPORARILY_HELD or PAYMENT_PENDING)
      const expiredStalls = await tx.stall.findMany({
        where: {
          status: { in: ['TEMPORARILY_HELD', 'PAYMENT_PENDING'] },
          heldUntil: { lt: now },
        },
        select: { id: true },
      });

      if (expiredStalls.length === 0) return 0;
      const expiredStallIds = expiredStalls.map((s) => s.id);

      // 2. Mark associated unconfirmed bookings as EXPIRED
      await tx.booking.updateMany({
        where: {
          status: { in: ['INITIATED', 'PENDING_PAYMENT'] },
          stalls: { some: { stallId: { in: expiredStallIds } } },
          expiresAt: { lt: now },
        },
        data: {
          status: 'EXPIRED',
        },
      });

      // 3. Atomically release stall statuses back to AVAILABLE
      const result = await tx.stall.updateMany({
        where: {
          id: { in: expiredStallIds },
          status: { in: ['TEMPORARILY_HELD', 'PAYMENT_PENDING'] },
          heldUntil: { lt: now },
        },
        data: {
          status: 'AVAILABLE',
          heldUntil: null,
          heldByUserId: null,
        },
      });

      if (result.count > 0) {
        console.log(`⏰ Automatically released ${result.count} expired stall hold(s) and expired associated unconfirmed bookings.`);
      }

      return result.count;
    });
  }

  static async getStallsByFloorPlan(floorPlanId: string) {
    // Purge expired holds before fetching
    await this.releaseExpiredHolds();

    const stalls = await prisma.stall.findMany({
      where: { floorPlanId },
      orderBy: { stallNumber: 'asc' },
    });

    return stalls;
  }

  static async createStall(input: CreateStallInput) {
    const existing = await prisma.stall.findUnique({
      where: {
        floorPlanId_stallNumber: {
          floorPlanId: input.floorPlanId,
          stallNumber: input.stallNumber,
        },
      },
    });

    if (existing) {
      return await prisma.stall.update({
        where: { id: existing.id },
        data: {
          ...input,
          price: input.price,
        },
      });
    }

    return await prisma.stall.create({
      data: {
        ...input,
        price: input.price,
      },
    });
  }

  static async updateStall(stallId: string, input: UpdateStallInput) {
    const stall = await prisma.stall.findUnique({ where: { id: stallId } });
    if (!stall) {
      throw ApiError.notFound('Stall not found.');
    }

    return await prisma.stall.update({
      where: { id: stallId },
      data: input,
    });
  }

  /**
   * ATOMIC STALL HOLD RESERVATION (Concurrency-safe)
   * Only changes status to TEMPORARILY_HELD if current status is AVAILABLE.
   */
  static async holdStall(stallId: string, userId: string) {
    await this.releaseExpiredHolds();

    const targetStall = await prisma.stall.findUnique({
      where: { id: stallId },
      include: {
        floorPlan: {
          include: {
            exhibition: true,
          },
        },
      },
    });

    if (!targetStall) {
      throw ApiError.notFound('Stall not found.');
    }

    const exhibition = targetStall.floorPlan.exhibition;
    if (exhibition.status === 'COMPLETED') {
      throw ApiError.badRequest('This exhibition has concluded. Stall holds and bookings are closed.');
    }
    if (exhibition.status === 'CANCELLED') {
      throw ApiError.badRequest('This exhibition is cancelled.');
    }
    if (exhibition.status === 'DRAFT') {
      throw ApiError.badRequest('This exhibition is not yet published for booking.');
    }

    const now = new Date();
    const bookingDeadline = exhibition.bookingEndDate
      ? new Date(exhibition.bookingEndDate)
      : new Date(exhibition.startDate.getTime() - 15 * 24 * 60 * 60 * 1000);

    if (now > bookingDeadline) {
      throw ApiError.badRequest('Stall bookings for this exhibition are closed as the cut-off date has passed.');
    }

    if (now > exhibition.endDate) {
      throw ApiError.badRequest('This exhibition event has ended.');
    }

    const holdUntil = new Date(Date.now() + env.STALL_HOLD_DURATION_MINUTES * 60 * 1000);

    // Atomic update using Prisma condition: updateMany guarantees atomicity in PostgreSQL
    const updatedCount = await prisma.stall.updateMany({
      where: {
        id: stallId,
        OR: [
          { status: 'AVAILABLE' },
          // Allow re-holding if held by same user
          { status: 'TEMPORARILY_HELD', heldByUserId: userId },
        ],
      },
      data: {
        status: 'TEMPORARILY_HELD',
        heldUntil: holdUntil,
        heldByUserId: userId,
      },
    });

    if (updatedCount.count === 0) {
      throw ApiError.conflict(
        'This stall is no longer available for hold. Another user has already reserved or booked it. Please select another stall.'
      );
    }

    const updatedStall = await prisma.stall.findUnique({
      where: { id: stallId },
      include: {
        floorPlan: {
          include: {
            exhibition: true,
          },
        },
      },
    });

    return {
      stall: updatedStall,
      heldUntil: holdUntil,
      durationMinutes: env.STALL_HOLD_DURATION_MINUTES,
    };
  }

  static async releaseHold(stallId: string, userId: string) {
    const stall = await prisma.stall.findUnique({ where: { id: stallId } });
    if (!stall) throw ApiError.notFound('Stall not found.');

    if (stall.heldByUserId !== userId && stall.status === 'TEMPORARILY_HELD') {
      throw ApiError.forbidden('You are not authorized to release this hold.');
    }

    return await prisma.stall.update({
      where: { id: stallId },
      data: {
        status: 'AVAILABLE',
        heldUntil: null,
        heldByUserId: null,
      },
    });
  }

  static async toggleBlockStall(stallId: string, block: boolean) {
    const stall = await prisma.stall.findUnique({ where: { id: stallId } });
    if (!stall) throw ApiError.notFound('Stall not found.');

    return await prisma.stall.update({
      where: { id: stallId },
      data: {
        status: block ? 'BLOCKED' : 'AVAILABLE',
        heldUntil: null,
        heldByUserId: null,
      },
    });
  }
}
