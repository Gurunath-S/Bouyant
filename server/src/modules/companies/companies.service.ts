import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/apiError.js';
import { GstValidationProvider } from './providers/gstValidation.provider.js';
import { CreateCompanyInput, UpdateCompanyInput } from './companies.schemas.js';
import { GST_STATE_CODES } from './utils/gstUtils.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { EmailService } from '../../services/email.service.js';
import { generateTokens } from '../../utils/jwt.js';
import { normalizePagination } from '../../utils/pagination.js';

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
    let cleanPan = input.panNumber && input.panNumber.trim() !== '' ? input.panNumber.trim().toUpperCase() : null;
    if (!cleanPan && cleanGst && cleanGst.length === 15) {
      cleanPan = cleanGst.substring(2, 12);
    }
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

    // 2. SMART CHECK: Company & User Identity Resolution according to business rules
    let existingCompany = cleanGst
      ? await prisma.company.findUnique({ where: { gstNumber: cleanGst } })
      : null;

    if (!existingCompany && cleanPan) {
      existingCompany = await prisma.company.findUnique({ where: { panNumber: cleanPan } });
    }

    if (!existingCompany && cleanMobile) {
      existingCompany = await prisma.company.findUnique({ where: { mobile: cleanMobile } });
    }

    if (!existingCompany && normalizedEmail) {
      existingCompany = await prisma.company.findUnique({ where: { email: normalizedEmail } });
    }

    // Find user by EXACT email (Primary login identifier)
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { company: true },
    });

    // Find user by phone
    const existingUserByPhone = await prisma.user.findFirst({
      where: { phone: cleanMobile },
      include: { company: true },
    });

    // Check for exact identity match (Same Email + Same Phone)
    const exactMatchingUser = (existingUserByEmail && existingUserByEmail.phone === cleanMobile)
      ? existingUserByEmail
      : null;

    // CASE 1: EXACT MATCH (Same GST + Same Email + Same Phone) or same email+phone
    // -> Update existing user and company with the freshly submitted details.
    if (exactMatchingUser) {
      let companyToUse = existingCompany || exactMatchingUser.company;

      if (companyToUse) {
        // ALWAYS update the existing company with the freshly entered company details
        companyToUse = await prisma.company.update({
          where: { id: companyToUse.id },
          data: {
            name: input.name,
            contactPerson: input.contactPerson,
            mobile: cleanMobile,
            email: normalizedEmail,
            address: input.address,
            city: input.city,
            state: input.state,
            pinCode: input.pinCode || companyToUse.pinCode,
            country: input.country || companyToUse.country,
            gstNumber: cleanGst || companyToUse.gstNumber,
            panNumber: cleanPan || companyToUse.panNumber,
            industry: input.industry || companyToUse.industry,
            website: input.website || companyToUse.website,
          },
        });
      }

      await prisma.user.update({
        where: { id: exactMatchingUser.id },
        data: {
          name: input.contactPerson,
          phone: cleanMobile,
          ...(companyToUse ? { companyId: companyToUse.id } : {}),
          ...(requestedUsername ? { username: requestedUsername } : {}),
        },
      });

      const updatedUser = await prisma.user.findUnique({
        where: { id: exactMatchingUser.id },
        include: { company: true },
      });

      const tokens = generateTokens({
        userId: exactMatchingUser.id,
        email: exactMatchingUser.email,
        role: exactMatchingUser.role,
        companyId: companyToUse?.id || exactMatchingUser.companyId || undefined,
      });

      return {
        company: companyToUse || updatedUser?.company,
        user: updatedUser || exactMatchingUser,
        tokens,
        temporaryPassword: null,
        isExistingUser: true,
      };
    }

    // CASE 4: SAME EMAIL + DIFFERENT PHONE
    // Email is a globally unique login identifier (User.email @unique).
    // If the email exists, update the company and user records with the fresh details.
    if (existingUserByEmail) {
      let companyToUse = existingCompany || existingUserByEmail.company;
      if (companyToUse) {
        companyToUse = await prisma.company.update({
          where: { id: companyToUse.id },
          data: {
            name: input.name,
            contactPerson: input.contactPerson,
            mobile: cleanMobile,
            email: normalizedEmail,
            address: input.address,
            city: input.city,
            state: input.state,
            pinCode: input.pinCode || companyToUse.pinCode,
            country: input.country || companyToUse.country,
            gstNumber: cleanGst || companyToUse.gstNumber,
            panNumber: cleanPan || companyToUse.panNumber,
            industry: input.industry || companyToUse.industry,
            website: input.website || companyToUse.website,
          },
        });
      }

      await prisma.user.update({
        where: { id: existingUserByEmail.id },
        data: {
          name: input.contactPerson,
          phone: cleanMobile,
          ...(companyToUse ? { companyId: companyToUse.id } : {}),
          ...(requestedUsername ? { username: requestedUsername } : {}),
        },
      });

      const updatedUser = await prisma.user.findUnique({
        where: { id: existingUserByEmail.id },
        include: { company: true },
      });

      const tokens = generateTokens({
        userId: existingUserByEmail.id,
        email: existingUserByEmail.email,
        role: existingUserByEmail.role,
        companyId: companyToUse?.id || existingUserByEmail.companyId || undefined,
      });

      return {
        company: companyToUse || updatedUser?.company,
        user: updatedUser || existingUserByEmail,
        tokens,
        temporaryPassword: null,
        isExistingUser: true,
      };
    }

    // 3. CASE 2: Create New Company or User safely
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
      const company = existingCompany
        ? await tx.company.update({
            where: { id: existingCompany.id },
            data: {
              name: input.name,
              contactPerson: input.contactPerson,
              mobile: cleanMobile,
              email: normalizedEmail,
              address: input.address,
              city: input.city,
              state: input.state,
              pinCode: input.pinCode || existingCompany.pinCode,
              country: input.country || existingCompany.country,
              gstNumber: cleanGst || existingCompany.gstNumber,
              panNumber: cleanPan || existingCompany.panNumber,
              industry: input.industry || existingCompany.industry,
              website: input.website || existingCompany.website,
            },
          })
        : await tx.company.create({
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
              industry: input.industry || 'General Exhibitor',
              website: input.website,
              remarks: input.remarks || 'Not Provided',
              companyCode,
              regNo,
              spcode,
            },
          });

      const targetUser = existingUserByEmail || existingUserByPhone;
      const user = targetUser
        ? await tx.user.update({
            where: { id: targetUser.id },
            data: {
              name: input.contactPerson,
              phone: cleanMobile,
              companyId: company.id,
              ...(requestedUsername ? { username: requestedUsername } : {}),
            },
          })
        : await tx.user.create({
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

    const tokens = generateTokens({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      companyId: result.company.id,
    });

    return {
      company: result.company,
      user: result.user,
      tokens,
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
      updateData.gstNumber = input.gstNumber && input.gstNumber.trim() !== '' ? input.gstNumber.trim().toUpperCase() : null;
    }
    if (input.panNumber !== undefined) {
      updateData.panNumber = input.panNumber && input.panNumber.trim() !== '' ? input.panNumber.trim().toUpperCase() : null;
    }
    if (input.tanNumber !== undefined) {
      updateData.tanNumber = input.tanNumber && input.tanNumber.trim() !== '' ? input.tanNumber.trim().toUpperCase() : null;
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
          select: { id: true, name: true, email: true, role: true, spcode: true, phone: true },
        },
        bookings: {
          orderBy: { createdAt: 'desc' },
          include: {
            exhibition: {
              select: {
                id: true,
                title: true,
                slug: true,
                city: true,
                venue: true,
                startDate: true,
                endDate: true,
                edition: true,
                eventCode: true,
                spcode: true,
                status: true,
                bannerUrl: true,
              },
            },
            stalls: {
              include: {
                stall: {
                  select: {
                    id: true,
                    stallNumber: true,
                    category: true,
                    price: true,
                    areaSqFt: true,
                  },
                },
              },
            },
            payments: {
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                paymentReference: true,
                amount: true,
                currency: true,
                status: true,
                provider: true,
                paymentMethod: true,
                transactionId: true,
                paidAt: true,
                createdAt: true,
              },
            },
            invoices: {
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                invoiceNumber: true,
                totalAmount: true,
                taxAmount: true,
                grandTotal: true,
                status: true,
                pdfUrl: true,
                issueDate: true,
                createdAt: true,
              },
            },
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
    page: any = 1,
    limit: any = 20,
    search = '',
    exhibitionId?: string,
    status?: string,
    paymentStatus?: string
  ) {
    const { page: validPage, limit: validLimit, skip } = normalizePagination(page, limit, 20, 100);
    const baseAndConditions: any[] = [];

    if (search && search.trim()) {
      const q = search.trim();
      baseAndConditions.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' as const } },
          { companyCode: { contains: q, mode: 'insensitive' as const } },
          { regNo: { contains: q, mode: 'insensitive' as const } },
          { spcode: { contains: q, mode: 'insensitive' as const } },
          { email: { contains: q, mode: 'insensitive' as const } },
          { gstNumber: { contains: q, mode: 'insensitive' as const } },
          { contactPerson: { contains: q, mode: 'insensitive' as const } },
          { industry: { contains: q, mode: 'insensitive' as const } },
        ],
      });
    }

    const hasExhibitionScope = !!(exhibitionId && exhibitionId !== 'ALL');

    if (hasExhibitionScope) {
      baseAndConditions.push({
        bookings: {
          some: {
            exhibitionId,
            status: { not: 'CANCELLED' as const },
          },
        },
      });
    }

    if (status === 'REGISTERED') {
      baseAndConditions.push({
        bookings: {
          some: {
            status: { not: 'CANCELLED' as const },
            ...(hasExhibitionScope ? { exhibitionId } : {}),
          },
        },
      });
    } else if (status === 'UNREGISTERED') {
      baseAndConditions.push({
        bookings: {
          none: {
            status: { not: 'CANCELLED' as const },
            ...(hasExhibitionScope ? { exhibitionId } : {}),
          },
        },
      });
    }

    const paidCondition = {
      bookings: {
        some: {
          status: { not: 'CANCELLED' as const },
          ...(hasExhibitionScope ? { exhibitionId } : {}),
          OR: [
            { paymentStatus: 'PAID_FULL' },
            { paymentStatus: 'PARTIALLY_PAID' },
            { paidAmount: { gt: 0 } },
            { status: 'CONFIRMED' },
          ],
        },
      },
    };

    const notPaidCondition = hasExhibitionScope
      ? {
          bookings: {
            some: {
              exhibitionId,
              status: { not: 'CANCELLED' as const },
              OR: [
                { paymentStatus: 'UNPAID' },
                { paidAmount: { equals: 0 } },
              ],
            },
          },
        }
      : {
          bookings: {
            none: {
              status: { not: 'CANCELLED' as const },
              OR: [
                { paymentStatus: 'PAID_FULL' },
                { paymentStatus: 'PARTIALLY_PAID' },
                { paidAmount: { gt: 0 } },
                { status: 'CONFIRMED' },
              ],
            },
          },
        };

    const queryAndConditions = [...baseAndConditions];
    if (paymentStatus === 'PAID') {
      queryAndConditions.push(paidCondition);
    } else if (paymentStatus === 'NOT_PAID') {
      queryAndConditions.push(notPaidCondition);
    }

    const where = queryAndConditions.length > 0 ? { AND: queryAndConditions } : {};
    const baseWhere = baseAndConditions.length > 0 ? { AND: baseAndConditions } : {};

    const [companies, total, allCount, paidCount, notPaidCount, pendingGstCount] = await Promise.all([
      prisma.company.findMany({
        where,
        skip,
        take: validLimit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          _count: { select: { bookings: true, users: true } },
          bookings: {
            where: {
              status: { not: 'CANCELLED' as const },
              ...(hasExhibitionScope ? { exhibitionId } : {}),
            },
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
      prisma.company.count({ where: baseWhere }),
      prisma.company.count({
        where: {
          AND: [...baseAndConditions, paidCondition],
        },
      }),
      prisma.company.count({
        where: {
          AND: [...baseAndConditions, notPaidCondition],
        },
      }),
      prisma.company.count({
        where: {
          AND: [...baseAndConditions, { OR: [{ gstNumber: null }, { gstNumber: '' }] }],
        },
      }),
    ]);

    return {
      companies,
      meta: {
        total,
        page: validPage,
        limit: validLimit,
        totalPages: Math.ceil(total / validLimit) || 1,
        summary: {
          totalCount: allCount,
          paidCount,
          notPaidCount,
          pendingGstCount,
        },
      },
    };
  }
}
