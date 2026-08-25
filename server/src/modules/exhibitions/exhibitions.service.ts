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
          select: { id: true, name: true, isPublished: true },
        },
        _count: {
          select: { bookings: true },
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
    const slug = input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const existing = await prisma.exhibition.findUnique({ where: { slug } });
    if (existing) {
      throw ApiError.conflict('An exhibition with this title/slug already exists.');
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

    // Create default primary FloorPlan canvas for this exhibition
    await prisma.floorPlan.create({
      data: {
        exhibitionId: exhibition.id,
        name: `${exhibition.title} - Main Floor Canvas`,
        width: 1200,
        height: 700,
        gridColumns: 6,
        gridRows: 4,
        isPublished: true,
      },
    });

    return exhibition;
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
}
