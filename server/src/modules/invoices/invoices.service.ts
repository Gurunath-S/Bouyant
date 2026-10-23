import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/apiError.js';
import { InvoicePdfService } from '../../services/InvoicePdfService.js';
import { normalizePagination } from '../../utils/pagination.js';
import { TokenPayload } from '../../utils/jwt.js';
import { hasUserPermission, Permissions } from '../../config/permissions.js';

export class InvoicesService {
  static async getInvoiceById(identifier: string, user?: TokenPayload) {
    let invoice = await prisma.invoice.findFirst({
      where: {
        OR: [
          { id: identifier },
          { invoiceNumber: identifier },
          { bookingId: identifier },
          { booking: { bookingReference: identifier } },
          { paymentId: identifier },
          { payment: { paymentReference: identifier } },
        ],
      },
      include: {
        company: true,
        payment: true,
        booking: {
          include: {
            stalls: { include: { stall: true } },
            exhibition: true,
            payments: {
              where: { status: 'SUCCESS' },
              orderBy: { createdAt: 'asc' },
            },
            invoices: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!invoice) {
      // Check if identifier matches a payment whose booking has an invoice
      const payment = await prisma.payment.findFirst({
        where: {
          OR: [{ id: identifier }, { paymentReference: identifier }],
        },
        include: {
          booking: {
            include: {
              invoices: {
                include: {
                  company: true,
                  payment: true,
                  booking: {
                    include: {
                      stalls: { include: { stall: true } },
                      exhibition: true,
                      payments: {
                        where: { status: 'SUCCESS' },
                        orderBy: { createdAt: 'asc' },
                      },
                      invoices: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (payment?.booking?.invoices?.length) {
        invoice = payment.booking.invoices[0];
      }
    }

    if (!invoice) {
      // Check if identifier matches a booking directly
      const booking = await prisma.booking.findFirst({
        where: {
          OR: [{ id: identifier }, { bookingReference: identifier }],
        },
        include: {
          company: true,
          stalls: { include: { stall: true } },
          exhibition: true,
          payments: {
            where: { status: 'SUCCESS' },
            orderBy: { createdAt: 'asc' },
          },
          invoices: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (booking) {
        if (booking.invoices && booking.invoices.length > 0) {
          invoice = await prisma.invoice.findUnique({
            where: { id: booking.invoices[0].id },
            include: {
              company: true,
              payment: true,
              booking: {
                include: {
                  stalls: { include: { stall: true } },
                  exhibition: true,
                  payments: {
                    where: { status: 'SUCCESS' },
                    orderBy: { createdAt: 'asc' },
                  },
                  invoices: {
                    orderBy: { createdAt: 'asc' },
                  },
                },
              },
            },
          });
        } else {
          // Auto-generate invoice for this booking so user/admin can always download it!
          const invoiceNum = `INV-${Date.now().toString().slice(-6)}`;
          invoice = await prisma.invoice.create({
            data: {
              invoiceNumber: invoiceNum,
              bookingId: booking.id,
              companyId: booking.companyId,
              paymentId: booking.payments?.[0]?.id || null,
              totalAmount: booking.totalAmount,
              taxAmount: booking.taxAmount,
              grandTotal: booking.grandTotal,
              status: 'PAID',
            },
            include: {
              company: true,
              payment: true,
              booking: {
                include: {
                  stalls: { include: { stall: true } },
                  exhibition: true,
                  payments: {
                    where: { status: 'SUCCESS' },
                    orderBy: { createdAt: 'asc' },
                  },
                  invoices: true,
                },
              },
            },
          });
        }
      }
    }

    if (!invoice) {
      throw ApiError.notFound('Invoice or bill not found.');
    }

    // Enforce authorization and tenant isolation if user context is provided
    if (user) {
      const isPrivileged =
        user.role === 'SUPERADMIN' ||
        user.role === 'ADMIN' ||
        user.role === 'STAFF' ||
        hasUserPermission(user, Permissions.INVOICE_MANAGE);

      if (!isPrivileged) {
        if (user.role === 'CLIENT') {
          let userCompanyId = user.companyId;
          if (!userCompanyId && user.userId) {
            const dbUser = await prisma.user.findUnique({
              where: { id: user.userId },
              select: { companyId: true },
            });
            userCompanyId = dbUser?.companyId || null;
          }

          if (
            !userCompanyId ||
            (invoice.companyId !== userCompanyId &&
              invoice.booking?.companyId !== userCompanyId &&
              invoice.booking?.userId !== user.userId)
          ) {
            throw ApiError.forbidden('Not authorized to access this invoice.');
          }
        } else {
          // Any other unprivileged role
          throw ApiError.forbidden('Not authorized to access this invoice.');
        }
      }
    }

    return invoice;
  }

  static async listUserInvoices(userOrUserId: TokenPayload | string) {
    let companyId: string | null = null;
    let userId: string | null = null;
    let userEmail: string | null = null;
    let isClient = false;

    if (typeof userOrUserId === 'object' && userOrUserId !== null) {
      userId = userOrUserId.userId || null;
      userEmail = userOrUserId.email ? userOrUserId.email.toLowerCase().trim() : null;
      companyId = userOrUserId.companyId || null;
      isClient = userOrUserId.role === 'CLIENT';

      if ((!companyId || !userEmail) && userOrUserId.userId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: userOrUserId.userId },
          select: { companyId: true, email: true },
        });
        if (!companyId) companyId = dbUser?.companyId || null;
        if (!userEmail && dbUser?.email) userEmail = dbUser.email.toLowerCase().trim();
      }
    } else if (typeof userOrUserId === 'string') {
      userId = userOrUserId;
      const dbUser = await prisma.user.findUnique({
        where: { id: userOrUserId },
        select: { companyId: true, email: true, role: true },
      });
      companyId = dbUser?.companyId || null;
      userEmail = dbUser?.email ? dbUser.email.toLowerCase().trim() : null;
      isClient = dbUser?.role === 'CLIENT';
    }

    if (!companyId) {
      return [];
    }

    // Invoices are only given/shown if payment actually happened
    const whereClause: any = {
      companyId,
      OR: [
        { payment: { status: 'SUCCESS' } },
        { status: 'PAID' },
      ],
    };

    // Client user isolation: strictly show only their own bookings' invoices
    if (isClient) {
      whereClause.booking = {
        OR: [
          ...(userId ? [{ userId }] : []),
          ...(userEmail
            ? [
                {
                  userId: null,
                  contactEmail: { equals: userEmail, mode: 'insensitive' as const },
                },
              ]
            : []),
        ],
      };
    }

    return await prisma.invoice.findMany({
      where: whereClause,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        company: { select: { name: true } },
        payment: true,
        booking: {
          include: {
            stalls: { include: { stall: { select: { stallNumber: true, category: true } } } },
            exhibition: { select: { title: true } },
          },
        },
      },
    });
  }

  private static pdfCache = new Map<string, { buffer: Buffer; cachedAt: number }>();

  static clearPdfCache() {
    this.pdfCache.clear();
  }

  static async generateInvoicePdf(invoiceId: string, user?: TokenPayload) {
    // Ownership/authorization is checked first inside getInvoiceById
    const invoice = await this.getInvoiceById(invoiceId, user);
    const bookingUpdatedAt = invoice.booking?.updatedAt?.getTime() || 0;
    const cacheKey = `${invoice.id}_${invoice.updatedAt?.getTime() || 0}_${bookingUpdatedAt}`;
    const cached = this.pdfCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < 1000 * 60 * 30) {
      return cached.buffer;
    }

    const pdfData = InvoicePdfService.buildInvoicePdfData(invoice, invoice.booking);
    const buffer = await InvoicePdfService.generateInvoicePdf(pdfData);
    this.pdfCache.set(cacheKey, { buffer, cachedAt: Date.now() });
    return buffer;
  }

  static async listAllInvoices(
    options?: { page?: number | string; limit?: number | string; search?: string } | number,
    limitArg?: number
  ) {
    let rawPage: any;
    let rawLimit: any;
    let search = '';

    if (options && typeof options === 'object') {
      rawPage = options.page;
      rawLimit = options.limit;
      search = options.search || '';
    } else if (options !== undefined) {
      rawPage = options;
      rawLimit = limitArg;
    }

    const andConditions: any[] = [];
    if (search && search.trim()) {
      const q = search.trim();
      andConditions.push({
        OR: [
          { invoiceNumber: { contains: q, mode: 'insensitive' } },
          { company: { name: { contains: q, mode: 'insensitive' } } },
          { booking: { bookingReference: { contains: q, mode: 'insensitive' } } },
        ],
      });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    if (rawPage !== undefined || rawLimit !== undefined) {
      const { page, limit, skip } = normalizePagination(rawPage, rawLimit, 10, 100);
      const [invoices, total, aggregate] = await Promise.all([
        prisma.invoice.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          include: {
            company: { select: { name: true, companyCode: true } },
            booking: {
              include: {
                stalls: { include: { stall: { select: { stallNumber: true } } } },
                exhibition: { select: { title: true } },
              },
            },
          },
        }),
        prisma.invoice.count({ where }),
        prisma.invoice.aggregate({ where, _sum: { grandTotal: true } }),
      ]);

      return {
        invoices,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalGrandTotal: Number(aggregate._sum.grandTotal || 0),
      };
    }

    return await prisma.invoice.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        company: { select: { name: true, companyCode: true } },
        booking: {
          include: {
            stalls: { include: { stall: { select: { stallNumber: true } } } },
            exhibition: { select: { title: true } },
          },
        },
      },
    });
  }
}

