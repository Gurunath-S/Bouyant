import { Request, Response } from 'express';
import { UsersService } from './users.service.js';
import { AuthenticatedRequest } from '../../middlewares/auth.js';
import { sendResponse } from '../../utils/response.js';

export class UsersController {
  static list = async (req: Request, res: Response) => {
    const role = req.query.role as string | undefined;
    const search = (req.query.search as string) || '';
    const status = req.query.status as string | undefined;
    const exhibitionId = req.query.exhibitionId as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    const usersResult: any = await UsersService.listUsers({
      role,
      search,
      status,
      exhibitionId,
      page,
      limit,
    });

    if (usersResult && typeof usersResult === 'object' && 'users' in usersResult) {
      return sendResponse({
        res,
        statusCode: 200,
        message: 'Users list retrieved successfully.',
        data: usersResult.users,
        meta: {
          total: usersResult.total,
          page: usersResult.page,
          limit: usersResult.limit,
          totalPages: usersResult.totalPages,
          roleCounts: usersResult.roleCounts,
        },
      });
    }

    return sendResponse({
      res,
      statusCode: 200,
      message: 'Users list retrieved successfully.',
      data: usersResult,
    });
  };

  static getById = async (req: Request, res: Response) => {
    const user = await UsersService.getUserById(req.params.id);
    return sendResponse({
      res,
      statusCode: 200,
      message: 'User details retrieved successfully.',
      data: user,
    });
  };

  static create = async (req: Request, res: Response) => {
    const user = await UsersService.createUser(req.body);
    return sendResponse({
      res,
      statusCode: 201,
      message: `${user.role} account created successfully.`,
      data: user,
    });
  };

  static createAdmin = async (req: Request, res: Response) => {
    const admin = await UsersService.createAdmin(req.body);
    return sendResponse({
      res,
      statusCode: 201,
      message: 'Admin account created successfully.',
      data: admin,
    });
  };

  static createStaff = async (req: Request, res: Response) => {
    const staff = await UsersService.createStaff(req.body);
    return sendResponse({
      res,
      statusCode: 201,
      message: 'Staff account created successfully.',
      data: staff,
    });
  };

  static update = async (req: AuthenticatedRequest, res: Response) => {
    const updated = await UsersService.updateUser(req.params.id, req.body, req.user);
    return sendResponse({
      res,
      statusCode: 200,
      message: 'User account updated successfully.',
      data: updated,
    });
  };

  static toggleStatus = async (req: AuthenticatedRequest, res: Response) => {
    const { isActive } = req.body;
    const updated = await UsersService.toggleStatus(req.params.id, isActive, req.user!.userId);
    return sendResponse({
      res,
      statusCode: 200,
      message: `User account has been ${isActive ? 'activated' : 'deactivated'} successfully.`,
      data: updated,
    });
  };

  static resetPassword = async (req: Request, res: Response) => {
    const { newPassword, sendEmailNotification, newUsername } = req.body;
    const actingAdmin = (req as any).user;
    const result = await UsersService.resetPassword(req.params.id, newPassword, sendEmailNotification, actingAdmin, newUsername);
    return sendResponse({
      res,
      statusCode: 200,
      message: result.message,
      data: result,
    });
  };
}
