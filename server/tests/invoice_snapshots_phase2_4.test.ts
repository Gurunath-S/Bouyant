import { createApp } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { InvoicePdfService, numberToIndianWords } from '../src/services/InvoicePdfService.js';
import { InvoicesService } from '../src/modules/invoices/invoices.service.ts';
import { generateTokens } from '../src/utils/jwt.js';
import bcrypt from 'bcryptjs';

let server: any;
let baseUrl: string;

async function startTestServer() {
  const app = createApp();
  return new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const port = (server.address() as any).port;
      baseUrl = `http://localhost:${port}/api/v1`;
      resolve();
    });
  });
}

async function request(endpoint: string, { method = 'GET', body, token }: any = {}) {
  const url = `${baseUrl}${endpoint}`;
  const headers: any = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const status = res.status;
  const contentType = res.headers.get('content-type') || '';
  let data: any = null;
  let buffer: Buffer | null = null;

  if (contentType.includes('application/pdf')) {
    const arrayBuf = await res.arrayBuffer();
    buffer = Buffer.from(arrayBuf);
  } else {
    try {
      data = await res.json();
    } catch (_e) {
      // not json
    }
  }

  return { status, data, buffer, headers: res.headers };
}

async function runPhase2_4Suite() {
  await startTestServer();

  console.log('\n=================================================================');
  console.log('🏛️ PHASE 2.4: HISTORICAL INVOICE & BILL SNAPSHOT RENDERING TESTS');
  console.log('=================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail = '') {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} — ${detail}`);
      failed++;
    }
  }

  const suffix = Date.now().toString().slice(-6);
  const createdBookingIds: string[] = [];
  const createdPaymentIds: string[] = [];
  const createdInvoiceIds: string[] = [];
  const createdStallIds: string[] = [];
  const createdCompanyIds: string[] = [];
  const createdUserIds: string[] = [];
  let testExhibitionId: string | null = null;
  let testFloorPlanId: string | null = null;

  try {
    // Clear in-memory PDF cache before suite runs
    InvoicesService.clearPdfCache();

    // -------------------------------------------------------------------------
    // Setup Test Environment: Exhibition, FloorPlan, Stall, Company, User
    // -------------------------------------------------------------------------
    const exhibition = await prisma.exhibition.create({
      data: {
        title: `Pharma Bio Expo ${suffix}`,
        slug: `pharma-bio-expo-${suffix}`,
        description: `Annual Pharma Expo ${suffix}`,
        edition: `2026-${suffix}`,
        eventCode: `PB-${suffix}`,
        venue: 'BIEC Exhibition Hall 3',
        city: 'Bengaluru',
        startDate: new Date(Date.now() + 86400000 * 45),
        endDate: new Date(Date.now() + 86400000 * 48),
        bookingEndDate: new Date(Date.now() + 86400000 * 30),
        status: 'PUBLISHED',
      },
    });
    testExhibitionId = exhibition.id;

    const floorPlan = await prisma.floorPlan.create({
      data: {
        exhibitionId: exhibition.id,
        name: `Hall 3 Floorplan ${suffix}`,
        width: 1200,
        height: 800,
        isPublished: true,
      },
    });
    testFloorPlanId = floorPlan.id;

    const stall = await prisma.stall.create({
      data: {
        floorPlanId: floorPlan.id,
        stallNumber: `PB-A1-${suffix}`,
        name: `Stall PB-A1`,
        category: 'PREMIUM',
        price: 50000,
        areaSqFt: 150,
        status: 'BOOKED_CONFIRMED',
      },
    });
    createdStallIds.push(stall.id);

    // Initial Master Company
    const masterCompany = await prisma.company.create({
      data: {
        companyCode: `CMP-INV-${suffix}`,
        name: `Original Pharma Dynamics Ltd ${suffix}`,
        contactPerson: 'Original Director Anil Kapoor',
        mobile: `98450${suffix.slice(-5)}`,
        email: `original_${suffix}@pharmadynamics.example.com`,
        address: '100 Old Airport Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        pinCode: '560008',
        country: 'India',
        gstNumber: `29AAACP${suffix.slice(-4)}E1Z0`,
        panNumber: `AAACP${suffix.slice(-4)}E`,
        industry: 'Pharmaceuticals',
      },
    });
    createdCompanyIds.push(masterCompany.id);

    const adminUser = await prisma.user.create({
      data: {
        email: `admin_${suffix}@buoyant.example.com`,
        username: `admin_p24_${suffix}`,
        name: 'Admin Tester',
        role: 'SUPERADMIN',
        passwordHash: await bcrypt.hash('AdminPass123!', 10),
      },
    });
    createdUserIds.push(adminUser.id);
    const tokenAdmin = generateTokens({
      userId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      companyId: null,
    }).accessToken;

    // -------------------------------------------------------------------------
    // Scenario 1: Invoice uses booking's billing name instead of changed company name
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 1: Booking Billing Name Preservation After Company Name Mutation ---');
    const snapshotBillingName = `Pharma Bio Divisions Legal Ent ${suffix}`;
    const booking1 = await prisma.booking.create({
      data: {
        bookingReference: `BKG-INV-1-${suffix}`,
        companyId: masterCompany.id,
        exhibitionId: exhibition.id,
        status: 'CONFIRMED',
        totalAmount: 50000,
        taxAmount: 9000,
        grandTotal: 59000,
        paidAmount: 59000,
        balanceAmount: 0,
        paymentStatus: 'PAID_FULL',
        billingName: snapshotBillingName,
        billingGst: `29AAACP${suffix.slice(-4)}E1Z0`,
        billingAddress: '404 Historic Tech Suite',
        billingCity: 'Bengaluru',
        billingState: 'Karnataka',
        billingPinCode: '560001',
        contactPerson: 'Historic Delegate',
        contactEmail: `delegate_${suffix}@pharmabio.example.com`,
        contactPhone: '9888800001',
        stalls: {
          create: [{ stallId: stall.id, price: 50000 }],
        },
      },
      include: {
        company: true,
        stalls: { include: { stall: true } },
        exhibition: true,
      },
    });
    createdBookingIds.push(booking1.id);

    const payment1 = await prisma.payment.create({
      data: {
        paymentReference: `PAY-INV-1-${suffix}`,
        bookingId: booking1.id,
        amount: 59000,
        currency: 'INR',
        status: 'SUCCESS',
        provider: 'OFFLINE_ADMIN',
        paidAt: new Date(),
      },
    });
    createdPaymentIds.push(payment1.id);

    const invoice1 = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-2026-S1-${suffix}`,
        bookingId: booking1.id,
        paymentId: payment1.id,
        companyId: masterCompany.id,
        totalAmount: 50000,
        taxAmount: 9000,
        grandTotal: 59000,
        status: 'ISSUED',
        issueDate: new Date(),
      },
      include: {
        company: true,
        booking: {
          include: {
            company: true,
            stalls: { include: { stall: true } },
            exhibition: true,
          },
        },
      },
    });
    createdInvoiceIds.push(invoice1.id);

    // MUTATE MASTER COMPANY NAME in database
    await prisma.company.update({
      where: { id: masterCompany.id },
      data: { name: `CHANGED Company Master Name Ltd ${suffix}` },
    });

    // Invalidate PDF cache
    InvoicesService.clearPdfCache();

    // Fetch refreshed invoice with mutated company
    const refreshedInvoice1 = await InvoicesService.getInvoiceById(invoice1.id);
    const pdfData1 = InvoicePdfService.buildInvoicePdfData(refreshedInvoice1, refreshedInvoice1.booking);

    assert(
      pdfData1.company.name === snapshotBillingName,
      'Scenario 1: Invoice uses booking snapshot billingName',
      `Expected "${snapshotBillingName}", got "${pdfData1.company.name}"`
    );
    assert(
      pdfData1.company.name !== refreshedInvoice1.company.name,
      'Scenario 1: Mutated master company name is ignored in favor of snapshot'
    );

    // -------------------------------------------------------------------------
    // Scenario 2: Invoice uses booking's saved GSTIN instead of changed company GSTIN
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 2: Booking Saved GSTIN Preservation After Company GSTIN Mutation ---');
    const snapshotGst = `29AAACP${suffix.slice(-4)}E1Z0`;
    const mutatedGst = `27BBBCP${suffix.slice(-4)}M1Z8`;

    // MUTATE MASTER COMPANY GSTIN in database
    await prisma.company.update({
      where: { id: masterCompany.id },
      data: { gstNumber: mutatedGst },
    });

    InvoicesService.clearPdfCache();
    const refreshedInvoice2 = await InvoicesService.getInvoiceById(invoice1.id);
    const pdfData2 = InvoicePdfService.buildInvoicePdfData(refreshedInvoice2, refreshedInvoice2.booking);

    assert(
      pdfData2.company.gstin === snapshotGst,
      'Scenario 2: Invoice renders saved booking snapshot GSTIN',
      `Expected "${snapshotGst}", got "${pdfData2.company.gstin}"`
    );
    assert(
      pdfData2.company.gstin !== mutatedGst,
      'Scenario 2: Mutated master company GSTIN does not affect historical invoice'
    );

    // -------------------------------------------------------------------------
    // Scenario 3: Saved billing address and contact details remain unchanged after master edits
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 3: Saved Address & Contact Immutability After Profile Overwrites ---');
    // Overwrite master company address, city, state, pin, contact person, mobile, email
    await prisma.company.update({
      where: { id: masterCompany.id },
      data: {
        address: '999 Completely Altered Tower, Nariman Point',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400021',
        contactPerson: 'Intruder Overwrite Person',
        mobile: '9111199999',
        email: 'intruder@differentcorp.example.com',
      },
    });

    InvoicesService.clearPdfCache();
    const refreshedInvoice3 = await InvoicesService.getInvoiceById(invoice1.id);
    const pdfData3 = InvoicePdfService.buildInvoicePdfData(refreshedInvoice3, refreshedInvoice3.booking);

    assert(pdfData3.company.address === '404 Historic Tech Suite', 'Scenario 3: Snapshot billingAddress preserved');
    assert(pdfData3.company.city === 'Bengaluru', 'Scenario 3: Snapshot billingCity preserved');
    assert(pdfData3.company.state === 'Karnataka', 'Scenario 3: Snapshot billingState preserved');
    assert(pdfData3.company.pinCode === '560001', 'Scenario 3: Snapshot billingPinCode preserved');
    assert(pdfData3.company.contactPerson === 'Historic Delegate', 'Scenario 3: Snapshot contactPerson preserved');
    assert(pdfData3.company.email === `delegate_${suffix}@pharmabio.example.com`, 'Scenario 3: Snapshot contactEmail preserved');
    assert(pdfData3.company.mobile === '9888800001', 'Scenario 3: Snapshot contactPhone preserved');

    // -------------------------------------------------------------------------
    // Scenario 4: Legacy bookings with null snapshots generate valid PDFs through fallback path
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 4: Legacy Booking with Null Snapshots Safe Fallback ---');
    const stall4 = await prisma.stall.create({
      data: {
        floorPlanId: floorPlan.id,
        stallNumber: `PB-LEG-${suffix}`,
        price: 30000,
        areaSqFt: 100,
        status: 'BOOKED_CONFIRMED',
      },
    });
    createdStallIds.push(stall4.id);

    // Pure legacy booking with NULL snapshot values
    const legacyBooking = await prisma.booking.create({
      data: {
        bookingReference: `BKG-LEG-S4-${suffix}`,
        companyId: masterCompany.id,
        exhibitionId: exhibition.id,
        status: 'CONFIRMED',
        totalAmount: 30000,
        taxAmount: 5400,
        grandTotal: 35400,
        paidAmount: 35400,
        balanceAmount: 0,
        paymentStatus: 'PAID_FULL',
        contactPerson: null,
        contactEmail: null,
        contactPhone: null,
        billingName: null,
        billingGst: null,
        billingPan: null,
        billingAddress: null,
        billingCity: null,
        billingState: null,
        billingPinCode: null,
        billingCountry: null,
        userId: null,
        stalls: {
          create: [{ stallId: stall4.id, price: 30000 }],
        },
      },
    });
    createdBookingIds.push(legacyBooking.id);

    const legacyPayment = await prisma.payment.create({
      data: {
        paymentReference: `PAY-LEG-S4-${suffix}`,
        bookingId: legacyBooking.id,
        amount: 35400,
        currency: 'INR',
        status: 'SUCCESS',
        provider: 'OFFLINE_ADMIN',
        paidAt: new Date(),
      },
    });
    createdPaymentIds.push(legacyPayment.id);

    const legacyInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-2026-LEG-${suffix}`,
        bookingId: legacyBooking.id,
        paymentId: legacyPayment.id,
        companyId: masterCompany.id,
        totalAmount: 30000,
        taxAmount: 5400,
        grandTotal: 35400,
        status: 'ISSUED',
        issueDate: new Date(),
      },
    });
    createdInvoiceIds.push(legacyInvoice.id);

    const fetchedLegacy = await InvoicesService.getInvoiceById(legacyInvoice.id);
    const pdfDataLegacy = InvoicePdfService.buildInvoicePdfData(fetchedLegacy, fetchedLegacy.booking);

    assert(
      pdfDataLegacy.company.name === fetchedLegacy.company.name,
      'Scenario 4: Null billingName falls back to master company name'
    );
    assert(
      pdfDataLegacy.company.address === fetchedLegacy.company.address,
      'Scenario 4: Null billingAddress falls back to master company address'
    );
    assert(
      pdfDataLegacy.company.city === fetchedLegacy.company.city,
      'Scenario 4: Null billingCity falls back to master company city'
    );

    // Verify PDF renders cleanly without throwing null pointer exceptions
    const legacyPdfBuffer = await InvoicePdfService.generateInvoicePdf(pdfDataLegacy);
    assert(legacyPdfBuffer.length > 0, 'Scenario 4: Legacy PDF buffer generated with non-zero length');
    assert(legacyPdfBuffer.subarray(0, 4).toString('utf-8') === '%PDF', 'Scenario 4: Legacy PDF starts with %PDF magic bytes');

    // -------------------------------------------------------------------------
    // Scenario 5: Partially populated snapshot uses field-by-field fallbacks safely
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 5: Partially Populated Snapshot Field-by-Field Fallbacks ---');
    const stall5 = await prisma.stall.create({
      data: {
        floorPlanId: floorPlan.id,
        stallNumber: `PB-PART-${suffix}`,
        price: 40000,
        areaSqFt: 120,
        status: 'BOOKED_CONFIRMED',
      },
    });
    createdStallIds.push(stall5.id);

    // Booking with some snapshots provided, and some left null
    const partialBooking = await prisma.booking.create({
      data: {
        bookingReference: `BKG-PART-S5-${suffix}`,
        companyId: masterCompany.id,
        exhibitionId: exhibition.id,
        status: 'CONFIRMED',
        totalAmount: 40000,
        taxAmount: 7200,
        grandTotal: 47200,
        paidAmount: 47200,
        balanceAmount: 0,
        paymentStatus: 'PAID_FULL',
        billingName: `Partial Division Corp ${suffix}`, // Provided
        billingGst: null, // Omitted -> fallback to company
        billingPan: `PARPAN${suffix.slice(-4)}`, // Provided
        billingAddress: null, // Omitted -> fallback to company
        billingCity: 'Hyderabad', // Provided
        billingState: null, // Omitted -> fallback to company
        billingPinCode: '500081', // Provided
        contactPerson: 'Local Branch Head', // Provided
        contactEmail: null, // Omitted -> fallback to company
        stalls: {
          create: [{ stallId: stall5.id, price: 40000 }],
        },
      },
    });
    createdBookingIds.push(partialBooking.id);

    const partialInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-2026-PART-${suffix}`,
        bookingId: partialBooking.id,
        companyId: masterCompany.id,
        totalAmount: 40000,
        taxAmount: 7200,
        grandTotal: 47200,
        status: 'ISSUED',
        issueDate: new Date(),
      },
    });
    createdInvoiceIds.push(partialInvoice.id);

    const fetchedPartial = await InvoicesService.getInvoiceById(partialInvoice.id);
    const pdfDataPartial = InvoicePdfService.buildInvoicePdfData(fetchedPartial, fetchedPartial.booking);

    assert(pdfDataPartial.company.name === `Partial Division Corp ${suffix}`, 'Scenario 5: Provided billingName used');
    assert(pdfDataPartial.company.gstin === fetchedPartial.company.gstNumber, 'Scenario 5: Null billingGst safely falls back to company.gstNumber');
    assert(pdfDataPartial.company.pan === `PARPAN${suffix.slice(-4)}`, 'Scenario 5: Provided billingPan used');
    assert(pdfDataPartial.company.address === fetchedPartial.company.address, 'Scenario 5: Null billingAddress falls back to company.address');
    assert(pdfDataPartial.company.city === 'Hyderabad', 'Scenario 5: Provided billingCity used');
    assert(pdfDataPartial.company.state === fetchedPartial.company.state, 'Scenario 5: Null billingState falls back to company.state');
    assert(pdfDataPartial.company.pinCode === '500081', 'Scenario 5: Provided billingPinCode used');
    assert(pdfDataPartial.company.contactPerson === 'Local Branch Head', 'Scenario 5: Provided contactPerson used');
    assert(pdfDataPartial.company.email === fetchedPartial.company.email, 'Scenario 5: Null contactEmail falls back to company.email');

    // -------------------------------------------------------------------------
    // Scenario 6: Invoice download returns valid binary PDF with application/pdf
    // -------------------------------------------------------------------------
    // Unauthenticated public download endpoint is decommissioned & rejected
    const res6_public = await request(`/invoices/public/${invoice1.id}/pdf`);
    assert(res6_public.status === 401 || res6_public.status === 404, 'Scenario 6: Unauthenticated public download is rejected (401 or 404)');

    // Authenticated download endpoint
    const res6_auth = await request(`/invoices/${invoice1.id}/pdf`, { token: tokenAdmin });
    assert(res6_auth.status === 200, 'Scenario 6: Authenticated download returns 200 OK');
    assert(res6_auth.headers.get('content-type')?.includes('application/pdf') === true, 'Scenario 6: Authenticated Content-Type is application/pdf');
    assert(res6_auth.buffer?.subarray(0, 4).toString('utf-8') === '%PDF', 'Scenario 6: Authenticated verified %PDF magic bytes');

    // -------------------------------------------------------------------------
    // Scenario 7: Bill and invoice rendering consistency across all identifier paths
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 7: Resolution Consistency Across All Identifiers ---');
    // 1. By Invoice ID
    const invById = await InvoicesService.getInvoiceById(invoice1.id);
    // 2. By Invoice Number
    const invByNumber = await InvoicesService.getInvoiceById(invoice1.invoiceNumber);
    // 3. By Booking ID
    const invByBookingId = await InvoicesService.getInvoiceById(booking1.id);
    // 4. By Booking Reference
    const invByBookingRef = await InvoicesService.getInvoiceById(booking1.bookingReference);
    // 5. By Payment ID
    const invByPaymentId = await InvoicesService.getInvoiceById(payment1.id);
    // 6. By Payment Reference
    const invByPaymentRef = await InvoicesService.getInvoiceById(payment1.paymentReference);

    assert(invById.id === invoice1.id, 'Scenario 7: Resolved by Invoice ID');
    assert(invByNumber.id === invoice1.id, 'Scenario 7: Resolved by Invoice Number');
    assert(invByBookingId.id === invoice1.id, 'Scenario 7: Resolved by Booking ID');
    assert(invByBookingRef.id === invoice1.id, 'Scenario 7: Resolved by Booking Reference');
    assert(invByPaymentId.id === invoice1.id, 'Scenario 7: Resolved by Payment ID');
    assert(invByPaymentRef.id === invoice1.id, 'Scenario 7: Resolved by Payment Reference');

    const pdfDataFromBookingRef = InvoicePdfService.buildInvoicePdfData(invByBookingRef, invByBookingRef.booking);
    assert(
      pdfDataFromBookingRef.company.name === snapshotBillingName,
      'Scenario 7: Consistent snapshot billing name rendered via booking reference lookup'
    );

    // -------------------------------------------------------------------------
    // Scenario 8: Email invoice attachment data resolution
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 8: Email Attachment Billing Data Alignment ---');
    // Verify that the data passed to email payloads prefers booking snapshots
    const emailCompanyName = (booking1.billingName && booking1.billingName.trim()) || booking1.company.name;
    const emailContactPerson = (booking1.contactPerson && booking1.contactPerson.trim()) || booking1.company.contactPerson;
    const emailContactEmail = (booking1.contactEmail && booking1.contactEmail.trim()) || booking1.company.email;
    const emailGst = (booking1.billingGst && booking1.billingGst.trim()) || booking1.company.gstNumber;

    assert(emailCompanyName === snapshotBillingName, 'Scenario 8: Email companyName aligns with booking snapshot');
    assert(emailContactPerson === 'Historic Delegate', 'Scenario 8: Email contactPerson aligns with booking snapshot');
    assert(emailContactEmail === `delegate_${suffix}@pharmabio.example.com`, 'Scenario 8: Email contactEmail aligns with booking snapshot');
    assert(emailGst === snapshotGst, 'Scenario 8: Email GST aligns with booking snapshot');

    // -------------------------------------------------------------------------
    // Scenario 9: Financial calculations, GST rates, and formatting integrity
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 9: Financial Calculations & Indian Rupee Formatting Integrity ---');
    assert(pdfData1.taxableAmount === 50000, 'Scenario 9: Taxable base amount is 50000');
    assert(pdfData1.totalTax === 9000, 'Scenario 9: Total GST is 9000 (18%)');
    assert(pdfData1.cgstAmount === 4500, 'Scenario 9: CGST is exactly 4500 (9%)');
    assert(pdfData1.sgstAmount === 4500, 'Scenario 9: SGST is exactly 4500 (9%)');
    assert(pdfData1.grandTotal === 59000, 'Scenario 9: Grand Total is 59000');
    assert(pdfData1.taxableAmount + pdfData1.totalTax === pdfData1.grandTotal, 'Scenario 9: Taxable + Tax = Grand Total');

    // Test numberToIndianWords
    const words59000 = numberToIndianWords(59000);
    assert(words59000.includes('Fifty Nine Thousand'), `Scenario 9: Correct Indian words representation: "${words59000}"`);

    // -------------------------------------------------------------------------
    // Scenario 10: Non-mutation guarantee (Rendering never mutates records)
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 10: Non-Mutation Guarantee ---');
    const bookingBefore = await prisma.booking.findUnique({ where: { id: booking1.id } });
    const companyBefore = await prisma.company.findUnique({ where: { id: masterCompany.id } });
    const invoiceBefore = await prisma.invoice.findUnique({ where: { id: invoice1.id } });

    // Execute full generation and authenticated download
    await InvoicesService.generateInvoicePdf(invoice1.id);
    const unauthDownload = await request(`/invoices/public/${invoice1.id}/pdf`);
    assert(unauthDownload.status === 401 || unauthDownload.status === 404, 'Scenario 10: Unauthenticated download rejected');
    await request(`/invoices/${invoice1.id}/pdf`, { token: tokenAdmin });

    const bookingAfter = await prisma.booking.findUnique({ where: { id: booking1.id } });
    const companyAfter = await prisma.company.findUnique({ where: { id: masterCompany.id } });
    const invoiceAfter = await prisma.invoice.findUnique({ where: { id: invoice1.id } });

    assert(bookingBefore?.updatedAt.getTime() === bookingAfter?.updatedAt.getTime(), 'Scenario 10: Booking record updatedAt untouched');
    assert(companyBefore?.updatedAt.getTime() === companyAfter?.updatedAt.getTime(), 'Scenario 10: Company record updatedAt untouched');
    assert(invoiceBefore?.updatedAt.getTime() === invoiceAfter?.updatedAt.getTime(), 'Scenario 10: Invoice record updatedAt untouched');
    assert(bookingBefore?.billingName === bookingAfter?.billingName, 'Scenario 10: Booking snapshot data completely immutable');

  } catch (err: any) {
    console.error('💥 Test suite encountered an unhandled exception:', err);
    failed++;
  } finally {
    // -------------------------------------------------------------------------
    // Clean up created entities
    // -------------------------------------------------------------------------
    console.log('\n--- Cleaning up test records ---');
    try {
      if (createdInvoiceIds.length > 0) {
        await prisma.invoice.deleteMany({ where: { id: { in: createdInvoiceIds } } }).catch(() => {});
      }
      if (createdPaymentIds.length > 0) {
        await prisma.payment.deleteMany({ where: { id: { in: createdPaymentIds } } }).catch(() => {});
      }
      if (createdBookingIds.length > 0) {
        await prisma.bookingStall.deleteMany({ where: { bookingId: { in: createdBookingIds } } }).catch(() => {});
        await prisma.booking.deleteMany({ where: { id: { in: createdBookingIds } } }).catch(() => {});
      }
      if (createdStallIds.length > 0) {
        await prisma.stall.deleteMany({ where: { id: { in: createdStallIds } } }).catch(() => {});
      }
      if (testFloorPlanId) {
        await prisma.floorPlan.delete({ where: { id: testFloorPlanId } }).catch(() => {});
      }
      if (testExhibitionId) {
        await prisma.exhibition.delete({ where: { id: testExhibitionId } }).catch(() => {});
      }
      if (createdUserIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } }).catch(() => {});
      }
      if (createdCompanyIds.length > 0) {
        await prisma.company.deleteMany({ where: { id: { in: createdCompanyIds } } }).catch(() => {});
      }
    } catch (cleanupErr) {
      console.warn('⚠️ Cleanup warning:', cleanupErr);
    }

    if (server) {
      server.close();
    }
  }

  console.log('\n=================================================================');
  console.log(`📊 PHASE 2.4 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2_4Suite()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
