import { Request,Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.js';
import { CompaniesService } from './companies.service.js';
import { sendResponse } from '../../utils/response.js';
import { prisma } from '../../config/db.js';

export class CompaniesController {


  static verifyGst = async (req: Request, res: Response) => {
    const { gstNumber, edition, eventCode, spcode, year } = req.body;
    const effectiveSpcode = spcode || (req as AuthenticatedRequest).user?.spcode;

    const result = await CompaniesService.verifyGst(gstNumber, edition, eventCode, effectiveSpcode, year);

    return sendResponse({
      res,
      statusCode: 200,
      message: 'GST verification completed successfully.',
      data: result,
    });
  };

  static create = async (req: AuthenticatedRequest, res: Response) => {
    const company = await CompaniesService.createCompany(req.body, {
      actingUser: req.user,
      userSpcode: req.user?.spcode || undefined,
    });

    const isDeliveryFailed = company.emailDelivery?.status === 'FAILED';
    const isDeliverySkipped = company.emailDelivery?.status === 'SKIPPED';

    let message = 'Company profile created successfully.';
    if (isDeliveryFailed) {
      message = 'Company profile created, but credential delivery email failed. Please use password recovery.';
    } else if (isDeliverySkipped && !company.isExistingUser) {
      message = 'Company profile created. Credential email delivery was skipped.';
    }

    return sendResponse({
      res,
      statusCode: 201,
      message,
      data: company,
    });
  };

  static update = async (req: AuthenticatedRequest, res: Response) => {
    let targetCompanyId = req.params.id || req.user?.companyId;

    if (!targetCompanyId && req.user?.userId) {
      const userRecord = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { companyId: true },
      });
      targetCompanyId = userRecord?.companyId || undefined;
    }

    if (!targetCompanyId) {
      return sendResponse({
        res,
        statusCode: 400,
        message: 'Company ID is required.',
      });
    }

    const isAdminOrStaff =
      req.user?.role === 'ADMIN' || req.user?.role === 'SUPERADMIN' || req.user?.role === 'STAFF';

    if (!isAdminOrStaff) {
      let userCompanyId = req.user?.companyId;
      if (!userCompanyId && req.user?.userId) {
        const userRecord = await prisma.user.findUnique({
          where: { id: req.user.userId },
          select: { companyId: true },
        });
        userCompanyId = userRecord?.companyId || null;
      }

      if (userCompanyId !== targetCompanyId) {
        return sendResponse({
          res,
          statusCode: 403,
          message: 'Access denied: You can only update your own company profile.',
        });
      }
    }

    const updated = await CompaniesService.updateCompany(targetCompanyId, req.body, req.user?.userId);
    return sendResponse({
      res,
      statusCode: 200,
      message: 'Company profile updated successfully.',
      data: updated,
    });
  };

  static getById = async (req: AuthenticatedRequest, res: Response) => {
    const targetCompanyId = req.params.id || req.user!.companyId;
    if (!targetCompanyId) {
      return sendResponse({
        res,
        statusCode: 404,
        message: 'No company linked to this profile yet.',
      });
    }

    const isAdminOrStaff =
      req.user?.role === 'ADMIN' || req.user?.role === 'SUPERADMIN' || req.user?.role === 'STAFF';
    if (!isAdminOrStaff && req.user?.companyId !== targetCompanyId) {
      return sendResponse({
        res,
        statusCode: 403,
        message: 'Access denied: You can only access your own company profile.',
      });
    }

    const company = await CompaniesService.getCompanyById(targetCompanyId);
    return sendResponse({
      res,
      statusCode: 200,
      message: 'Company details retrieved.',
      data: company,
    });
  };

  static list = async (req: AuthenticatedRequest, res: Response) => {
    const page = req.query.page;
    const limit = req.query.limit;
    const search = (req.query.search as string) || '';
    const exhibitionId = (req.query.exhibitionId as string) || undefined;
    const status = (req.query.status as string) || undefined;
    const paymentStatus = (req.query.paymentStatus as string) || undefined;

    const result = await CompaniesService.listCompanies(page, limit, search, exhibitionId, status, paymentStatus);
    return sendResponse({
      res,
      statusCode: 200,
      message: 'Companies list retrieved.',
      data: result.companies,
      meta: result.meta,
    });
  };
}
