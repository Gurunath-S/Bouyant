import { createApp } from '../src/app.js';
import { prisma } from '../src/config/db.js';
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
    // Non-JSON response
  }

  return { status, data };
}

async function runWizardSessionTestSuite() {
  await startTestServer();

  console.log('\n======================================================');
  console.log('🧪 PHASE 2.5: WIZARD REGISTRATION & SESSION RETENTION');
  console.log('======================================================\n');

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

  try {
    const runId = Date.now().toString().slice(-6);
    const hashedPassword = await bcrypt.hash('SecretPass123!', 10);

    // Seed test expo
    const expo = await prisma.exhibition.create({
      data: {
        title: `Phase 2.5 Wizard Expo ${runId}`,
        slug: `wizard-expo-${runId}`,
        description: 'Phase 2.5 Test Expo Description',
        venue: 'Hall 5, Pragati Maidan',
        city: 'New Delhi',
        startDate: new Date(Date.now() + 86400000 * 30),
        endDate: new Date(Date.now() + 86400000 * 35),
        bookingEndDate: new Date(Date.now() + 86400000 * 20),
        status: 'PUBLISHED',
        edition: `ED-${runId}`,
        eventCode: `EV-${runId}`,
      },
    });

    const floorPlan = await prisma.floorPlan.create({
      data: {
        exhibitionId: expo.id,
        name: `Hall 5 FloorPlan ${runId}`,
        width: 1000,
        height: 800,
        isPublished: true,
      },
    });

    // Seed test stalls
    const stallA = await prisma.stall.create({
      data: {
        floorPlanId: floorPlan.id,
        stallNumber: `WIZ-A-${runId}`,
        name: `Stall WIZ-A-${runId}`,
        price: 15000,
        areaSqFt: 120,
        status: 'AVAILABLE',
      },
    });

    const stallB = await prisma.stall.create({
      data: {
        floorPlanId: floorPlan.id,
        stallNumber: `WIZ-B-${runId}`,
        name: `Stall WIZ-B-${runId}`,
        price: 20000,
        areaSqFt: 150,
        status: 'AVAILABLE',
      },
    });

    // Seed existing exhibitor user & company
    const existingExhibitorEmail = `exhibitor_${runId}@acme.com`;
    const existingExhibitorUsername = `exhibitor_${runId}`;
    const existingGst = `27AAACW${runId}F1Z5`;

    const existingCompany = await prisma.company.create({
      data: {
        name: `Acme Industrial Systems ${runId}`,
        companyCode: `ACM-${runId}`,
        gstNumber: existingGst,
        panNumber: `AAACW${runId}F`,
        contactPerson: 'Vikram Mehta',
        email: existingExhibitorEmail,
        mobile: '9876543210',
        address: '401 Acme Heights, Bandra East',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        pinCode: '400051',
        industry: 'Engineering',
      },
    });

    const existingUser = await prisma.user.create({
      data: {
        email: existingExhibitorEmail,
        username: existingExhibitorUsername,
        passwordHash: hashedPassword,
        name: 'Vikram Mehta',
        phone: '9876543210',
        role: 'CLIENT',
        companyId: existingCompany.id,
      },
    });

    // Seed staff user
    const staffEmail = `staff_${runId}@buoyantmedia.com`;
    const staffUser = await prisma.user.create({
      data: {
        email: staffEmail,
        username: `staff_${runId}`,
        passwordHash: hashedPassword,
        name: 'Operations Staff',
        phone: '9876500000',
        role: 'STAFF',
      },
    });

    // -------------------------------------------------------------------------
    // TEST 1: Authenticated user retains account identity in Step 2 / registration
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 1: Authenticated Exhibitor Identity Retention ---');
    const exhibitorLoginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: existingExhibitorEmail, password: 'SecretPass123!' },
    });
    assert(
      exhibitorLoginRes.status === 200 && exhibitorLoginRes.data?.data?.user?.username === existingExhibitorUsername,
      'Exhibitor can authenticate successfully with existing credentials',
      JSON.stringify(exhibitorLoginRes.data)
    );
    const exhibitorToken = exhibitorLoginRes.data?.data?.tokens?.accessToken;

    // Authenticated user registers/updates company
    const authCompanyRes = await request('/companies', {
      method: 'POST',
      token: exhibitorToken,
      body: {
        name: `Acme Industrial Systems ${runId}`,
        contactPerson: 'Vikram Mehta',
        email: existingExhibitorEmail,
        mobile: '9876543210',
        address: '401 Acme Heights, Bandra East',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        category: 'Manufacturing',
        gstNumber: existingGst,
        username: existingExhibitorUsername,
      },
    });
    assert(
      authCompanyRes.status === 201 || authCompanyRes.status === 200,
      'Authenticated exhibitor submitting their verified identity succeeds (HTTP 200/201)',
      `status: ${authCompanyRes.status}, data: ${JSON.stringify(authCompanyRes.data)}`
    );
    assert(
      authCompanyRes.data?.data?.user?.id === existingUser.id &&
      authCompanyRes.data?.data?.user?.username === existingExhibitorUsername,
      'Authenticated user retains their exact account identity without username re-assignment',
      `user: ${JSON.stringify(authCompanyRes.data?.data?.user)}`
    );

    // -------------------------------------------------------------------------
    // TEST 2: A taken username check does not block a returning authenticated user
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 2: Returning Exhibitor Username Collision Check ---');
    const checkUsernameRes = await request(`/auth/check-username?username=${existingExhibitorUsername}`);
    assert(
      checkUsernameRes.status === 200 && checkUsernameRes.data?.data?.available === false,
      'Public username availability reports username as taken by existing account',
      JSON.stringify(checkUsernameRes.data)
    );
    // When the authenticated user submits with their own username, backend accepts it
    const authSubmitOwnUsername = await request('/companies', {
      method: 'POST',
      token: exhibitorToken,
      body: {
        name: `Acme Industrial Systems ${runId}`,
        contactPerson: 'Vikram Mehta Updated',
        email: existingExhibitorEmail,
        mobile: '9876543210',
        address: '401 Acme Heights, Bandra East',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        category: 'Manufacturing',
        gstNumber: existingGst,
        username: existingExhibitorUsername,
      },
    });
    assert(
      authSubmitOwnUsername.status === 201 || authSubmitOwnUsername.status === 200,
      'Returning authenticated user using their own taken username is NOT blocked (HTTP 200/201)',
      `status: ${authSubmitOwnUsername.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 3: Guest entering an existing account email receives ACCOUNT_EXISTS (HTTP 409)
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 3: Guest Submitting Existing Email Triggers ACCOUNT_EXISTS ---');
    const guestConflictRes = await request('/companies', {
      method: 'POST',
      body: {
        name: `Impostor Company ${runId}`,
        contactPerson: 'Unknown Guest',
        email: existingExhibitorEmail, // Existing account email!
        mobile: '9111111111',
        address: '99 Rogue St',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        category: 'Services',
        gstNumber: `27ZZZZZ${runId}F1Z0`,
      },
    });
    assert(
      guestConflictRes.status === 409,
      'Unauthenticated guest submitting existing email receives HTTP 409 Conflict',
      `status: ${guestConflictRes.status}`
    );
    assert(
      guestConflictRes.data?.code === 'ACCOUNT_EXISTS' || guestConflictRes.data?.errors?.[0]?.code === 'ACCOUNT_EXISTS',
      'Conflict response includes code ACCOUNT_EXISTS for frontend modal trigger',
      JSON.stringify(guestConflictRes.data)
    );

    // -------------------------------------------------------------------------
    // TEST 4: Invalid login credentials do not create session or link account
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 4: Invalid Password Attempt Handling ---');
    const invalidLoginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: existingExhibitorEmail,
        password: 'CompletelyWrongPassword!',
      },
    });
    assert(
      invalidLoginRes.status === 401,
      'Invalid password returns HTTP 401 Unauthorized',
      `status: ${invalidLoginRes.status}`
    );
    assert(
      !invalidLoginRes.data?.data?.tokens,
      'No JWT tokens issued upon invalid password attempt',
      JSON.stringify(invalidLoginRes.data)
    );

    // -------------------------------------------------------------------------
    // TEST 5: Successful login resumes registration without duplicate submissions
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 5: Login & Registration Resume Flow ---');
    // Step 5a: Log in via standard auth endpoint
    const validLoginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: existingExhibitorEmail,
        password: 'SecretPass123!',
      },
    });
    assert(
      validLoginRes.status === 200 && Boolean(validLoginRes.data?.data?.tokens?.accessToken),
      'Successful login issues valid JWT access token',
      JSON.stringify(validLoginRes.data)
    );
    const resumedToken = validLoginRes.data?.data?.tokens?.accessToken;

    // Step 5b: Re-submit the registration using the newly acquired token
    const resumeCompanyRes = await request('/companies', {
      method: 'POST',
      token: resumedToken,
      body: {
        name: `Acme Industrial Systems ${runId}`,
        contactPerson: 'Vikram Mehta',
        email: existingExhibitorEmail,
        mobile: '9876543210',
        address: '401 Acme Heights, Bandra East',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        category: 'Manufacturing',
        gstNumber: existingGst,
      },
    });
    assert(
      resumeCompanyRes.status === 200 || resumeCompanyRes.status === 201,
      'Resuming company registration under authenticated session succeeds (HTTP 200/201)',
      `status: ${resumeCompanyRes.status}`
    );
    // Verify no duplicate company created in DB with same GSTIN
    const companiesInDb = await prisma.company.findMany({
      where: { gstNumber: existingGst },
    });
    assert(
      companiesInDb.length === 1,
      'Database retains exactly 1 company record — zero duplicate companies created upon resume',
      `found ${companiesInDb.length} companies`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Guest submitting taken username with fresh email gets auto-generated username
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 6: Guest Username Collision Handled Non-Destructively ---');
    const freshGuestEmail = `new_guest_${runId}@freshcorp.com`;
    const guestTakenUserRes = await request('/companies', {
      method: 'POST',
      body: {
        name: `Fresh Corp ${runId}`,
        contactPerson: 'Sunil Patel',
        email: freshGuestEmail,
        mobile: '9811223344',
        address: '12 MG Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
        category: 'Robotics',
        gstNumber: `29AAACF${runId}F1Z9`,
        username: existingExhibitorUsername, // Submitting an already taken username!
      },
    });
    assert(
      guestTakenUserRes.status === 201,
      'Guest submitting taken username with fresh email succeeds without permanent block (HTTP 201)',
      `status: ${guestTakenUserRes.status}`
    );
    const assignedGuestUsername = guestTakenUserRes.data?.data?.user?.username;
    assert(
      assignedGuestUsername !== existingExhibitorUsername,
      'Guest was NOT assigned the taken username belonging to another user',
      `assigned username: ${assignedGuestUsername}`
    );
    assert(
      guestTakenUserRes.data?.data?.user?.id !== existingUser.id,
      'Guest was NOT silently associated with the existing account',
      `user ID: ${guestTakenUserRes.data?.data?.user?.id}`
    );

    // -------------------------------------------------------------------------
    // TEST 7: Booking userId is derived strictly from server-side JWT session
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 7: Server-Side Authorization for Booking userId ---');
    // Hold stall A for existing exhibitor
    await prisma.stall.update({
      where: { id: stallA.id },
      data: {
        status: 'TEMPORARILY_HELD',
        heldByUserId: existingUser.id,
        heldUntil: new Date(Date.now() + 900000), // 15 mins
      },
    });

    // Create booking as authenticated exhibitor, attempting body tampering
    const bookingRes = await request('/bookings', {
      method: 'POST',
      token: exhibitorToken,
      body: {
        exhibitionId: expo.id,
        stallIds: [stallA.id],
        companyId: existingCompany.id,
        paymentType: 'FullPayment',
        percentage: 100,
        // Attempting to spoof userId in request body to another user
        userId: 'some-spoofed-user-id',
      },
    });
    assert(
      bookingRes.status === 201 || bookingRes.status === 200,
      'Booking creation succeeds for held stall (HTTP 200/201)',
      `status: ${bookingRes.status}, data: ${JSON.stringify(bookingRes.data)}`
    );
    const createdBookingId =
      bookingRes.data?.data?.data?.bookingId ||
      bookingRes.data?.data?.bookingId ||
      bookingRes.data?.data?.id;

    assert(
      Boolean(createdBookingId),
      'Booking ID is returned in response',
      JSON.stringify(bookingRes.data)
    );

    const dbBooking = await prisma.booking.findUnique({
      where: { id: createdBookingId },
    });
    assert(
      dbBooking?.userId === existingUser.id,
      'Booking userId in database is strictly derived from verified JWT session, spoofed body ignored',
      `db userId: ${dbBooking?.userId}, expected: ${existingUser.id}`
    );

    // -------------------------------------------------------------------------
    // TEST 8: Conflicting active stall hold rejection & safe hold handling
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 8: Conflicting Stall Hold Safety ---');
    // Set stall B hold to active by another user
    await prisma.stall.update({
      where: { id: stallB.id },
      data: {
        status: 'TEMPORARILY_HELD',
        heldByUserId: 'another-user-guid',
        heldUntil: new Date(Date.now() + 600000), // Active hold by someone else for 10 mins
      },
    });

    // Attempting to book active stall held by someone else without holding it
    const conflictingBookingRes = await request('/bookings', {
      method: 'POST',
      token: exhibitorToken,
      body: {
        exhibitionId: expo.id,
        stallIds: [stallB.id],
        companyId: existingCompany.id,
        paymentType: 'FullPayment',
        percentage: 100,
      },
    });
    assert(
      conflictingBookingRes.status === 400 || conflictingBookingRes.status === 409,
      'Booking stall actively held by another user is safely rejected (HTTP 400/409)',
      `status: ${conflictingBookingRes.status}, data: ${JSON.stringify(conflictingBookingRes.data)}`
    );

    // -------------------------------------------------------------------------
    // TEST 9: Staff and Administrator behavior remains intact
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 9: Staff / Admin Privileges and Sessions ---');
    const staffLoginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: staffEmail, password: 'SecretPass123!' },
    });
    assert(
      staffLoginRes.status === 200 && staffLoginRes.data?.data?.user?.role === 'STAFF',
      'Staff user logs in successfully with STAFF role',
      JSON.stringify(staffLoginRes.data)
    );
    const staffToken = staffLoginRes.data?.data?.tokens?.accessToken;

    // Staff creates a booking on behalf of exhibitor
    const cleanStallC = await prisma.stall.create({
      data: {
        floorPlanId: floorPlan.id,
        stallNumber: `WIZ-C-${runId}`,
        name: `Stall WIZ-C-${runId}`,
        price: 25000,
        areaSqFt: 180,
        status: 'AVAILABLE',
      },
    });

    const staffBookingRes = await request('/bookings', {
      method: 'POST',
      token: staffToken,
      body: {
        exhibitionId: expo.id,
        stallIds: [cleanStallC.id],
        companyId: existingCompany.id,
        paymentType: 'FullPayment',
        percentage: 100,
      },
    });
    assert(
      staffBookingRes.status === 201 || staffBookingRes.status === 200,
      'Staff user can create booking on behalf of company (HTTP 200/201)',
      `status: ${staffBookingRes.status}`
    );
    // Verify staff user's own profile is intact
    const staffProfile = await prisma.user.findUnique({
      where: { id: staffUser.id },
    });
    assert(
      staffProfile?.role === 'STAFF' && staffProfile.email === staffEmail,
      'Staff identity and role remain completely intact after booking on behalf of client',
      `role: ${staffProfile?.role}`
    );

    // -------------------------------------------------------------------------
    // TEST 10: Session retention after payment verification
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 10: Session Persistence After Payment ---');
    // Verify that payment status transition does not invalidate or purge user session
    const payment = await prisma.payment.findFirst({
      where: { bookingId: createdBookingId },
    });
    assert(
      Boolean(payment),
      'Payment order was generated for the confirmed booking',
      `payment: ${payment?.id}`
    );

    // Re-verify that user token remains valid by querying authenticated user endpoint
    const userMeRes = await request('/auth/me', {
      method: 'GET',
      token: exhibitorToken,
    });
    assert(
      userMeRes.status === 200 && userMeRes.data?.data?.email === existingExhibitorEmail,
      'Exhibitor JWT session remains 100% active and authenticated (HTTP 200)',
      `status: ${userMeRes.status}`
    );

    console.log('\n======================================================');
    console.log(`Phase 2.5 Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================\n');

  } catch (err) {
    console.error('Fatal error in Phase 2.5 test suite:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
    await prisma.$disconnect();
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runWizardSessionTestSuite();
