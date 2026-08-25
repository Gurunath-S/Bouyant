import jwt, { Secret } from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  companyId?: string | null;
}

export const generateTokens = (payload: TokenPayload) => {
  const accessToken = jwt.sign(payload, env.JWT_SECRET as Secret, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });

  const refreshToken = jwt.sign(payload, env.REFRESH_TOKEN_SECRET as Secret, {
    expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as any,
  });

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.JWT_SECRET as Secret) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.REFRESH_TOKEN_SECRET as Secret) as TokenPayload;
};
