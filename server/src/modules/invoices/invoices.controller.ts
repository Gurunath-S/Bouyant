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
    const invoices = await InvoicesService.listAllInvoices();
    return sendResponse({
      res,
      statusCode: 200,
      message: 'All invoices list retrieved.',
      data: invoices,
    });
  };
}
