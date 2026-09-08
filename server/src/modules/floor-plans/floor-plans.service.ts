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

        const newStallNumbers = new Set(stalls.map((s) => s.stallNumber.trim()));
        const newStallIds = new Set(stalls.filter((s) => s.id).map((s) => s.id));

        // Identify stalls to delete (stalls not in new list and with 0 bookings)
        const toDeleteIds: string[] = [];
        for (const existing of existingStalls) {
          const isRetained = newStallIds.has(existing.id) || newStallNumbers.has(existing.stallNumber);
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

        // Upsert stalls
        for (const s of stalls) {
          const stallNum = s.stallNumber.trim();
          const category = s.category || 'STANDARD';
          const price = Number(s.price) || 50000;
          const areaSqFt = s.areaSqFt || Math.round((s.width * s.height) / 100);
          const width = Number(s.width) || 60;
          const height = Number(s.height) || 60;
          const xPosition = Number(s.xPosition) || 0;
          const yPosition = Number(s.yPosition) || 0;
          const status = s.status || 'AVAILABLE';

          // Try match by ID or stallNumber
          const matched = existingStalls.find(
            (es) => (s.id && es.id === s.id) || es.stallNumber === stallNum
          );

          if (matched) {
            // Update existing stall
            await tx.stall.update({
              where: { id: matched.id },
              data: {
                stallNumber: stallNum,
                name: s.name || `Stall ${stallNum}`,
                category,
                price,
                areaSqFt,
                width,
                height,
                xPosition,
                yPosition,
                // Don't overwrite BOOKED_CONFIRMED status with AVAILABLE unless explicitly requested
                status: matched.status === 'BOOKED_CONFIRMED' && status === 'AVAILABLE' ? 'BOOKED_CONFIRMED' : status,
              },
            });
          } else {
            // Create new stall
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
    });
  }
}
