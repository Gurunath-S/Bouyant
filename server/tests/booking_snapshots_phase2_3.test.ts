import { createApp } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { BookingsService } from '../src/modules/bookings/bookings.service.js';
import { generateTokens } from '../src/utils/jwt.js';
import { razorpay } from '../src/config/razorpay.js';
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
  let data: any = null;
  try {
    data = await res.json();
  } catch (_e) {
    // not json
  }

  return { status, data, headers: res.headers };
}

async function runPhase2_3Suite() {
  await startTestServer();

  console.log('\n=================================================================');
  console.log('🏛️ PHASE 2.3: DATABASE MIGRATION & BOOKING SNAPSHOTS TEST SUITE');
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

  const origOrdersCreate = razorpay.orders.create;
  (razorpay.orders as any).create = async (options: any) => {
    return {
      id: `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      entity: 'order',
      amount: options.amount,
      currency: options.currency,
      receipt: options.receipt,
      status: 'created',
    };
  };

  const suffix = Date.now().toString().slice(-6);
  const createdBookingIds: string[] = [];
  const createdStallIds: string[] = [];
  const createdCompanyIds: string[] = [];
  const createdUserIds: string[] = [];
  let testExhibitionId: string | null = null;
  let testFloorPlanId: string | null = null;

  try {
    // -------------------------------------------------------------------------
    // Setup: Exhibition, FloorPlan, Stalls, Master Company, and Users
    // -------------------------------------------------------------------------
    const exhibition = await prisma.exhibition.create({
      data: {
        title: `Snapshot Expo ${suffix}`,
        slug: `snapshot-expo-${suffix}`,
        description: `Snapshot Expo Description ${suffix}`,
        edition: `2026-${suffix}`,
        eventCode: `SE-${suffix}`,
        venue: 'Grand Tech Expo Centre',
        city: 'Bengaluru',
        startDate: new Date(Date.now() + 86400000 * 30),
        endDate: new Date(Date.now() + 86400000 * 35),
        bookingEndDate: new Date(Date.now() + 86400000 * 20),
        status: 'PUBLISHED',
      },
    });
    testExhibitionId = exhibition.id;

    const floorPlan = await prisma.floorPlan.create({
      data: {
        exhibitionId: exhibition.id,
        name: `Hall A - Snapshots ${suffix}`,
        width: 1000,
        height: 800,
        isPublished: true,
      },
    });
    testFloorPlanId = floorPlan.id;

    // Helper to create test stalls
    async function createTestStall(stallNum: string, price = 25000) {
      const stall = await prisma.stall.create({
        data: {
          floorPlanId: floorPlan.id,
          stallNumber: `SNP-${stallNum}-${suffix}`,
          name: `Stall SNP-${stallNum}`,
          price,
          areaSqFt: 100,
          status: 'AVAILABLE',
        },
      });
      createdStallIds.push(stall.id);
      return stall;
    }

    // Create Master Company A
    const masterGst = `29ABCDE${suffix.slice(-4)}F1Z5`;
    const masterPan = `ABCDE${suffix.slice(-4)}F`;
    const masterMobile = `98450${suffix.slice(-5)}`;
    const masterEmail = `master_${suffix}@apexrobotics.example.com`;

    const masterCompany = await prisma.company.create({
      data: {
        companyCode: `CMP-SNP-${suffix}`,
        name: `Apex Robotics Technologies Pvt Ltd ${suffix}`,
        contactPerson: 'Director Rajesh Varma',
        mobile: masterMobile,
        email: masterEmail,
        address: '100 Innovation Park, Electronic City Phase 1',
        city: 'Bengaluru',
        state: 'Karnataka',
        pinCode: '560100',
        country: 'India',
        gstNumber: masterGst,
        panNumber: masterPan,
        industry: 'Robotics',
      },
    });
    createdCompanyIds.push(masterCompany.id);

    // Primary Authenticated User A for Company A
    const userA = await prisma.user.create({
      data: {
        email: masterEmail,
        username: `rajesh_${suffix}`,
        name: 'Director Rajesh Varma',
        phone: masterMobile,
        role: 'CLIENT',
        companyId: masterCompany.id,
        passwordHash: await bcrypt.hash('MasterPass123!', 10),
      },
    });
    createdUserIds.push(userA.id);
    const tokenA = generateTokens({
      userId: userA.id,
      email: userA.email,
      role: userA.role,
      companyId: userA.companyId,
    }).accessToken;

    // Secondary User B (Delegate) for Company A
    const delegateEmail = `delegate_${suffix}@apexrobotics.example.com`;
    const delegateMobile = `98451${suffix.slice(-5)}`;
    const userB = await prisma.user.create({
      data: {
        email: delegateEmail,
        username: `delegate_${suffix}`,
        name: 'Delegate Priya Nair',
        phone: delegateMobile,
        role: 'CLIENT',
        companyId: masterCompany.id,
        passwordHash: await bcrypt.hash('DelegatePass123!', 10),
      },
    });
    createdUserIds.push(userB.id);
    const _tokenB = generateTokens({
      userId: userB.id,
      email: userB.email,
      role: userB.role,
      companyId: userB.companyId,
    }).accessToken;

    // Super Admin User
    const adminEmail = `admin_${suffix}@buoyant.example.com`;
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        username: `admin_${suffix}`,
        name: 'System Admin',
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
    // Scenario 1: Correct contact snapshots for a new booking
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 1: Correct Contact Snapshots for New Booking ---');
    const stall1 = await createTestStall('01');
    const res1 = await request('/bookings', {
      method: 'POST',
      token: tokenAdmin,
      body: {
        exhibitionId: exhibition.id,
        stallIds: [stall1.id],
        companyId: masterCompany.id,
        confirmDirectly: true,
        contactPerson: 'Operations Lead Vikram Rao',
        contactEmail: 'vikram.rao@apexrobotics.example.com',
        contactPhone: '9888812345',
      },
    });

    console.log('res1 response:', res1.status, JSON.stringify(res1.data));
    assert(res1.status === 201, 'Scenario 1: Booking created successfully (201)', `Got ${res1.status}: ${JSON.stringify(res1.data)}`);
    const bookingId1 = res1.data?.data?.data?.bookingId || res1.data?.data?.id;
    if (bookingId1) createdBookingIds.push(bookingId1);

    const bkg1 = await prisma.booking.findUnique({
      where: { id: bookingId1 },
    });

    assert(bkg1 !== null, 'Scenario 1: Booking found in DB');
    assert(bkg1?.contactPerson === 'Operations Lead Vikram Rao', 'Scenario 1: contactPerson captured submitted value', `Got: ${bkg1?.contactPerson}`);
    assert(bkg1?.contactEmail === 'vikram.rao@apexrobotics.example.com', 'Scenario 1: contactEmail captured submitted value', `Got: ${bkg1?.contactEmail}`);
    assert(bkg1?.contactPhone === '9888812345', 'Scenario 1: contactPhone captured submitted value', `Got: ${bkg1?.contactPhone}`);

    // -------------------------------------------------------------------------
    // Scenario 2: Correct legal billing snapshots for a new booking
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 2: Correct Legal Billing Snapshots for New Booking ---');
    const stall2 = await createTestStall('02');
    const customBillingName = `Apex Robotics Billing Branch ${suffix}`;
    const customBillingAddress = 'Suite 404, Cyber Towers, Whitefield';
    const customBillingCity = 'Bengaluru';
    const customBillingState = 'Karnataka';
    const customBillingPin = '560066';
    const customBillingCountry = 'India';

    const res2 = await request('/bookings', {
      method: 'POST',
      token: tokenAdmin,
      body: {
        exhibitionId: exhibition.id,
        stallIds: [stall2.id],
        companyId: masterCompany.id,
        confirmDirectly: true,
        billingName: customBillingName,
        billingGst: masterGst,
        billingPan: masterPan,
        billingAddress: customBillingAddress,
        billingCity: customBillingCity,
        billingState: customBillingState,
        billingPinCode: customBillingPin,
        billingCountry: customBillingCountry,
      },
    });

    assert(res2.status === 201, 'Scenario 2: Booking created with custom billing snapshots (201)');
    const bookingId2 = res2.data?.data?.data?.bookingId || res2.data?.data?.id;
    if (bookingId2) createdBookingIds.push(bookingId2);

    const bkg2 = await prisma.booking.findUnique({
      where: { id: bookingId2 },
    });

    assert(bkg2?.billingName === customBillingName, 'Scenario 2: billingName captured correctly', `Got: ${bkg2?.billingName}`);
    assert(bkg2?.billingGst === masterGst, 'Scenario 2: billingGst captured correctly', `Got: ${bkg2?.billingGst}`);
    assert(bkg2?.billingPan === masterPan, 'Scenario 2: billingPan captured correctly', `Got: ${bkg2?.billingPan}`);
    assert(bkg2?.billingAddress === customBillingAddress, 'Scenario 2: billingAddress captured correctly', `Got: ${bkg2?.billingAddress}`);
    assert(bkg2?.billingCity === customBillingCity, 'Scenario 2: billingCity captured correctly', `Got: ${bkg2?.billingCity}`);
    assert(bkg2?.billingState === customBillingState, 'Scenario 2: billingState captured correctly', `Got: ${bkg2?.billingState}`);
    assert(bkg2?.billingPinCode === customBillingPin, 'Scenario 2: billingPinCode captured correctly', `Got: ${bkg2?.billingPinCode}`);
    assert(bkg2?.billingCountry === customBillingCountry, 'Scenario 2: billingCountry captured correctly', `Got: ${bkg2?.billingCountry}`);

    // -------------------------------------------------------------------------
    // Scenario 3: A different contact booking for an existing legal company
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 3: Different Contact Booking for Existing Legal Company ---');
    const stall3 = await createTestStall('03');
    // Delegate User B creates a booking without overriding snapshots explicitly:
    // It should snapshot User B's contact details, while resolving legal billing details from master company
    const bkgResult3 = await BookingsService.createBooking(
      {
        userId: userB.id,
        email: userB.email,
        role: userB.role,
        companyId: userB.companyId,
      },
      {
        exhibitionId: exhibition.id,
        stallIds: [stall3.id],
        companyId: masterCompany.id,
        contactPerson: 'Delegate Priya Nair',
        contactEmail: delegateEmail,
        contactPhone: delegateMobile,
      }
    );

    const bookingId3 = (bkgResult3 as any)?.data?.bookingId || (bkgResult3 as any)?.id;
    if (bookingId3) createdBookingIds.push(bookingId3);

    const bkg3 = await prisma.booking.findUnique({
      where: { id: bookingId3 },
    });

    assert(bkg3?.contactPerson === 'Delegate Priya Nair', 'Scenario 3: Booking contactPerson reflects Delegate Priya Nair');
    assert(bkg3?.contactEmail === delegateEmail, 'Scenario 3: Booking contactEmail reflects delegate email');
    assert(bkg3?.contactPhone === delegateMobile, 'Scenario 3: Booking contactPhone reflects delegate mobile');
    assert(bkg3?.billingName === masterCompany.name, 'Scenario 3: Legal billing name inherited from existing legal company');
    assert(bkg3?.billingGst === masterCompany.gstNumber, 'Scenario 3: Legal GST inherited from existing legal company');

    // -------------------------------------------------------------------------
    // Scenario 4: Company master data remaining unchanged
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 4: Company Master Data Remaining Unchanged ---');
    const freshMasterCompany = await prisma.company.findUnique({
      where: { id: masterCompany.id },
    });

    assert(freshMasterCompany?.name === masterCompany.name, 'Scenario 4: Master company name unchanged');
    assert(freshMasterCompany?.contactPerson === 'Director Rajesh Varma', 'Scenario 4: Master contactPerson unchanged (not overwritten by delegate/custom contact)');
    assert(freshMasterCompany?.mobile === masterMobile, 'Scenario 4: Master mobile unchanged');
    assert(freshMasterCompany?.email === masterEmail, 'Scenario 4: Master email unchanged');
    assert(freshMasterCompany?.address === masterCompany.address, 'Scenario 4: Master address unchanged');
    assert(freshMasterCompany?.gstNumber === masterGst, 'Scenario 4: Master GST unchanged');
    assert(freshMasterCompany?.panNumber === masterPan, 'Scenario 4: Master PAN unchanged');

    // -------------------------------------------------------------------------
    // Scenario 5: Correct authenticated user association (No Arbitrary Spoofing)
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 5: Authenticated User Association & Spoof Protection ---');
    // User A makes a booking, but payload attempts to inject arbitrary userId
    const stall4 = await createTestStall('04');
    const spoofedUserId = '00000000-0000-0000-0000-000000000000';

    const res5 = await request('/bookings', {
      method: 'POST',
      token: tokenA,
      body: {
        exhibitionId: exhibition.id,
        stallIds: [stall4.id],
        companyId: masterCompany.id,
        userId: spoofedUserId, // Spoofed user ID attempt
      },
    });

    assert(res5.status === 201, 'Scenario 5: Client booking initiated (201)');
    const bookingId5 = res5.data?.data?.data?.bookingId || res5.data?.data?.id;
    if (bookingId5) createdBookingIds.push(bookingId5);

    const bkg5 = await prisma.booking.findUnique({
      where: { id: bookingId5 },
    });

    assert(bkg5?.userId === userA.id, 'Scenario 5: Booking.userId strictly bound to authenticated token userA.id', `Got: ${bkg5?.userId}`);
    assert(bkg5?.userId !== spoofedUserId, 'Scenario 5: Client-supplied arbitrary userId was completely ignored');

    // -------------------------------------------------------------------------
    // Scenario 6: Guest or unauthenticated booking behavior
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 6: Unauthenticated Guest Booking Behavior ---');
    const stall5 = await createTestStall('05');
    const res6 = await request('/bookings', {
      method: 'POST',
      body: {
        exhibitionId: exhibition.id,
        stallIds: [stall5.id],
        companyId: masterCompany.id,
      },
    });

    assert(res6.status === 201, 'Scenario 6: Unauthenticated guest booking succeeds with 201 Created', `Got ${res6.status}`);
    assert(res6.data?.success === true, 'Scenario 6: Success true returned for guest booking');
    const guestBookingId = res6.data?.data?.data?.bookingId || res6.data?.data?.id;
    if (guestBookingId) createdBookingIds.push(guestBookingId);

    // Verify stall was reserved and booking has no bound user account
    const stall5Check = await prisma.stall.findUnique({ where: { id: stall5.id } });
    assert(stall5Check?.status !== 'AVAILABLE', 'Scenario 6: Stall is reserved for the guest booking');

    if (guestBookingId) {
      const guestBkg = await prisma.booking.findUnique({ where: { id: guestBookingId } });
      assert(guestBkg?.userId === null, 'Scenario 6: Guest booking has userId: null preserving tenant isolation');
    }

    // -------------------------------------------------------------------------
    // Scenario 7: Existing bookings with nullable snapshot fields
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 7: Existing Bookings with Nullable Snapshot Fields ---');
    const stall6 = await createTestStall('06');
    const legacyBookingRef = `BKG-LEGACY-${suffix}`;
    const legacyBooking = await prisma.booking.create({
      data: {
        bookingReference: legacyBookingRef,
        companyId: masterCompany.id,
        exhibitionId: exhibition.id,
        status: 'CONFIRMED',
        totalAmount: 25000,
        taxAmount: 4500,
        grandTotal: 29500,
        paidAmount: 29500,
        balanceAmount: 0,
        paymentStatus: 'PAID_FULL',
        // Legacy record: all snapshot fields explicitly null
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
          create: [{ stallId: stall6.id, price: 25000 }],
        },
      },
    });
    createdBookingIds.push(legacyBooking.id);

    // Verify querying by ID succeeds without error
    const res7 = await request(`/bookings/${legacyBooking.id}`, {
      token: tokenAdmin,
    });
    assert(res7.status === 200, 'Scenario 7: GET /bookings/:id returns 200 OK for booking with null snapshots');
    assert(res7.data?.data?.billingName === null, 'Scenario 7: billingName gracefully serialized as null');

    // -------------------------------------------------------------------------
    // Scenario 8: Idempotent backfill behavior
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 8: Idempotent Backfill Behavior ---');
    // First backfill pass: should detect and update legacyBooking
    const backfillPass1 = await BookingsService.backfillHistoricalSnapshots();
    assert(backfillPass1.totalProcessed >= 1, `Scenario 8: First pass processed ${backfillPass1.totalProcessed} legacy booking(s)`);
    assert(backfillPass1.updated >= 1, `Scenario 8: First pass updated ${backfillPass1.updated} booking(s)`);

    const legacyReloaded = await prisma.booking.findUnique({
      where: { id: legacyBooking.id },
    });
    assert(legacyReloaded?.billingName === masterCompany.name, 'Scenario 8: Legacy booking billingName backfilled from company master');
    assert(legacyReloaded?.contactPerson === masterCompany.contactPerson, 'Scenario 8: Legacy booking contactPerson backfilled');
    assert(legacyReloaded?.contactEmail === masterCompany.email, 'Scenario 8: Legacy booking contactEmail backfilled');
    assert(legacyReloaded?.billingGst === masterCompany.gstNumber, 'Scenario 8: Legacy booking billingGst backfilled');

    // Second backfill pass: must be completely idempotent (0 updated)
    const backfillPass2 = await BookingsService.backfillHistoricalSnapshots();
    assert(backfillPass2.totalProcessed === 0, 'Scenario 8: Second pass found 0 missing bookings (idempotent)');
    assert(backfillPass2.updated === 0, 'Scenario 8: Second pass made 0 updates (idempotent)');

    // -------------------------------------------------------------------------
    // Scenario 9: Migration compatibility with existing data
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 9: Migration Compatibility with Existing Data ---');
    // Inspect database column schema directly
    const columnDefinitions: any = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Booking'
        AND column_name IN (
          'contactPerson', 'contactEmail', 'contactPhone',
          'billingName', 'billingGst', 'billingPan',
          'billingAddress', 'billingCity', 'billingState',
          'billingPinCode', 'billingCountry', 'userId'
        )
      ORDER BY column_name;
    `);

    assert(columnDefinitions.length === 12, `Scenario 9: All 12 new snapshot & user columns exist in DB (Found ${columnDefinitions.length})`);
    const allNullable = columnDefinitions.every((col: any) => col.is_nullable === 'YES');
    assert(allNullable, 'Scenario 9: All snapshot columns are NULLABLE, guaranteeing backwards compatibility');

    // Check userId foreign key
    const fkConstraints: any = await prisma.$queryRawUnsafe(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'Booking' AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%userId%';
    `);
    assert(fkConstraints.length >= 1, 'Scenario 9: Foreign key constraint on Booking.userId exists');

    // Check index on userId
    const indexes: any = await prisma.$queryRawUnsafe(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'Booking' AND indexname = 'Booking_userId_idx';
    `);
    assert(indexes.length === 1, 'Scenario 9: Index Booking_userId_idx exists');

    // Verify all existing bookings in database have valid state
    const totalDbBookings = await prisma.booking.count();
    const missingBillingAfterBackfill = await prisma.booking.count({
      where: { billingName: null },
    });
    assert(missingBillingAfterBackfill === 0, `Scenario 9: All ${totalDbBookings} database bookings have valid billing snapshots after backfill`);

    // -------------------------------------------------------------------------
    // Scenario 10: Phase 2.1 account-takeover & Phase 2.2 company-identity regressions
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 10: Phase 2.1 & 2.2 Security Regressions ---');
    // Phase 2.1 check: Attempt unauthenticated company registration with existing user's email
    const res10_1 = await request('/companies', {
      method: 'POST',
      body: {
        name: `Attacker Corp ${suffix}`,
        contactPerson: 'Attacker Bob',
        mobile: '9999912345',
        email: masterEmail, // Matches existing User A email
        address: '123 Fake Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400001',
      },
    });
    assert(res10_1.status === 409, 'Scenario 10: Registration with existing email rejected with 409 Conflict');
    assert(res10_1.data?.code === 'ACCOUNT_EXISTS', 'Scenario 10: Account takeover payload blocked with ACCOUNT_EXISTS');

    // Phase 2.2 check: Attempt registration with matching GSTIN but different contact info
    const res10_2 = await request('/companies', {
      method: 'POST',
      body: {
        name: masterCompany.name,
        contactPerson: 'Intruder Overwrite',
        mobile: '9111122222',
        email: `new_delegate_${suffix}@different.example.com`,
        address: 'Overwritten Master Address',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400001',
        gstNumber: masterGst,
      },
    });
    assert(res10_2.status === 200 || res10_2.status === 201, 'Scenario 10: Matching GSTIN reuses existing verified legal company', `Got ${res10_2.status}`);
    const recheckedCompany = await prisma.company.findUnique({ where: { id: masterCompany.id } });
    assert(recheckedCompany?.contactPerson === 'Director Rajesh Varma', 'Scenario 10: Master company contactPerson NOT overwritten during registration reuse');
    assert(recheckedCompany?.address === masterCompany.address, 'Scenario 10: Master company address NOT overwritten');

    // -------------------------------------------------------------------------
    // Scenario 11: Existing booking, payment, invoice-download, and reporting regressions
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 11: Payment, Invoice & Cancellation Regressions ---');
    // Test payment creation on snapshotted booking
    const payment = await prisma.payment.create({
      data: {
        paymentReference: `PAY-SNP-${suffix}`,
        bookingId: bkg1!.id,
        amount: 29500,
        currency: 'INR',
        status: 'SUCCESS',
        provider: 'OFFLINE',
        paidAt: new Date(),
      },
    });

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-SNP-${suffix}`,
        bookingId: bkg1!.id,
        paymentId: payment.id,
        companyId: masterCompany.id,
        totalAmount: 25000,
        taxAmount: 4500,
        grandTotal: 29500,
        status: 'PAID',
        issueDate: new Date(),
      },
    });

    // Test invoice PDF download route with snapshotted booking
    const res11_pdf = await request(`/invoices/${invoice.id}/pdf`, {
      token: tokenAdmin,
    });
    assert(res11_pdf.status === 200, 'Scenario 11: Invoice PDF download returns 200 OK');
    const contentType = res11_pdf.headers.get('content-type');
    assert(contentType?.includes('application/pdf') === true, `Scenario 11: Invoice download is application/pdf (Got: ${contentType})`);

    // Test booking cancellation on snapshotted booking
    const stall7 = await createTestStall('07');
    const cancellableBooking = await prisma.booking.create({
      data: {
        bookingReference: `BKG-CANCEL-${suffix}`,
        companyId: masterCompany.id,
        exhibitionId: exhibition.id,
        status: 'PENDING_PAYMENT',
        totalAmount: 25000,
        taxAmount: 4500,
        grandTotal: 29500,
        paidAmount: 0,
        balanceAmount: 29500,
        paymentStatus: 'UNPAID',
        contactPerson: 'Cancellable Contact',
        contactEmail: 'cancel@example.com',
        billingName: masterCompany.name,
        stalls: {
          create: [{ stallId: stall7.id, price: 25000 }],
        },
      },
    });
    createdBookingIds.push(cancellableBooking.id);

    const cancelRes = await BookingsService.cancelBooking(cancellableBooking.id);
    assert(cancelRes.booking?.status === 'CANCELLED', 'Scenario 11: Snapshotted booking successfully cancelled');
    const cancelledStall = await prisma.stall.findUnique({ where: { id: stall7.id } });
    assert(cancelledStall?.status === 'AVAILABLE', 'Scenario 11: Stall reset to AVAILABLE upon booking cancellation');

    // Clean up created payment and invoice
    await prisma.invoice.delete({ where: { id: invoice.id } }).catch(() => {});
    await prisma.payment.delete({ where: { id: payment.id } }).catch(() => {});

  } catch (err: any) {
    console.error('💥 Test suite encountered an unhandled exception:', err);
    failed++;
  } finally {
    // -------------------------------------------------------------------------
    // Cleanup Test Entities
    // -------------------------------------------------------------------------
    (razorpay.orders as any).create = origOrdersCreate;

    console.log('\n--- Cleaning up test records ---');
    try {
      if (testExhibitionId) {
        const testBkgs = await prisma.booking.findMany({ where: { exhibitionId: testExhibitionId }, select: { id: true } });
        const allBkgIds = Array.from(new Set([...createdBookingIds, ...testBkgs.map(b => b.id)]));
        if (allBkgIds.length > 0) {
          await prisma.invoice.deleteMany({ where: { bookingId: { in: allBkgIds } } }).catch(() => {});
          await prisma.payment.deleteMany({ where: { bookingId: { in: allBkgIds } } }).catch(() => {});
          await prisma.bookingStall.deleteMany({ where: { bookingId: { in: allBkgIds } } }).catch(() => {});
          await prisma.booking.deleteMany({ where: { id: { in: allBkgIds } } }).catch(() => {});
        }
      } else if (createdBookingIds.length > 0) {
        await prisma.invoice.deleteMany({ where: { bookingId: { in: createdBookingIds } } }).catch(() => {});
        await prisma.payment.deleteMany({ where: { bookingId: { in: createdBookingIds } } }).catch(() => {});
        await prisma.bookingStall.deleteMany({ where: { bookingId: { in: createdBookingIds } } }).catch(() => {});
        await prisma.booking.deleteMany({ where: { id: { in: createdBookingIds } } }).catch(() => {});
      }
      if (createdStallIds.length > 0) {
        await prisma.bookingStall.deleteMany({ where: { stallId: { in: createdStallIds } } }).catch(() => {});
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
  console.log(`📊 PHASE 2.3 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2_3Suite()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
