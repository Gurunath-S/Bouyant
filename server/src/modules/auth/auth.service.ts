import bcrypt from 'bcryptjs';
import jwt, { Secret } from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/apiError.js';
import { UserRole } from '@prisma/client';
import { generateTokens, verifyRefreshToken } from '../../utils/jwt.js';
import { EmailService } from '../../services/email.service.js';
import { RegisterInput, LoginInput } from './auth.schemas.js';
import { DEFAULT_ROLE_PAGE_ACCESS } from '../../config/permissions.js';
import { resolveClientOrigin } from '../../utils/urlHelper.js';

const FORGOT_PASSWORD_EMAIL_COOLDOWN_MS = 60 * 1000; // 60 seconds per email
const forgotPasswordEmailTimestamps = new Map<string, number>();

export function resetForgotPasswordCooldownForTesting() {
  forgotPasswordEmailTimestamps.clear();
}

export class AuthService {
  static async register(input: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      throw ApiError.conflict('An account with this email address already exists.');
    }

    if (input.spcode) {
      const cleanSp = input.spcode.toUpperCase().trim();
      const existingSp = await prisma.user.findUnique({
        where: { spcode: cleanSp },
      });
      if (existingSp) {
        throw ApiError.conflict(`A user with Staff SP Code '${cleanSp}' already exists.`);
      }
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        name: input.name,
        phone: input.phone,
        role: 'CLIENT',
        spcode: input.spcode ? input.spcode.toUpperCase().trim() : null,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        phone: true,
        role: true,
        spcode: true,
        companyId: true,
        createdAt: true,
      },
    });

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      spcode: user.spcode,
    });

    return { user, tokens };
  }

  static async checkUsernameAvailability(username: string) {
    const clean = username.trim().toLowerCase();
    if (!clean || clean.length < 3 || clean.length > 30) {
      return { available: false, message: 'Username must be between 3 and 30 characters long.' };
    }
    if (!/^[a-z0-9][a-z0-9._-]*[a-z0-9]$/.test(clean) || /\.{2,}/.test(clean)) {
      return {
        available: false,
        message: 'Username can only contain letters, numbers, hyphens, underscores, and non-consecutive dots.',
      };
    }
    const existing = await prisma.user.findUnique({
      where: { username: clean },
    });
    return {
      available: !existing,
      username: clean,
      message: existing ? 'Username is already taken.' : 'Username is available!',
    };
  }

  static async login(input: LoginInput) {
    const identifier = input.email.trim();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: identifier, mode: 'insensitive' } },
          { username: { equals: identifier, mode: 'insensitive' } },
          { spcode: { equals: identifier, mode: 'insensitive' } },
        ],
      },
      include: { company: true },
    });

    if (!user) {
      throw ApiError.unauthorized('Invalid username/email or password.');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid username/email or password.');
    }

    if (user.isActive === false) {
      throw ApiError.forbidden('Your account has been deactivated. Please contact an administrator.');
    }

    const userAccessList = (user as any).pageAccess as string[] | undefined;
    const effectivePageAccess =
      Array.isArray(userAccessList) && userAccessList.length > 0
        ? userAccessList
        : DEFAULT_ROLE_PAGE_ACCESS[user.role as UserRole] || [];

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      spcode: user.spcode,
      pageAccess: effectivePageAccess,
    });

    const userProfile = {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      phone: user.phone,
      role: user.role,
      spcode: user.spcode,
      pageAccess: effectivePageAccess,
      isActive: user.isActive,
      companyId: user.companyId,
      company: user.company,
      createdAt: user.createdAt,
    };

    return { user: userProfile, tokens };
  }

  static async refreshSession(token: string) {
    try {
      const decoded = verifyRefreshToken(token);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        throw ApiError.unauthorized('User no longer exists.');
      }

      if (user.isActive === false) {
        throw ApiError.forbidden('Your account has been deactivated.');
      }

      const userAccessList = (user as any).pageAccess as string[] | undefined;
      const effectivePageAccess =
        Array.isArray(userAccessList) && userAccessList.length > 0
          ? userAccessList
          : DEFAULT_ROLE_PAGE_ACCESS[user.role as UserRole] || [];

      const tokens = generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        spcode: user.spcode,
        pageAccess: effectivePageAccess,
      });

      return tokens;
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw ApiError.unauthorized('Invalid or expired refresh token.');
    }
  }

  static async getCurrentUser(userId: string) {
    const user: any = await (prisma.user as any).findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        phone: true,
        role: true,
        spcode: true,
        pageAccess: true,
        isActive: true,
        companyId: true,
        company: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw ApiError.notFound('User profile not found.');
    }

    if (user.isActive === false) {
      throw ApiError.forbidden('Your account has been deactivated.');
    }

    const userAccessList = (user as any)?.pageAccess as string[] | undefined;
    const effectivePageAccess =
      Array.isArray(userAccessList) && userAccessList.length > 0
        ? userAccessList
        : DEFAULT_ROLE_PAGE_ACCESS[(user as any)?.role as UserRole] || [];

    return {
      ...user,
      pageAccess: effectivePageAccess,
    };
  }

  static async forgotPassword(email: string) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const genericResponse = {
      message: 'If an account associated with this email exists, a password reset link has been dispatched.',
    };

    if (!cleanEmail) {
      return genericResponse;
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    // Account enumeration defense: Return identical response whether user exists or not
    if (!user || user.isActive === false) {
      return genericResponse;
    }

    // Cryptographic single-use token: Secret is HMAC keyed with (JWT_SECRET + user.passwordHash)
    // When the user resets their password, passwordHash updates, instantly invalidating this token.
    const secret = `${env.JWT_SECRET}:${user.passwordHash}`;
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        type: 'password_reset',
      },
      secret as Secret,
      { expiresIn: '1h' }
    );

    // Per-account cooldown defense against distributed email-bombing botnets
    const lastDispatched = forgotPasswordEmailTimestamps.get(cleanEmail);
    const now = Date.now();
    if (lastDispatched && now - lastDispatched < FORGOT_PASSWORD_EMAIL_COOLDOWN_MS) {
      console.log(`ℹ️ [AUTH] Password reset email throttled by per-account cooldown (60s) for: ${cleanEmail}`);
      return genericResponse;
    }
    forgotPasswordEmailTimestamps.set(cleanEmail, now);

    // Bounded memory cleanup
    if (forgotPasswordEmailTimestamps.size > 2000) {
      for (const [k, v] of forgotPasswordEmailTimestamps.entries()) {
        if (now - v > FORGOT_PASSWORD_EMAIL_COOLDOWN_MS * 2) {
          forgotPasswordEmailTimestamps.delete(k);
        }
      }
    }

    const clientUrl = resolveClientOrigin();
    const resetUrl = `${clientUrl}/reset-password?token=${encodeURIComponent(token)}`;

    // Dispatch recovery email to the verified user email
    try {
      await EmailService.sendPasswordResetEmail({
        toEmail: user.email,
        toName: user.name,
        resetUrl,
      });
    } catch (err: any) {
      console.error('Password reset email dispatch failure:', err?.message || err);
    }

    return genericResponse;
  }

  static async resetPassword(token: string, newPassword: string) {
    if (!token || typeof token !== 'string') {
      throw ApiError.badRequest('Invalid or malformed password reset token.');
    }

    let unverified: any;
    try {
      unverified = jwt.decode(token);
    } catch {
      throw ApiError.badRequest('Invalid or malformed password reset token.');
    }

    if (!unverified || typeof unverified !== 'object' || !unverified.userId || unverified.type !== 'password_reset') {
      throw ApiError.badRequest('Invalid or malformed password reset token.');
    }

    const user = await prisma.user.findUnique({
      where: { id: unverified.userId },
    });

    if (!user || user.isActive === false) {
      throw ApiError.badRequest('Invalid or expired password reset link.');
    }

    const secret = `${env.JWT_SECRET}:${user.passwordHash}`;
    try {
      jwt.verify(token, secret as Secret, { algorithms: ['HS256'] });
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw ApiError.badRequest('Password reset link has expired. Please request a new one.');
      }
      throw ApiError.badRequest('Invalid or expired password reset link.');
    }

    // Enforce password length
    if (!newPassword || newPassword.length < 8) {
      throw ApiError.badRequest('New password must be at least 8 characters long.');
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return {
      message: 'Password has been reset successfully. You may now log in with your new password.',
    };
  }
}
