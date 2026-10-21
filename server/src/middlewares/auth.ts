import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError.js';
import { verifyAccessToken, TokenPayload } from '../utils/jwt.js';
import { prisma } from '../config/db.js';

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

export const optionalAuth = async (
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

  // 2. If a token was provided, verify and check if the user actually exists in the database
  try {
    const decoded = verifyAccessToken(token);
    const userRecord = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, companyId: true },
    });

    if (!userRecord) {
      // User was deleted or belonged to a cleared test session: fall back to unauthenticated guest
      req.user = undefined;
      return next();
    }

    req.user = decoded;
    next();
  } catch (_error) {
    // If token is invalid or expired on an optionalAuth route, fall back to guest rather than blocking
    req.user = undefined;
    next();
  }
};
