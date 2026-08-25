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
}
