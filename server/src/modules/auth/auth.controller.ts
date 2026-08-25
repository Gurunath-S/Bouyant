import { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { sendResponse } from '../../utils/response.js';
import { AuthenticatedRequest } from '../../middlewares/auth.js';

export class AuthController {
  static register = async (req: Request, res: Response) => {
    const { user, tokens } = await AuthService.register(req.body);

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return sendResponse({
      res,
      statusCode: 201,
      message: 'Account registered successfully.',
      data: { user, tokens },
    });
  };

  static login = async (req: Request, res: Response) => {
    const { user, tokens } = await AuthService.login(req.body);

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return sendResponse({
      res,
      statusCode: 200,
      message: 'Login successful.',
      data: { user, tokens },
    });
  };

  static refresh = async (req: Request, res: Response) => {
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
    const tokens = await AuthService.refreshSession(refreshToken);

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return sendResponse({
      res,
      statusCode: 200,
      message: 'Session refreshed successfully.',
      data: tokens,
    });
  };

  static me = async (req: AuthenticatedRequest, res: Response) => {
    const user = await AuthService.getCurrentUser(req.user!.userId);
    return sendResponse({
      res,
      statusCode: 200,
      message: 'User profile retrieved.',
      data: user,
    });
  };

  static logout = async (req: Request, res: Response) => {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return sendResponse({
      res,
      statusCode: 200,
      message: 'Logged out successfully.',
    });
  };
}
