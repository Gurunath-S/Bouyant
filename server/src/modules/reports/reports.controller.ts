import { Response } from 'express';
import { ReportsService, ReportFilters, DetailedReportParams } from './reports.service.js';
import { AuthenticatedRequest } from '../../middlewares/auth.js';
import { sendResponse } from '../../utils/response.js';

export class ReportsController {
  static getOverview = async (req: AuthenticatedRequest, res: Response) => {
    const role = req.user!.role;
    const userId = req.user!.userId;
    const filters: ReportFilters = {
      exhibitionId: req.query.exhibitionId as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      status: req.query.status as string | undefined,
      paymentStatus: req.query.paymentStatus as string | undefined,
    };

    const data = await ReportsService.getOverview(role, userId, filters);

    return sendResponse({
      res,
      statusCode: 200,
      message: 'Overview report retrieved successfully.',
      data,
    });
  };

  static getExhibitions = async (req: AuthenticatedRequest, res: Response) => {
    const role = req.user!.role;
    const userId = req.user!.userId;
    const data = await ReportsService.getExhibitionsReport(role, userId);

    return sendResponse({
      res,
      statusCode: 200,
      message: 'Exhibitions report retrieved successfully.',
      data,
    });
  };

  static getStallOccupancy = async (req: AuthenticatedRequest, res: Response) => {
    const role = req.user!.role;
    const userId = req.user!.userId;
    const filters: ReportFilters = {
      exhibitionId: req.query.exhibitionId as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    };

    const data = await ReportsService.getStallOccupancyReport(role, userId, filters);

    return sendResponse({
      res,
      statusCode: 200,
      message: 'Stall occupancy report retrieved successfully.',
      data,
    });
  };

  static getDetails = async (req: AuthenticatedRequest, res: Response) => {
    const role = req.user!.role;
    const userId = req.user!.userId;
    const params: DetailedReportParams = {
      type: (req.query.type as any) || 'bookings',
      exhibitionId: req.query.exhibitionId as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      status: req.query.status as string | undefined,
      paymentStatus: req.query.paymentStatus as string | undefined,
      search: req.query.search as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
    };

    const data = await ReportsService.getDetailedRecordsReport(role, userId, params);

    return sendResponse({
      res,
      statusCode: 200,
      message: `${params.type} detailed report retrieved successfully.`,
      data,
    });
  };

  static exportCsv = async (req: AuthenticatedRequest, res: Response) => {
    const role = req.user!.role;
    const userId = req.user!.userId;
    const params: DetailedReportParams = {
      type: (req.query.type as any) || 'bookings',
      exhibitionId: req.query.exhibitionId as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      status: req.query.status as string | undefined,
      paymentStatus: req.query.paymentStatus as string | undefined,
      search: req.query.search as string | undefined,
    };

    const csvData = await ReportsService.exportReportCsv(role, userId, params);
    const filename = `buoyant-report-${params.type}-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvData);
  };
}
