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

    return await prisma.$transaction(async (tx) => {
      // 1. Update FloorPlan record
      const updateData: any = {};
      if (name) updateData.name = name;
      if (width) updateData.width = Math.round(width);
      if (height) updateData.height = Math.round(height);
      if (layoutData !== undefined) {
        updateData.backgroundUrl = typeof layoutData === 'string' ? layoutData : JSON.stringify(layoutData);
      }

      const updatedFloorPlan = await tx.floorPlan.update({
        where: { id: floorPlanId },
        data: updateData,
      });

      // 2. Synchronize stalls if provided
      if (Array.isArray(stalls)) {
        const existingStalls = await tx.stall.findMany({
          where: { floorPlanId },
          include: { bookings: true },
        });

        // Deduplicate incoming stalls by stallNumber to ensure intra-batch uniqueness
        const seenNumbers = new Set<string>();
        const sanitizedStalls = stalls.map((s, idx) => {
          let num = (s.stallNumber || `S-${idx + 1}`).trim();
          if (seenNumbers.has(num.toUpperCase())) {
            num = `${num}-${idx + 1}`;
          }
          seenNumbers.add(num.toUpperCase());
          return { ...s, stallNumber: num };
        });

        const newStallNumbers = new Set(sanitizedStalls.map((s) => s.stallNumber.toUpperCase()));
        const newStallIds = new Set(sanitizedStalls.filter((s) => s.id).map((s) => s.id));

        // Identify stalls to delete (stalls not in new list and with 0 bookings)
        const toDeleteIds: string[] = [];
        for (const existing of existingStalls) {
          const isRetained = newStallIds.has(existing.id) || newStallNumbers.has(existing.stallNumber.toUpperCase());
          if (!isRetained) {
            if (existing.bookings && existing.bookings.length > 0) {
              // Preserve stalls with active bookings
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

        // Upsert stalls: if a record with (floorPlanId, stallNumber) exists, update it!
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

          try {
            // Check if record already exists by unique (floorPlanId, stallNumber)
            const existingByNum = await tx.stall.findUnique({
              where: {
                floorPlanId_stallNumber: {
                  floorPlanId,
                  stallNumber: stallNum,
                },
              },
            });

            if (existingByNum) {
              // Exists: update it directly
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
              // Does not exist yet: create
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
          } catch (err: any) {
            // If unique constraint race occurs, update the record rather than failing
            if (err?.code === 'P2002' || err?.message?.includes('stallNumber')) {
              await tx.stall.updateMany({
                where: {
                  floorPlanId,
                  stallNumber: stallNum,
                },
                data: {
                  name: s.name || `Stall ${stallNum}`,
                  category,
                  price,
                  areaSqFt,
                  width,
                  height,
                  xPosition,
                  yPosition,
                },
              });
            } else {
              throw err;
            }
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
    });
  }
}
