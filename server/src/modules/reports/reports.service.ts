import { prisma } from '../../config/db.js';
import { UserRole } from '@prisma/client';

export class ReportsService {
  static async getOverview(role: string, userId: string) {
    if (role === UserRole.SUPERADMIN) {
      // Platform-wide governance & financials
      const [
        bookings,
        exhibitionsCount,
        activeAdminsCount,
        activeStaffCount,
        stallsCount,
        occupiedStallsCount,
      ] = await Promise.all([
        prisma.booking.findMany({
          select: {
            id: true,
            bookingReference: true,
            status: true,
            grandTotal: true,
            createdAt: true,
            company: { select: { name: true } },
            exhibition: { select: { title: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.exhibition.count(),
        prisma.user.count({ where: { role: UserRole.ADMIN, isActive: true } }),
        prisma.user.count({ where: { role: UserRole.STAFF, isActive: true } }),
        prisma.stall.count(),
        prisma.stall.count({ where: { status: 'BOOKED_CONFIRMED' } }),
      ]);

      const totalRevenue = bookings
        .filter((b) => b.status === 'CONFIRMED')
        .reduce((sum, b) => sum + (Number(b.grandTotal) || 0), 0);

      const confirmedBookings = bookings.filter((b) => b.status === 'CONFIRMED').length;

      return {
        roleScope: 'SUPERADMIN',
        totalRevenue,
        totalBookings: bookings.length,
        confirmedBookings,
        totalExhibitions: exhibitionsCount,
        activeAdmins: activeAdminsCount,
        activeStaff: activeStaffCount,
        totalStalls: stallsCount,
        occupiedStalls: occupiedStallsCount,
        occupancyRate: stallsCount > 0 ? Math.round((occupiedStallsCount / stallsCount) * 100) : 0,
        recentBookings: bookings.slice(0, 5),
      };
    }

    if (role === UserRole.ADMIN) {
      // Event & Business performance metrics
      const [bookings, exhibitionsCount, stallsCount, occupiedStallsCount] = await Promise.all([
        prisma.booking.findMany({
          select: {
            id: true,
            bookingReference: true,
            status: true,
            grandTotal: true,
            createdAt: true,
            company: { select: { name: true } },
            exhibition: { select: { title: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.exhibition.count(),
        prisma.stall.count(),
        prisma.stall.count({ where: { status: 'BOOKED_CONFIRMED' } }),
      ]);

      const totalRevenue = bookings
        .filter((b) => b.status === 'CONFIRMED')
        .reduce((sum, b) => sum + (Number(b.grandTotal) || 0), 0);

      const confirmedBookings = bookings.filter((b) => b.status === 'CONFIRMED').length;

      return {
        roleScope: 'ADMIN',
        totalRevenue,
        totalBookings: bookings.length,
        confirmedBookings,
        totalExhibitions: exhibitionsCount,
        totalStalls: stallsCount,
        occupiedStalls: occupiedStallsCount,
        occupancyRate: stallsCount > 0 ? Math.round((occupiedStallsCount / stallsCount) * 100) : 0,
        recentBookings: bookings.slice(0, 5),
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

  static async getStallOccupancyReport(_role: string, _userId: string) {
    const stalls = await prisma.stall.findMany({
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
