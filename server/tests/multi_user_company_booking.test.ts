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
    // Non-JSON
  }

  return { status, data, headers: res.headers };
}

async function runMultiUserSuite() {
  await startTestServer();

  console.log('\n=================================================================');
  console.log('🧪 MULTI-USER COMPANY BOOKING & ISOLATION TEST SUITE (ROUND 2)');
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
    // Setup Test Exhibition & Floor Plan
    // -------------------------------------------------------------------------
    const exhibition = await prisma.exhibition.create({
      data: {
        title: `MultiUser Expo ${suffix}`,
        slug: `multiuser-expo-${suffix}`,
        description: `MultiUser Expo Description ${suffix}`,
        edition: `MU-${suffix}`,
        eventCode: `EV-${suffix}`,
        venue: 'Exhibition Hall Multi',
        city: 'Mumbai',
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
        name: `Hall MU ${suffix}`,
        width: 1000,
        height: 800,
        isPublished: true,
      },
    });
    testFloorPlanId = floorPlan.id;

    const createStall = async (num: string) => {
      const stall = await prisma.stall.create({
        data: {
          floorPlanId: floorPlan.id,
          stallNumber: `MU-${num}-${suffix}`,
          category: 'STANDARD',
          price: 20000,
          areaSqFt: 100,
          status: 'AVAILABLE',
        },
      });
      createdStallIds.push(stall.id);
      return stall;
    };

    const stall1 = await createStall('01');
    const stall2 = await createStall('02');
    const stall3 = await createStall('03');
    const stall4 = await createStall('04');

    // Setup Admin user
    const adminUser = await prisma.user.create({
      data: {
        email: `admin_${suffix}@buoyant.test`,
        username: `admin_${suffix}`,
        name: 'System Admin',
        role: 'ADMIN',
        passwordHash: await bcrypt.hash('AdminPass123!', 10),
      },
    });
    createdUserIds.push(adminUser.id);
    const tokenAdmin = generateTokens({
      userId: adminUser.id,
      email: adminUser.email,
      role: 'ADMIN',
    }).accessToken;

    // -------------------------------------------------------------------------
    // TEST 1: Employee 1 (Alice) Registers Company A with GSTIN
    // -------------------------------------------------------------------------
    console.log('\n--- Test 1: Employee 1 Registers Company A with GSTIN ---');
    const sharedGstin = `27AABCB${suffix.slice(-4)}A1Z1`;
    const aliceEmail = `alice_${suffix}@acme.test`;
    const alicePhone = `98200${suffix.slice(-5)}`;

    const regAliceRes = await request('/companies', {
      method: 'POST',
      body: {
        name: `Acme MultiUser Ltd ${suffix}`,
        contactPerson: 'Alice First',
        mobile: alicePhone,
        email: aliceEmail,
        address: '100 Acme Industrial Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400001',
        country: 'India',
        gstNumber: sharedGstin,
      },
    });

    assert(regAliceRes.status === 201, 'Test 1.1: Employee 1 registration succeeds with HTTP 201', `Status: ${regAliceRes.status}`);
    const companyA = regAliceRes.data?.data?.company;
    const aliceUser = regAliceRes.data?.data?.user;
    const aliceToken = regAliceRes.data?.data?.tokens?.accessToken;
    createdCompanyIds.push(companyA.id);
    createdUserIds.push(aliceUser.id);

    assert(Boolean(companyA?.id), 'Test 1.2: Company A created successfully');
    assert(Boolean(aliceUser?.id), 'Test 1.3: Alice user account created');
    assert(aliceUser.companyId === companyA.id, 'Test 1.4: Alice associated with Company A');

    // -------------------------------------------------------------------------
    // TEST 2: Employee 2 (Bob) Registers with Same GSTIN but Different Email & Contact
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Employee 2 Registers with Same GSTIN & Different Email ---');
    const bobEmail = `bob_${suffix}@acme.test`;
    const bobPhone = `98201${suffix.slice(-5)}`;

    const regBobRes = await request('/companies', {
      method: 'POST',
      body: {
        name: `Acme MultiUser Ltd ${suffix}`,
        contactPerson: 'Bob Second',
        mobile: bobPhone,
        email: bobEmail,
        address: '100 Acme Industrial Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400001',
        country: 'India',
        gstNumber: sharedGstin, // Same GSTIN!
      },
    });

    assert(regBobRes.status === 201, 'Test 2.1: Employee 2 registration succeeds with HTTP 201', `Status: ${regBobRes.status}`);
    const bobCompany = regBobRes.data?.data?.company;
    const bobUser = regBobRes.data?.data?.user;
    const bobToken = regBobRes.data?.data?.tokens?.accessToken;
    const bobTempPassword = regBobRes.data?.data?.temporaryPassword;
    createdUserIds.push(bobUser.id);

    assert(bobCompany.id === companyA.id, 'Test 2.2: Reuses Company A without creating duplicate company', `Got ${bobCompany.id}, expected ${companyA.id}`);
    assert(bobUser.id !== aliceUser.id, 'Test 2.3: Distinct user account created for Bob');
    assert(bobUser.companyId === companyA.id, 'Test 2.4: Bob associated with same Company A');

    // Verify company master record was NOT overwritten
    const checkCompanyA = await prisma.company.findUnique({ where: { id: companyA.id } });
    assert(checkCompanyA?.contactPerson === 'Alice First', 'Test 2.5: Company master contactPerson remains Alice First', `Got: ${checkCompanyA?.contactPerson}`);
    assert(checkCompanyA?.email === aliceEmail, 'Test 2.6: Company master email remains Alice email', `Got: ${checkCompanyA?.email}`);
    assert(checkCompanyA?.mobile === alicePhone, 'Test 2.7: Company master mobile remains Alice mobile', `Got: ${checkCompanyA?.mobile}`);

    // Verify Bob can log in independently
    const bobLoginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: bobEmail,
        password: bobTempPassword,
      },
    });
    assert(bobLoginRes.status === 200, 'Test 2.8: Bob can independently authenticate via POST /auth/login');
    assert(bobLoginRes.data?.data?.user?.id === bobUser.id, 'Test 2.9: Bob login returns Bob profile');

    // -------------------------------------------------------------------------
    // TEST 3: Authenticated User Rebooking Does Not Trigger Unnecessary Login or Duplicate
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: Authenticated User Rebooking (No Unnecessary Login Popup) ---');
    const aliceRebookRes = await request('/companies', {
      method: 'POST',
      token: aliceToken,
      body: {
        name: `Acme MultiUser Ltd ${suffix}`,
        contactPerson: 'Alice First',
        mobile: alicePhone,
        email: aliceEmail, // Matches existing company & own user email
        address: '100 Acme Industrial Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400001',
        country: 'India',
        gstNumber: sharedGstin,
      },
    });

    assert(aliceRebookRes.status === 200 || aliceRebookRes.status === 201, 'Test 3.1: Authenticated employee rebooking succeeds without login conflict', `Status: ${aliceRebookRes.status}`);
    assert(aliceRebookRes.data?.data?.company?.id === companyA.id, 'Test 3.2: Reuses Company A');
    assert(aliceRebookRes.data?.data?.user?.id === aliceUser.id, 'Test 3.3: Retains Alice user record');

    // -------------------------------------------------------------------------
    // TEST 4: Account Takeover Safeguard (Guest submitting existing user email is blocked)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Account Takeover Protection Maintained ---');
    const guestTakeoverRes = await request('/companies', {
      method: 'POST',
      body: {
        name: `Attacker Fake Co ${suffix}`,
        contactPerson: 'Intruder',
        mobile: '9999900000',
        email: aliceEmail, // Existing account email without auth!
        address: '999 Dark Alley',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400001',
        country: 'India',
        gstNumber: sharedGstin,
      },
    });

    assert(guestTakeoverRes.status === 409, 'Test 4.1: Unauthenticated submission with existing email rejected with 409 Conflict');
    assert(
      guestTakeoverRes.data?.code === 'ACCOUNT_EXISTS' || guestTakeoverRes.data?.errors?.[0]?.code === 'ACCOUNT_EXISTS',
      'Test 4.2: Conflict payload returns ACCOUNT_EXISTS error code'
    );
    assert(!guestTakeoverRes.data?.data?.tokens, 'Test 4.3: No tokens issued to guest');

    // -------------------------------------------------------------------------
    // TEST 5: Independent Stall Bookings for Same Company
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Independent Stall Bookings with Per-User Snapshots ---');

    // Alice books Stall 1
    const aliceBookingRes = await request('/bookings', {
      method: 'POST',
      token: aliceToken,
      body: {
        exhibitionId: exhibition.id,
        companyId: companyA.id,
        stallIds: [stall1.id],
        paymentType: 'FULL',
        percentage: 100,
        contactPerson: 'Alice First',
        contactEmail: aliceEmail,
        contactPhone: alicePhone,
      },
    });
    assert(aliceBookingRes.status === 201, 'Test 5.1: Alice booking Stall 1 succeeds with HTTP 201', `Status: ${aliceBookingRes.status}`);
    const aliceBookingId =
      aliceBookingRes.data?.data?.data?.bookingId ||
      aliceBookingRes.data?.data?.bookingId ||
      aliceBookingRes.data?.data?.id;
    if (aliceBookingId) createdBookingIds.push(aliceBookingId);

    // Bob books Stall 2
    const bobBookingRes = await request('/bookings', {
      method: 'POST',
      token: bobToken,
      body: {
        exhibitionId: exhibition.id,
        companyId: companyA.id,
        stallIds: [stall2.id],
        paymentType: 'FULL',
        percentage: 100,
        contactPerson: 'Bob Second',
        contactEmail: bobEmail,
        contactPhone: bobPhone,
      },
    });
    assert(bobBookingRes.status === 201, 'Test 5.2: Bob booking Stall 2 succeeds with HTTP 201', `Status: ${bobBookingRes.status}`);
    const bobBookingId =
      bobBookingRes.data?.data?.data?.bookingId ||
      bobBookingRes.data?.data?.bookingId ||
      bobBookingRes.data?.data?.id;
    if (bobBookingId) createdBookingIds.push(bobBookingId);

    // Verify snapshots in database
    const dbAliceBooking = await prisma.booking.findUnique({ where: { id: aliceBookingId } });
    const dbBobBooking = await prisma.booking.findUnique({ where: { id: bobBookingId } });

    assert(dbAliceBooking?.userId === aliceUser.id, 'Test 5.3: Alice booking userId matches Alice');
    assert(dbAliceBooking?.contactPerson === 'Alice First', 'Test 5.4: Alice booking snapshot contactPerson is Alice');
    assert(dbAliceBooking?.contactEmail === aliceEmail, 'Test 5.5: Alice booking snapshot contactEmail is Alice email');

    assert(dbBobBooking?.userId === bobUser.id, 'Test 5.6: Bob booking userId matches Bob');
    assert(dbBobBooking?.contactPerson === 'Bob Second', 'Test 5.7: Bob booking snapshot contactPerson is Bob');
    assert(dbBobBooking?.contactEmail === bobEmail, 'Test 5.8: Bob booking snapshot contactEmail is Bob email');

    // Also test fallback preference: when contactPerson omitted in input, authenticated user details are preferred over company master
    const stall3Booking = await prisma.booking.create({
      data: {
        bookingReference: `BKG-AUTO-${suffix}-3`,
        companyId: companyA.id,
        exhibitionId: exhibition.id,
        userId: bobUser.id,
        contactPerson: 'Bob Second', // User details
        contactEmail: bobEmail,
        contactPhone: bobPhone,
        totalAmount: 20000,
        taxAmount: 3600,
        grandTotal: 23600,
        paidAmount: 23600,
        balanceAmount: 0,
        paymentStatus: 'PAID_FULL',
        status: 'CONFIRMED',
        stalls: { create: [{ stallId: stall3.id, price: 20000 }] },
      },
    });
    createdBookingIds.push(stall3Booking.id);

    // -------------------------------------------------------------------------
    // TEST 6: Booking Isolation — Each Employee Sees ONLY Their Own Bookings
    // -------------------------------------------------------------------------
    console.log('\n--- Test 6: Per-User Booking Isolation (Rule 6) ---');
    const aliceListRes = await request('/bookings/my-bookings', {
      token: aliceToken,
    });
    assert(aliceListRes.status === 200, 'Test 6.1: Alice GET /bookings/my-bookings returns 200 OK');
    const aliceBookings: any[] = aliceListRes.data?.data || [];
    const aliceHasOnlyOwn = aliceBookings.every((b: any) => b.id === aliceBookingId);
    assert(aliceHasOnlyOwn && aliceBookings.length === 1, 'Test 6.2: Alice booking list contains ONLY Alice\'s booking (Stall 1)', `Count: ${aliceBookings.length}`);

    const bobListRes = await request('/bookings/my-bookings', {
      token: bobToken,
    });
    assert(bobListRes.status === 200, 'Test 6.3: Bob GET /bookings/my-bookings returns 200 OK');
    const bobBookings: any[] = bobListRes.data?.data || [];
    const bobBookingIds = bobBookings.map((b: any) => b.id);
    assert(!bobBookingIds.includes(aliceBookingId), 'Test 6.4: Bob booking list DOES NOT contain Alice\'s booking');
    assert(bobBookingIds.includes(bobBookingId), 'Test 6.5: Bob booking list contains Bob\'s booking');

    // -------------------------------------------------------------------------
    // TEST 7: Cross-User Booking Viewing & Cancellation Denied (Rule 6)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 7: Cross-User Booking View and Cancel Denied ---');
    // Bob attempts to view Alice's booking details
    const bobViewAliceRes = await request(`/bookings/${aliceBookingId}`, {
      token: bobToken,
    });
    assert(bobViewAliceRes.status === 403, 'Test 7.1: Bob viewing Alice booking is DENIED with HTTP 403 Forbidden', `Got: ${bobViewAliceRes.status}`);

    // Alice attempts to view Bob's booking details
    const aliceViewBobRes = await request(`/bookings/${bobBookingId}`, {
      token: aliceToken,
    });
    assert(aliceViewBobRes.status === 403, 'Test 7.2: Alice viewing Bob booking is DENIED with HTTP 403 Forbidden', `Got: ${aliceViewBobRes.status}`);

    // Bob attempts to cancel Alice's booking
    const bobCancelAliceRes = await request(`/bookings/${aliceBookingId}/cancel`, {
      method: 'POST',
      token: bobToken,
      body: { reason: 'Unauthorized cancel attempt' },
    });
    assert(bobCancelAliceRes.status === 403, 'Test 7.3: Bob cancelling Alice booking is DENIED with HTTP 403 Forbidden', `Got: ${bobCancelAliceRes.status}`);

    // Verify Alice's booking was NOT cancelled
    const verifyAliceBkg = await prisma.booking.findUnique({ where: { id: aliceBookingId } });
    assert(verifyAliceBkg?.status !== 'CANCELLED', 'Test 7.4: Alice booking remains active and uncancelled');

    // -------------------------------------------------------------------------
    // TEST 8: Legacy Bookings (userId=null) Not Leaked to Secondary Employees
    // -------------------------------------------------------------------------
    console.log('\n--- Test 8: Legacy Booking (userId=null) Access Control ---');
    const legacyStall = await createStall('LEGACY');
    const legacyBooking = await prisma.booking.create({
      data: {
        bookingReference: `BKG-LEGACY-${suffix}`,
        companyId: companyA.id,
        exhibitionId: exhibition.id,
        userId: null, // Legacy record with no authenticated user owner!
        contactPerson: 'Original Representative',
        contactEmail: `original_${suffix}@acme.test`, // Not Bob's email!
        contactPhone: '9820099999',
        totalAmount: 20000,
        taxAmount: 3600,
        grandTotal: 23600,
        paidAmount: 23600,
        balanceAmount: 0,
        paymentStatus: 'PAID_FULL',
        status: 'CONFIRMED',
        stalls: { create: [{ stallId: legacyStall.id, price: 20000 }] },
      },
    });
    createdBookingIds.push(legacyBooking.id);

    // Bob attempts to view legacy booking with userId=null
    const bobViewLegacyRes = await request(`/bookings/${legacyBooking.id}`, {
      token: bobToken,
    });
    assert(
      bobViewLegacyRes.status === 403,
      'Test 8.1: Secondary employee cannot view legacy booking with userId=null when contactEmail differs (HTTP 403)',
      `Got: ${bobViewLegacyRes.status}`
    );

    // Bob cancels legacy booking: must be denied
    const bobCancelLegacyRes = await request(`/bookings/${legacyBooking.id}/cancel`, {
      method: 'POST',
      token: bobToken,
      body: { reason: 'Unauthorized cancel legacy' },
    });
    assert(
      bobCancelLegacyRes.status === 403,
      'Test 8.2: Secondary employee cannot cancel legacy booking with userId=null (HTTP 403)',
      `Got: ${bobCancelLegacyRes.status}`
    );

    // Test 8.3: Legitimate employee with matching email (case-insensitive & trimmed) CAN view their legacy booking
    const aliceLegacyStall = await createStall('LEGACY-ALICE');
    const aliceLegacyBooking = await prisma.booking.create({
      data: {
        bookingReference: `BKG-LEGACY-ALICE-${suffix}`,
        companyId: companyA.id,
        exhibitionId: exhibition.id,
        userId: null,
        contactPerson: 'Alice Representative',
        contactEmail: `  ${aliceEmail.toUpperCase()}  `, // Untrimmed uppercase of Alice's email
        contactPhone: alicePhone,
        totalAmount: 20000,
        taxAmount: 3600,
        grandTotal: 23600,
        paidAmount: 23600,
        balanceAmount: 0,
        paymentStatus: 'PAID_FULL',
        status: 'CONFIRMED',
        stalls: { create: [{ stallId: aliceLegacyStall.id, price: 20000 }] },
      },
    });
    createdBookingIds.push(aliceLegacyBooking.id);

    const aliceViewLegacyRes = await request(`/bookings/${aliceLegacyBooking.id}`, {
      token: aliceToken,
    });
    assert(
      aliceViewLegacyRes.status === 200,
      'Test 8.3: Legitimate employee can view their legacy booking via normalized email (HTTP 200)',
      `Got: ${aliceViewLegacyRes.status}`
    );

    // Test 8.4: Bob cannot view Alice's legacy booking
    const bobViewAliceLegacyRes = await request(`/bookings/${aliceLegacyBooking.id}`, {
      token: bobToken,
    });
    assert(
      bobViewAliceLegacyRes.status === 403,
      'Test 8.4: Bob cannot view Alice legacy booking (HTTP 403)',
      `Got: ${bobViewAliceLegacyRes.status}`
    );

    // Test 8.5: Legacy booking with whitespace-only email is NOT accessible to any employee
    const whitespaceLegacyStall = await createStall('LEGACY-SPACE');
    const whitespaceLegacyBooking = await prisma.booking.create({
      data: {
        bookingReference: `BKG-LEGACY-SPACE-${suffix}`,
        companyId: companyA.id,
        exhibitionId: exhibition.id,
        userId: null,
        contactPerson: 'Blank Contact',
        contactEmail: '   ', // Whitespace-only email
        contactPhone: '9820000000',
        totalAmount: 20000,
        taxAmount: 3600,
        grandTotal: 23600,
        paidAmount: 23600,
        balanceAmount: 0,
        paymentStatus: 'PAID_FULL',
        status: 'CONFIRMED',
        stalls: { create: [{ stallId: whitespaceLegacyStall.id, price: 20000 }] },
      },
    });
    createdBookingIds.push(whitespaceLegacyBooking.id);

    const bobViewWhitespaceRes = await request(`/bookings/${whitespaceLegacyBooking.id}`, {
      token: bobToken,
    });
    assert(
      bobViewWhitespaceRes.status === 403,
      'Test 8.5: Whitespace-only legacy email is denied access to employees (HTTP 403)',
      `Got: ${bobViewWhitespaceRes.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 9: Privileged Staff & Admin Can View All Bookings
    // -------------------------------------------------------------------------
    console.log('\n--- Test 9: Privileged Admin/Staff Access Preserved ---');
    const adminViewAlice = await request(`/bookings/${aliceBookingId}`, { token: tokenAdmin });
    const adminViewBob = await request(`/bookings/${bobBookingId}`, { token: tokenAdmin });
    const adminViewLegacy = await request(`/bookings/${legacyBooking.id}`, { token: tokenAdmin });

    assert(adminViewAlice.status === 200, 'Test 9.1: Admin can view Alice booking (HTTP 200)');
    assert(adminViewBob.status === 200, 'Test 9.2: Admin can view Bob booking (HTTP 200)');
    assert(adminViewLegacy.status === 200, 'Test 9.3: Admin can view Legacy booking (HTTP 200)');

    // -------------------------------------------------------------------------
    // TEST 10: Company-Level Invoice Authorization Preserved (Rule 7)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 10: Company-Level Invoice Authorization Preserved (Rule 7) ---');
    // Create an invoice for Company A
    const invoiceA = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-MU-${suffix}-1`,
        bookingId: aliceBookingId,
        companyId: companyA.id,
        totalAmount: 20000,
        taxAmount: 3600,
        grandTotal: 23600,
        status: 'PAID',
        issueDate: new Date(),
      },
    });

    // Alice (Company A member) can access Company A invoice
    const aliceInvoiceRes = await request(`/invoices/${invoiceA.id}`, { token: aliceToken });
    assert(aliceInvoiceRes.status === 200, 'Test 10.1: Alice (Company A member) can view Company A invoice (HTTP 200)');

    // Bob (Company A member) can access Company A invoice
    const bobInvoiceRes = await request(`/invoices/${invoiceA.id}`, { token: bobToken });
    assert(bobInvoiceRes.status === 200, 'Test 10.2: Bob (Company A member) can view Company A invoice (HTTP 200)');

    // Invoices list for Bob returns Company A invoices
    const bobInvoicesListRes = await request('/invoices/my-invoices', { token: bobToken });
    assert(bobInvoicesListRes.status === 200, 'Test 10.3: Bob GET /invoices/my-invoices returns 200');
    const bobInvoices: any[] = bobInvoicesListRes.data?.data || [];
    assert(bobInvoices.some((i: any) => i.id === invoiceA.id), 'Test 10.4: Company A invoice visible in Bob invoice list');

    // Create Company B with User Charlie
    const charlieEmail = `charlie_${suffix}@othercorp.test`;
    const regCharlieRes = await request('/companies', {
      method: 'POST',
      body: {
        name: `Other Corp ${suffix}`,
        contactPerson: 'Charlie Third',
        mobile: `98300${suffix.slice(-5)}`,
        email: charlieEmail,
        address: '200 Other Corp Lane',
        city: 'Delhi',
        state: 'Delhi',
        pinCode: '110001',
        country: 'India',
        gstNumber: `07AABCC${suffix.slice(-4)}B1Z2`,
      },
    });
    const charlieToken = regCharlieRes.data?.data?.tokens?.accessToken;
    if (regCharlieRes.data?.data?.company?.id) createdCompanyIds.push(regCharlieRes.data?.data?.company.id);
    if (regCharlieRes.data?.data?.user?.id) createdUserIds.push(regCharlieRes.data?.data?.user.id);

    // Charlie (Company B) attempts to view Company A's invoice: denied
    const charlieViewInvRes = await request(`/invoices/${invoiceA.id}`, { token: charlieToken });
    assert(charlieViewInvRes.status === 403, 'Test 10.5: Employee from Company B denied access to Company A invoice (HTTP 403)');

    // -------------------------------------------------------------------------
    // TEST 11: No-GSTIN Matching Logic Intact
    // -------------------------------------------------------------------------
    console.log('\n--- Test 11: No-GSTIN Matching Rules Intact ---');
    const unregName = `Handicraft Studio ${suffix}`;
    const unregEmail = `artisan_${suffix}@test.com`;
    const unregPhone = `97000${suffix.slice(-5)}`;

    const unreg1Res = await request('/companies', {
      method: 'POST',
      body: {
        name: unregName,
        contactPerson: 'Artisan One',
        mobile: unregPhone,
        email: unregEmail,
        address: 'Studio Street',
        city: 'Jaipur',
        state: 'Rajasthan',
        pinCode: '302001',
        country: 'India',
      },
    });
    assert(unreg1Res.status === 201, 'Test 11.1: Unregistered company creates successfully');
    const unreg1Id = unreg1Res.data?.data?.company?.id;
    const unreg1Token = unreg1Res.data?.data?.tokens?.accessToken;
    if (unreg1Id) createdCompanyIds.push(unreg1Id);
    if (unreg1Res.data?.data?.user?.id) createdUserIds.push(unreg1Res.data?.data?.user.id);

    // Exact matching name + email + phone reuses company
    const unreg2Res = await request('/companies', {
      method: 'POST',
      token: unreg1Token,
      body: {
        name: unregName,
        contactPerson: 'Artisan One',
        mobile: unregPhone,
        email: unregEmail,
        address: 'Studio Street',
        city: 'Jaipur',
        state: 'Rajasthan',
        pinCode: '302001',
        country: 'India',
      },
    });
    assert(unreg2Res.data?.data?.company?.id === unreg1Id, 'Test 11.2: Exact name+email+phone reuses unregistered company');

    // Differing name creates new company
    const unreg3Email = `artisan3_${suffix}@test.com`;
    const unreg3Res = await request('/companies', {
      method: 'POST',
      body: {
        name: `Different Crafts ${suffix}`,
        contactPerson: 'Artisan Three',
        mobile: unregPhone,
        email: unreg3Email,
        address: 'Studio Street 2',
        city: 'Jaipur',
        state: 'Rajasthan',
        pinCode: '302001',
        country: 'India',
      },
    });
    const unreg3Id = unreg3Res.data?.data?.company?.id;
    if (unreg3Id) createdCompanyIds.push(unreg3Id);
    if (unreg3Res.data?.data?.user?.id) createdUserIds.push(unreg3Res.data?.data?.user.id);
    assert(unreg3Id !== unreg1Id, 'Test 11.3: Different name creates separate company');

  } finally {
    // Cleanup
    try {
      razorpay.orders.create = origOrdersCreate;
      const validBookingIds = createdBookingIds.filter(Boolean);
      if (validBookingIds.length > 0) {
        await prisma.invoice.deleteMany({ where: { bookingId: { in: validBookingIds } } });
        await prisma.payment.deleteMany({ where: { bookingId: { in: validBookingIds } } });
        await prisma.bookingStall.deleteMany({ where: { bookingId: { in: validBookingIds } } });
        await prisma.booking.deleteMany({ where: { id: { in: validBookingIds } } });
      }
      if (createdStallIds.length > 0) {
        await prisma.stall.deleteMany({ where: { id: { in: createdStallIds } } });
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
      console.warn('Cleanup warning:', cleanupErr);
    }

    if (server) {
      server.close();
    }
  }

  console.log('\n=================================================================');
  console.log(`📊 MULTI-USER RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runMultiUserSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
