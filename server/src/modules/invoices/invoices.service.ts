import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/apiError.js';
import { InvoicePdfService } from '../../services/InvoicePdfService.js';
import { normalizePagination } from '../../utils/pagination.js';

export class InvoicesService {
  static async getInvoiceById(invoiceIdOrBookingId: string, _userId?: string) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        OR: [
          { id: invoiceIdOrBookingId },
          { invoiceNumber: invoiceIdOrBookingId },
          { bookingId: invoiceIdOrBookingId },
          { booking: { bookingReference: invoiceIdOrBookingId } },
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

    if (!invoice) throw ApiError.notFound('Invoice not found.');

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

  static async generateInvoicePdf(invoiceId: string) {
    const invoice = await this.getInvoiceById(invoiceId);
    const pdfData = InvoicePdfService.buildInvoicePdfData(invoice, invoice.booking);
    return await InvoicePdfService.generateInvoicePdf(pdfData);
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

