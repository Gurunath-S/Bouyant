import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/apiError.js';

export class InvoicesService {
  static async getInvoiceById(invoiceId: string, userId?: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        company: true,
        payment: true,
        booking: {
          include: {
            stall: true,
            exhibition: true,
            user: { select: { name: true, email: true, phone: true } },
          },
        },
      },
    });

    if (!invoice) throw ApiError.notFound('Invoice not found.');
    if (userId && invoice.booking.userId !== userId) {
      throw ApiError.forbidden('Access denied to this invoice.');
    }

    return invoice;
  }

  static async listUserInvoices(userId: string) {
    return await prisma.invoice.findMany({
      where: {
        booking: { userId },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        company: { select: { name: true } },
        booking: {
          include: {
            stall: { select: { stallNumber: true, category: true } },
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
            stall: { select: { stallNumber: true } },
            exhibition: { select: { title: true } },
          },
        },
      },
    });
  }
}
