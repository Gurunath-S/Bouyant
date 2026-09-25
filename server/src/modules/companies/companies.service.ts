import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/apiError.js';
import { GstValidationProvider } from './providers/gstValidation.provider.js';
import { CreateCompanyInput, UpdateCompanyInput } from './companies.schemas.js';
import { GST_STATE_CODES } from './utils/gstUtils.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { EmailService } from '../../services/email.service.js';

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

  /**
   * Generates a unique username candidate if none provided
   */
  static async generateUniqueUsername(seed: string): Promise<string> {
    const clean = seed.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14) || 'user';
    let candidate = `${clean}_${Math.floor(100 + Math.random() * 900)}`;
    let attempts = 0;
    while (await prisma.user.findUnique({ where: { username: candidate } })) {
      attempts++;
      candidate = `${clean}_${Math.floor(1000 + Math.random() * 9000)}`;
      if (attempts > 10) {
        candidate = `${clean}_${Date.now().toString().slice(-4)}`;
        break;
      }
    }
    return candidate;
  }

  static async createCompany(input: CreateCompanyInput, userSpcode?: string) {
    const anyInput = input as any;
    let edition = anyInput.edition;
    let eventCode = anyInput.eventCode;
    let spcode = anyInput.spcode || userSpcode;

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

    const cleanGst = input.gstNumber && input.gstNumber.trim() !== '' ? input.gstNumber.trim().toUpperCase() : null;
    const cleanPan = input.panNumber && input.panNumber.trim() !== '' ? input.panNumber.trim().toUpperCase() : null;
    const normalizedEmail = input.email.trim().toLowerCase();
    const cleanMobile = input.mobile.trim();

    // 1. Resolve or Generate Unique Username
    let requestedUsername = anyInput.username ? anyInput.username.trim().toLowerCase() : null;
    if (requestedUsername) {
      const existingUserWithUsername = await prisma.user.findUnique({
        where: { username: requestedUsername },
      });
      if (existingUserWithUsername && existingUserWithUsername.email !== normalizedEmail) {
        throw ApiError.conflict(`Username "${requestedUsername}" is already taken. Please choose another username.`);
      }
    } else {
      requestedUsername = await this.generateUniqueUsername(input.contactPerson || input.name);
    }

    // 2. SMART CHECK: Check if Company already exists in database
    let existingCompany = cleanGst
      ? await prisma.company.findUnique({ where: { gstNumber: cleanGst } })
      : null;

    if (!existingCompany && cleanPan) {
      existingCompany = await prisma.company.findUnique({ where: { panNumber: cleanPan } });
    }

    if (existingCompany) {
      // Check if user with same email or phone exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: normalizedEmail },
            { phone: cleanMobile },
          ],
        },
      });

      // CASE 1: EXACT MATCH (Same GST and same Email or Phone) -> Reuse existing data, no duplication
      if (existingUser && existingUser.companyId === existingCompany.id) {
        if (requestedUsername && !existingUser.username) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { username: requestedUsername },
          });
        }

        return {
          company: existingCompany,
          user: existingUser,
          temporaryPassword: null,
        };
      }

      // CASE 2: Same Company (GST), but new Email or Phone -> Create new User under this Company
      if (existingUser && existingUser.companyId !== existingCompany.id) {
        throw ApiError.conflict('An account with this email is already registered with another corporate entity.');
      }

      const temporaryPassword = crypto.randomBytes(8).toString('base64url');
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);

      const newUser = await prisma.user.create({
        data: {
          email: normalizedEmail,
          username: requestedUsername,
          passwordHash,
          name: input.contactPerson,
          phone: cleanMobile,
          role: 'CLIENT',
          companyId: existingCompany.id,
        },
      });

      // Notify Admins about new representative under existing company
      const admins = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
        select: { id: true },
      });

      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            title: 'New User Added to Company',
            message: `New user ${input.contactPerson} (${normalizedEmail}) registered under company "${existingCompany!.name}".`,
            type: 'INFO',
          })),
        });
      }

      return {
        company: existingCompany,
        user: newUser,
        temporaryPassword,
      };
    }

    // 3. CASE 3: Completely New Company & User Registration
    let effectiveTan = input.tanNumber && input.tanNumber.trim() !== ''
      ? input.tanNumber.trim().toUpperCase()
      : null;

    if (!effectiveTan) {
      let candidateTan = `TAN${cleanPan ? cleanPan.substring(0, 4) : 'TEMP'}${Math.floor(1000 + Math.random() * 9000)}Z`;
      while (await prisma.company.findUnique({ where: { tanNumber: candidateTan } })) {
        candidateTan = `TAN${cleanPan ? cleanPan.substring(0, 4) : 'TEMP'}${Math.floor(1000 + Math.random() * 9000)}Z`;
      }
      effectiveTan = candidateTan;
    }

    let regNo = anyInput.regNo;
    if (!regNo || await prisma.company.findUnique({ where: { regNo } })) {
      regNo = await this.generateNextRegNo(edition, eventCode, anyInput.year);
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
          mobile: cleanMobile,
          email: normalizedEmail,
          address: input.address,
          city: input.city,
          state: input.state,
          pinCode: input.pinCode || '400051',
          country: input.country || 'India',
          gstNumber: cleanGst,
          panNumber: cleanPan,
          tanNumber: effectiveTan,
          industry: input.industry,
          website: input.website,
          remarks: input.remarks || 'Not Provided',
          companyCode,
          regNo,
          spcode,
        },
      });

      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          username: requestedUsername,
          passwordHash,
          name: input.contactPerson,
          phone: cleanMobile,
          role: 'CLIENT',
          companyId: company.id,
        },
      });

      // Find associated exhibition for event-specific admin notification routing
      const targetExpo = await tx.exhibition.findFirst({
        where: {
          OR: [
            { edition, eventCode },
            { status: 'PUBLISHED' },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      const eventEmails = targetExpo?.notificationEmails
        ? targetExpo.notificationEmails.split(',').map((e) => e.trim().toLowerCase())
        : [];

      // Notify System Administrators or Event Designated Admins
      const targetAdmins = await tx.user.findMany({
        where: {
          OR: [
            ...(eventEmails.length > 0 ? [{ email: { in: eventEmails, mode: 'insensitive' as const } }] : []),
            ...(targetExpo?.createdByUserId ? [{ id: targetExpo.createdByUserId }] : []),
            { role: { in: ['ADMIN', 'SUPERADMIN'] } },
          ],
        },
        select: { id: true },
      });

      const uniqueAdminIds = Array.from(new Set(targetAdmins.map((a) => a.id)));

      if (uniqueAdminIds.length > 0) {
        await tx.notification.createMany({
          data: uniqueAdminIds.map((adminId) => ({
            userId: adminId,
            title: 'New Corporate Registration',
            message: `Company "${company.name}" (${input.contactPerson}, ${normalizedEmail}) registered for "${targetExpo?.title || 'Exhibition'}".`,
            type: 'INFO',
          })),
        });
      }

      return {
        company,
        user,
        temporaryPassword,
        targetExpo,
      };
    });

    // Dispatch background email alert to designated Event Admins / customRecipients
    EmailService.sendAdminAlert({
      type: 'COMPANY_REGISTERED',
      companyName: result.company.name,
      contactPerson: input.contactPerson,
      email: normalizedEmail,
      mobile: cleanMobile,
      exhibitionTitle: result.targetExpo?.title,
      customRecipients: result.targetExpo?.notificationEmails,
    }).catch((e) => console.error('Admin registration email alert error:', e));

    return {
      company: result.company,
      user: result.user,
      temporaryPassword: result.temporaryPassword,
    };
  }

  static async updateCompany(companyId: string, input: UpdateCompanyInput) {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw ApiError.notFound('Company not found.');
    }

    const updateData: any = { ...input };
    if (input.gstNumber !== undefined) {
      updateData.gstNumber = input.gstNumber && input.gstNumber.trim() !== '' ? input.gstNumber : null;
    }
    if (input.panNumber !== undefined) {
      updateData.panNumber = input.panNumber && input.panNumber.trim() !== '' ? input.panNumber : null;
    }
    if (input.tanNumber !== undefined) {
      updateData.tanNumber = input.tanNumber && input.tanNumber.trim() !== '' ? input.tanNumber : null;
    }

    return await prisma.company.update({
      where: { id: companyId },
      data: updateData,
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
            stalls: { include: { stall: { select: { stallNumber: true, category: true } } } },
          },
        },
      },
    });

    if (!company) {
      throw ApiError.notFound('Company profile not found.');
    }

    return company;
  }

  static async listCompanies(
    page = 1,
    limit = 20,
    search = '',
    exhibitionId?: string,
    status?: string
  ) {
    const skip = (page - 1) * limit;
    const andConditions: any[] = [];

    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { companyCode: { contains: search, mode: 'insensitive' as const } },
          { regNo: { contains: search, mode: 'insensitive' as const } },
          { spcode: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { gstNumber: { contains: search, mode: 'insensitive' as const } },
          { contactPerson: { contains: search, mode: 'insensitive' as const } },
          { industry: { contains: search, mode: 'insensitive' as const } },
        ],
      });
    }

    if (exhibitionId) {
      andConditions.push({
        bookings: {
          some: {
            exhibitionId,
            status: { not: 'CANCELLED' as const },
          },
        },
      });
    }

    if (status === 'REGISTERED') {
      andConditions.push({
        bookings: {
          some: {
            status: { not: 'CANCELLED' as const },
          },
        },
      });
    } else if (status === 'UNREGISTERED') {
      andConditions.push({
        bookings: {
          none: {
            status: { not: 'CANCELLED' as const },
          },
        },
      });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { bookings: true, users: true } },
          bookings: {
            where: { status: { not: 'CANCELLED' as const } },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              bookingReference: true,
              status: true,
              paymentStatus: true,
              grandTotal: true,
              paidAmount: true,
              balanceAmount: true,
              createdAt: true,
              exhibition: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  edition: true,
                  eventCode: true,
                  city: true,
                  venue: true,
                  startDate: true,
                  endDate: true,
                },
              },
              stalls: {
                select: {
                  stall: {
                    select: {
                      id: true,
                      stallNumber: true,
                      category: true,
                      price: true,
                    },
                  },
                },
              },
            },
          },
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
