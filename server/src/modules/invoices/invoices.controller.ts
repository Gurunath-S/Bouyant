import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.js';
import { InvoicesService } from './invoices.service.js';
import { sendResponse } from '../../utils/response.js';

export class InvoicesController {
  static getById = async (req: AuthenticatedRequest, res: Response) => {
    const isClient = req.user!.role === 'CLIENT';
    const invoice = await InvoicesService.getInvoiceById(
      req.params.id,
      isClient ? req.user!.userId : undefined
    );

    return sendResponse({
      res,
      statusCode: 200,
      message: 'Invoice details retrieved.',
      data: invoice,
    });
  };

  static myInvoices = async (req: AuthenticatedRequest, res: Response) => {
    const invoices = await InvoicesService.listUserInvoices(req.user!.userId);
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
    const pdfBuffer = await InvoicesService.generateInvoicePdf(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${req.params.id}.pdf`);
    return res.send(pdfBuffer);
  };
}
