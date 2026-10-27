import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/apiError.js';

export class FloorPlansService {
  static async getById(floorPlanId: string) {
    const floorPlan = await prisma.floorPlan.findUnique({
      where: { id: floorPlanId },
      include: {
        exhibition: true,
        stalls: {
          orderBy: { stallNumber: 'asc' },
        },
      },
    });

    if (!floorPlan) {
      throw ApiError.notFound('Floor plan canvas not found.');
    }

    return floorPlan;
  }

  static async updateFloorPlan(floorPlanId: string, data: any) {
    const floorPlan = await prisma.floorPlan.findUnique({ where: { id: floorPlanId } });
    if (!floorPlan) throw ApiError.notFound('Floor plan canvas not found.');

    return await prisma.floorPlan.update({
      where: { id: floorPlanId },
      data,
    });
  }

  static async syncFloorPlan(
    floorPlanId: string,
    payload: {
      name?: string;
      width?: number;
      height?: number;
      layoutData?: any;
      stalls?: Array<{
        id?: string;
        stallNumber: string;
        name?: string;
        category?: any;
        price: number | string;
        areaSqFt?: number;
        width: number;
        height: number;
        xPosition: number;
        yPosition: number;
        status?: any;
      }>;
    }
  ) {
    const floorPlan = await prisma.floorPlan.findUnique({
      where: { id: floorPlanId },
      include: { exhibition: true },
    });

    if (!floorPlan) {
      throw ApiError.notFound('Floor plan canvas not found.');
    }

    const { name, width, height, layoutData, stalls } = payload;
    const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

    let validatedLayoutData = layoutData;
    if (layoutData !== undefined) {
      let parsedLayout: any = layoutData;
      if (typeof layoutData === 'string') {
        try {
          parsedLayout = JSON.parse(layoutData);
        } catch {
          parsedLayout = {};
        }
      } else {
        parsedLayout = { ...layoutData };
      }

      // Validate stallColors map if provided
      if (parsedLayout.stallColors && typeof parsedLayout.stallColors === 'object') {
        for (const [key, colorVal] of Object.entries(parsedLayout.stallColors)) {
          if (colorVal && typeof colorVal === 'string') {
            if (!hexColorRegex.test(colorVal)) {
              throw ApiError.badRequest(`Invalid stall color "${colorVal}" for ${key}. Colors must be valid hexadecimal values.`);
            }
          }
        }
      }

      // Validate facility icon sizes and display modes
      if (Array.isArray(parsedLayout.facilities)) {
        parsedLayout.facilities = parsedLayout.facilities.map((fac: any) => {
          if (fac.iconSize !== undefined) {
            const size = Number(fac.iconSize);
            if (isNaN(size) || size < 10 || size > 72) {
              fac.iconSize = 24;
            }
          }
          if (fac.displayMode && !['both', 'icon-only', 'text-only'].includes(fac.displayMode)) {
            fac.displayMode = 'both';
          }
          return fac;
        });
      }

      validatedLayoutData = parsedLayout;
    }

    // Validate incoming stall colors if present
    if (Array.isArray(stalls)) {
      for (const s of stalls) {
        if ((s as any).color && typeof (s as any).color === 'string') {
          if (!hexColorRegex.test((s as any).color)) {
            throw ApiError.badRequest(`Invalid stall color "${(s as any).color}" for stall ${s.stallNumber}. Colors must be valid hexadecimal values.`);
          }
        }
      }
    }

    return await prisma.$transaction(
      async (tx) => {
        // 1. Update FloorPlan record
        const updateData: any = {};
        if (name) updateData.name = name;
        if (width) updateData.width = Math.round(width);
        if (height) updateData.height = Math.round(height);
        if (validatedLayoutData !== undefined) {
          updateData.backgroundUrl = typeof validatedLayoutData === 'string' ? validatedLayoutData : JSON.stringify(validatedLayoutData);
        }

        await tx.floorPlan.update({
          where: { id: floorPlanId },
          data: updateData,
        });

        // 2. Synchronize stalls if provided
        if (Array.isArray(stalls)) {
          const existingStalls = await tx.stall.findMany({
            where: { floorPlanId },
            include: { bookingStalls: true },
          });

          // Build index of existing stalls by uppercase stallNumber
          const existingMap = new Map<string, any>();
          existingStalls.forEach((es) => {
            existingMap.set(es.stallNumber.toUpperCase(), es);
          });

          // Validate incoming stalls by stallNumber to ensure intra-batch uniqueness
          const seenNumbers = new Set<string>();
          for (let i = 0; i < stalls.length; i++) {
            const num = (stalls[i].stallNumber || '').trim();
            if (!num) {
              throw ApiError.badRequest(`Stall #${i + 1} is missing a stall identifier.`);
            }
            const upper = num.toUpperCase();
            if (seenNumbers.has(upper)) {
              throw ApiError.badRequest(
                `Duplicate stall identifier "${num}" detected. Every stall on a floor plan must have a unique identifier/number.`
              );
            }
            seenNumbers.add(upper);
          }

          const sanitizedStalls = stalls.map((s) => ({
            ...s,
            stallNumber: s.stallNumber.trim(),
          }));

          const newStallNumbers = new Set(sanitizedStalls.map((s) => s.stallNumber.toUpperCase()));
          const newStallIds = new Set(sanitizedStalls.filter((s) => s.id).map((s) => s.id));

          // Identify stalls to delete (stalls not in new list and with 0 bookings)
          const toDeleteIds: string[] = [];
          for (const existing of existingStalls) {
            const isRetained = newStallIds.has(existing.id) || newStallNumbers.has(existing.stallNumber.toUpperCase());
            if (!isRetained) {
              const isBookedOrHeld =
                (existing.bookingStalls && existing.bookingStalls.length > 0) ||
                existing.status === 'BOOKED_CONFIRMED' ||
                existing.status === 'PAYMENT_PENDING' ||
                existing.status === 'BOOKING_IN_PROGRESS' ||
                existing.status === 'TEMPORARILY_HELD' ||
                Boolean((existing as any).heldByUserId);

              if (isBookedOrHeld) {
                // Preserve stalls with active bookings, holds, or pending customer payments
                continue;
              }
              toDeleteIds.push(existing.id);
            }
          }

          if (toDeleteIds.length > 0) {
            await tx.stall.deleteMany({
              where: { id: { in: toDeleteIds } },
            });
          }

          const validCategories = ['STANDARD', 'PREMIUM', 'CORNER', 'ISLAND'];
          const validStatuses = ['AVAILABLE', 'TEMPORARILY_HELD', 'BOOKING_IN_PROGRESS', 'PAYMENT_PENDING', 'BOOKED_CONFIRMED', 'BLOCKED'];

          // Upsert stalls using in-memory existingMap lookup to prevent round-trip transaction stalls
          for (const s of sanitizedStalls) {
            const stallNum = s.stallNumber.trim();
            const rawCat = s.category ? String(s.category).toUpperCase() : 'STANDARD';
            const category = (validCategories.includes(rawCat) ? rawCat : 'STANDARD') as any;

            const rawStat = s.status ? String(s.status).toUpperCase() : 'AVAILABLE';
            const status = (validStatuses.includes(rawStat) ? rawStat : 'AVAILABLE') as any;

            const price = Number(s.price) || 50000;
            const areaSqFt = s.areaSqFt ? Number(s.areaSqFt) : Math.round((Number(s.width || 60) * Number(s.height || 60)) / 100);
            const width = Number(s.width) || 60;
            const height = Number(s.height) || 60;
            const xPosition = Number(s.xPosition) || 0;
            const yPosition = Number(s.yPosition) || 0;

            const existingByNum = existingMap.get(stallNum.toUpperCase());

            if (existingByNum) {
              await tx.stall.update({
                where: { id: existingByNum.id },
                data: {
                  name: s.name || `Stall ${stallNum}`,
                  category,
                  price,
                  areaSqFt,
                  width,
                  height,
                  xPosition,
                  yPosition,
                  status: existingByNum.status === 'BOOKED_CONFIRMED' && status === 'AVAILABLE' ? 'BOOKED_CONFIRMED' : status,
                },
              });
            } else {
              await tx.stall.create({
                data: {
                  floorPlanId,
                  stallNumber: stallNum,
                  name: s.name || `Stall ${stallNum}`,
                  category,
                  price,
                  areaSqFt,
                  width,
                  height,
                  xPosition,
                  yPosition,
                  status,
                },
              });
            }
          }

          // Update totalStalls on Exhibition
          await tx.exhibition.update({
            where: { id: floorPlan.exhibitionId },
            data: { totalStalls: stalls.length },
          });
        }

        return await tx.floorPlan.findUnique({
          where: { id: floorPlanId },
          include: {
            stalls: {
              orderBy: { stallNumber: 'asc' },
            },
          },
        });
      },
      {
        maxWait: 15000,
        timeout: 30000,
      }
    );
  }
}
