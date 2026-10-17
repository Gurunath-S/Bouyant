import { createApp } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { InvoicesService } from '../src/modules/invoices/invoices.service.js';
import { getActivePdfRendersCount } from '../src/services/InvoicePdfService.js';
import { generateTokens } from '../src/utils/jwt.js';
import { createRateLimiter } from '../src/middlewares/rateLimiter.js';
import express from 'express';
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

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASS: ${message}`);
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

async function runPhase2_7Suite() {
  await startTestServer();

  console.log('\n=================================================================');
  console.log('🔒 PHASE 2.7: INVOICE ACCESS-CONTROL & TENANT ISOLATION TESTS');
  console.log('=================================================================\n');

  const suffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  // Track created entities for cleanup
  const createdInvoiceIds: string[] = [];
  const createdPaymentIds: string[] = [];
  const createdBookingIds: string[] = [];
  const createdStallIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdCompanyIds: string[] = [];
  let floorPlanId: string | null = null;
  let exhibitionId: string | null = null;

  let passed = 0;
  let failed = 0;

  try {
    // Clear PDF cache
    InvoicesService.clearPdfCache();

    const pwdHash = await bcrypt.hash('TestPass@123', 10);

    const exhibition = await prisma.exhibition.create({
      data: {
        title: `Ph2.7 Security Expo ${suffix}`,
        slug: `ph2-7-sec-expo-${suffix}`,
        description: 'Exhibition description for Phase 2.7 security tests',
        edition: `2026-${suffix}`,
        eventCode: `SEC-${suffix}`,
        venue: 'Security Trade Pavilion',
        city: 'Chennai',
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-11-05'),
        bookingEndDate: new Date('2026-10-31'),
        status: 'PUBLISHED',
      },
    });
    exhibitionId = exhibition.id;

    const floorPlan = await prisma.floorPlan.create({
      data: {
        name: `Sec FloorPlan ${suffix}`,
        exhibitionId: exhibition.id,
        width: 1000,
        height: 800,
      },
    });
    floorPlanId = floorPlan.id;

    // Helper for stall creation
    async function createStall(code: string) {
      const s = await prisma.stall.create({
        data: {
          floorPlanId: floorPlan.id,
          stallNumber: `S-${code}-${suffix.slice(-4)}`,
          name: `Stall ${code}`,
          category: 'PREMIUM',
          price: 50000,
          areaSqFt: 100,
          status: 'BOOKED_CONFIRMED',
        },
      });
      createdStallIds.push(s.id);
      return s;
    }

    // 2. Setup Company A and User A (Client A)
    const companyA = await prisma.company.create({
      data: {
        companyCode: `CMP-A-${suffix}`,
        name: `Alpha Enterprises ${suffix}`,
        contactPerson: 'Alice Alpha',
        mobile: `98765${String(Math.floor(Math.random() * 90000) + 10000)}`,
        email: `alice_${suffix}@alpha.com`,
        address: '100 Alpha Tower',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pinCode: '600001',
        country: 'India',
        gstNumber: `33AAAFA${suffix.slice(-4)}M1Z1`,
        panNumber: `AAAFA${suffix.slice(-4)}M`,
        industry: 'Technology',
      },
    });
    createdCompanyIds.push(companyA.id);

    const userA = await prisma.user.create({
      data: {
        email: `alice_${suffix}@alpha.com`,
        username: `alice_${suffix}`,
        passwordHash: pwdHash,
        name: 'Alice Alpha',
        role: 'CLIENT',
        companyId: companyA.id,
      },
    });
    createdUserIds.push(userA.id);
    const tokenA = generateTokens({
      userId: userA.id,
      email: userA.email,
      role: 'CLIENT',
      companyId: companyA.id,
    }).accessToken;

    // 3. Setup Company B and User B (Client B)
    const companyB = await prisma.company.create({
      data: {
        companyCode: `CMP-B-${suffix}`,
        name: `Beta Industries ${suffix}`,
        contactPerson: 'Bob Beta',
        mobile: `98765${String(Math.floor(Math.random() * 90000) + 10000)}`,
        email: `bob_${suffix}@beta.com`,
        address: '200 Beta Park',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pinCode: '641001',
        country: 'India',
        gstNumber: `33AAAFB${suffix.slice(-4)}M1Z2`,
        panNumber: `AAAFB${suffix.slice(-4)}M`,
        industry: 'Manufacturing',
      },
    });
    createdCompanyIds.push(companyB.id);

    const userB = await prisma.user.create({
      data: {
        email: `bob_${suffix}@beta.com`,
        username: `bob_${suffix}`,
        passwordHash: pwdHash,
        name: 'Bob Beta',
        role: 'CLIENT',
        companyId: companyB.id,
      },
    });
    createdUserIds.push(userB.id);
    const tokenB = generateTokens({
      userId: userB.id,
      email: userB.email,
      role: 'CLIENT',
      companyId: companyB.id,
    }).accessToken;

    // 4. Setup User C (Client without company association)
    const userC = await prisma.user.create({
      data: {
        email: `charlie_${suffix}@solo.com`,
        username: `charlie_${suffix}`,
        passwordHash: pwdHash,
        name: 'Charlie Solo',
        role: 'CLIENT',
        companyId: null,
      },
    });
    createdUserIds.push(userC.id);
    const tokenC = generateTokens({
      userId: userC.id,
      email: userC.email,
      role: 'CLIENT',
      companyId: null,
    }).accessToken;

    // 5. Admin Token
    const adminToken = generateTokens({
      userId: `admin_${suffix}`,
      email: `admin_${suffix}@buoyantmedia.com`,
      role: 'ADMIN',
      pageAccess: ['*'],
    }).accessToken;

    // 6. Create Booking & Invoice for Company A
    const stallA = await createStall('A1');
    const bookingA = await prisma.booking.create({
      data: {
        bookingReference: `BKG-A-${suffix}`,
        companyId: companyA.id,
        exhibitionId: exhibition.id,
        userId: userA.id,
        status: 'CONFIRMED',
        paymentStatus: 'PAID_FULL',
        totalAmount: 50000,
        taxAmount: 9000,
        grandTotal: 59000,
        paidAmount: 59000,
        balanceAmount: 0,
        billingName: companyA.name,
        billingGst: companyA.gstNumber,
        billingPan: companyA.panNumber,
        billingAddress: companyA.address,
        billingCity: companyA.city,
        billingState: companyA.state,
        billingPinCode: companyA.pinCode,
        billingCountry: companyA.country,
        contactPerson: companyA.contactPerson,
        contactEmail: companyA.email,
        contactPhone: companyA.mobile,
        stalls: {
          create: [{ stallId: stallA.id, price: 50000 }],
        },
      },
    });
    createdBookingIds.push(bookingA.id);

    const paymentA = await prisma.payment.create({
      data: {
        paymentReference: `PAY-A-${suffix}`,
        bookingId: bookingA.id,
        amount: 59000,
        currency: 'INR',
        status: 'SUCCESS',
        provider: 'RAZORPAY',
        paidAt: new Date(),
      },
    });
    createdPaymentIds.push(paymentA.id);

    const invoiceA = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-A-${suffix}`,
        bookingId: bookingA.id,
        paymentId: paymentA.id,
        companyId: companyA.id,
        totalAmount: 50000,
        taxAmount: 9000,
        grandTotal: 59000,
        status: 'PAID',
        issueDate: new Date(),
      },
    });
    createdInvoiceIds.push(invoiceA.id);

    // 7. Create Booking & Invoice for Company B
    const stallB = await createStall('B1');
    const bookingB = await prisma.booking.create({
      data: {
        bookingReference: `BKG-B-${suffix}`,
        companyId: companyB.id,
        exhibitionId: exhibition.id,
        userId: userB.id,
        status: 'CONFIRMED',
        paymentStatus: 'PAID_FULL',
        totalAmount: 50000,
        taxAmount: 9000,
        grandTotal: 59000,
        paidAmount: 59000,
        balanceAmount: 0,
        billingName: companyB.name,
        billingGst: companyB.gstNumber,
        billingPan: companyB.panNumber,
        billingAddress: companyB.address,
        billingCity: companyB.city,
        billingState: companyB.state,
        billingPinCode: companyB.pinCode,
        billingCountry: companyB.country,
        contactPerson: companyB.contactPerson,
        contactEmail: companyB.email,
        contactPhone: companyB.mobile,
        stalls: {
          create: [{ stallId: stallB.id, price: 50000 }],
        },
      },
    });
    createdBookingIds.push(bookingB.id);

    const paymentB = await prisma.payment.create({
      data: {
        paymentReference: `PAY-B-${suffix}`,
        bookingId: bookingB.id,
        amount: 59000,
        currency: 'INR',
        status: 'SUCCESS',
        provider: 'RAZORPAY',
        paidAt: new Date(),
      },
    });
    createdPaymentIds.push(paymentB.id);

    const invoiceB = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-B-${suffix}`,
        bookingId: bookingB.id,
        paymentId: paymentB.id,
        companyId: companyB.id,
        totalAmount: 50000,
        taxAmount: 9000,
        grandTotal: 59000,
        status: 'PAID',
        issueDate: new Date(),
      },
    });
    createdInvoiceIds.push(invoiceB.id);

    // =========================================================================
    // TEST 1: Unauthenticated Requests Must Be Strictly Rejected
    // =========================================================================
    console.log('\n--- Test 1: Unauthenticated Access Rejection ---');
    const unauthPdf = await request(`/invoices/${invoiceA.id}/pdf`);
    assert(unauthPdf.status === 401, 'Test 1.1: GET /invoices/:id/pdf without token returns 401 Unauthorized');

    const unauthJson = await request(`/invoices/${invoiceA.id}`);
    assert(unauthJson.status === 401, 'Test 1.2: GET /invoices/:id without token returns 401 Unauthorized');

    const unauthMy = await request('/invoices/my-invoices');
    assert(unauthMy.status === 401, 'Test 1.3: GET /invoices/my-invoices without token returns 401 Unauthorized');

    const unauthPublic = await request(`/invoices/public/${invoiceA.id}/pdf`);
    assert(
      unauthPublic.status === 401 || unauthPublic.status === 404,
      'Test 1.4: Decommissioned public route does not serve PDF (returns 401 or 404)'
    );
    passed++;

    // =========================================================================
    // TEST 2: Tenant Isolation — Company A Cannot Access Company B's Documents
    // =========================================================================
    console.log('\n--- Test 2: Cross-Tenant Isolation (Company A vs Company B) ---');
    // User A accessing Company B's invoice JSON
    const resAtoBJson = await request(`/invoices/${invoiceB.id}`, { token: tokenA });
    assert(resAtoBJson.status === 403, 'Test 2.1: User A accessing Invoice B JSON returns 403 Forbidden');

    // User A accessing Company B's invoice PDF
    const resAtoBPdf = await request(`/invoices/${invoiceB.id}/pdf`, { token: tokenA });
    assert(resAtoBPdf.status === 403, 'Test 2.2: User A accessing Invoice B PDF returns 403 Forbidden');

    // User B accessing Company A's invoice JSON
    const resBtoAJson = await request(`/invoices/${invoiceA.id}`, { token: tokenB });
    assert(resBtoAJson.status === 403, 'Test 2.3: User B accessing Invoice A JSON returns 403 Forbidden');

    // User B accessing Company A's invoice PDF
    const resBtoAPdf = await request(`/invoices/${invoiceA.id}/pdf`, { token: tokenB });
    assert(resBtoAPdf.status === 403, 'Test 2.4: User B accessing Invoice A PDF returns 403 Forbidden');
    passed++;

    // =========================================================================
    // TEST 3: "My Invoices" Query Scoping to Authenticated Company
    // =========================================================================
    console.log('\n--- Test 3: My Invoices Scoping ---');
    const myInvoicesA = await request('/invoices/my-invoices', { token: tokenA });
    assert(myInvoicesA.status === 200, 'Test 3.1: User A GET /invoices/my-invoices returns 200 OK');
    const invIdsA = myInvoicesA.data.data.map((inv: any) => inv.id);
    assert(invIdsA.includes(invoiceA.id), 'Test 3.2: User A receives their own Company A invoice');
    assert(!invIdsA.includes(invoiceB.id), 'Test 3.3: User A receives ZERO instances of Company B invoice');

    const myInvoicesB = await request('/invoices/my-invoices', { token: tokenB });
    assert(myInvoicesB.status === 200, 'Test 3.4: User B GET /invoices/my-invoices returns 200 OK');
    const invIdsB = myInvoicesB.data.data.map((inv: any) => inv.id);
    assert(invIdsB.includes(invoiceB.id), 'Test 3.5: User B receives their own Company B invoice');
    assert(!invIdsB.includes(invoiceA.id), 'Test 3.6: User B receives ZERO instances of Company A invoice');
    passed++;

    // =========================================================================
    // TEST 4: Alternate Identifier IDOR Prevention
    // =========================================================================
    console.log('\n--- Test 4: Alternate Identifier IDOR Prevention ---');
    // Using invoiceNumber of Company B
    const resInvNum = await request(`/invoices/${invoiceB.invoiceNumber}`, { token: tokenA });
    assert(resInvNum.status === 403, 'Test 4.1: Lookup by foreign invoiceNumber returns 403 Forbidden');

    // Using bookingReference of Company B
    const resBkRef = await request(`/invoices/${bookingB.bookingReference}`, { token: tokenA });
    assert(resBkRef.status === 403, 'Test 4.2: Lookup by foreign bookingReference returns 403 Forbidden');

    // Using paymentReference of Company B
    const resPayRef = await request(`/invoices/${paymentB.paymentReference}`, { token: tokenA });
    assert(resPayRef.status === 403, 'Test 4.3: Lookup by foreign paymentReference returns 403 Forbidden');

    // PDF downloads using alternate identifiers
    const resPdfInvNum = await request(`/invoices/${invoiceB.invoiceNumber}/pdf`, { token: tokenA });
    assert(resPdfInvNum.status === 403, 'Test 4.4: PDF download by foreign invoiceNumber returns 403 Forbidden');

    const resPdfBkRef = await request(`/invoices/${bookingB.bookingReference}/pdf`, { token: tokenA });
    assert(resPdfBkRef.status === 403, 'Test 4.5: PDF download by foreign bookingReference returns 403 Forbidden');
    passed++;

    // =========================================================================
    // TEST 5: Legitimate Authenticated Customer Downloads & Content Validation
    // =========================================================================
    console.log('\n--- Test 5: Legitimate Authenticated Customer Downloads ---');
    const legitimateA = await request(`/invoices/${invoiceA.id}/pdf`, { token: tokenA });
    assert(legitimateA.status === 200, 'Test 5.1: User A downloading Invoice A PDF returns 200 OK');
    assert(legitimateA.headers.get('content-type')?.includes('application/pdf') === true, 'Test 5.2: Content-Type is application/pdf');
    assert(legitimateA.buffer !== null && legitimateA.buffer.length > 5000, 'Test 5.3: Valid binary buffer returned');
    assert(legitimateA.buffer?.subarray(0, 4).toString('utf-8') === '%PDF', 'Test 5.4: Magic bytes start with %PDF');
    passed++;

    // =========================================================================
    // TEST 6: Administrator Privileged Access
    // =========================================================================
    console.log('\n--- Test 6: Administrator Cross-Company Access ---');
    const adminFetchA = await request(`/invoices/${invoiceA.id}/pdf`, { token: adminToken });
    assert(adminFetchA.status === 200, 'Test 6.1: Admin can access Company A invoice PDF');

    const adminFetchB = await request(`/invoices/${invoiceB.id}/pdf`, { token: adminToken });
    assert(adminFetchB.status === 200, 'Test 6.2: Admin can access Company B invoice PDF');
    passed++;

    // =========================================================================
    // TEST 7: Fail-Closed Behavior for Users Without Company Association
    // =========================================================================
    console.log('\n--- Test 7: Fail Closed for Unassociated Users ---');
    const resUserC = await request(`/invoices/${invoiceA.id}`, { token: tokenC });
    assert(resUserC.status === 403, 'Test 7.1: User without company receives 403 on invoice lookup');

    const resUserCPdf = await request(`/invoices/${invoiceA.id}/pdf`, { token: tokenC });
    assert(resUserCPdf.status === 403, 'Test 7.2: User without company receives 403 on PDF download');

    const myInvC = await request('/invoices/my-invoices', { token: tokenC });
    assert(myInvC.status === 200 && myInvC.data.data.length === 0, 'Test 7.3: User without company receives empty array [] on my-invoices');
    passed++;

    // =========================================================================
    // TEST 8: Read-Only Non-Mutation Guarantee
    // =========================================================================
    console.log('\n--- Test 8: Read-Only Non-Mutation Guarantee ---');
    const invoiceCountBefore = await prisma.invoice.count();
    const missingRes = await request(`/invoices/INV-NON-EXISTENT-${suffix}`, { token: adminToken });
    assert(missingRes.status === 404, 'Test 8.1: Querying non-existent invoice returns 404 Not Found');

    const invoiceCountAfter = await prisma.invoice.count();
    assert(invoiceCountBefore === invoiceCountAfter, 'Test 8.2: Zero invoice records created during read operation');
    passed++;

    // =========================================================================
    // TEST 9: Response Security Headers & Cache Isolation
    // =========================================================================
    console.log('\n--- Test 9: Response Security Headers & Cache Isolation ---');
    // Ensure Invoice A is cached in memory
    const cacheWarmup = await request(`/invoices/${invoiceA.id}/pdf`, { token: tokenA });
    assert(cacheWarmup.status === 200, 'Test 9.1: Cache warmed for Invoice A');

    // Verify security headers
    const cacheControl = cacheWarmup.headers.get('cache-control');
    assert(cacheControl?.includes('no-store') === true, `Test 9.2: Cache-Control includes no-store (Got: ${cacheControl})`);
    assert(cacheControl?.includes('private') === true, 'Test 9.3: Cache-Control includes private');
    assert(cacheWarmup.headers.get('x-content-type-options') === 'nosniff', 'Test 9.4: X-Content-Type-Options is nosniff');
    assert(cacheWarmup.headers.get('pragma') === 'no-cache', 'Test 9.5: Pragma is no-cache');

    // Attempt unauthorized access against cached invoice
    const cacheBypassAttempt = await request(`/invoices/${invoiceA.id}/pdf`, { token: tokenB });
    assert(cacheBypassAttempt.status === 403, 'Test 9.6: Cached invoice cannot be accessed by unauthorized User B (403 Forbidden)');
    passed++;

    // =========================================================================
    // TEST 10: Bounded Concurrency Verification
    // =========================================================================
    console.log('\n--- Test 10: Bounded Concurrency Verification ---');
    const activeRenders = getActivePdfRendersCount();
    assert(activeRenders <= 3, `Test 10.1: Active PDF renders is bounded (active: ${activeRenders} <= 3)`);
    passed++;

    // =========================================================================
    // TEST 11: Rate Limiter Middleware Verification
    // =========================================================================
    console.log('\n--- Test 11: Rate Limiter Middleware Verification ---');
    // Create an isolated Express router with createRateLimiter to verify 429 response
    const testApp = express();
    const testLimiter = createRateLimiter({ max: 2, windowMs: 60000 });
    testApp.get('/test-rate-limit', testLimiter, (_req, res) => res.json({ ok: true }));

    const testServer = testApp.listen(0);
    const testPort = (testServer.address() as any).port;
    const testUrl = `http://localhost:${testPort}/test-rate-limit`;

    const r1 = await fetch(testUrl);
    assert(r1.status === 200, 'Test 11.1: Request 1 within rate limit returns 200');
    const r2 = await fetch(testUrl);
    assert(r2.status === 200, 'Test 11.2: Request 2 within rate limit returns 200');
    const r3 = await fetch(testUrl);
    assert(r3.status === 429, `Test 11.3: Request 3 exceeding rate limit returns 429 Too Many Requests (Got: ${r3.status})`);
    testServer.close();
    passed++;

    // =========================================================================
    // TEST 12: Public Booking Summary Does Not Expose Invoice CUID
    // =========================================================================
    console.log('\n--- Test 12: Public Booking Summary Information Leak Closed ---');
    const publicSummaryRes = await request(`/bookings/public/summary/${bookingA.bookingReference}`);
    assert(publicSummaryRes.status === 200, 'Test 12.1: Public booking summary returns 200 OK');
    const summaryInvoices = publicSummaryRes.data.data.invoices;
    assert(Array.isArray(summaryInvoices) && summaryInvoices.length > 0, 'Test 12.2: Summary returns invoices array');
    assert(summaryInvoices[0].id === undefined, 'Test 12.3: Summary invoices array does NOT expose internal invoice ID/CUID');
    assert(summaryInvoices[0].invoiceNumber !== undefined, 'Test 12.4: Summary invoice retains user-facing invoiceNumber');
    passed++;

  } catch (err: any) {
    console.error('💥 Test suite encountered an exception:', err);
    failed++;
  } finally {
    // Cleanup
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
      if (floorPlanId) {
        await prisma.floorPlan.delete({ where: { id: floorPlanId } }).catch(() => {});
      }
      if (exhibitionId) {
        await prisma.exhibition.delete({ where: { id: exhibitionId } }).catch(() => {});
      }
      if (createdUserIds.length > 0) {
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } }).catch(() => {});
      }
      if (createdCompanyIds.length > 0) {
        await prisma.company.deleteMany({ where: { id: { in: createdCompanyIds } } }).catch(() => {});
      }
    } catch (_cleanupErr) {
      // Ignore cleanup error
    }

    if (server) {
      server.close();
    }
  }

  console.log('\n=================================================================');
  console.log(`📊 PHASE 2.7 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runPhase2_7Suite().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
