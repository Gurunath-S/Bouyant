import bcrypt from 'bcryptjs';
import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/apiError.js';
import { UserRole } from '@prisma/client';
import { ROLE_PERMISSIONS, DEFAULT_ROLE_PAGE_ACCESS } from '../../config/permissions.js';
import {
  CreateUserInput,
  CreateAdminInput,
  CreateStaffInput,
  UpdateUserInput,
} from './users.schemas.js';
import { normalizePagination } from '../../utils/pagination.js';
import { TokenPayload } from '../../utils/jwt.js';

export interface ListUsersParams {
  role?: string;
  search?: string;
  status?: string;
  exhibitionId?: string;
  page?: number;
  limit?: number;
}

export class UsersService {
  static async listUsers(roleOrOptions?: string | ListUsersParams, searchParam = '') {
    let role: string | undefined;
    let search = '';
    let status: string | undefined;
    let exhibitionId: string | undefined;
    let page: number | undefined;
    let limit: number | undefined;

    if (roleOrOptions && typeof roleOrOptions === 'object') {
      role = roleOrOptions.role;
      search = roleOrOptions.search || '';
      status = roleOrOptions.status;
      exhibitionId = roleOrOptions.exhibitionId;
      page = roleOrOptions.page;
      limit = roleOrOptions.limit;
    } else {
      role = roleOrOptions;
      search = searchParam || '';
    }

    const where: any = {};

    // Role filter
    if (role && role.toUpperCase() !== 'ALL') {
      const upperRole = role.toUpperCase();
      if (['SUPERADMIN', 'ADMIN', 'STAFF', 'CLIENT'].includes(upperRole)) {
        where.role = upperRole as UserRole;
      }
    }

    // Status filter
    if (status && status.toUpperCase() !== 'ALL') {
      const upperStatus = status.toUpperCase();
      if (upperStatus === 'ACTIVE') {
        where.isActive = true;
      } else if (upperStatus === 'INACTIVE') {
        where.isActive = false;
      }
    }

    // Search query
    if (search.trim()) {
      const s = search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { spcode: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
        { company: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }

    // Event scoping
    let targetExhibition: { id: string; spcode: string | null } | null = null;
    if (exhibitionId && exhibitionId.toUpperCase() !== 'ALL') {
      targetExhibition = await prisma.exhibition.findUnique({
        where: { id: exhibitionId },
        select: { id: true, spcode: true },
      });

      if (!targetExhibition) {
        throw ApiError.notFound('Exhibition not found.');
      }

      const eventScopeConditions: any[] = [
        { role: UserRole.SUPERADMIN }, // Platform-wide governance users
        { createdExhibitions: { some: { id: exhibitionId } } },
        { company: { bookings: { some: { exhibitionId } } } },
      ];

      if (targetExhibition.spcode) {
        eventScopeConditions.push({ spcode: targetExhibition.spcode });
      }

      where.AND = [
        ...(where.AND || []),
        { OR: eventScopeConditions },
      ];
    }

    const total = await prisma.user.count({ where });

    const queryArgs: any = {
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        spcode: true,
        pageAccess: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        companyId: true,
        company: {
          select: {
            id: true,
            name: true,
            companyCode: true,
            industry: true,
          },
        },
        createdExhibitions: {
          select: {
            id: true,
            title: true,
            status: true,
            edition: true,
          },
        },
        _count: {
          select: {
            createdExhibitions: true,
          },
        },
      },
    };

    let validPage: number | undefined;
    let validLimit: number | undefined;

    if (page !== undefined || limit !== undefined) {
      const normalized = normalizePagination(page, limit, 10, 100);
      validPage = normalized.page;
      validLimit = normalized.limit;
      queryArgs.skip = normalized.skip;
      queryArgs.take = normalized.limit;
    }

    queryArgs.orderBy = [{ createdAt: 'desc' }, { id: 'desc' }];

    const rawUsers: any[] = await prisma.user.findMany(queryArgs);

    const formattedUsers = rawUsers.map((u: any) => {
      let isGlobal = false;
      let eventAssociation = 'General User';

      if (u.role === UserRole.SUPERADMIN) {
        isGlobal = true;
        eventAssociation = 'Platform-Wide Governance';
      } else if (u.role === UserRole.ADMIN) {
        isGlobal = true;
        eventAssociation = 'Platform Administration';
      } else if (u.role === UserRole.STAFF) {
        if (exhibitionId && targetExhibition) {
          if (u.createdExhibitions?.some((e: any) => e.id === exhibitionId)) {
            eventAssociation = 'Event Creator';
          } else if (targetExhibition.spcode && u.spcode === targetExhibition.spcode) {
            eventAssociation = 'Associated Sales Representative';
          } else {
            eventAssociation = 'Operations Staff';
          }
        } else {
          eventAssociation = u._count?.createdExhibitions
            ? `${u._count.createdExhibitions} Event(s) Created`
            : 'Operations Staff';
        }
      } else if (u.role === UserRole.CLIENT) {
        if (exhibitionId) {
          eventAssociation = 'Exhibitor Client';
        } else {
          eventAssociation = u.company?.name ? `Exhibitor (${u.company.name})` : 'Exhibitor Client';
        }
      }

      const effectivePages =
        u.pageAccess && u.pageAccess.length > 0
          ? u.pageAccess
          : DEFAULT_ROLE_PAGE_ACCESS[u.role as UserRole] || [];

      return {
        ...u,
        pageAccess: effectivePages,
        isGlobal,
        eventAssociation,
      };
    });

    if (validPage && validLimit) {
      const baseWhere = { ...where };
      delete baseWhere.role;
      const roleCountsRaw = await prisma.user.groupBy({
        by: ['role'],
        where: baseWhere,
        _count: { _all: true },
      });
      const roleCounts: Record<string, number> = {
        ALL: 0,
        SUPERADMIN: 0,
        ADMIN: 0,
        STAFF: 0,
        CLIENT: 0,
      };
      for (const r of roleCountsRaw) {
        if (r.role in roleCounts) {
          roleCounts[r.role] = r._count._all;
          roleCounts.ALL += r._count._all;
        }
      }

      return {
        users: formattedUsers,
        total,
        page: validPage,
        limit: validLimit,
        totalPages: Math.ceil(total / validLimit),
        roleCounts,
      };
    }

    return formattedUsers;
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
        pageAccess: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        companyId: true,
        company: {
          select: {
            id: true,
            name: true,
            companyCode: true,
            contactPerson: true,
            mobile: true,
            email: true,
            address: true,
            city: true,
            state: true,
            pinCode: true,
            country: true,
            gstNumber: true,
            panNumber: true,
            industry: true,
            website: true,
          },
        },
        createdExhibitions: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            startDate: true,
            endDate: true,
            totalStalls: true,
            edition: true,
            eventCode: true,
            spcode: true,
            createdAt: true,
            _count: {
              select: { bookings: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found.');
    }

    let attributedBookings: any[] = [];
    let companyBookings: any[] = [];
    let heldStalls: any[] = [];

    // Fetch attributed bookings based on SP Code or User ID
    if (user.spcode) {
      attributedBookings = await prisma.booking.findMany({
        where: {
          OR: [
            { company: { users: { some: { id: user.id } } } },
            { company: { spcode: user.spcode } },
            { exhibition: { spcode: user.spcode } },
          ],
        },
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          bookingReference: true,
          status: true,
          paymentStatus: true,
          grandTotal: true,
          paidAmount: true,
          createdAt: true,
          company: {
            select: { name: true, spcode: true },
          },
          exhibition: {
            select: { title: true, edition: true, eventCode: true, spcode: true },
          },
          stalls: {
            select: {
              stall: { select: { stallNumber: true } },
            },
          },
        },
      });
    }

    // If client has a company, fetch bookings of their company
    if (user.companyId) {
      companyBookings = await prisma.booking.findMany({
        where: { companyId: user.companyId },
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          bookingReference: true,
          status: true,
          paymentStatus: true,
          grandTotal: true,
          paidAmount: true,
          createdAt: true,
          exhibition: {
            select: { id: true, title: true, edition: true, eventCode: true, venue: true, city: true },
          },
          stalls: {
            select: {
              stall: { select: { stallNumber: true, category: true } },
            },
          },
        },
      });
    }

    // Fetch active/recent stall holds placed by this Admin/Staff member
    heldStalls = await prisma.stall.findMany({
      where: { heldByUserId: user.id },
      take: 15,
      select: {
        id: true,
        stallNumber: true,
        status: true,
        heldUntil: true,
        price: true,
        floorPlan: {
          select: {
            exhibition: { select: { title: true } },
          },
        },
      },
    });

    const effectivePages =
      user.pageAccess && user.pageAccess.length > 0
        ? user.pageAccess
        : DEFAULT_ROLE_PAGE_ACCESS[user.role as UserRole] || [];

    const rolePermissions = Array.from(ROLE_PERMISSIONS[user.role] || []);

    return {
      ...user,
      pageAccess: effectivePages,
      attributedBookings,
      companyBookings,
      heldStalls,
      rolePermissions,
    };
  }

  static async createUser(input: CreateUserInput) {
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
        throw ApiError.conflict(`A user with SP Code '${spcode}' already exists.`);
      }
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const targetRole = input.role as UserRole;
    const pageAccess =
      input.pageAccess && input.pageAccess.length > 0
        ? input.pageAccess
        : DEFAULT_ROLE_PAGE_ACCESS[targetRole] || [];

    const user = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email,
        passwordHash,
        phone: input.phone ? input.phone.trim() : null,
        spcode,
        role: targetRole,
        pageAccess,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        spcode: true,
        pageAccess: true,
        isActive: true,
        createdAt: true,
      },
    });

    return user;
  }

  static async createAdmin(input: CreateAdminInput) {
    return this.createUser({
      ...input,
      role: 'ADMIN',
      pageAccess: input.pageAccess || DEFAULT_ROLE_PAGE_ACCESS[UserRole.ADMIN],
    });
  }

  static async createStaff(input: CreateStaffInput) {
    return this.createUser({
      ...input,
      role: 'STAFF',
      pageAccess: input.pageAccess || DEFAULT_ROLE_PAGE_ACCESS[UserRole.STAFF],
    });
  }

  static async updateUser(id: string, input: UpdateUserInput, callerUser?: TokenPayload) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw ApiError.notFound('User not found.');
    }

    if (user.role === UserRole.SUPERADMIN && callerUser?.role !== 'SUPERADMIN') {
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
        role: input.role ? (input.role as UserRole) : undefined,
        pageAccess: input.pageAccess !== undefined ? input.pageAccess : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        spcode: true,
        pageAccess: true,
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
