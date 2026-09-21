import bcrypt from 'bcryptjs';
import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/apiError.js';
import { UserRole } from '@prisma/client';
import {
  CreateAdminInput,
  CreateStaffInput,
  UpdateUserInput,
} from './users.schemas.js';

export class UsersService {
  static async listUsers(role?: string, search = '') {
    const where: any = {};

    if (role && role.toUpperCase() !== 'ALL') {
      const upperRole = role.toUpperCase();
      if (upperRole === 'ADMIN' || upperRole === 'STAFF') {
        where.role = upperRole as UserRole;
      }
    } else {
      // By default in user management, show ADMIN and STAFF accounts
      where.role = { in: [UserRole.ADMIN, UserRole.STAFF] };
    }

    if (search.trim()) {
      const s = search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { spcode: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        spcode: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            createdExhibitions: true,
          },
        },
      },
    });

    return users;
  }

  static async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        spcode: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        createdExhibitions: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            startDate: true,
            endDate: true,
            totalStalls: true,
            spcode: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found.');
    }

    return user;
  }

  static async createAdmin(input: CreateAdminInput) {
    const email = input.email.toLowerCase().trim();

    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      throw ApiError.conflict('An account with this email address already exists.');
    }

    let spcode: string | null = null;
    if (input.spcode && input.spcode.trim()) {
      spcode = input.spcode.trim().toUpperCase();
      const existingSp = await prisma.user.findUnique({
        where: { spcode },
      });
      if (existingSp) {
        throw ApiError.conflict(`A user with Staff SP Code '${spcode}' already exists.`);
      }
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email,
        passwordHash,
        phone: input.phone ? input.phone.trim() : null,
        spcode,
        role: UserRole.ADMIN,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        spcode: true,
        isActive: true,
        createdAt: true,
      },
    });

    return user;
  }

  static async createStaff(input: CreateStaffInput) {
    const email = input.email.toLowerCase().trim();

    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      throw ApiError.conflict('An account with this email address already exists.');
    }

    let spcode: string | null = null;
    if (input.spcode && input.spcode.trim()) {
      spcode = input.spcode.trim().toUpperCase();
      const existingSp = await prisma.user.findUnique({
        where: { spcode },
      });
      if (existingSp) {
        throw ApiError.conflict(`A user with Staff SP Code '${spcode}' already exists.`);
      }
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email,
        passwordHash,
        phone: input.phone ? input.phone.trim() : null,
        spcode,
        role: UserRole.STAFF,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        spcode: true,
        isActive: true,
        createdAt: true,
      },
    });

    return user;
  }

  static async updateUser(id: string, input: UpdateUserInput) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw ApiError.notFound('User not found.');
    }

    if (user.role === UserRole.SUPERADMIN) {
      throw ApiError.forbidden('Platform Super Admin details cannot be modified through this endpoint.');
    }

    let spcode = user.spcode;
    if (input.spcode !== undefined) {
      const cleanSp = input.spcode ? input.spcode.trim().toUpperCase() : null;
      if (cleanSp && cleanSp !== user.spcode) {
        const existingSp = await prisma.user.findUnique({
          where: { spcode: cleanSp },
        });
        if (existingSp && existingSp.id !== id) {
          throw ApiError.conflict(`SP Code '${cleanSp}' is already assigned to another user.`);
        }
      }
      spcode = cleanSp;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: input.name ? input.name.trim() : undefined,
        phone: input.phone !== undefined ? (input.phone ? input.phone.trim() : null) : undefined,
        spcode,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        spcode: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  static async toggleStatus(id: string, isActive: boolean, requestingUserId: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw ApiError.notFound('User not found.');
    }

    if (user.role === UserRole.SUPERADMIN) {
      throw ApiError.forbidden('Super Admin account status cannot be deactivated.');
    }

    if (id === requestingUserId && !isActive) {
      throw ApiError.forbidden('You cannot deactivate your own account.');
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  static async resetPassword(id: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw ApiError.notFound('User not found.');
    }

    if (user.role === UserRole.SUPERADMIN) {
      throw ApiError.forbidden('Super Admin password cannot be reset via this interface.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return { message: `Password for ${user.name} (${user.email}) has been reset successfully.` };
  }
}
