import { Request, Response } from 'express';
import { FloorPlansService } from './floor-plans.service.js';
import { sendResponse } from '../../utils/response.js';

export class FloorPlansController {
  static getById = async (req: Request, res: Response) => {
    const floorPlan = await FloorPlansService.getById(req.params.id);
    return sendResponse({
      res,
      statusCode: 200,
      message: 'Floor plan details retrieved.',
      data: floorPlan,
    });
  };

  static update = async (req: Request, res: Response) => {
    const floorPlan = await FloorPlansService.updateFloorPlan(req.params.id, req.body);
    return sendResponse({
      res,
      statusCode: 200,
      message: 'Floor plan updated successfully.',
      data: floorPlan,
    });
  };
}
