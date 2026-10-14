import { prisma } from '../../config/db.js';
import { UserRole } from '@prisma/client';
import { ApiError } from '../../utils/apiError.js';

export class ReportsService {
  static async getOverview(role: string, userId: string, exhibitionId?: string) {
    if (exhibitionId && exhibitionId.toUpperCase() !== 'ALL') {
      const exhibition = await prisma.exhibition.findUnique({
        where: { id: exhibitionId },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, role: true, spcode: true },
          },
          floorPlans: {
            include: {
              stalls: {
                select: { id: true, status: true, price: true, category: true },
              },
            },
          },
        },
      });

      if (!exhibition) {
        throw ApiError.notFound('Exhibition not found.');
      }

      const bookings = await prisma.booking.findMany({
        where: { exhibitionId },
        select: {
          id: true,
          bookingReference: true,
          status: true,
          paymentStatus: true,
          paidAmount: true,
          grandTotal: true,
          createdAt: true,
          companyId: true,
          company: { select: { id: true, name: true, companyCode: true } },
          exhibition: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const allStalls = exhibition.floorPlans.flatMap((fp) => fp.stalls);
      const totalStalls = allStalls.length > 0 ? allStalls.length : exhibition.totalStalls;
      const occupiedStalls = allStalls.filter((s) => s.status === 'BOOKED_CONFIRMED').length;
      const occupancyRate = totalStalls > 0 ? Math.round((occupiedStalls / totalStalls) * 100) : 0;

      const paidBookings = bookings.filter(
        (b) =>
          b.status === 'CONFIRMED' ||
          b.paymentStatus === 'PAID_FULL' ||
          b.paymentStatus === 'PARTIALLY_PAID' ||
          Number(b.paidAmount || 0) > 0
      );

      const totalRevenue = paidBookings.reduce(
        (sum, b) => sum + (Number(b.paidAmount) || Number(b.grandTotal) || 0),
        0
      );

      const participatingBookings = bookings.filter(
        (b) => b.companyId && b.status !== 'CANCELLED' && b.status !== 'EXPIRED'
      );
      const uniqueCompanyIds = new Set(participatingBookings.map((b) => b.companyId));

      return {
        roleScope: role,
        eventScoped: true,
        exhibition: {
          id: exhibition.id,
          title: exhibition.title,
          edition: exhibition.edition,
          eventCode: exhibition.eventCode,
          status: exhibition.status,
          venue: exhibition.venue,
          city: exhibition.city,
          startDate: exhibition.startDate,
          endDate: exhibition.endDate,
          createdBy: exhibition.createdBy,
        },
        totalRevenue,
        totalBookings: bookings.length,
        confirmedBookings: paidBookings.length,
        totalExhibitions: 1,
        publishedExhibitions: exhibition.status === 'PUBLISHED' ? 1 : 0,
        activeAdmins: exhibition.createdBy?.role === 'ADMIN' || exhibition.createdBy?.role === 'SUPERADMIN' ? 1 : 0,
        activeStaff: exhibition.createdBy?.role === 'STAFF' ? 1 : 0,
        totalEventsRegistered: 1,
        platformTotalEvents: 1,
        upcomingEvents: new Date(exhibition.startDate) > new Date() ? 1 : 0,
        totalStallsInRegisteredEvents: totalStalls,
        totalStalls,
        occupiedStalls,
        occupancyRate,
        totalExhibitors: uniqueCompanyIds.size,
        recentBookings: bookings.slice(0, 5),
      };
    }

    if (role === UserRole.SUPERADMIN) {
      // Platform-wide governance & financials
      const [
        bookings,
        exhibitionsCount,
        publishedExhibitionsCount,
        activeAdminsCount,
        activeStaffCount,
        stallsCount,
        occupiedStallsCount,
        companiesCount,
      ] = await Promise.all([
        prisma.booking.findMany({
          select: {
            id: true,
            bookingReference: true,
            status: true,
            paymentStatus: true,
            paidAmount: true,
            grandTotal: true,
            createdAt: true,
            company: { select: { name: true } },
            exhibition: { select: { title: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.exhibition.count(),
        prisma.exhibition.count({ where: { status: 'PUBLISHED' } }),
        prisma.user.count({ where: { role: UserRole.ADMIN, isActive: true } }),
        prisma.user.count({ where: { role: UserRole.STAFF, isActive: true } }),
        prisma.stall.count(),
        prisma.stall.count({ where: { status: 'BOOKED_CONFIRMED' } }),
        prisma.company.count(),
      ]);

      const paidBookings = bookings.filter(
        (b) =>
          b.status === 'CONFIRMED' ||
          b.paymentStatus === 'PAID_FULL' ||
          b.paymentStatus === 'PARTIALLY_PAID' ||
          Number(b.paidAmount || 0) > 0
      );

      const totalRevenue = paidBookings.reduce(
        (sum, b) => sum + (Number(b.paidAmount) || Number(b.grandTotal) || 0),
        0
      );

      return {
        roleScope: 'SUPERADMIN',
        eventScoped: false,
        totalRevenue,
        totalBookings: bookings.length,
        confirmedBookings: paidBookings.length,
        totalExhibitions: exhibitionsCount,
        publishedExhibitions: publishedExhibitionsCount,
        activeAdmins: activeAdminsCount,
        activeStaff: activeStaffCount,
        totalStalls: stallsCount,
        occupiedStalls: occupiedStallsCount,
        occupancyRate: stallsCount > 0 ? Math.round((occupiedStallsCount / stallsCount) * 100) : 0,
        totalExhibitors: companiesCount,
        recentBookings: paidBookings.slice(0, 5),
      };
    }

    if (role === UserRole.ADMIN) {
      // Event & Business performance metrics
      const [bookings, exhibitionsCount, publishedExhibitionsCount, stallsCount, occupiedStallsCount, companiesCount] = await Promise.all([
        prisma.booking.findMany({
          select: {
            id: true,
            bookingReference: true,
            status: true,
            paymentStatus: true,
            paidAmount: true,
            grandTotal: true,
            createdAt: true,
            company: { select: { name: true } },
            exhibition: { select: { title: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.exhibition.count(),
        prisma.exhibition.count({ where: { status: 'PUBLISHED' } }),
        prisma.stall.count(),
        prisma.stall.count({ where: { status: 'BOOKED_CONFIRMED' } }),
        prisma.company.count(),
      ]);

      const paidBookings = bookings.filter(
        (b) =>
          b.status === 'CONFIRMED' ||
          b.paymentStatus === 'PAID_FULL' ||
          b.paymentStatus === 'PARTIALLY_PAID' ||
          Number(b.paidAmount || 0) > 0
      );

      const totalRevenue = paidBookings.reduce(
        (sum, b) => sum + (Number(b.paidAmount) || Number(b.grandTotal) || 0),
        0
      );

      return {
        roleScope: 'ADMIN',
        eventScoped: false,
        totalRevenue,
        totalBookings: bookings.length,
        confirmedBookings: paidBookings.length,
        totalExhibitions: exhibitionsCount,
        publishedExhibitions: publishedExhibitionsCount,
        totalStalls: stallsCount,
        occupiedStalls: occupiedStallsCount,
        occupancyRate: stallsCount > 0 ? Math.round((occupiedStallsCount / stallsCount) * 100) : 0,
        totalExhibitors: companiesCount,
        recentBookings: paidBookings.slice(0, 5),
      };
    }

    // STAFF: Operational / Event-Registration reports (No platform revenue or user admin stats)
    const [staffExhibitions, upcomingExhibitions, totalEventsCount] = await Promise.all([
      prisma.exhibition.findMany({
        where: { createdByUserId: userId },
        include: {
          _count: {
            select: { bookings: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.exhibition.count({
        where: { startDate: { gte: new Date() } },
      }),
      prisma.exhibition.count(),
    ]);

    const totalStallsRegistered = staffExhibitions.reduce(
      (sum, e) => sum + (e.totalStalls || 0),
      0
    );

    return {
      roleScope: 'STAFF',
      totalEventsRegistered: staffExhibitions.length,
      platformTotalEvents: totalEventsCount,
      upcomingEvents: upcomingExhibitions,
      totalStallsInRegisteredEvents: totalStallsRegistered,
      registeredEvents: staffExhibitions.map((e) => ({
        id: e.id,
        title: e.title,
        slug: e.slug,
        status: e.status,
        venue: e.venue,
        city: e.city,
        startDate: e.startDate,
        endDate: e.endDate,
        edition: e.edition,
        eventCode: e.eventCode,
        spcode: e.spcode,
        totalStalls: e.totalStalls,
        bookingsCount: e._count.bookings,
        createdAt: e.createdAt,
      })),
    };
  }

  static async getExhibitionsReport(role: string, _userId: string) {
    const isStaff = role === UserRole.STAFF;
    const where: any = {};

    // For Staff, show events created by them or all active events in operational view
    if (isStaff) {
      // Staff can view all exhibitions in operational status
    }

    const exhibitions = await prisma.exhibition.findMany({
      where,
      orderBy: { startDate: 'asc' },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        city: true,
        venue: true,
        startDate: true,
        endDate: true,
        edition: true,
        eventCode: true,
        spcode: true,
        totalStalls: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: { bookings: true },
        },
        floorPlans: {
          select: {
            id: true,
            name: true,
            isPublished: true,
            _count: {
              select: { stalls: true },
            },
          },
        },
      },
    });

    return exhibitions;
  }

  static async getStallOccupancyReport(_role: string, _userId: string, exhibitionId?: string) {
    const where: any = {};
    if (exhibitionId && exhibitionId.toUpperCase() !== 'ALL') {
      where.floorPlan = {
        exhibitionId,
      };
    }

    const stalls = await prisma.stall.findMany({
      where,
      select: {
        id: true,
        category: true,
        status: true,
        price: true,
        floorPlan: {
          select: {
            exhibition: {
              select: { id: true, title: true },
            },
          },
        },
      },
    });

    const categoryBreakdown: Record<string, { total: number; available: number; booked: number }> = {
      STANDARD: { total: 0, available: 0, booked: 0 },
      PREMIUM: { total: 0, available: 0, booked: 0 },
      CORNER: { total: 0, available: 0, booked: 0 },
      ISLAND: { total: 0, available: 0, booked: 0 },
    };

    let totalAvailable = 0;
    let totalBooked = 0;
    let totalBlocked = 0;

    for (const s of stalls) {
      const cat = s.category || 'STANDARD';
      if (!categoryBreakdown[cat]) {
        categoryBreakdown[cat] = { total: 0, available: 0, booked: 0 };
      }
      categoryBreakdown[cat].total++;

      if (s.status === 'AVAILABLE') {
        categoryBreakdown[cat].available++;
        totalAvailable++;
      } else if (s.status === 'BOOKED_CONFIRMED') {
        categoryBreakdown[cat].booked++;
        totalBooked++;
      } else if (s.status === 'BLOCKED') {
        totalBlocked++;
      }
    }

    return {
      totalStalls: stalls.length,
      totalAvailable,
      totalBooked,
      totalBlocked,
      categoryBreakdown,
    };
  }
}
