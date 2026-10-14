import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/apiError.js';
import { InvoicePdfService } from '../../services/InvoicePdfService.js';
import { normalizePagination } from '../../utils/pagination.js';

export class InvoicesService {
  static async getInvoiceById(identifier: string, _userId?: string) {
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

    // What if a booking exists with no invoice yet (e.g. pending/held/initiated booking or on-the-fly bill)?
    if (!invoice) {
      const booking = await prisma.booking.findFirst({
        where: {
          OR: [{ id: identifier }, { bookingReference: identifier }],
        },
        include: {
          company: true,
          exhibition: true,
          stalls: { include: { stall: true } },
          payments: {
            where: { status: 'SUCCESS' },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (booking) {
        // Create an official invoice for this booking so it has a permanent record
        const invCount = await prisma.invoice.count();
        const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invCount + 1).padStart(3, '0')}`;
        invoice = await prisma.invoice.create({
          data: {
            invoiceNumber,
            bookingId: booking.id,
            companyId: booking.companyId,
            totalAmount: booking.totalAmount,
            taxAmount: booking.taxAmount,
            grandTotal: booking.grandTotal,
            status: 'ISSUED',
            issueDate: new Date(),
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

    if (!invoice) throw ApiError.notFound('Invoice or bill not found.');

    return invoice;
  }

  static async listUserInvoices(_userId: string) {
    return await prisma.invoice.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        company: { select: { name: true } },
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

  static async generateInvoicePdf(invoiceId: string) {
    const invoice = await this.getInvoiceById(invoiceId);
    const cacheKey = `${invoice.id}_${invoice.updatedAt?.getTime() || 0}`;
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

