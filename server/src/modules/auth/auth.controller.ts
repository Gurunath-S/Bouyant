import { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { sendResponse } from '../../utils/response.js';
import { AuthenticatedRequest } from '../../middlewares/auth.js';

export class AuthController {
  private static getCookieOptions(req: Request) {
    const isHttps =
      req.secure ||
      req.headers['x-forwarded-proto'] === 'https' ||
      process.env.NODE_ENV === 'production' ||
      Boolean(process.env.RENDER) ||
      Boolean(process.env.VERCEL);

    return {
      httpOnly: true,
      secure: isHttps,
      sameSite: (isHttps ? 'none' : 'lax') as 'none' | 'lax',
      path: '/',
    };
  }

  static register = async (req: Request, res: Response) => {
    const { user, tokens } = await AuthService.register(req.body);

    const cookieOpts = AuthController.getCookieOptions(req);
    res.cookie('accessToken', tokens.accessToken, {
      ...cookieOpts,
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      ...cookieOpts,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return sendResponse({
      res,
      statusCode: 201,
      message: 'Account registered successfully.',
      data: { user, tokens },
    });
  };

  static checkUsername = async (req: Request, res: Response) => {
    const username = (req.query.username as string) || '';
    const result = await AuthService.checkUsernameAvailability(username);
    return sendResponse({
      res,
      statusCode: 200,
      message: result.message,
      data: result,
    });
  };

  static lookupAccount = async (req: Request, res: Response) => {
    const email = req.query.email as string | undefined;
    const phone = req.query.phone as string | undefined;
    const gstNumber = req.query.gstNumber as string | undefined;
    const companyName = req.query.companyName as string | undefined;
    const result = await AuthService.lookupAccount({ email, phone, gstNumber, companyName });
    return sendResponse({
      res,
      statusCode: 200,
      message: result.exists ? 'Account found.' : 'No existing account found.',
      data: result,
    });
  };

  static login = async (req: Request, res: Response) => {
    const { user, tokens } = await AuthService.login(req.body);

    const cookieOpts = AuthController.getCookieOptions(req);
    res.cookie('accessToken', tokens.accessToken, {
      ...cookieOpts,
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      ...cookieOpts,
      maxAge: 7 * 24 * 60 * 60 * 1000,
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

    const cookieOpts = AuthController.getCookieOptions(req);
    res.cookie('accessToken', tokens.accessToken, {
      ...cookieOpts,
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.cookie('refreshToken', tokens.refreshToken, {
      ...cookieOpts,
      maxAge: 7 * 24 * 60 * 60 * 1000,
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
    const cookieOpts = AuthController.getCookieOptions(req);
    res.clearCookie('accessToken', cookieOpts);
    res.clearCookie('refreshToken', cookieOpts);
    return sendResponse({
      res,
      statusCode: 200,
      message: 'Logged out successfully.',
    });
  };

  static forgotPassword = async (req: Request, res: Response) => {
    const result = await AuthService.forgotPassword(req.body.email);
    return sendResponse({
      res,
      statusCode: 200,
      message: result.message,
      data: result,
    });
  };

  static resetPassword = async (req: Request, res: Response) => {
    const result = await AuthService.resetPassword(req.body.token, req.body.password);
    return sendResponse({
      res,
      statusCode: 200,
      message: result.message,
      data: result,
    });
  };
}
