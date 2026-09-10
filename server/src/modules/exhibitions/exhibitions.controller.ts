import { Request, Response } from 'express';
import { ExhibitionsService } from './exhibitions.service.js';
import { AuthenticatedRequest } from '../../middlewares/auth.js';
import { sendResponse } from '../../utils/response.js';

export class ExhibitionsController {
  static list = async (req: Request, res: Response) => {
    const status = req.query.status as string;
    const search = req.query.search as string || '';
    const exhibitions = await ExhibitionsService.listExhibitions(status, search);

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
    const result = await ExhibitionsService.deleteExhibition(req.params.id);
    return sendResponse({
      res,
      statusCode: 200,
      message: result.message,
      data: result,
    });
  };
}
