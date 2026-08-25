import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/auth.js';
import { StallsService } from './stalls.service.js';
import { sendResponse } from '../../utils/response.js';

export class StallsController {
  static getByFloorPlan = async (req: Request, res: Response) => {
    const stalls = await StallsService.getStallsByFloorPlan(req.params.floorPlanId);
    return sendResponse({
      res,
      statusCode: 200,
      message: 'Stalls retrieved successfully.',
      data: stalls,
    });
  };

  static create = async (req: Request, res: Response) => {
    const stall = await StallsService.createStall(req.body);
    return sendResponse({
      res,
      statusCode: 201,
      message: 'Stall created successfully.',
      data: stall,
    });
  };

  static update = async (req: Request, res: Response) => {
    const stall = await StallsService.updateStall(req.params.id, req.body);
    return sendResponse({
      res,
      statusCode: 200,
      message: 'Stall updated successfully.',
      data: stall,
    });
  };

  static hold = async (req: AuthenticatedRequest, res: Response) => {
    const { stallId } = req.body;
    const userId = req.user!.userId;
    const result = await StallsService.holdStall(stallId, userId);

    return sendResponse({
      res,
      statusCode: 200,
      message: 'Stall held temporarily for booking.',
      data: result,
    });
  };

  static releaseHold = async (req: AuthenticatedRequest, res: Response) => {
    const { stallId } = req.params;
    const userId = req.user!.userId;
    const stall = await StallsService.releaseHold(stallId, userId);

    return sendResponse({
      res,
      statusCode: 200,
      message: 'Stall hold released.',
      data: stall,
    });
  };

  static toggleBlock = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { block } = req.body;
    const stall = await StallsService.toggleBlockStall(id, block);

    return sendResponse({
      res,
      statusCode: 200,
      message: `Stall ${block ? 'blocked' : 'unblocked'} successfully.`,
      data: stall,
    });
  };
}
