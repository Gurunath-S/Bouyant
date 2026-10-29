import { prisma } from '../../config/db.js';
import type { Company } from '@prisma/client';
import { ApiError } from '../../utils/apiError.js';
import { GstValidationProvider } from './providers/gstValidation.provider.js';
import { CreateCompanyInput, UpdateCompanyInput } from './companies.schemas.js';
import { GST_STATE_CODES } from './utils/gstUtils.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';
import { EmailService, type EmailDeliveryResult } from '../../services/email.service.js';
import { generateTokens, TokenPayload } from '../../utils/jwt.js';
import { normalizePagination } from '../../utils/pagination.js';

function normalizeCountry(country?: string | null): string {
  if (!country) return 'India';
  const trimmed = country.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'in' || lower === 'ind' || lower === 'india') return 'India';
  return trimmed;
}

export class CompaniesService {

  static async verifyGst(gstNumber: string, edition?: string, eventCode?: string, spcode?: string, year?: string) {
    const cleanGst = gstNumber.trim().toUpperCase();

    // 1. Check if the company is already registered in Buoyant database
    const existingCompany = await prisma.company.findUnique({
      where: {
        gstNumber: cleanGst,
      },
      include: {
        users: {
          where: { role: 'CLIENT' },
          select: { id: true, email: true, username: true, name: true, phone: true, role: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (existingCompany) {
      const stateCode = cleanGst.substring(0, 2);
      const primaryUser =
        existingCompany.users?.find((u) => u.email.toLowerCase() === existingCompany.email.toLowerCase()) ||
        existingCompany.users?.[0];
      const existingUsername = primaryUser?.username || null;

      return {
        gstVerified: true,
        companyExists: true,
        canCreate: false,
        existingCompany: {
          ...existingCompany,
          username: existingUsername,
        },
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
          username: existingUsername,
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
  /**
   * Generates the official Registration Number: [Edition]/[Year]/[EventCode]/[SeriesNumber]
   * e.g. 04/26/ME/01, 10/26/GG/01...
   */
  static async generateNextRegNo(edition = '04', eventCode = 'ME', year?: string, tx?: any): Promise<string> {
    const db = tx || prisma;
    const yr = year || String(new Date().getFullYear()).slice(-2);
    const prefix = `${edition}/${yr}/${eventCode}/`;

    const companies = await db.company.findMany({
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
    while (await db.company.findUnique({ where: { regNo: candidate } })) {
      series++;
      candidate = `${prefix}${String(series).padStart(2, '0')}`;
    }
    return candidate;
  }

  /**
   * Generates the official sequential Company Code: CMP-[Year]-[Sequence]
   * e.g., CMP-2026-001, CMP-2026-002...
   * Uses max sequence detection from the database and handles concurrency safely.
   */
  static async generateNextCompanyCode(year?: string | number, tx?: any): Promise<string> {
    const db = tx || prisma;
    const currentYear = year ? String(year) : String(new Date().getFullYear());
    const prefix = `CMP-${currentYear}-`;

    // 1. Try atomic PostgreSQL sequence for zero-collision concurrent code allocation
    try {
      const seqResult: any = await db.$queryRawUnsafe(`SELECT nextval('company_code_seq') as num;`);
      if (seqResult && seqResult.length > 0 && seqResult[0]?.num) {
        let seq = Number(seqResult[0].num);
        let candidate = `${prefix}${String(seq).padStart(3, '0')}`;
        // In the rare event of a pre-existing manual entry at this sequence number, increment safely
        while (await db.company.findUnique({ where: { companyCode: candidate } })) {
          const nextValResult: any = await db.$queryRawUnsafe(`SELECT nextval('company_code_seq') as num;`);
          if (nextValResult?.[0]?.num) {
            seq = Number(nextValResult[0].num);
            candidate = `${prefix}${String(seq).padStart(3, '0')}`;
          } else {
            seq++;
            candidate = `${prefix}${String(seq).padStart(3, '0')}`;
          }
        }
        return candidate;
      }
    } catch (_seqErr) {
      // Sequence does not exist yet: create and initialize it synced with current max sequence
      try {
        const companies = await prisma.company.findMany({
          where: { companyCode: { startsWith: prefix } },
          select: { companyCode: true },
        });
        let max = 0;
        for (const c of companies) {
          if (c.companyCode) {
            const parts = c.companyCode.split('-');
            const s = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(s) && s > max) max = s;
          }
        }
        await prisma.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS company_code_seq START WITH ${Math.max(max + 1, 1)};`);
        await prisma.$executeRawUnsafe(`SELECT setval('company_code_seq', ${Math.max(max, 1)});`);
        const retryResult: any = await db.$queryRawUnsafe(`SELECT nextval('company_code_seq') as num;`);
        if (retryResult?.[0]?.num) {
          const seq = Number(retryResult[0].num);
          return `${prefix}${String(seq).padStart(3, '0')}`;
        }
      } catch (_initErr) {
        // Fall through to database scan fallback
      }
    }

    // 2. Fallback: Numerical scan from existing company records
    const companies = await db.company.findMany({
      where: {
        companyCode: { startsWith: prefix },
      },
      select: { companyCode: true },
    });

    let maxSeq = 0;
    for (const c of companies) {
      if (c.companyCode) {
        const parts = c.companyCode.split('-');
        const seq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }

    let nextSeq = maxSeq + 1;
    let candidate = `${prefix}${String(nextSeq).padStart(3, '0')}`;
    while (await db.company.findUnique({ where: { companyCode: candidate } })) {
      nextSeq++;
      candidate = `${prefix}${String(nextSeq).padStart(3, '0')}`;
    }
    return candidate;
  }

  /**
   * Generates a clean, readable, unique username derived from the person's name or submitted seed.
   * Preferred conventions:
   * 1. firstname.lastname (e.g., arun.kumar)
   * 2. firstnamelastname (e.g., arunkumar)
   * 3. firstname.lastname2, firstname.lastname3 ... (e.g., arun.kumar2)
   */
  static async generateUniqueUsername(seed: string, tx?: any): Promise<string> {
    const db = tx || prisma;
    const normalized = (seed || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    // Extract alphanumeric word tokens
    const tokens = normalized
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    // Filter out common honorific titles if there are 2+ tokens remaining
    const filteredTokens =
      tokens.length > 2 && ['dr', 'mr', 'ms', 'mrs', 'prof'].includes(tokens[0])
        ? tokens.slice(1)
        : tokens;

    let baseDot: string;
    let baseJoined: string;

    if (filteredTokens.length >= 2) {
      const first = filteredTokens[0].slice(0, 14);
      const last = filteredTokens[filteredTokens.length - 1].slice(0, 14);
      baseDot = `${first}.${last}`.slice(0, 25);
      baseJoined = `${first}${last}`.slice(0, 25);
    } else if (filteredTokens.length === 1) {
      const single = filteredTokens[0].slice(0, 25);
      baseDot = single.length >= 3 ? single : `${single}.user`;
      baseJoined = baseDot;
    } else {
      baseDot = 'exhibitor';
      baseJoined = 'exhibitor';
    }

    // Candidate 1: firstname.lastname
    const exists1 = await db.user.findUnique({ where: { username: baseDot } });
    if (!exists1) return baseDot;

    // Candidate 2: firstnamelastname (if different)
    if (baseJoined !== baseDot) {
      const exists2 = await db.user.findUnique({ where: { username: baseJoined } });
      if (!exists2) return baseJoined;
    }

    // Candidate 3..50: firstname.lastname2, firstname.lastname3, etc.
    for (let counter = 2; counter <= 50; counter++) {
      const candidate = `${baseDot}${counter}`.slice(0, 30);
      const exists = await db.user.findUnique({ where: { username: candidate } });
      if (!exists) return candidate;
    }

    // Bounded fallback with timestamp slice
    return `${baseDot.slice(0, 20)}.${Date.now().toString().slice(-4)}`;
  }

  /**
   * Generates a cryptographically secure random initial password.
   * Guarantees at least 1 uppercase, 1 lowercase, 1 number, and 1 symbol,
   * while excluding ambiguous visual characters (0, O, 1, l, I).
   */
  static generateSecureInitialPassword(length = 12): string {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // excludes I, O
    const lowercase = 'abcdefghijkmnopqrstuvwxyz'; // excludes l
    const numbers = '23456789'; // excludes 0, 1
    const symbols = '!@#$%&*';
    const all = uppercase + lowercase + numbers + symbols;

    const chars = [
      uppercase[crypto.randomInt(0, uppercase.length)],
      lowercase[crypto.randomInt(0, lowercase.length)],
      numbers[crypto.randomInt(0, numbers.length)],
      symbols[crypto.randomInt(0, symbols.length)],
    ];

    for (let i = chars.length; i < length; i++) {
      chars.push(all[crypto.randomInt(0, all.length)]);
    }

    // Cryptographic Fisher-Yates shuffle
    for (let i = chars.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
  }

  static async createCompany(
    input: CreateCompanyInput,
    options?: { actingUser?: TokenPayload; userSpcode?: string } | string
  ) {
    const actingUser = typeof options === 'object' && options ? options.actingUser : undefined;
    const userSpcode = typeof options === 'object' && options ? options.userSpcode : (typeof options === 'string' ? options : undefined);

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
    const cleanPhoneDigits = cleanMobile.replace(/\D/g, '').slice(-10);

    // =========================================================================
    // NON-DESTRUCTIVE COMPANY IDENTITY MATCHING (Phase 2.2):
    //
    // 1. Legal Company Reuse vs. Registration/Contact Matching:
    //    - If a valid GSTIN matches an existing company:
    //      We reuse that legal company record to preserve the unique GSTIN constraint.
    //      We NEVER overwrite an existing company's master record (legal name, GSTIN,
    //      PAN, registered address, or master contact details).
    //      If the submitted contact phone/email differs, it represents the booking contact
    //      person and must NOT overwrite the company master profile.
    //    - If GSTIN differs:
    //      We NEVER reuse an existing company based solely on matching PAN, phone, or email.
    //      Multi-state branches share PAN but have distinct GSTINs and are separate entities.
    //    - For registrations without GSTIN (unregistered exhibitors):
    //      We only match an existing company if:
    //        a) existingCompany.gstNumber is NULL (never merge with a GST-registered company)
    //        b) Name matches exactly (case-insensitive)
    //        c) Email matches exactly
    //        d) Mobile matches exactly (or matching 10-digit phone)
    //      If any field differs or data is ambiguous, we create a new company record.
    // =========================================================================
    let existingCompany: Company | null = null;

    const isExplicitEdit = Boolean(anyInput.id || anyInput.companyId);
    if (isExplicitEdit) {
      existingCompany = await prisma.company.findUnique({
        where: { id: anyInput.id || anyInput.companyId },
      });
    }

    if (!existingCompany) {
      if (cleanGst) {
        existingCompany = await prisma.company.findUnique({ where: { gstNumber: cleanGst } });
      } else {
        const potentialMatches = await prisma.company.findMany({
          where: {
            gstNumber: null,
            name: { equals: input.name.trim(), mode: 'insensitive' },
            email: normalizedEmail,
          },
        });

        const exactMatch = potentialMatches.find(
          (c) => c.mobile === cleanMobile || (cleanPhoneDigits && c.mobile?.replace(/\D/g, '').slice(-10) === cleanPhoneDigits)
        );

        if (exactMatch) {
          existingCompany = exactMatch;
        }
      }
    }

    // Privileged Account Collision Check: SuperAdmin, Admin, and Staff emails are strictly unique
    const privilegedUser = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        role: { in: ['SUPERADMIN', 'ADMIN', 'STAFF'] },
      },
    });

    if (privilegedUser && (!actingUser || actingUser.userId !== privilegedUser.id)) {
      throw ApiError.conflict(
        'An administrative or staff account with this email address already exists. Please log in with your administrative credentials.',
        [{ code: 'ACCOUNT_EXISTS', email: normalizedEmail }],
        'ACCOUNT_EXISTS'
      );
    }

    // Authenticated user context
    let authenticatedUser: any = null;
    if (actingUser?.userId) {
      authenticatedUser = await prisma.user.findUnique({
        where: { id: actingUser.userId },
        include: { company: true },
      });
    }
    const isActingUser = Boolean(authenticatedUser);

    // Identity Resolution for Unauthenticated (Guest) or Authenticated Exhibitor:
    let recognizedExistingUser: any = null;
    let isSameExhibitorIdentity = false;

    if (!isActingUser) {
      if (existingCompany) {
        // Under the same company (matched via GSTIN or strict no-GSTIN fallback):
        // Check if an existing exhibitor has BOTH matching normalized email AND matching phone
        const exactMatchUser = await prisma.user.findFirst({
          where: {
            companyId: existingCompany.id,
            role: 'CLIENT',
            email: normalizedEmail,
            phone: { contains: cleanPhoneDigits },
          },
          include: { company: true },
        });

        if (exactMatchUser) {
          // Exact same exhibitor identity!
          // "Same GSTIN + same normalized email + same normalized phone: recognize the existing exhibitor account. Show the existing username if appropriate, but do not create a duplicate account for the same identity. Do not block the guest booking."
          // "An unauthenticated user must be allowed to complete the booking form as a guest. Never force the user to log in simply because an existing exhibitor account is detected."
          recognizedExistingUser = exactMatchUser;
          isSameExhibitorIdentity = true;
        }
      } else {
        // No existing company matched (Brand new company registration).
        // Check if normalized email is already used by an existing exhibitor in another company.
        // "When the GSTIN differs: Treat it as a different company and resolve identity independently. Do not allow an existing exhibitor email belonging to another company to be silently reused to take over or modify that account."
        const crossCompanyUser = await prisma.user.findFirst({
          where: { email: normalizedEmail },
          include: { company: true },
        });

        if (crossCompanyUser) {
          throw ApiError.conflict(
            'An account with this email address already exists for another registered company. Please log in with your existing account or contact support.',
            [{ code: 'ACCOUNT_EXISTS', email: normalizedEmail }],
            'ACCOUNT_EXISTS'
          );
        }
      }
    }

    // Compliance Data: Never fabricate synthetic TAN. Respect optional TAN as provided.
    const effectiveTan = input.tanNumber && input.tanNumber.trim() !== ''
      ? input.tanNumber.trim().toUpperCase()
      : null;

    // Frictionless Guest Booking: If exact existing account identity is recognized, do not force login or create duplicate.
    if (isSameExhibitorIdentity && existingCompany) {
      const updateData: any = {};
      if (input.tanNumber !== undefined && effectiveTan !== existingCompany.tanNumber) {
        updateData.tanNumber = effectiveTan;
      }
      if (isExplicitEdit) {
        if (input.address && input.address !== existingCompany.address) {
          updateData.address = input.address;
        }
        if (input.city && input.city !== existingCompany.city) {
          updateData.city = input.city;
        }
        if (input.state && input.state !== existingCompany.state) {
          updateData.state = input.state;
        }
        if (input.pinCode && input.pinCode !== existingCompany.pinCode) {
          updateData.pinCode = input.pinCode;
        }
        if (input.website !== undefined && input.website !== existingCompany.website) {
          updateData.website = input.website;
        }
      }
      if (Object.keys(updateData).length > 0) {
        existingCompany = await prisma.company.update({
          where: { id: existingCompany.id },
          data: updateData,
        });
      }

      return {
        company: existingCompany,
        user: null,
        tokens: null,
        temporaryPassword: null,
        isExistingUser: false,
        isGuestBooking: true,
        recognizedAccount: {
          username: recognizedExistingUser?.username || null,
          name: recognizedExistingUser?.name || null,
        },
        emailDelivery: { status: 'SKIPPED', error: 'NOT_APPLICABLE' },
      };
    }

    // PRODUCTION SMTP CHECK:
    // In production, missing SMTP configuration must not silently produce a successful registration
    // when initial credentials cannot be delivered.
    const isProduction = env.NODE_ENV === 'production' || process.env.NODE_ENV === 'production';
    if (isProduction && !isActingUser && !EmailService.isConfigured()) {
      throw ApiError.serviceUnavailable(
        'Registration unavailable: Outbound email credential delivery is not configured in production environment.'
      );
    }

    // Resolve or Generate Unique Username safely
    let requestedUsername = anyInput.username ? anyInput.username.trim().toLowerCase() : null;
    if (authenticatedUser?.username) {
      requestedUsername = authenticatedUser.username;
    } else if (requestedUsername) {
      const existingUserWithUsername = await prisma.user.findUnique({
        where: { username: requestedUsername },
      });
      if (existingUserWithUsername) {
        const isSameUser = isActingUser && existingUserWithUsername.id === actingUser?.userId;
        if (!isSameUser) {
          requestedUsername = await CompaniesService.generateUniqueUsername(requestedUsername);
        }
      }
    } else {
      requestedUsername = await CompaniesService.generateUniqueUsername(input.contactPerson || input.name);
    }

    // Retry loop for collision-safe sequential codes and concurrent registrations
    const maxRetries = 10;
    let attempt = 0;
    let lastError: any = null;

    while (attempt < maxRetries) {
      attempt++;
      try {
        const result = await prisma.$transaction(async (tx) => {
          let company = existingCompany;

          // If no existing company matched, create a new company record non-destructively
          if (!company) {
            const nextCompanyCode = await CompaniesService.generateNextCompanyCode(anyInput.year, tx);
            let regNo = anyInput.regNo;
            if (!regNo || (await tx.company.findUnique({ where: { regNo } }))) {
              regNo = await CompaniesService.generateNextRegNo(edition, eventCode, anyInput.year, tx);
            }

            company = await tx.company.create({
              data: {
                name: input.name.trim(),
                contactPerson: input.contactPerson.trim(),
                mobile: cleanMobile,
                email: normalizedEmail,
                address: input.address,
                city: input.city,
                state: input.state,
                pinCode: input.pinCode || '400051',
                country: normalizeCountry(input.country || 'India'),
                gstNumber: cleanGst,
                panNumber: cleanPan,
                tanNumber: effectiveTan,
                industry: input.industry?.trim() || anyInput.category?.trim() || 'General Exhibitor',
                website: input.website,
                remarks: input.remarks || 'Not Provided',
                companyCode: nextCompanyCode,
                regNo,
                spcode,
              },
            });
          } else {
            // Update existing company fields (including TAN number) if modified
            const updateData: any = {};
            if (input.tanNumber !== undefined && effectiveTan !== company.tanNumber) {
              updateData.tanNumber = effectiveTan;
            }
            if (isExplicitEdit) {
              if (input.address && input.address !== company.address) {
                updateData.address = input.address;
              }
              if (input.city && input.city !== company.city) {
                updateData.city = input.city;
              }
              if (input.state && input.state !== company.state) {
                updateData.state = input.state;
              }
              if (input.pinCode && input.pinCode !== company.pinCode) {
                updateData.pinCode = input.pinCode;
              }
              if (input.website !== undefined && input.website !== company.website) {
                updateData.website = input.website;
              }
            }
            if (Object.keys(updateData).length > 0) {
              company = await tx.company.update({
                where: { id: company.id },
                data: updateData,
              });
            }
          }

          // User handling:
          let user = authenticatedUser;
          let temporaryPassword: string | null = null;

          if (user) {
            // Authenticated acting user:
            // "Authenticated users must not be silently reassigned to another company."
            // "Existing user identity and company association remain unchanged."
            // Only associate if the acting user is an exhibitor (CLIENT) and currently has no company assigned:
            // Superadmins, admins, and operations staff are internal platform managers and must NEVER be bound to a client company.
            if (!user.companyId && user.role === 'CLIENT') {
              user = await tx.user.update({
                where: { id: user.id },
                data: { companyId: company.id },
                include: { company: true },
              });
            }
          } else {
            // New user registration
            temporaryPassword = CompaniesService.generateSecureInitialPassword(12);
            const passwordHash = await bcrypt.hash(temporaryPassword, 12);

            user = await tx.user.create({
              data: {
                email: normalizedEmail,
                username: requestedUsername,
                passwordHash,
                name: input.contactPerson.trim(),
                phone: cleanMobile,
                role: 'CLIENT',
                companyId: company.id,
              },
              include: { company: true },
            });
          }

          // Exhibition and Admin notifications
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
            company: {
              ...company,
              username: user?.username || requestedUsername,
            },
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

        // Dispatch initial account credentials email to the newly registered exhibitor
        let emailDelivery: EmailDeliveryResult = { status: 'SKIPPED', error: 'NOT_APPLICABLE' };
        if (result.temporaryPassword && result.user?.email) {
          try {
            emailDelivery = await EmailService.sendAccountCredentialsEmail({
              toEmail: result.user.email,
              toName: input.contactPerson.trim(),
              companyName: result.company.name,
              username: result.user.username || result.user.email,
              temporaryPassword: result.temporaryPassword,
            });
          } catch (e: any) {
            console.error('Exhibitor credentials email dispatch error:', e?.message || e);
            emailDelivery = {
              status: 'FAILED',
              attempts: 3,
              error: e?.message || 'SMTP_DELIVERY_FAILED',
            };
          }
        }

        const tokens = result.user
          ? generateTokens({
              userId: result.user.id,
              email: result.user.email,
              role: result.user.role,
              companyId: result.company.id || result.user.companyId || undefined,
            })
          : null;

        return {
          company: result.company,
          user: result.user,
          tokens,
          temporaryPassword: result.temporaryPassword,
          isExistingUser: Boolean(isActingUser && authenticatedUser),
          isGuestBooking: !result.user,
          emailDelivery,
        };
      } catch (err: any) {
        lastError = err;

        // If it's an ApiError (e.g. ACCOUNT_EXISTS conflict), don't retry, rethrow immediately
        if (err instanceof ApiError) {
          throw err;
        }

        // Handle unique constraint collision (P2002) in concurrent registrations
        if (err.code === 'P2002') {
          const target = (Array.isArray(err.meta?.target) ? err.meta.target.join(',') : String(err.meta?.target || '')).toLowerCase();

          // If concurrent request inserted the same GSTIN, look it up in next attempt to reuse
          if (target.includes('gstnumber') && cleanGst) {
            existingCompany = await prisma.company.findUnique({ where: { gstNumber: cleanGst } });
            if (existingCompany) {
              continue;
            }
          }

          // If companyCode or regNo collision happened concurrently, back off with progressive jitter and retry fresh sequence
          if (target.includes('companycode') || target.includes('regno') || target.includes('company_companycode') || target.includes('company_regno')) {
            await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 80) * attempt + 30));
            continue;
          }

          // If username collision occurred, regenerate username and retry
          if (target.includes('username') && requestedUsername) {
            requestedUsername = await CompaniesService.generateUniqueUsername(requestedUsername);
            continue;
          }

          // If compound company_email_phone collision occurred concurrently (another request registered this exact identity)
          if (target.includes('company_email_phone') || target.includes('user_company_email_phone_key')) {
            if (existingCompany) {
              return {
                company: existingCompany,
                user: null,
                tokens: null,
                temporaryPassword: null,
                isExistingUser: false,
                isGuestBooking: true,
                emailDelivery: { status: 'SKIPPED', error: 'NOT_APPLICABLE' },
              };
            }
          }

          // If privileged email or email collision occurred
          if (target.includes('email') || target.includes('user_privileged_email_key')) {
            throw ApiError.conflict(
              'An account with this email address already exists. Please log in with your credentials to continue your booking.',
              [{ code: 'ACCOUNT_EXISTS', email: normalizedEmail }],
              'ACCOUNT_EXISTS'
            );
          }
        }

        // For other errors, rethrow immediately
        throw err;
      }
    }

    throw lastError || ApiError.internal('Unable to complete registration due to concurrent updates. Please try again.');
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
          select: { id: true, name: true, email: true, username: true, role: true, spcode: true, phone: true },
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
                images: true,
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
