import bcrypt from 'bcryptjs';
import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/apiError.js';
import { generateTokens, verifyRefreshToken } from '../../utils/jwt.js';
import { RegisterInput, LoginInput } from './auth.schemas.js';

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
    if (!clean || clean.length < 3) {
      return { available: false, message: 'Username must be at least 3 characters long.' };
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(clean)) {
      return { available: false, message: 'Username can only contain letters, numbers, hyphens, and underscores.' };
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

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      spcode: user.spcode,
    });

    const userProfile = {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      phone: user.phone,
      role: user.role,
      spcode: user.spcode,
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

      const tokens = generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        spcode: user.spcode,
      });

      return tokens;
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw ApiError.unauthorized('Invalid or expired refresh token.');
    }
  }

  static async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        phone: true,
        role: true,
        spcode: true,
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

    return user;
  }
}
