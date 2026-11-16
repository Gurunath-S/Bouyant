import { Request, Response } from 'express';
import { ExhibitionsService } from './exhibitions.service.js';
import { AuthenticatedRequest } from '../../middlewares/auth.js';
import { sendResponse } from '../../utils/response.js';

export class ExhibitionsController {
  static list = async (req: Request, res: Response) => {
    const status = req.query.status as string;
    const search = req.query.search as string || '';
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const exhibitions = await ExhibitionsService.listExhibitions(status, search,page,limit);

    return sendResponse({
      res,
      statusCode: 200,
      message: 'Exhibitions list retrieved.',
      data: exhibitions,
    });
  };

  static getBySlug = async (req: Request, res: Response) => {
    const exhibition = await ExhibitionsService.getExhibitionBySlugOrId(req.params.idOrSlug);
    return sendResponse({
      res,
      statusCode: 200,
      message: 'Exhibition details retrieved.',
      data: exhibition,
    });
  };

  static create = async (req: AuthenticatedRequest, res: Response) => {
    const exhibition = await ExhibitionsService.createExhibition(req.body, req.user?.userId);
    return sendResponse({
      res,
      statusCode: 201,
      message: 'Exhibition event created successfully.',
      data: exhibition,
    });
  };

  static update = async (req: Request, res: Response) => {
    const exhibition = await ExhibitionsService.updateExhibition(req.params.id, req.body);
    return sendResponse({
      res,
      statusCode: 200,
      message: 'Exhibition event updated successfully.',
      data: exhibition,
    });
  };

  static delete = async (req: Request, res: Response) => {
    const force = req.query.force === 'true' || req.query.force === '1';
    const result = await ExhibitionsService.deleteExhibition(req.params.id, force);
    return sendResponse({
      res,
      statusCode: 200,
      message: result.message,
      data: result,
    });
  };
}
