import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/apiError.js';

export class InvoicesService {
  static async getInvoiceById(invoiceId: string, _userId?: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
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
      orderBy: { createdAt: 'desc' },
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

  static async listAllInvoices() {
    return await prisma.invoice.findMany({
      orderBy: { createdAt: 'desc' },
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
