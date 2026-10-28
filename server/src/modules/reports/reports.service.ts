import { prisma } from '../../config/db.js';
import { UserRole, Prisma } from '@prisma/client';
import { ApiError } from '../../utils/apiError.js';

export interface ReportFilters {
  exhibitionId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  paymentStatus?: string;
}

export interface DetailedReportParams extends ReportFilters {
  type: 'bookings' | 'payments' | 'invoices';
  search?: string;
  page?: number;
  limit?: number;
}

export class ReportsService {
  /**
   * Helper: Builds standard Prisma where clause for bookings based on role and filters.
   */
  private static async buildBookingWhereClause(
    role: string,
    userId: string,
    filters: ReportFilters = {}
  ): Promise<{ bookingWhere: Prisma.BookingWhereInput; userSpcode?: string | null }> {
    const bookingWhere: Prisma.BookingWhereInput = {};

    let userSpcode: string | null = null;
    if (role === UserRole.STAFF) {
      const userRecord = await prisma.user.findUnique({
        where: { id: userId },
        select: { spcode: true },
      });
      userSpcode = userRecord?.spcode || null;

      // Staff sees bookings registered by staff, attributed to their SPCode, or in their exhibitions
      bookingWhere.OR = [
        { user: { role: 'STAFF' } },
        { user: { id: userId } },
        { exhibition: { createdByUserId: userId } },
        { payments: { some: { OR: [{ provider: 'OFFLINE_STAFF' }, { paymentMethod: { contains: 'STAFF', mode: 'insensitive' } }] } } },
        ...(userSpcode
          ? [
              { company: { spcode: { equals: userSpcode, mode: 'insensitive' as const } } },
              { company: { spcode: { startsWith: 'ST', mode: 'insensitive' as const } } },
              { company: { spcode: { startsWith: 'SP', mode: 'insensitive' as const } } },
              { exhibition: { spcode: { equals: userSpcode, mode: 'insensitive' as const } } },
            ]
          : [
              { company: { spcode: { startsWith: 'ST', mode: 'insensitive' as const } } },
              { company: { spcode: { startsWith: 'SP', mode: 'insensitive' as const } } },
              { exhibition: { spcode: { startsWith: 'ST', mode: 'insensitive' as const } } },
            ]),
      ];
    }

    // Exhibition scope
    if (filters.exhibitionId && filters.exhibitionId.toUpperCase() !== 'ALL') {
      bookingWhere.exhibitionId = filters.exhibitionId;
    }

    // Date range filtering on createdAt
    if (filters.startDate || filters.endDate) {
      bookingWhere.createdAt = {};
      if (filters.startDate) {
        bookingWhere.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        bookingWhere.createdAt.lte = end;
      }
    }

    // Status filter
    if (filters.status && filters.status !== 'ALL') {
      bookingWhere.status = filters.status as any;
    }

    // Payment status filter
    if (filters.paymentStatus && filters.paymentStatus !== 'ALL') {
      bookingWhere.paymentStatus = filters.paymentStatus as any;
    }

    return { bookingWhere, userSpcode };
  }

  /**
   * Comprehensive Overview & KPI Metrics
   */
  static async getOverview(role: string, userId: string, filters: ReportFilters = {}) {
    const isStaff = role === UserRole.STAFF;
    const isEventScoped = !!(filters.exhibitionId && filters.exhibitionId.toUpperCase() !== 'ALL');

    const { bookingWhere, userSpcode } = await this.buildBookingWhereClause(role, userId, filters);

    // If event-scoped, verify exhibition exists
    let scopedExhibition: any = null;
    if (isEventScoped) {
      scopedExhibition = await prisma.exhibition.findUnique({
        where: { id: filters.exhibitionId },
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

      if (!scopedExhibition) {
        throw ApiError.notFound('Exhibition not found.');
      }
    }

    // 1. STAFF OPERATIONAL OVERVIEW (Strictly operational, zero platform financial exposure)
    if (isStaff) {
      const staffExhibitionWhere: Prisma.ExhibitionWhereInput = {
        OR: [
          { createdByUserId: userId },
          ...(userSpcode ? [{ spcode: { equals: userSpcode, mode: 'insensitive' as const } }] : []),
          {
            bookings: {
              some: {
                OR: [
                  { user: { role: 'STAFF' } },
                  { user: { id: userId } },
                  { payments: { some: { OR: [{ provider: 'OFFLINE_STAFF' }, { paymentMethod: { contains: 'STAFF', mode: 'insensitive' } }] } } },
                  ...(userSpcode
                    ? [
                        { company: { spcode: { equals: userSpcode, mode: 'insensitive' as const } } },
                        { company: { spcode: { startsWith: 'ST', mode: 'insensitive' as const } } },
                        { company: { spcode: { startsWith: 'SP', mode: 'insensitive' as const } } },
                        { exhibition: { spcode: { equals: userSpcode, mode: 'insensitive' as const } } },
                      ]
                    : [
                        { company: { spcode: { startsWith: 'ST', mode: 'insensitive' as const } } },
                        { company: { spcode: { startsWith: 'SP', mode: 'insensitive' as const } } },
                        { exhibition: { spcode: { startsWith: 'ST', mode: 'insensitive' as const } } },
                      ]),
                ],
              },
            },
          },
        ],
      };

      if (isEventScoped) {
        staffExhibitionWhere.id = filters.exhibitionId;
      }

      const [staffExhibitions, upcomingExhibitions, totalEventsCount, bookings] = await Promise.all([
        prisma.exhibition.findMany({
          where: staffExhibitionWhere,
          include: {
            _count: { select: { bookings: true } },
            floorPlans: {
              include: {
                stalls: {
                  select: { id: true, status: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.exhibition.count({
          where: {
            status: 'PUBLISHED',
            endDate: { gte: new Date() },
          },
        }),
        prisma.exhibition.count({ where: staffExhibitionWhere }),
        prisma.booking.findMany({
          where: bookingWhere,
          select: {
            id: true,
            bookingReference: true,
            status: true,
            paymentStatus: true,
            createdAt: true,
            company: { select: { name: true, contactPerson: true } },
            exhibition: { select: { title: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

      const allStalls = staffExhibitions.flatMap((e) => e.floorPlans.flatMap((fp) => fp.stalls));
      const totalStalls = allStalls.length > 0 ? allStalls.length : staffExhibitions.reduce((sum, e) => sum + (e.totalStalls || 0), 0);
      const occupiedStalls = allStalls.filter((s) => s.status === 'BOOKED_CONFIRMED').length;
      const occupancyRate = totalStalls > 0 ? Math.round((occupiedStalls / totalStalls) * 100) : 0;

      return {
        roleScope: 'STAFF',
        eventScoped: isEventScoped,
        exhibition: scopedExhibition
          ? {
              id: scopedExhibition.id,
              title: scopedExhibition.title,
              edition: scopedExhibition.edition,
              eventCode: scopedExhibition.eventCode,
              status: scopedExhibition.status,
              venue: scopedExhibition.venue,
              city: scopedExhibition.city,
              startDate: scopedExhibition.startDate,
              endDate: scopedExhibition.endDate,
              createdBy: scopedExhibition.createdBy,
            }
          : undefined,
        totalEventsRegistered: staffExhibitions.length,
        platformTotalEvents: totalEventsCount,
        upcomingEvents: upcomingExhibitions,
        totalStallsInRegisteredEvents: totalStalls,
        totalStalls,
        occupiedStalls,
        occupancyRate,
        totalBookings: bookings.length,
        recentBookings: bookings,
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

    // 2. ADMIN & SUPERADMIN EXECUTIVE & FINANCIAL OVERVIEW
    const [
      bookings,
      exhibitionsCount,
      publishedExhibitionsCount,
      activeAdminsCount,
      activeStaffCount,
      stallsList,
      totalCompaniesCount,
    ] = await Promise.all([
      prisma.booking.findMany({
        where: bookingWhere,
        select: {
          id: true,
          bookingReference: true,
          companyId: true,
          exhibitionId: true,
          status: true,
          paymentStatus: true,
          totalAmount: true,
          taxAmount: true,
          discountAmount: true,
          grandTotal: true,
          paidAmount: true,
          balanceAmount: true,
          createdAt: true,
          company: {
            select: { id: true, name: true, companyCode: true, contactPerson: true, email: true, mobile: true },
          },
          exhibition: {
            select: { id: true, title: true, eventCode: true, edition: true, startDate: true, endDate: true },
          },
          stalls: {
            select: {
              id: true,
              price: true,
              stall: { select: { id: true, stallNumber: true, category: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.exhibition.count(),
      prisma.exhibition.count({ where: { status: 'PUBLISHED' } }),
      prisma.user.count({ where: { role: UserRole.ADMIN, isActive: true } }),
      prisma.user.count({ where: { role: UserRole.STAFF, isActive: true } }),
      prisma.stall.findMany({
        where: isEventScoped
          ? { floorPlan: { exhibitionId: filters.exhibitionId } }
          : {},
        select: {
          id: true,
          status: true,
          category: true,
          price: true,
        },
      }),
      prisma.company.count(),
    ]);

    // Financial Reconciliation & Aggregations
    const activeBookings = bookings.filter((b) => b.status !== 'CANCELLED' && b.status !== 'EXPIRED');
    const cancelledBookings = bookings.filter((b) => b.status === 'CANCELLED' || b.status === 'EXPIRED');
    const confirmedBookings = bookings.filter((b) => b.status === 'CONFIRMED');

    const totalBookingValue = activeBookings.reduce((sum, b) => sum + Number(b.grandTotal || 0), 0);
    const actualPaymentsReceived = activeBookings.reduce((sum, b) => sum + Number(b.paidAmount || 0), 0);
    const outstandingBalance = activeBookings.reduce((sum, b) => sum + Number(b.balanceAmount || 0), 0);
    const cancelledBookingValue = cancelledBookings.reduce((sum, b) => sum + Number(b.grandTotal || 0), 0);

    // Participating Companies Count
    const participatingCompanyIds = new Set(activeBookings.map((b) => b.companyId));
    const participatingCompaniesCount = participatingCompanyIds.size;

    // Payment Status Distribution
    const fullyPaidBookings = activeBookings.filter((b) => b.paymentStatus === 'PAID_FULL');
    const partiallyPaidBookings = activeBookings.filter((b) => b.paymentStatus === 'PARTIALLY_PAID');
    const unpaidBookings = activeBookings.filter((b) => b.paymentStatus === 'UNPAID');
    const refundedBookings = bookings.filter((b) => b.paymentStatus === 'REFUNDED');

    const paymentStatusBreakdown = {
      fullyPaid: {
        count: fullyPaidBookings.length,
        totalAmount: fullyPaidBookings.reduce((s, b) => s + Number(b.grandTotal || 0), 0),
        paidAmount: fullyPaidBookings.reduce((s, b) => s + Number(b.paidAmount || 0), 0),
      },
      partiallyPaid: {
        count: partiallyPaidBookings.length,
        totalAmount: partiallyPaidBookings.reduce((s, b) => s + Number(b.grandTotal || 0), 0),
        paidAmount: partiallyPaidBookings.reduce((s, b) => s + Number(b.paidAmount || 0), 0),
        balanceAmount: partiallyPaidBookings.reduce((s, b) => s + Number(b.balanceAmount || 0), 0),
      },
      unpaid: {
        count: unpaidBookings.length,
        totalAmount: unpaidBookings.reduce((s, b) => s + Number(b.grandTotal || 0), 0),
        balanceAmount: unpaidBookings.reduce((s, b) => s + Number(b.balanceAmount || 0), 0),
      },
      refunded: {
        count: refundedBookings.length,
        totalAmount: refundedBookings.reduce((s, b) => s + Number(b.grandTotal || 0), 0),
      },
    };

    // Booking Status Distribution
    const bookingStatusBreakdown: Record<string, { count: number; totalAmount: number }> = {
      CONFIRMED: { count: 0, totalAmount: 0 },
      PENDING_PAYMENT: { count: 0, totalAmount: 0 },
      HELD: { count: 0, totalAmount: 0 },
      INITIATED: { count: 0, totalAmount: 0 },
      CANCELLED: { count: 0, totalAmount: 0 },
      EXPIRED: { count: 0, totalAmount: 0 },
    };

    for (const b of bookings) {
      const st = b.status || 'INITIATED';
      if (!bookingStatusBreakdown[st]) {
        bookingStatusBreakdown[st] = { count: 0, totalAmount: 0 };
      }
      bookingStatusBreakdown[st].count++;
      bookingStatusBreakdown[st].totalAmount += Number(b.grandTotal || 0);
    }

    // Query Payments for this dataset to give payment gateway breakdowns
    const bookingIds = bookings.map((b) => b.id);
    const payments = bookingIds.length > 0
      ? await prisma.payment.findMany({
          where: { bookingId: { in: bookingIds } },
          select: {
            id: true,
            amount: true,
            status: true,
            paymentMethod: true,
            provider: true,
            createdAt: true,
            paidAt: true,
          },
        })
      : [];

    const successfulPayments = payments.filter((p) => p.status === 'SUCCESS');
    const failedPayments = payments.filter((p) => p.status === 'FAILED');
    const pendingPayments = payments.filter((p) => p.status === 'PENDING');

    const paymentMethodsBreakdown: Record<string, { count: number; amount: number }> = {};
    for (const sp of successfulPayments) {
      const method = sp.paymentMethod || 'RAZORPAY';
      if (!paymentMethodsBreakdown[method]) {
        paymentMethodsBreakdown[method] = { count: 0, amount: 0 };
      }
      paymentMethodsBreakdown[method].count++;
      paymentMethodsBreakdown[method].amount += Number(sp.amount || 0);
    }

    // Invoices breakdown
    const invoices = bookingIds.length > 0
      ? await prisma.invoice.findMany({
          where: { bookingId: { in: bookingIds } },
          select: {
            id: true,
            totalAmount: true,
            taxAmount: true,
            grandTotal: true,
            status: true,
            issueDate: true,
          },
        })
      : [];

    const totalInvoiceAmount = invoices.reduce((s, inv) => s + Number(inv.grandTotal || 0), 0);
    const totalTaxAmount = invoices.reduce((s, inv) => s + Number(inv.taxAmount || 0), 0);
    const totalBaseAmount = invoices.reduce((s, inv) => s + Number(inv.totalAmount || 0), 0);

    // Stall Occupancy Metrics
    const totalStalls = stallsList.length > 0 ? stallsList.length : (scopedExhibition?.totalStalls || 0);
    const occupiedStalls = stallsList.filter((s) => s.status === 'BOOKED_CONFIRMED').length;
    const availableStalls = stallsList.filter((s) => s.status === 'AVAILABLE').length;
    const heldStalls = stallsList.filter((s) =>
      ['TEMPORARILY_HELD', 'BOOKING_IN_PROGRESS', 'PAYMENT_PENDING'].includes(s.status)
    ).length;
    const blockedStalls = stallsList.filter((s) => s.status === 'BLOCKED').length;
    const occupancyRate = totalStalls > 0 ? Math.round((occupiedStalls / totalStalls) * 100) : 0;

    // Daily Time-Series Trends
    const trendsMap: Record<string, { date: string; bookingsCount: number; bookingValue: number; paymentsCollected: number }> = {};
    for (const b of activeBookings) {
      const d = new Date(b.createdAt).toISOString().split('T')[0];
      if (!trendsMap[d]) {
        trendsMap[d] = { date: d, bookingsCount: 0, bookingValue: 0, paymentsCollected: 0 };
      }
      trendsMap[d].bookingsCount++;
      trendsMap[d].bookingValue += Number(b.grandTotal || 0);
    }

    for (const sp of successfulPayments) {
      const d = new Date(sp.paidAt || sp.createdAt).toISOString().split('T')[0];
      if (!trendsMap[d]) {
        trendsMap[d] = { date: d, bookingsCount: 0, bookingValue: 0, paymentsCollected: 0 };
      }
      trendsMap[d].paymentsCollected += Number(sp.amount || 0);
    }

    const dailyTrends = Object.values(trendsMap).sort((a, b) => a.date.localeCompare(b.date));

    // Operational Exceptions: Active bookings with outstanding balance
    const operationalExceptions = activeBookings
      .filter((b) => Number(b.balanceAmount || 0) > 0)
      .slice(0, 10);

    return {
      roleScope: role,
      eventScoped: isEventScoped,
      exhibition: scopedExhibition
        ? {
            id: scopedExhibition.id,
            title: scopedExhibition.title,
            edition: scopedExhibition.edition,
            eventCode: scopedExhibition.eventCode,
            status: scopedExhibition.status,
            venue: scopedExhibition.venue,
            city: scopedExhibition.city,
            startDate: scopedExhibition.startDate,
            endDate: scopedExhibition.endDate,
            createdBy: scopedExhibition.createdBy,
          }
        : undefined,

      // Core KPI Metrics
      totalRevenue: actualPaymentsReceived, // Backwards-compatible alias for UI components
      actualPaymentsReceived,
      totalBookingValue,
      outstandingBalance,
      cancelledBookingValue,
      totalBookings: bookings.length,
      confirmedBookings: confirmedBookings.length,
      totalExhibitors: isEventScoped ? participatingCompaniesCount : totalCompaniesCount,
      participatingCompaniesCount,
      totalExhibitions: isEventScoped ? 1 : exhibitionsCount,
      publishedExhibitions: isEventScoped ? (scopedExhibition?.status === 'PUBLISHED' ? 1 : 0) : publishedExhibitionsCount,
      activeAdmins: activeAdminsCount,
      activeStaff: activeStaffCount,

      // Stall Occupancy
      totalStalls,
      occupiedStalls,
      availableStalls,
      heldStalls,
      blockedStalls,
      occupancyRate,

      // Breakdowns
      financialSummary: {
        paymentStatusBreakdown,
        bookingStatusBreakdown,
        paymentsMetrics: {
          successfulCount: successfulPayments.length,
          successfulTotal: successfulPayments.reduce((s, p) => s + Number(p.amount || 0), 0),
          failedCount: failedPayments.length,
          failedTotal: failedPayments.reduce((s, p) => s + Number(p.amount || 0), 0),
          pendingCount: pendingPayments.length,
          pendingTotal: pendingPayments.reduce((s, p) => s + Number(p.amount || 0), 0),
          paymentMethodsBreakdown,
        },
        invoiceMetrics: {
          invoicesCount: invoices.length,
          grandTotal: totalInvoiceAmount,
          taxAmount: totalTaxAmount,
          baseAmount: totalBaseAmount,
        },
      },

      dailyTrends,
      recentBookings: activeBookings.slice(0, 8),
      operationalExceptions: {
        count: activeBookings.filter((b) => Number(b.balanceAmount || 0) > 0).length,
        bookings: operationalExceptions,
      },
    };
  }

  /**
   * Detailed Exhibitions Comparison & Directory Report
   */
  static async getExhibitionsReport(role: string, userId: string) {
    const isStaff = role === UserRole.STAFF;
    let where: Prisma.ExhibitionWhereInput = {};

    if (isStaff) {
      const userRecord = await prisma.user.findUnique({
        where: { id: userId },
        select: { spcode: true },
      });
      const userSpcode = userRecord?.spcode || null;
      where = {
        OR: [
          { createdByUserId: userId },
          ...(userSpcode ? [{ spcode: { equals: userSpcode, mode: 'insensitive' as const } }] : []),
        ],
      };
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
        bookings: {
          select: {
            id: true,
            status: true,
            grandTotal: true,
            paidAmount: true,
            balanceAmount: true,
            paymentStatus: true,
          },
        },
        floorPlans: {
          select: {
            id: true,
            name: true,
            isPublished: true,
            stalls: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
      },
    });

    return exhibitions.map((expo) => {
      const allStalls = expo.floorPlans.flatMap((fp) => fp.stalls);
      const totalStalls = allStalls.length > 0 ? allStalls.length : expo.totalStalls;
      const bookedStalls = allStalls.filter((s) => s.status === 'BOOKED_CONFIRMED').length;
      const availableStalls = allStalls.filter((s) => s.status === 'AVAILABLE').length;
      const occupancyRate = totalStalls > 0 ? Math.round((bookedStalls / totalStalls) * 100) : 0;

      const activeBookings = expo.bookings.filter((b) => b.status !== 'CANCELLED' && b.status !== 'EXPIRED');
      const totalBookingValue = activeBookings.reduce((sum, b) => sum + Number(b.grandTotal || 0), 0);
      const revenueCollected = activeBookings.reduce((sum, b) => sum + Number(b.paidAmount || 0), 0);
      const outstandingBalance = activeBookings.reduce((sum, b) => sum + Number(b.balanceAmount || 0), 0);

      return {
        id: expo.id,
        title: expo.title,
        slug: expo.slug,
        status: expo.status,
        city: expo.city,
        venue: expo.venue,
        startDate: expo.startDate,
        endDate: expo.endDate,
        edition: expo.edition,
        eventCode: expo.eventCode,
        spcode: expo.spcode,
        createdBy: expo.createdBy,
        totalStalls,
        bookedStalls,
        availableStalls,
        occupancyRate,
        bookingsCount: expo._count.bookings,
        activeBookingsCount: activeBookings.length,
        totalBookingValue: isStaff ? 0 : totalBookingValue,
        revenueCollected: isStaff ? 0 : revenueCollected,
        outstandingBalance: isStaff ? 0 : outstandingBalance,
      };
    });
  }

  /**
   * Stall Occupancy & Category Breakdown Report
   */
  static async getStallOccupancyReport(role: string, userId: string, filters: ReportFilters = {}) {
    const isStaff = role === UserRole.STAFF;
    const isEventScoped = !!(filters.exhibitionId && filters.exhibitionId.toUpperCase() !== 'ALL');

    const stallWhere: Prisma.StallWhereInput = {};

    if (isEventScoped) {
      stallWhere.floorPlan = { exhibitionId: filters.exhibitionId };
    } else if (isStaff) {
      const userRecord = await prisma.user.findUnique({
        where: { id: userId },
        select: { spcode: true },
      });
      const userSpcode = userRecord?.spcode || null;
      stallWhere.floorPlan = {
        exhibition: {
          OR: [
            { createdByUserId: userId },
            ...(userSpcode ? [{ spcode: { equals: userSpcode, mode: 'insensitive' as const } }] : []),
          ],
        },
      };
    }

    const stalls = await prisma.stall.findMany({
      where: stallWhere,
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

    const categoryBreakdown: Record<
      string,
      { total: number; available: number; booked: number; held: number; blocked: number; revenue: number }
    > = {
      STANDARD: { total: 0, available: 0, booked: 0, held: 0, blocked: 0, revenue: 0 },
      PREMIUM: { total: 0, available: 0, booked: 0, held: 0, blocked: 0, revenue: 0 },
      CORNER: { total: 0, available: 0, booked: 0, held: 0, blocked: 0, revenue: 0 },
      ISLAND: { total: 0, available: 0, booked: 0, held: 0, blocked: 0, revenue: 0 },
    };

    let totalAvailable = 0;
    let totalBooked = 0;
    let totalHeld = 0;
    let totalBlocked = 0;

    for (const s of stalls) {
      const cat = s.category || 'STANDARD';
      if (!categoryBreakdown[cat]) {
        categoryBreakdown[cat] = { total: 0, available: 0, booked: 0, held: 0, blocked: 0, revenue: 0 };
      }
      categoryBreakdown[cat].total++;

      if (s.status === 'AVAILABLE') {
        categoryBreakdown[cat].available++;
        totalAvailable++;
      } else if (s.status === 'BOOKED_CONFIRMED') {
        categoryBreakdown[cat].booked++;
        totalBooked++;
        categoryBreakdown[cat].revenue += Number(s.price || 0);
      } else if (['TEMPORARILY_HELD', 'BOOKING_IN_PROGRESS', 'PAYMENT_PENDING'].includes(s.status)) {
        categoryBreakdown[cat].held++;
        totalHeld++;
      } else if (s.status === 'BLOCKED') {
        categoryBreakdown[cat].blocked++;
        totalBlocked++;
      }
    }

    return {
      totalStalls: stalls.length,
      totalAvailable,
      totalBooked,
      totalHeld,
      totalBlocked,
      occupancyRate: stalls.length > 0 ? Math.round((totalBooked / stalls.length) * 100) : 0,
      categoryBreakdown,
    };
  }

  /**
   * Paginated Detailed Records (Bookings, Payments, Invoices)
   * Calculates dataset-wide metrics independently of pagination!
   */
  static async getDetailedRecordsReport(
    role: string,
    userId: string,
    params: DetailedReportParams
  ) {
    const { type, page = 1, limit = 10, search } = params;
    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
    const take = Math.min(100, Math.max(1, limit));

    const { bookingWhere } = await this.buildBookingWhereClause(role, userId, params);

    // 1. DETAILED BOOKINGS
    if (type === 'bookings') {
      const where: Prisma.BookingWhereInput = { ...bookingWhere };

      if (search && search.trim()) {
        const s = search.trim();
        where.OR = [
          { bookingReference: { contains: s, mode: 'insensitive' } },
          { company: { name: { contains: s, mode: 'insensitive' } } },
          { company: { contactPerson: { contains: s, mode: 'insensitive' } } },
          { company: { email: { contains: s, mode: 'insensitive' } } },
          { company: { mobile: { contains: s } } },
          { exhibition: { title: { contains: s, mode: 'insensitive' } } },
        ];
      }

      const [totalItems, summaryAgg, items] = await Promise.all([
        prisma.booking.count({ where }),
        prisma.booking.aggregate({
          where: { ...where, status: { notIn: ['CANCELLED', 'EXPIRED'] } },
          _sum: {
            grandTotal: true,
            paidAmount: true,
            balanceAmount: true,
          },
        }),
        prisma.booking.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          include: {
            company: {
              select: { id: true, name: true, companyCode: true, contactPerson: true, email: true, mobile: true },
            },
            exhibition: {
              select: { id: true, title: true, eventCode: true, edition: true },
            },
            stalls: {
              select: {
                id: true,
                price: true,
                stall: { select: { id: true, stallNumber: true, category: true } },
              },
            },
          },
        }),
      ]);

      return {
        type: 'bookings',
        items: items.map((b) => ({
          id: b.id,
          bookingReference: b.bookingReference,
          companyName: b.company?.name || '—',
          companyContact: b.company?.contactPerson || '—',
          companyEmail: b.company?.email || '—',
          companyMobile: b.company?.mobile || '—',
          exhibitionTitle: b.exhibition?.title || '—',
          stallsCount: b.stalls.length,
          stallsList: b.stalls.map((s) => s.stall?.stallNumber || '—').join(', '),
          totalAmount: Number(b.totalAmount || 0),
          taxAmount: Number(b.taxAmount || 0),
          grandTotal: Number(b.grandTotal || 0),
          paidAmount: Number(b.paidAmount || 0),
          balanceAmount: Number(b.balanceAmount || 0),
          status: b.status,
          paymentStatus: b.paymentStatus,
          createdAt: b.createdAt,
        })),
        pagination: {
          currentPage: Math.max(1, page),
          pageSize: take,
          totalItems,
          totalPages: Math.ceil(totalItems / take) || 1,
        },
        summary: {
          totalBookings: totalItems,
          totalValue: Number(summaryAgg._sum.grandTotal || 0),
          totalPaid: Number(summaryAgg._sum.paidAmount || 0),
          totalBalance: Number(summaryAgg._sum.balanceAmount || 0),
        },
      };
    }

    // 2. DETAILED PAYMENTS
    if (type === 'payments') {
      const paymentWhere: Prisma.PaymentWhereInput = {
        booking: bookingWhere,
      };

      if (search && search.trim()) {
        const s = search.trim();
        paymentWhere.OR = [
          { paymentReference: { contains: s, mode: 'insensitive' } },
          { transactionId: { contains: s, mode: 'insensitive' } },
          { razorpayPaymentId: { contains: s, mode: 'insensitive' } },
          { booking: { bookingReference: { contains: s, mode: 'insensitive' } } },
          { booking: { company: { name: { contains: s, mode: 'insensitive' } } } },
        ];
      }

      const [totalItems, summaryAgg, successAgg, items] = await Promise.all([
        prisma.payment.count({ where: paymentWhere }),
        prisma.payment.aggregate({
          where: paymentWhere,
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: { ...paymentWhere, status: 'SUCCESS' },
          _sum: { amount: true },
        }),
        prisma.payment.findMany({
          where: paymentWhere,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          include: {
            booking: {
              select: {
                id: true,
                bookingReference: true,
                company: { select: { name: true, contactPerson: true } },
                exhibition: { select: { title: true } },
              },
            },
          },
        }),
      ]);

      return {
        type: 'payments',
        items: items.map((p) => ({
          id: p.id,
          paymentReference: p.paymentReference,
          bookingReference: p.booking?.bookingReference || '—',
          companyName: p.booking?.company?.name || '—',
          exhibitionTitle: p.booking?.exhibition?.title || '—',
          amount: Number(p.amount || 0),
          currency: p.currency,
          status: p.status,
          provider: p.provider,
          paymentMethod: p.paymentMethod || 'RAZORPAY',
          transactionId: p.transactionId || p.razorpayPaymentId || '—',
          paidAt: p.paidAt || p.createdAt,
          createdAt: p.createdAt,
        })),
        pagination: {
          currentPage: Math.max(1, page),
          pageSize: take,
          totalItems,
          totalPages: Math.ceil(totalItems / take) || 1,
        },
        summary: {
          totalPayments: totalItems,
          totalAmount: Number(summaryAgg._sum.amount || 0),
          successfulAmount: Number(successAgg._sum.amount || 0),
        },
      };
    }

    // 3. DETAILED INVOICES
    if (type === 'invoices') {
      const invoiceWhere: Prisma.InvoiceWhereInput = {
        booking: bookingWhere,
      };

      if (search && search.trim()) {
        const s = search.trim();
        invoiceWhere.OR = [
          { invoiceNumber: { contains: s, mode: 'insensitive' } },
          { company: { name: { contains: s, mode: 'insensitive' } } },
          { booking: { bookingReference: { contains: s, mode: 'insensitive' } } },
          { booking: { exhibition: { title: { contains: s, mode: 'insensitive' } } } },
        ];
      }

      const [totalItems, summaryAgg, items] = await Promise.all([
        prisma.invoice.count({ where: invoiceWhere }),
        prisma.invoice.aggregate({
          where: invoiceWhere,
          _sum: { grandTotal: true, taxAmount: true, totalAmount: true },
        }),
        prisma.invoice.findMany({
          where: invoiceWhere,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          include: {
            company: { select: { name: true, contactPerson: true, gstNumber: true } },
            booking: {
              select: {
                id: true,
                bookingReference: true,
                exhibition: { select: { title: true } },
                stalls: { select: { stall: { select: { stallNumber: true } } } },
              },
            },
          },
        }),
      ]);

      return {
        type: 'invoices',
        items: items.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          bookingReference: inv.booking?.bookingReference || '—',
          companyName: inv.company?.name || '—',
          gstNumber: inv.company?.gstNumber || '—',
          exhibitionTitle: inv.booking?.exhibition?.title || '—',
          stallsList: inv.booking?.stalls.map((s) => s.stall?.stallNumber || '—').join(', ') || '—',
          totalAmount: Number(inv.totalAmount || 0),
          taxAmount: Number(inv.taxAmount || 0),
          grandTotal: Number(inv.grandTotal || 0),
          status: inv.status,
          issueDate: inv.issueDate,
          createdAt: inv.createdAt,
        })),
        pagination: {
          currentPage: Math.max(1, page),
          pageSize: take,
          totalItems,
          totalPages: Math.ceil(totalItems / take) || 1,
        },
        summary: {
          totalInvoices: totalItems,
          grandTotal: Number(summaryAgg._sum.grandTotal || 0),
          taxTotal: Number(summaryAgg._sum.taxAmount || 0),
          baseTotal: Number(summaryAgg._sum.totalAmount || 0),
        },
      };
    }

    throw ApiError.badRequest(`Unsupported report type: ${type}`);
  }

  /**
   * Clean, Complete CSV Export of Entire Filtered Dataset
   */
  static async exportReportCsv(role: string, userId: string, params: DetailedReportParams): Promise<string> {
    const { type, search } = params;
    const { bookingWhere } = await this.buildBookingWhereClause(role, userId, params);

    const escapeCsvField = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    // Helper to format ISO date
    const fmtDate = (d: any) => {
      if (!d) return '—';
      try {
        return new Date(d).toISOString().split('T')[0];
      } catch {
        return '—';
      }
    };

    if (type === 'bookings') {
      const where: Prisma.BookingWhereInput = { ...bookingWhere };
      if (search && search.trim()) {
        const s = search.trim();
        where.OR = [
          { bookingReference: { contains: s, mode: 'insensitive' } },
          { company: { name: { contains: s, mode: 'insensitive' } } },
          { exhibition: { title: { contains: s, mode: 'insensitive' } } },
        ];
      }

      const bookings = await prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          company: true,
          exhibition: true,
          stalls: { include: { stall: true } },
        },
      });

      const headers = [
        'Booking Reference',
        'Exhibition',
        'Company Name',
        'Contact Person',
        'Email',
        'Mobile',
        'GST Number',
        'Stalls Count',
        'Stall Numbers',
        'Base Amount (INR)',
        'GST 18% (INR)',
        'Grand Total (INR)',
        'Paid Amount (INR)',
        'Balance Due (INR)',
        'Booking Status',
        'Payment Status',
        'Booking Date',
      ];

      const rows = bookings.map((b) => [
        escapeCsvField(b.bookingReference),
        escapeCsvField(b.exhibition?.title),
        escapeCsvField(b.company?.name),
        escapeCsvField(b.company?.contactPerson),
        escapeCsvField(b.company?.email),
        escapeCsvField(b.company?.mobile),
        escapeCsvField(b.company?.gstNumber || 'N/A'),
        escapeCsvField(b.stalls.length),
        escapeCsvField(b.stalls.map((s) => s.stall?.stallNumber).join(', ')),
        escapeCsvField(Number(b.totalAmount || 0).toFixed(2)),
        escapeCsvField(Number(b.taxAmount || 0).toFixed(2)),
        escapeCsvField(Number(b.grandTotal || 0).toFixed(2)),
        escapeCsvField(Number(b.paidAmount || 0).toFixed(2)),
        escapeCsvField(Number(b.balanceAmount || 0).toFixed(2)),
        escapeCsvField(b.status),
        escapeCsvField(b.paymentStatus),
        escapeCsvField(fmtDate(b.createdAt)),
      ]);

      return '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    }

    if (type === 'payments') {
      const paymentWhere: Prisma.PaymentWhereInput = { booking: bookingWhere };
      if (search && search.trim()) {
        const s = search.trim();
        paymentWhere.OR = [
          { paymentReference: { contains: s, mode: 'insensitive' } },
          { transactionId: { contains: s, mode: 'insensitive' } },
          { razorpayPaymentId: { contains: s, mode: 'insensitive' } },
          { booking: { bookingReference: { contains: s, mode: 'insensitive' } } },
        ];
      }

      const payments = await prisma.payment.findMany({
        where: paymentWhere,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            include: { company: true, exhibition: true },
          },
        },
      });

      const headers = [
        'Payment Reference',
        'Booking Reference',
        'Company Name',
        'Exhibition',
        'Amount (INR)',
        'Currency',
        'Payment Method',
        'Provider',
        'Status',
        'Transaction ID',
        'Razorpay Order ID',
        'Payment Date',
      ];

      const rows = payments.map((p) => [
        escapeCsvField(p.paymentReference),
        escapeCsvField(p.booking?.bookingReference),
        escapeCsvField(p.booking?.company?.name),
        escapeCsvField(p.booking?.exhibition?.title),
        escapeCsvField(Number(p.amount || 0).toFixed(2)),
        escapeCsvField(p.currency),
        escapeCsvField(p.paymentMethod || 'RAZORPAY'),
        escapeCsvField(p.provider),
        escapeCsvField(p.status),
        escapeCsvField(p.transactionId || p.razorpayPaymentId || 'N/A'),
        escapeCsvField(p.razorpayOrderId || 'N/A'),
        escapeCsvField(fmtDate(p.paidAt || p.createdAt)),
      ]);

      return '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    }

    if (type === 'invoices') {
      const invoiceWhere: Prisma.InvoiceWhereInput = { booking: bookingWhere };
      if (search && search.trim()) {
        const s = search.trim();
        invoiceWhere.OR = [
          { invoiceNumber: { contains: s, mode: 'insensitive' } },
          { company: { name: { contains: s, mode: 'insensitive' } } },
          { booking: { bookingReference: { contains: s, mode: 'insensitive' } } },
        ];
      }

      const invoices = await prisma.invoice.findMany({
        where: invoiceWhere,
        orderBy: { createdAt: 'desc' },
        include: {
          company: true,
          booking: { include: { exhibition: true } },
        },
      });

      const headers = [
        'Invoice Number',
        'Booking Reference',
        'Company Name',
        'GST Number',
        'Exhibition',
        'Base Amount (INR)',
        'GST 18% (INR)',
        'Grand Total (INR)',
        'Status',
        'Issue Date',
      ];

      const rows = invoices.map((inv) => [
        escapeCsvField(inv.invoiceNumber),
        escapeCsvField(inv.booking?.bookingReference),
        escapeCsvField(inv.company?.name),
        escapeCsvField(inv.company?.gstNumber || 'N/A'),
        escapeCsvField(inv.booking?.exhibition?.title),
        escapeCsvField(Number(inv.totalAmount || 0).toFixed(2)),
        escapeCsvField(Number(inv.taxAmount || 0).toFixed(2)),
        escapeCsvField(Number(inv.grandTotal || 0).toFixed(2)),
        escapeCsvField(inv.status),
        escapeCsvField(fmtDate(inv.issueDate)),
      ]);

      return '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    }

    throw ApiError.badRequest(`Unsupported export type: ${type}`);
  }
}
