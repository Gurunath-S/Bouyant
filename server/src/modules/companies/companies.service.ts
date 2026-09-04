import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/apiError.js';
import { GstValidationProvider } from './providers/gstValidation.provider.js';
import { CreateCompanyInput, UpdateCompanyInput } from './companies.schemas.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export class CompaniesService {

   static async verifyGst(gstNumber: string) {

    const gstData = await GstValidationProvider.verify(gstNumber);

    return gstData;
  }

  static async createCompany(input: CreateCompanyInput) {

   // Check whether company information already exists
  const existingCompany = await prisma.company.findFirst({
    where: {
      OR: [
        { email: input.email },
        { mobile: input.mobile },
        { gstNumber: input.gstNumber },
        { panNumber: input.panNumber },
        { tanNumber: input.tanNumber }
      ],
    },
  });

  if (existingCompany) {
    if (existingCompany.email === input.email) {
      throw ApiError.conflict(
        'A company with this email already exists.'
      );
    }

    if (existingCompany.mobile === input.mobile) {
      throw ApiError.conflict(
        'A company with this mobile number already exists.'
      );
    }

    if (existingCompany.gstNumber === input.gstNumber) {
      throw ApiError.conflict(
        'A company with this GST number already exists.'
      );
    }

    if (existingCompany.panNumber === input.panNumber) {
      throw ApiError.conflict(
        'A company with this PAN number already exists.'
      );
    }
     if (existingCompany.tanNumber === input.tanNumber) {
      throw ApiError.conflict(
        'A company with this TAN number already exists.'
      );
    }

  }
     const count = await prisma.company.count();
     const companyCode = `CMP-2026-${String(count + 1).padStart(3, '0')}`;
     const temporaryPassword = crypto.randomBytes(8).toString('base64url');
     const passwordHash = await bcrypt.hash(temporaryPassword,12);
    
     const result = await prisma.$transaction(async (tx) => {

     const company = await tx.company.create({
      data: {
        ...input,
        companyCode,
      },
    });

    const user = await tx.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        name: input.contactPerson,
        phone: input.mobile,
        role: 'CLIENT',
        companyId: company.id,
      },
    });

    return {
      company,
      user
    };
  });
   

    return result;

  }

  static async updateCompany(companyId: string, input: UpdateCompanyInput) {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw ApiError.notFound('Company not found.');
    }

    return await prisma.company.update({
      where: { id: companyId },
      data: input,
    });
  }

  static async getCompanyById(companyId: string) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true },
        },
        bookings: {
          include: {
            exhibition: { select: { title: true, startDate: true } },
            stall: { select: { stallNumber: true, category: true } },
          },
        },
      },
    });

    if (!company) {
      throw ApiError.notFound('Company profile not found.');
    }

    return company;
  }

  static async listCompanies(page = 1, limit = 20, search = '') {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { companyCode: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { gstNumber: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { bookings: true, users: true } },
        },
      }),
      prisma.company.count({ where }),
    ]);

    return {
      companies,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
