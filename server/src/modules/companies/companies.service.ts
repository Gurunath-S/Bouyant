import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/apiError.js';
import { GstValidationProvider } from './providers/gstValidation.provider.js';
import { CreateCompanyInput, UpdateCompanyInput } from './companies.schemas.js';
import { GST_STATE_CODES } from './utils/gstUtils.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export class CompaniesService {

  static async verifyGst(gstNumber: string, edition?: string, eventCode?: string, spcode?: string, year?: string) {
    const cleanGst = gstNumber.trim().toUpperCase();

    // 1. Check if the company is already registered in Buoyant database
    const existingCompany = await prisma.company.findUnique({
      where: {
        gstNumber: cleanGst,
      },
    });

    if (existingCompany) {
      const stateCode = cleanGst.substring(0, 2);
      return {
        gstVerified: true,
        companyExists: true,
        canCreate: false,
        existingCompany,
        gstDetails: {
          gstin: existingCompany.gstNumber,
          legalName: existingCompany.name,
          tradeName: existingCompany.name,
          status: 'Active',
          address: existingCompany.address,
          city: existingCompany.city,
          state: existingCompany.state || GST_STATE_CODES[stateCode] || 'India',
          stateCode: stateCode,
          pincode: existingCompany.pinCode,
          pan: existingCompany.panNumber,
          regNo: existingCompany.regNo,
          spcode: existingCompany.spcode || spcode || 'B001',
          blockStatus: 'Unblocked',
          taxpayerType: 'Regular',
        },
      };
    }

    // 2. Query official registry or accurate fallback provider
    const gstData = await GstValidationProvider.verify(cleanGst);

    if (
      gstData?.success !== true ||
      gstData?.data?.status !== 'Active'
    ) {
      throw ApiError.badRequest(
        'GST verification failed. Please provide a valid and active GST number.'
      );
    }

    let activeEdition = edition;
    let activeEventCode = eventCode;
    let activeSpcode = spcode;

    if (!activeEdition || !activeEventCode || !activeSpcode) {
      const expo = await prisma.exhibition.findFirst({
        where: { status: 'PUBLISHED' },
        orderBy: { createdAt: 'desc' },
      });
      if (expo) {
        if (!activeEdition) activeEdition = expo.edition || '04';
        if (!activeEventCode) activeEventCode = expo.eventCode || 'ME';
        if (!activeSpcode) activeSpcode = expo.spcode || 'B001';
      } else {
        if (!activeEdition) activeEdition = '04';
        if (!activeEventCode) activeEventCode = 'ME';
        if (!activeSpcode) activeSpcode = 'B001';
      }
    }

    const stateCode = cleanGst.substring(0, 2);
    const stateName = gstData.data.state || GST_STATE_CODES[stateCode] || 'India';
    const pan = gstData.data.pan || (cleanGst.length === 15 ? cleanGst.substring(2, 12) : '');
    const nextRegNo = await this.generateNextRegNo(activeEdition, activeEventCode, year);

    return {
      gstVerified: true,
      companyExists: false,
      canCreate: true,
      gstDetails: {
        gstin: gstData.data.gstin,
        legalName: gstData.data.legal_name,
        tradeName: gstData.data.trade_name || gstData.data.legal_name,
        status: gstData.data.status,
        address: gstData.data.address,
        city: gstData.data.city,
        state: stateName,
        stateCode: stateCode,
        pincode: gstData.data.pincode,
        pan: pan,
        regNo: nextRegNo,
        spcode: activeSpcode,
        blockStatus: gstData.data.block_status || 'Unblocked',
        taxpayerType: gstData.data.taxpayer_type || 'Regular',
      },
    };
  }

  /**
   * Generates the official Registration Number: [Edition]/[Year]/[EventCode]/[SeriesNumber]
   * e.g. 04/26/ME/01, 10/26/GG/01...
   */
  static async generateNextRegNo(edition = '04', eventCode = 'ME', year?: string): Promise<string> {
    const yr = year || String(new Date().getFullYear()).slice(-2);
    const prefix = `${edition}/${yr}/${eventCode}/`;

    const companies = await prisma.company.findMany({
      where: {
        regNo: { startsWith: prefix },
      },
      select: { regNo: true },
    });

    let maxSeries = 0;
    for (const c of companies) {
      if (c.regNo) {
        const parts = c.regNo.split('/');
        const seq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(seq) && seq > maxSeries) {
          maxSeries = seq;
        }
      }
    }

    let series = maxSeries + 1;
    let candidate = `${prefix}${String(series).padStart(2, '0')}`;
    while (await prisma.company.findUnique({ where: { regNo: candidate } })) {
      series++;
      candidate = `${prefix}${String(series).padStart(2, '0')}`;
    }
    return candidate;
  }

  static async createCompany(input: CreateCompanyInput) {
    const anyInput = input as any;
    let edition = anyInput.edition;
    let eventCode = anyInput.eventCode;
    let spcode = anyInput.spcode;

    if (!edition || !eventCode || !spcode) {
      const expo = await prisma.exhibition.findFirst({
        where: { status: 'PUBLISHED' },
        orderBy: { createdAt: 'desc' },
      });
      if (expo) {
        if (!edition) edition = expo.edition || '04';
        if (!eventCode) eventCode = expo.eventCode || 'ME';
        if (!spcode) spcode = expo.spcode || 'B001';
      } else {
        if (!edition) edition = '04';
        if (!eventCode) eventCode = 'ME';
        if (!spcode) spcode = 'B001';
      }
    }

    // step 1: check gst verification 
    const gstResult = await this.verifyGst(input.gstNumber, edition, eventCode, spcode, anyInput.year);

    if (!gstResult.canCreate) {
      throw ApiError.conflict(
        'A company with this GST number is already registered.'
      );
    }

    let effectiveTan = input.tanNumber && input.tanNumber.trim() !== ''
      ? input.tanNumber.trim().toUpperCase()
      : null;

    if (!effectiveTan) {
      let candidateTan = `TAN${input.panNumber ? input.panNumber.substring(0, 4) : 'TEMP'}${Math.floor(1000 + Math.random() * 9000)}Z`;
      while (await prisma.company.findUnique({ where: { tanNumber: candidateTan } })) {
        candidateTan = `TAN${input.panNumber ? input.panNumber.substring(0, 4) : 'TEMP'}${Math.floor(1000 + Math.random() * 9000)}Z`;
      }
      effectiveTan = candidateTan;
    }

    // Check whether company information already exists
    const existingCompany = await prisma.company.findFirst({
      where: {
        OR: [
          { email: input.email },
          { mobile: input.mobile },
          { panNumber: input.panNumber },
          { tanNumber: effectiveTan },
        ],
      },
    });

    if (existingCompany) {
      if (existingCompany.email === input.email) {
        throw ApiError.conflict('A company with this email already exists.');
      }
      if (existingCompany.mobile === input.mobile) {
        throw ApiError.conflict('A company with this mobile number already exists.');
      }
      if (existingCompany.panNumber === input.panNumber) {
        throw ApiError.conflict('A company with this PAN number already exists.');
      }
      if (existingCompany.tanNumber === effectiveTan) {
        throw ApiError.conflict('A company with this TAN number already exists.');
      }
    }

    let regNo = anyInput.regNo;
    if (!regNo || await prisma.company.findUnique({ where: { regNo } })) {
      regNo = await this.generateNextRegNo(edition, eventCode, anyInput.year);
    }
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser && existingUser.companyId) {
      throw ApiError.conflict('An account with this email is already registered and linked to another company.');
    }

    const count = await prisma.company.count();
    const companyCode = `CMP-2026-${String(count + 1).padStart(3, '0')}`;
    const temporaryPassword = crypto.randomBytes(8).toString('base64url');
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: input.name,
          contactPerson: input.contactPerson,
          mobile: input.mobile,
          email: input.email,
          address: input.address,
          city: input.city,
          state: input.state,
          pinCode: input.pinCode || '400051',
          country: input.country || 'India',
          gstNumber: input.gstNumber,
          panNumber: input.panNumber,
          tanNumber: effectiveTan,
          industry: input.industry,
          website: input.website,
          remarks: input.remarks || 'Not Provided',
          companyCode,
          regNo,
          spcode,
        },
      });

      let user = existingUser;
      if (existingUser) {
        user = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            name: input.contactPerson,
            phone: input.mobile,
            companyId: company.id,
          },
        });
      } else {
        user = await tx.user.create({
          data: {
            email: input.email.toLowerCase(),
            passwordHash,
            name: input.contactPerson,
            phone: input.mobile,
            role: 'CLIENT',
            companyId: company.id,
          },
        });
      }

      return {
        company,
        user,
        temporaryPassword: existingUser ? null : temporaryPassword,
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
          select: { id: true, name: true, email: true, role: true, spcode: true },
        },
        bookings: {
          include: {
            exhibition: { select: { title: true, startDate: true, edition: true, eventCode: true, spcode: true } },
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
            { regNo: { contains: search, mode: 'insensitive' as const } },
            { spcode: { contains: search, mode: 'insensitive' as const } },
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
