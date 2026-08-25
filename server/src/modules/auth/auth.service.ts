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

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        name: input.name,
        phone: input.phone,
        role: 'CLIENT',
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        companyId: true,
        createdAt: true,
      },
    });

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });

    return { user, tokens };
  }

  static async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: { company: true },
    });

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password.');
    }

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });

    const userProfile = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
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

      const tokens = generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      });

      return tokens;
    } catch (error) {
      throw ApiError.unauthorized('Invalid or expired refresh token.');
    }
  }

  static async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        companyId: true,
        company: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw ApiError.notFound('User profile not found.');
    }

    return user;
  }
}
