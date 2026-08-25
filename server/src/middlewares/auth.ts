import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError.js';
import { verifyAccessToken, TokenPayload } from '../utils/jwt.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  let token = req.headers.authorization?.split(' ')[1];

  if (!token && req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return next(ApiError.unauthorized('Authentication token missing'));
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return next(ApiError.unauthorized('Invalid or expired authentication token'));
  }
};
