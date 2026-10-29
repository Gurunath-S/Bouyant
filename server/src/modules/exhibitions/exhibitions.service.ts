import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/apiError.js';
import { StallsService } from '../stalls/stalls.service.js';
import { CreateExhibitionInput, UpdateExhibitionInput } from './exhibitions.schemas.js';

export class ExhibitionsService {
  static async listExhibitions(status?: string, search = '') {
    // Auto-release expired stall holds and auto-complete expired published exhibitions
    try {
      await StallsService.releaseExpiredHolds();
      await prisma.exhibition.updateMany({
        where: {
          status: 'PUBLISHED',
          endDate: { lt: new Date() },
        },
        data: {
          status: 'COMPLETED',
        },
      });
    } catch (err) {
      console.warn('Could not auto-release expired holds or complete exhibitions:', err);
    }

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
            id: true,
            name: true,
            isPublished: true,
            stalls: {
              select: {
                id: true,
                stallNumber: true,
                status: true,
                category: true,
                price: true,
                heldUntil: true,
              },
            },
          },
        },
        bookings: {
          where: {
            status: { notIn: ['CANCELLED', 'EXPIRED'] },
          },
          select: {
            id: true,
            status: true,
            stalls: {
              select: {
                stallId: true,
              },
            },
          },
        },
        _count: {
          select: { bookings: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, role: true, spcode: true },
        },
      },
    });

    const now = new Date();
    const enrichedExhibitions = exhibitions.map((exhibition) => {
      const allStalls = (exhibition.floorPlans || []).flatMap((fp) => fp.stalls || []);
      const totalStallsFromDb = allStalls.length > 0 ? allStalls.length : (exhibition.totalStalls || 0);

      // Booked stall IDs from non-cancelled bookings
      const bookedStallIdsFromBookings = new Set(
        (exhibition.bookings || []).flatMap((b) => (b.stalls || []).map((s) => s.stallId))
      );

      // Booked stalls count
      let bookedStallsCount = allStalls.filter((s) => {
        if (s.status === 'BOOKED_CONFIRMED' || s.status === 'BLOCKED') return true;
        if (bookedStallIdsFromBookings.has(s.id)) return true;
        if (['TEMPORARILY_HELD', 'PAYMENT_PENDING', 'BOOKING_IN_PROGRESS'].includes(s.status)) {
          if (!s.heldUntil || new Date(s.heldUntil) > now) return true;
        }
        return false;
      }).length;

      // Fallback if floorPlan stalls are 0 but bookings exist
      if (allStalls.length === 0 && bookedStallIdsFromBookings.size > 0) {
        bookedStallsCount = bookedStallIdsFromBookings.size;
      }

      const totalStalls = totalStallsFromDb;
      const availableStallsCount = Math.max(0, totalStalls - bookedStallsCount);
      const isFull = totalStalls > 0 && (availableStallsCount === 0 || bookedStallsCount >= totalStalls);

      return {
        ...exhibition,
        spcode: exhibition.spcode || exhibition.createdBy?.spcode || null,
        totalStalls,
        bookedStallsCount,
        availableStallsCount,
        isFull,
      };
    });
   
    return enrichedExhibitions;
  }

  static async getExhibitionBySlugOrId(identifier: string) {
    try {
      await StallsService.releaseExpiredHolds();
    } catch (err) {
      console.warn('Could not auto-release expired holds:', err);
    }

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
        bookings: {
          where: {
            status: { notIn: ['CANCELLED', 'EXPIRED'] },
          },
          select: {
            id: true,
            status: true,
            stalls: {
              select: {
                stallId: true,
              },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true, role: true, spcode: true },
        },
      },
    });

    if (!exhibition) {
      throw ApiError.notFound('Exhibition not found.');
    }

    // Auto-complete if expired
    if (exhibition.status === 'PUBLISHED' && new Date(exhibition.endDate) < new Date()) {
      await prisma.exhibition.update({
        where: { id: exhibition.id },
        data: { status: 'COMPLETED' },
      });
      exhibition.status = 'COMPLETED';
    }

    const now = new Date();
    const allStalls = (exhibition.floorPlans || []).flatMap((fp) => fp.stalls || []);
    const totalStallsFromDb = allStalls.length > 0 ? allStalls.length : (exhibition.totalStalls || 0);

    const bookedStallIdsFromBookings = new Set(
      (exhibition.bookings || []).flatMap((b) => (b.stalls || []).map((s) => s.stallId))
    );

    let bookedStallsCount = allStalls.filter((s) => {
      if (s.status === 'BOOKED_CONFIRMED' || s.status === 'BLOCKED') return true;
      if (bookedStallIdsFromBookings.has(s.id)) return true;
      if (['TEMPORARILY_HELD', 'PAYMENT_PENDING', 'BOOKING_IN_PROGRESS'].includes(s.status)) {
        if (!s.heldUntil || new Date(s.heldUntil) > now) return true;
      }
      return false;
    }).length;

    if (allStalls.length === 0 && bookedStallIdsFromBookings.size > 0) {
      bookedStallsCount = bookedStallIdsFromBookings.size;
    }

    const totalStalls = totalStallsFromDb;
    const availableStallsCount = Math.max(0, totalStalls - bookedStallsCount);
    const isFull = totalStalls > 0 && (availableStallsCount === 0 || bookedStallsCount >= totalStalls);

    return {
      ...exhibition,
      spcode: exhibition.spcode || (exhibition as any).createdBy?.spcode || null,
      totalStalls,
      bookedStallsCount,
      availableStallsCount,
      isFull,
    };
  }

  static async createExhibition(input: CreateExhibitionInput, creatorId?: string) {
    const trimmedTitle = input.title ? input.title.trim() : '';
    if (!trimmedTitle) {
      throw ApiError.badRequest('Exhibition event name is required.');
    }

    // Enforce unique exhibition name
    const existingByTitle = await prisma.exhibition.findFirst({
      where: {
        title: {
          equals: trimmedTitle,
          mode: 'insensitive',
        },
      },
    });
    if (existingByTitle) {
      throw ApiError.badRequest(
        `An exhibition with the name "${trimmedTitle}" already exists. Exhibition names must be unique to prevent duplicate entries.`
      );
    }

    let baseSlug = (input as any).slug
      ? (input as any).slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
      : trimmedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

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

    // SP code identifies the admin/staff member who created or was allocated the exhibition.
    if (spcode && spcode !== 'B003') {
      spcode = String(spcode).toUpperCase().trim();
    } else if (creatorId) {
      const creator = await prisma.user.findUnique({ where: { id: creatorId } });
      if (creator?.spcode) {
        spcode = creator.spcode;
      } else if (creator?.role === 'SUPERADMIN') {
        spcode = 'SA01';
      } else if (creator?.role === 'ADMIN') {
        spcode = 'AD01';
      } else if (creator?.role === 'STAFF') {
        spcode = 'ST01';
      }
    }

    if (!spcode) {
      spcode = 'AD01';
    }

    // Auto-resolve any event code / edition collision so a newer unique code is always assigned
    let finalEventCode = eventCode;
    while (await prisma.exhibition.findFirst({ where: { edition, eventCode: finalEventCode } })) {
      const match = finalEventCode.match(/^(.*?)(\d+)$/);
      if (match) {
        finalEventCode = `${match[1]}${parseInt(match[2], 10) + 1}`;
      } else {
        finalEventCode = `${finalEventCode}2`;
      }
    }
    eventCode = finalEventCode;

    const validExhibitionStatuses = ['DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED', 'ARCHIVED'];
    let exhibitionStatus = 'DRAFT';
    if (input.status) {
      const upper = String(input.status).toUpperCase();
      if (validExhibitionStatuses.includes(upper)) {
        exhibitionStatus = upper;
      }
    }

    const startDt = new Date(input.startDate);
    const endDt = new Date(input.endDate);
    const bookingEndDt = input.bookingEndDate
      ? new Date(input.bookingEndDate)
      : new Date(startDt.getTime() - 15 * 24 * 60 * 60 * 1000);

    const exhibition = await prisma.exhibition.create({
      data: {
        title: input.title,
        slug,
        description: input.description || 'Exhibition Event Details',
        edition,
        eventCode,
        spcode,
        createdByUserId: creatorId || null,
        venue: input.venue || 'Exhibition Center',
        address: input.address || null,
        city: input.city || 'Mumbai',
        state: input.state || null,
        latitude: input.latitude !== undefined && input.latitude !== null ? Number(input.latitude) : null,
        longitude: input.longitude !== undefined && input.longitude !== null ? Number(input.longitude) : null,
        category: input.category || null,
        startDate: startDt,
        endDate: endDt,
        bannerUrl: input.bannerUrl || (input.images && input.images[0]) || null,
        images: Array.isArray(input.images) && input.images.length > 0
          ? input.images.filter(Boolean)
          : (input.bannerUrl ? [input.bannerUrl] : []),
        notificationEmails: input.notificationEmails || null,
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

    // Seed initial stalls if provided
    if (initialStalls.length > 0) {
      const seenNumbers = new Set<string>();
      for (let i = 0; i < initialStalls.length; i++) {
        const num = (initialStalls[i].stallNumber || '').trim();
        if (num) {
          const upper = num.toUpperCase();
          if (seenNumbers.has(upper)) {
            throw ApiError.badRequest(
              `Duplicate stall identifier "${num}" detected. Every stall on a floor plan must have a unique identifier/number.`
            );
          }
          seenNumbers.add(upper);
        }
      }

      const validCategories = ['STANDARD', 'PREMIUM', 'CORNER', 'ISLAND'];
      const validStatuses = ['AVAILABLE', 'HELD', 'BOOKED_CONFIRMED', 'BLOCKED'];

      const stallsToCreate = initialStalls.map((s, idx) => {
        const stallNum = s.stallNumber ? String(s.stallNumber).trim() : `A-${String(idx + 1).padStart(3, '0')}`;
        const rawCategory = s.category ? String(s.category).toUpperCase() : 'STANDARD';
        const category = validCategories.includes(rawCategory) ? rawCategory : 'STANDARD';

        const rawStatus = s.status ? String(s.status).toUpperCase() : 'AVAILABLE';
        const status = validStatuses.includes(rawStatus) ? rawStatus : 'AVAILABLE';

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

  static async updateExhibition(identifier: string, input: UpdateExhibitionInput) {
    const exhibition = await prisma.exhibition.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }],
      },
    });
    if (!exhibition) {
      throw ApiError.notFound('Exhibition not found.');
    }
    const id = exhibition.id;

    const cleanUpdateData: any = {};
    if (input.title !== undefined) {
      const trimmedTitle = input.title.trim();
      if (!trimmedTitle) {
        throw ApiError.badRequest('Exhibition event name cannot be empty.');
      }
      const existingByTitle = await prisma.exhibition.findFirst({
        where: {
          id: { not: id },
          title: {
            equals: trimmedTitle,
            mode: 'insensitive',
          },
        },
      });
      if (existingByTitle) {
        throw ApiError.badRequest(
          `An exhibition with the name "${trimmedTitle}" already exists. Exhibition names must be unique to prevent duplicate entries.`
        );
      }
      cleanUpdateData.title = trimmedTitle;
    }
    if (input.description !== undefined) cleanUpdateData.description = input.description;
    if (input.venue !== undefined) cleanUpdateData.venue = input.venue;
    if (input.address !== undefined) cleanUpdateData.address = input.address || null;
    if (input.city !== undefined) cleanUpdateData.city = input.city;
    if (input.state !== undefined) cleanUpdateData.state = input.state || null;
    if (input.latitude !== undefined) {
      cleanUpdateData.latitude = input.latitude !== null && input.latitude !== undefined ? Number(input.latitude) : null;
    }
    if (input.longitude !== undefined) {
      cleanUpdateData.longitude = input.longitude !== null && input.longitude !== undefined ? Number(input.longitude) : null;
    }
    if (input.category !== undefined) cleanUpdateData.category = input.category || null;
    if (input.startDate) cleanUpdateData.startDate = new Date(input.startDate);
    if (input.endDate) cleanUpdateData.endDate = new Date(input.endDate);
    if (input.bookingEndDate !== undefined) {
      cleanUpdateData.bookingEndDate = input.bookingEndDate ? new Date(input.bookingEndDate) : null;
    }
    if (input.images !== undefined) {
      cleanUpdateData.images = Array.isArray(input.images) ? input.images.filter(Boolean) : [];
      if (!input.bannerUrl && cleanUpdateData.images.length > 0) {
        cleanUpdateData.bannerUrl = cleanUpdateData.images[0];
      }
    }
    if (input.bannerUrl !== undefined) {
      cleanUpdateData.bannerUrl = input.bannerUrl || (cleanUpdateData.images?.[0]) || null;
      if (cleanUpdateData.bannerUrl && cleanUpdateData.images && !cleanUpdateData.images.includes(cleanUpdateData.bannerUrl)) {
        cleanUpdateData.images = [cleanUpdateData.bannerUrl, ...cleanUpdateData.images];
      }
    }
    if (input.notificationEmails !== undefined) {
      cleanUpdateData.notificationEmails = input.notificationEmails || null;
    }
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
      let finalTargetCode = targetEventCode;
      while (
        await prisma.exhibition.findFirst({
          where: {
            edition: targetEdition,
            eventCode: finalTargetCode,
            NOT: { id },
          },
        })
      ) {
        const match = finalTargetCode.match(/^(.*?)(\d+)$/);
        if (match) {
          finalTargetCode = `${match[1]}${parseInt(match[2], 10) + 1}`;
        } else {
          finalTargetCode = `${finalTargetCode}2`;
        }
      }
      cleanUpdateData.edition = targetEdition;
      cleanUpdateData.eventCode = finalTargetCode;
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
        const seenNumbers = new Set<string>();
        for (let i = 0; i < initialStalls.length; i++) {
          const num = (initialStalls[i].stallNumber || '').trim();
          if (num) {
            const upper = num.toUpperCase();
            if (seenNumbers.has(upper)) {
              throw ApiError.badRequest(
                `Duplicate stall identifier "${num}" detected. Every stall on a floor plan must have a unique identifier/number.`
              );
            }
            seenNumbers.add(upper);
          }
        }

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

  static async deleteExhibition(identifier: string, force = false) {
    const exhibition = await prisma.exhibition.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }],
      },
      include: {
        bookings: {
          select: {
            id: true,
            status: true,
            paymentStatus: true,
          },
        },
      },
    });

    if (!exhibition) {
      throw ApiError.notFound('Exhibition not found.');
    }

    const id = exhibition.id;

    // Active bookings are confirmed or partially/fully paid bookings
    const activeBookings = exhibition.bookings.filter(
      (b) => b.status === 'CONFIRMED' || (b.status === 'PENDING_PAYMENT' && b.paymentStatus !== 'UNPAID')
    );

    if (activeBookings.length > 0 && !force) {
      throw ApiError.badRequest(
        `Cannot delete exhibition because it has ${activeBookings.length} active booking(s). Please change the event status to CANCELLED or use Force Delete to permanently remove the event with all its records.`
      );
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete all bookings associated with this exhibition
      // PostgreSQL cascade deletes related BookingStall, Payment, and Invoice records
      await tx.booking.deleteMany({
        where: { exhibitionId: id },
      });

      // 2. Delete the exhibition
      // PostgreSQL cascade deletes related FloorPlan and Stall records
      await tx.exhibition.delete({
        where: { id },
      });
    });

    return { id, message: `Exhibition "${exhibition.title}" deleted successfully.` };
  }
}
