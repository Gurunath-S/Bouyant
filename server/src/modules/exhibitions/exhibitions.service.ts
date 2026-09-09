import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/apiError.js';
import { CreateExhibitionInput, UpdateExhibitionInput } from './exhibitions.schemas.js';

export class ExhibitionsService {
  static async listExhibitions(status?: string, search = '') {
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { venue: { contains: search, mode: 'insensitive' } },
      ];
    }

    const exhibitions = await prisma.exhibition.findMany({
      where,
      orderBy: { startDate: 'asc' },
      include: {
        floorPlans: {
          select: { 
            id: true, name: true, isPublished: true, _count: {
          select: {
            stalls: {
              where: {
                status: 'AVAILABLE',
              },
            },
          },
        }
          },
          
        },
        _count: {
          select: { bookings: true},
        },
      },
    });
   
    return exhibitions;
  }

  static async getExhibitionBySlugOrId(identifier: string) {
    const exhibition = await prisma.exhibition.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }],
      },
      include: {
        floorPlans: {
          include: {
            stalls: {
              orderBy: { stallNumber: 'asc' },
            },
          },
        },
      },
    });

    if (!exhibition) {
      throw ApiError.notFound('Exhibition not found.');
    }

    return exhibition;
  }

  static async createExhibition(input: CreateExhibitionInput) {
    let baseSlug = (input as any).slug
      ? (input as any).slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
      : input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    if (!baseSlug) baseSlug = `exhibition-${Date.now().toString().slice(-4)}`;

    let slug = baseSlug;
    const existing = await prisma.exhibition.findUnique({ where: { slug } });
    if (existing) {
      slug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const exhibition = await prisma.exhibition.create({
      data: {
        title: input.title,
        slug,
        description: input.description,
        venue: input.venue,
        city: input.city,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        bannerUrl: input.bannerUrl,
        status: input.status || 'DRAFT',
      },
    });

    const anyInput = input as any;
    const initialFloorPlan = anyInput.floorPlans?.[0];
    const initialLayoutData = initialFloorPlan?.layoutData || anyInput.layoutData;
    const initialStalls: any[] = initialFloorPlan?.stalls || anyInput.stalls || [];

    // Create primary FloorPlan canvas for this exhibition
    const floorPlan = await prisma.floorPlan.create({
      data: {
        exhibitionId: exhibition.id,
        name: initialFloorPlan?.name || `${exhibition.title} - Main Exhibition Canvas`,
        width: initialFloorPlan?.width ? Math.round(initialFloorPlan.width) : 1400,
        height: initialFloorPlan?.height ? Math.round(initialFloorPlan.height) : 850,
        backgroundUrl: initialLayoutData ? (typeof initialLayoutData === 'string' ? initialLayoutData : JSON.stringify(initialLayoutData)) : null,
        gridColumns: 20,
        gridRows: 15,
        isPublished: true,
      },
    });

    if (initialStalls.length > 0) {
      const seenNumbers = new Set<string>();
      const stallsToCreate = initialStalls.map((s, idx) => {
        let stallNum = (s.stallNumber || `S-${idx + 1}`).trim();
        if (seenNumbers.has(stallNum)) {
          stallNum = `${stallNum}-${idx + 1}`;
        }
        seenNumbers.add(stallNum);
        return {
          floorPlanId: floorPlan.id,
          stallNumber: stallNum,
          name: s.name || `Stall ${stallNum}`,
          category: s.category || 'STANDARD',
          price: Number(s.price) || 50000,
          areaSqFt: s.areaSqFt || Math.round((Number(s.width || 60) * Number(s.height || 60)) / 100),
          width: Number(s.width) || 60,
          height: Number(s.height) || 60,
          xPosition: Number(s.xPosition) || 0,
          yPosition: Number(s.yPosition) || 0,
          status: s.status || 'AVAILABLE',
        };
      });

      await prisma.stall.createMany({
        data: stallsToCreate,
        skipDuplicates: true,
      });

      await prisma.exhibition.update({
        where: { id: exhibition.id },
        data: { totalStalls: stallsToCreate.length },
      });
    }

    return await prisma.exhibition.findUnique({
      where: { id: exhibition.id },
      include: {
        floorPlans: {
          include: { stalls: true },
        },
      },
    });
  }

  static async updateExhibition(id: string, input: UpdateExhibitionInput) {
    const exhibition = await prisma.exhibition.findUnique({ where: { id } });
    if (!exhibition) {
      throw ApiError.notFound('Exhibition not found.');
    }

    const dataToUpdate: any = { ...input };
    if (input.startDate) dataToUpdate.startDate = new Date(input.startDate);
    if (input.endDate) dataToUpdate.endDate = new Date(input.endDate);

    return await prisma.exhibition.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  static async deleteExhibition(id: string) {
    const exhibition = await prisma.exhibition.findUnique({
      where: { id },
      include: {
        _count: {
          select: { bookings: true },
        },
      },
    });

    if (!exhibition) {
      throw ApiError.notFound('Exhibition not found.');
    }

    if (exhibition._count.bookings > 0) {
      throw ApiError.badRequest(
        `Cannot delete exhibition because it has ${exhibition._count.bookings} active booking(s). Please change the event status to CANCELLED instead.`
      );
    }

    await prisma.exhibition.delete({ where: { id } });
    return { id, message: 'Exhibition deleted successfully.' };
  }
}
