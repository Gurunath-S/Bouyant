import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError.js';
import { verifyAccessToken, TokenPayload } from '../utils/jwt.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  _res: Response,
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
  } catch (_error) {
    return next(ApiError.unauthorized('Invalid or expired authentication token'));
  }
};

export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  let token = req.headers.authorization?.split(' ')[1];

  if (!token && req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  // 1. If NO token is provided at all, they are a true guest -> proceed
  if (!token) {
    req.user = undefined;
    return next();
  }

  // 2. If a token WAS provided, it MUST be valid.
  // If it's expired or fake, reject with 401 so the user knows to log in again!
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return next(ApiError.unauthorized('Your session has expired or token is invalid. Please log in again.'));
  }
};
