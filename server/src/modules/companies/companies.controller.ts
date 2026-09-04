import { Request,Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.js';
import { CompaniesService } from './companies.service.js';
import { sendResponse } from '../../utils/response.js';

export class CompaniesController {


  static verifyGst = async (req: Request, res: Response) => {

  const { gstNumber } = req.body;

  const result =
    await CompaniesService.verifyGst(gstNumber);

  return sendResponse({
    res,
    statusCode: 200,
    message: 'GST verification completed successfully.',
    data: result,
  });
};

  static create = async (req: AuthenticatedRequest, res: Response) => {
    const company = await CompaniesService.createCompany(req.body);
    
    return sendResponse({
      res,
      statusCode: 201,
      message: 'Company profile created successfully.',
      data: company,
    });
  };

  static update = async (req: AuthenticatedRequest, res: Response) => {
    const companyId = req.params.id || req.user!.companyId;
    if (!companyId) {
      return sendResponse({
        res,
        statusCode: 400,
        message: 'Company ID is required.',
      });
    }

    const updated = await CompaniesService.updateCompany(companyId, req.body);
    return sendResponse({
      res,
      statusCode: 200,
      message: 'Company profile updated successfully.',
      data: updated,
    });
  };

  static getById = async (req: AuthenticatedRequest, res: Response) => {
    const companyId = req.params.id || req.user!.companyId;
    if (!companyId) {
      return sendResponse({
        res,
        statusCode: 404,
        message: 'No company linked to this profile yet.',
      });
    }

    const company = await CompaniesService.getCompanyById(companyId);
    return sendResponse({
      res,
      statusCode: 200,
      message: 'Company details retrieved.',
      data: company,
    });
  };

  static list = async (req: AuthenticatedRequest, res: Response) => {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const search = (req.query.search as string) || '';

    const result = await CompaniesService.listCompanies(page, limit, search);
    return sendResponse({
      res,
      statusCode: 200,
      message: 'Companies list retrieved.',
      data: result.companies,
      meta: result.meta,
    });
  };
}
