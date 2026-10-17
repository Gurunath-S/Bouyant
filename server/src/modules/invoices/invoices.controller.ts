import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.js';
import { InvoicesService } from './invoices.service.js';
import { sendResponse } from '../../utils/response.js';
import { ApiError } from '../../utils/apiError.js';

export class InvoicesController {
  static getById = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required.');
    }
    const invoice = await InvoicesService.getInvoiceById(req.params.id, req.user);

    return sendResponse({
      res,
      statusCode: 200,
      message: 'Invoice details retrieved.',
      data: invoice,
    });
  };

  static myInvoices = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required.');
    }
    const invoices = await InvoicesService.listUserInvoices(req.user);
    return sendResponse({
      res,
      statusCode: 200,
      message: 'My invoices retrieved.',
      data: invoices,
    });
  };

  static listAll = async (req: AuthenticatedRequest, res: Response) => {
    const page = req.query.page as string | undefined;
    const limit = req.query.limit as string | undefined;
    const search = (req.query.search as string) || '';

    const result = await InvoicesService.listAllInvoices({ page, limit, search });
    if (result && typeof result === 'object' && 'invoices' in result) {
      return sendResponse({
        res,
        statusCode: 200,
        message: 'All invoices list retrieved.',
        data: result.invoices,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
          totalGrandTotal: result.totalGrandTotal,
        },
      });
    }

    return sendResponse({
      res,
      statusCode: 200,
      message: 'All invoices list retrieved.',
      data: result,
    });
  };

  static downloadPdf = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required to download invoice PDF.');
    }
    const pdfBuffer = await InvoicesService.generateInvoicePdf(req.params.id, req.user);
    const cleanId = String(req.params.id || 'invoice').replace(/[^a-zA-Z0-9_-]/g, '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${cleanId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.end(pdfBuffer);
  };
}
