import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/apiError.js';
import { CreateExhibitionInput, UpdateExhibitionInput } from './exhibitions.schemas.js';

export class ExhibitionsService {
  static async listExhibitions(status?: string, search = '') {
    const validExhibitionStatuses = ['DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED', 'ARCHIVED'];
    const where: any = {};
    if (status && status.toUpperCase() !== 'ALL') {
      const upper = status.toUpperCase();
      if (validExhibitionStatuses.includes(upper)) {
        where.status = upper;
      }
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

  static async createExhibition(input: CreateExhibitionInput, creatorId?: string) {
    let baseSlug = (input as any).slug
      ? (input as any).slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
      : input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    if (!baseSlug) baseSlug = `exhibition-${Date.now().toString().slice(-4)}`;

    let slug = baseSlug;
    while (await prisma.exhibition.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    let edition = (input as any).edition ? String((input as any).edition).toUpperCase().trim() : '';
    if (edition && /^\d+$/.test(edition)) {
      edition = edition.padStart(2, '0');
    }
    let eventCode = (input as any).eventCode ? String((input as any).eventCode).toUpperCase().trim() : '';
    let spcode = (input as any).spcode ? String((input as any).spcode).toUpperCase().trim() : '';

    if (!eventCode) {
      const words = input.title.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/);
      if (words.length >= 2) {
        eventCode = (words[0][0] + words[1][0]).toUpperCase();
      } else if (words.length === 1 && words[0].length >= 2) {
        eventCode = words[0].substring(0, 2).toUpperCase();
      } else {
        eventCode = 'EX';
      }
    }

    if (!edition) {
      let edNum = 1;
      const latestForEvent = await prisma.exhibition.findFirst({
        where: { eventCode },
        orderBy: { createdAt: 'desc' },
      });
      if (latestForEvent && latestForEvent.edition) {
        const prev = parseInt(latestForEvent.edition, 10);
        if (!isNaN(prev)) edNum = prev + 1;
      }
      edition = String(edNum).padStart(2, '0');
      while (await prisma.exhibition.findFirst({ where: { edition, eventCode } })) {
        edNum++;
        edition = String(edNum).padStart(2, '0');
      }
    }

    // SP code identifies the admin who created the exhibition.
    if (spcode) {
      spcode = String(spcode).toUpperCase().trim();
    } else if (creatorId) {
      const creator = await prisma.user.findUnique({ where: { id: creatorId } });
      if (creator?.spcode) {
        spcode = creator.spcode;
      }
    }

    const existingCode = await prisma.exhibition.findFirst({
      where: {
        edition,
        eventCode,
      },
    });

    if (existingCode) {
      throw ApiError.conflict(
        `An exhibition with Edition '${edition}' and Event Code '${eventCode}' already exists ("${existingCode.title}"). These codes must always be unique.`
      );
    }

    const validExhibitionStatuses = ['DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED', 'ARCHIVED'];
    let exhibitionStatus = 'DRAFT';
    if (input.status) {
      const upper = String(input.status).toUpperCase();
      if (validExhibitionStatuses.includes(upper)) {
        exhibitionStatus = upper;
      }
    }

    const exhibition = await prisma.exhibition.create({
      data: {
        title: input.title,
        slug,
        description: input.description || 'Exhibition Event Details',
        edition,
        eventCode,
        spcode,
        venue: input.venue || 'Exhibition Center',
        city: input.city || 'Mumbai',
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        bannerUrl: input.bannerUrl || null,
        totalStalls: Number(input.totalStalls) || 0,
        status: exhibitionStatus as any,
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
        width: initialFloorPlan?.width ? Math.round(Number(initialFloorPlan.width)) : 1400,
        height: initialFloorPlan?.height ? Math.round(Number(initialFloorPlan.height)) : 850,
        backgroundUrl: initialLayoutData ? (typeof initialLayoutData === 'string' ? initialLayoutData : JSON.stringify(initialLayoutData)) : null,
        gridColumns: 20,
        gridRows: 15,
        isPublished: true,
      },
    });

    if (initialStalls.length > 0) {
      const validCategories = ['STANDARD', 'PREMIUM', 'CORNER', 'ISLAND'];
      const validStatuses = ['AVAILABLE', 'TEMPORARILY_HELD', 'BOOKING_IN_PROGRESS', 'PAYMENT_PENDING', 'BOOKED_CONFIRMED', 'BLOCKED'];

      const seenNumbers = new Set<string>();
      const stallsToCreate = initialStalls.map((s, idx) => {
        let stallNum = (s.stallNumber || `S-${idx + 1}`).trim();
        if (seenNumbers.has(stallNum)) {
          stallNum = `${stallNum}-${idx + 1}`;
        }
        seenNumbers.add(stallNum);

        const rawCat = s.category ? String(s.category).toUpperCase() : 'STANDARD';
        const category = validCategories.includes(rawCat) ? rawCat : 'STANDARD';

        const rawStat = s.status ? String(s.status).toUpperCase() : 'AVAILABLE';
        const status = validStatuses.includes(rawStat) ? rawStat : 'AVAILABLE';

        return {
          floorPlanId: floorPlan.id,
          stallNumber: stallNum,
          name: s.name || `Stall ${stallNum}`,
          category: category as any,
          price: Number(s.price) || 50000,
          areaSqFt: s.areaSqFt ? Number(s.areaSqFt) : Math.round((Number(s.width || 60) * Number(s.height || 60)) / 100),
          width: Number(s.width) || 60,
          height: Number(s.height) || 60,
          xPosition: Number(s.xPosition) || 0,
          yPosition: Number(s.yPosition) || 0,
          status: status as any,
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

    const cleanUpdateData: any = {};
    if (input.title !== undefined) cleanUpdateData.title = input.title;
    if (input.description !== undefined) cleanUpdateData.description = input.description;
    if (input.venue !== undefined) cleanUpdateData.venue = input.venue;
    if (input.city !== undefined) cleanUpdateData.city = input.city;
    if (input.startDate) cleanUpdateData.startDate = new Date(input.startDate);
    if (input.endDate) cleanUpdateData.endDate = new Date(input.endDate);
    if (input.bannerUrl !== undefined) cleanUpdateData.bannerUrl = input.bannerUrl || null;
    if (input.totalStalls !== undefined) cleanUpdateData.totalStalls = Number(input.totalStalls) || 0;

    if (input.status) {
      const validExhibitionStatuses = ['DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED', 'ARCHIVED'];
      const rawStatus = String(input.status).toUpperCase();
      if (validExhibitionStatuses.includes(rawStatus)) {
        cleanUpdateData.status = rawStatus as any;
      }
    }

    if (input.slug !== undefined) {
      const formattedSlug = input.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      if (formattedSlug && formattedSlug !== exhibition.slug) {
        const existingSlug = await prisma.exhibition.findFirst({
          where: { slug: formattedSlug, NOT: { id } },
        });
        if (existingSlug) {
          throw ApiError.conflict(`Exhibition with slug '${formattedSlug}' already exists.`);
        }
        cleanUpdateData.slug = formattedSlug;
      }
    }

    let targetEdition = input.edition !== undefined ? String(input.edition).toUpperCase().trim() : exhibition.edition;
    if (targetEdition && /^\d+$/.test(targetEdition)) {
      targetEdition = targetEdition.padStart(2, '0');
    }
    const targetEventCode = input.eventCode !== undefined ? String(input.eventCode).toUpperCase().trim() : exhibition.eventCode;

    if (targetEdition && targetEventCode) {
      const existingCode = await prisma.exhibition.findFirst({
        where: {
          edition: targetEdition,
          eventCode: targetEventCode,
          NOT: { id },
        },
      });

      if (existingCode) {
        throw ApiError.conflict(
          `An exhibition with Edition '${targetEdition}' and Event Code '${targetEventCode}' already exists ("${existingCode.title}"). These codes must always be unique.`
        );
      }
      cleanUpdateData.edition = targetEdition;
      cleanUpdateData.eventCode = targetEventCode;
    }

    const targetSpcode = input.spcode !== undefined ? String(input.spcode).toUpperCase().trim() : undefined;
    if (targetSpcode !== undefined) {
      cleanUpdateData.spcode = targetSpcode;
    }

    // Safely sync floor plans and stalls if provided in input
    const anyInput = input as any;
    const initialFloorPlan = anyInput.floorPlans?.[0];
    const initialLayoutData = initialFloorPlan?.layoutData || anyInput.layoutData;
    const initialStalls: any[] = initialFloorPlan?.stalls || anyInput.stalls;

    if (initialLayoutData || (initialStalls && initialStalls.length > 0)) {
      let fp = await prisma.floorPlan.findFirst({
        where: { exhibitionId: id },
      });

      const bgUrl = initialLayoutData
        ? typeof initialLayoutData === 'string'
          ? initialLayoutData
          : JSON.stringify(initialLayoutData)
        : undefined;

      if (!fp) {
        fp = await prisma.floorPlan.create({
          data: {
            exhibitionId: id,
            name: initialFloorPlan?.name || `${exhibition.title} - Main Floor Plan`,
            width: initialFloorPlan?.width ? Math.round(Number(initialFloorPlan.width)) : 1400,
            height: initialFloorPlan?.height ? Math.round(Number(initialFloorPlan.height)) : 850,
            backgroundUrl: bgUrl || null,
            gridColumns: 20,
            gridRows: 15,
            isPublished: true,
          },
        });
      } else if (bgUrl !== undefined) {
        await prisma.floorPlan.update({
          where: { id: fp.id },
          data: {
            backgroundUrl: bgUrl,
            width: initialFloorPlan?.width ? Math.round(Number(initialFloorPlan.width)) : fp.width,
            height: initialFloorPlan?.height ? Math.round(Number(initialFloorPlan.height)) : fp.height,
          },
        });
      }

      if (initialStalls && initialStalls.length > 0 && fp) {
        const validCategories = ['STANDARD', 'PREMIUM', 'CORNER', 'ISLAND'];
        const validStatuses = ['AVAILABLE', 'TEMPORARILY_HELD', 'BOOKING_IN_PROGRESS', 'PAYMENT_PENDING', 'BOOKED_CONFIRMED', 'BLOCKED'];

        for (const s of initialStalls) {
          if (!s.stallNumber) continue;
          const stallNum = String(s.stallNumber).trim();

          const rawCat = s.category ? String(s.category).toUpperCase() : 'STANDARD';
          const category = validCategories.includes(rawCat) ? rawCat : 'STANDARD';

          const rawStat = s.status ? String(s.status).toUpperCase() : 'AVAILABLE';
          const status = validStatuses.includes(rawStat) ? rawStat : 'AVAILABLE';

          const stallData = {
            name: s.name || `Stall ${stallNum}`,
            category: category as any,
            price: Number(s.price) || 50000,
            areaSqFt: s.areaSqFt ? Number(s.areaSqFt) : Math.round((Number(s.width || 60) * Number(s.height || 60)) / 100),
            width: Number(s.width) || 60,
            height: Number(s.height) || 60,
            xPosition: Number(s.xPosition) || 0,
            yPosition: Number(s.yPosition) || 0,
            status: status as any,
          };

          const existingStall = await prisma.stall.findFirst({
            where: { floorPlanId: fp.id, stallNumber: stallNum },
          });

          if (existingStall) {
            await prisma.stall.update({
              where: { id: existingStall.id },
              data: stallData,
            });
          } else {
            await prisma.stall.create({
              data: {
                floorPlanId: fp.id,
                stallNumber: stallNum,
                ...stallData,
              },
            });
          }
        }

        const totalStallCount = await prisma.stall.count({ where: { floorPlanId: fp.id } });
        cleanUpdateData.totalStalls = totalStallCount;
      }
    }

    await prisma.exhibition.update({
      where: { id },
      data: cleanUpdateData,
    });

    return await prisma.exhibition.findUnique({
      where: { id },
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
