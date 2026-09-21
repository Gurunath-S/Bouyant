import { Response } from 'express';
import { ReportsService } from './reports.service.js';
import { AuthenticatedRequest } from '../../middlewares/auth.js';
import { sendResponse } from '../../utils/response.js';

export class ReportsController {
  static getOverview = async (req: AuthenticatedRequest, res: Response) => {
    const role = req.user!.role;
    const userId = req.user!.userId;
    const data = await ReportsService.getOverview(role, userId);

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
    const data = await ReportsService.getStallOccupancyReport(role, userId);

    return sendResponse({
      res,
      statusCode: 200,
      message: 'Stall occupancy report retrieved successfully.',
      data,
    });
  };
}
