import { createApp } from '../src/app.js';
import { prisma } from '../src/config/db.js';

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

  return { status, data };
}

async function runSuperAdminGovernanceSuite() {
  await startTestServer();

  console.log('\n========================================');
  console.log('🏛️  STARTING SUPER ADMIN GOVERNANCE & REPORTING TESTS');
  console.log('========================================\n');

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
    // 1. Authenticate as SuperAdmin and Staff
    const saLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'superadmin@buoyantmedia.com', password: 'SuperAdminPassword123!' },
    });
    assert(saLogin.status === 200, 'SuperAdmin login succeeded');
    const saToken = saLogin.data?.data?.tokens?.accessToken;
    const saUserId = saLogin.data?.data?.user?.id;

    const staffLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'staff@buoyantmedia.com', password: 'StaffPassword123!' },
    });
    assert(staffLogin.status === 200, 'Staff login succeeded');
    const staffToken = staffLogin.data?.data?.tokens?.accessToken;

    // 2. Test Platform-Wide Overview Report
    console.log('\n--- 1. Platform-Wide Overview Report ---');
    const globalOverview = await request('/reports/overview', { token: saToken });
    assert(globalOverview.status === 200, 'SuperAdmin can fetch global overview (200)');
    assert(globalOverview.data?.data?.roleScope === 'SUPERADMIN', 'Role scope is SUPERADMIN');
    assert(typeof globalOverview.data?.data?.totalRevenue === 'number', 'totalRevenue is numeric');
    assert(typeof globalOverview.data?.data?.totalExhibitions === 'number', 'totalExhibitions is numeric');
    assert(globalOverview.data?.data?.eventScoped === false, 'eventScoped is false for platform-wide metrics');

    // 3. Create a test exhibition for event-scoped testing (spcode matches staff user ST01)
    console.log('\n--- 2. Create Published Test Exhibition ---');
    const createExRes = await request('/exhibitions', {
      method: 'POST',
      token: saToken,
      body: {
        title: 'Tech Expo Global 2026',
        description: 'Global tech exhibition',
        venue: 'BIEC Hall 1',
        city: 'Bengaluru',
        startDate: '2026-11-01T09:00:00.000Z',
        endDate: '2026-11-05T18:00:00.000Z',
        edition: 'T1',
        eventCode: 'TEG',
        spcode: 'ST01',
      },
    });
    assert(createExRes.status === 201, 'Test exhibition created (201)');
    const testExhibitionId = createExRes.data?.data?.id;

    // Publish the test exhibition
    const publishRes = await request(`/exhibitions/${testExhibitionId}`, {
      method: 'PUT',
      token: saToken,
      body: { status: 'PUBLISHED' },
    });
    assert(publishRes.status === 200, 'Test exhibition published (200)');

    // 4. Test Event-Scoped Overview Report (Empty State)
    console.log('\n--- 3. Event-Scoped Overview Report (Empty State) ---');
    const eventScopedOverview = await request(`/reports/overview?exhibitionId=${testExhibitionId}`, { token: saToken });
    assert(eventScopedOverview.status === 200, 'SuperAdmin can fetch event-scoped overview (200)');
    assert(eventScopedOverview.data?.data?.eventScoped === true, 'eventScoped is true');
    assert(eventScopedOverview.data?.data?.exhibition?.id === testExhibitionId, 'Returned exhibition matches query ID');
    assert(eventScopedOverview.data?.data?.exhibition?.title === 'Tech Expo Global 2026', 'Event title is accurate');
    assert(eventScopedOverview.data?.data?.totalExhibitors === 0, 'Initial totalExhibitors is 0');

    // 4b. Test Accurate Participating Exhibitor Counting (Fix 1)
    console.log('\n--- 3b. Participating Exhibitor Count & Booking Status Semantics ---');
    const compA = await prisma.company.create({
      data: {
        companyCode: `CMP-A-${Date.now()}`,
        name: 'Alpha Technologies Ltd',
        contactPerson: 'Alice Alpha',
        mobile: `+9199990${Math.floor(10000 + Math.random() * 90000)}`,
        email: `alpha_${Date.now()}@testcorp.com`,
        address: '100 Alpha Way',
        city: 'Bengaluru',
        state: 'Karnataka',
        pinCode: '560001',
        industry: 'Technology',
      },
    });

    const compB = await prisma.company.create({
      data: {
        companyCode: `CMP-B-${Date.now()}`,
        name: 'Beta Inactive Corp',
        contactPerson: 'Bob Beta',
        mobile: `+9199991${Math.floor(10000 + Math.random() * 90000)}`,
        email: `beta_${Date.now()}@testcorp.com`,
        address: '200 Beta Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        pinCode: '560001',
        industry: 'Manufacturing',
      },
    });

    const compC = await prisma.company.create({
      data: {
        companyCode: `CMP-C-${Date.now()}`,
        name: 'Gamma Progress Inc',
        contactPerson: 'Charlie Gamma',
        mobile: `+9199992${Math.floor(10000 + Math.random() * 90000)}`,
        email: `gamma_${Date.now()}@testcorp.com`,
        address: '300 Gamma Blvd',
        city: 'Bengaluru',
        state: 'Karnataka',
        pinCode: '560001',
        industry: 'Logistics',
      },
    });

    // Company A: 3 bookings (CONFIRMED paid, PENDING_PAYMENT unpaid, CANCELLED unpaid) -> Active + Cancelled mixture & multiple bookings
    await prisma.booking.create({
      data: {
        bookingReference: `REF-A1-${Date.now()}`,
        companyId: compA.id,
        exhibitionId: testExhibitionId,
        status: 'CONFIRMED',
        paymentStatus: 'PAID_FULL',
        paidAmount: 50000,
        totalAmount: 42372,
        taxAmount: 7628,
        grandTotal: 50000,
        balanceAmount: 0,
      },
    });
    await prisma.booking.create({
      data: {
        bookingReference: `REF-A2-${Date.now()}`,
        companyId: compA.id,
        exhibitionId: testExhibitionId,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'UNPAID',
        paidAmount: 0,
        totalAmount: 25424,
        taxAmount: 4576,
        grandTotal: 30000,
        balanceAmount: 30000,
      },
    });
    await prisma.booking.create({
      data: {
        bookingReference: `REF-A3-${Date.now()}`,
        companyId: compA.id,
        exhibitionId: testExhibitionId,
        status: 'CANCELLED',
        paymentStatus: 'UNPAID',
        paidAmount: 0,
        totalAmount: 16949,
        taxAmount: 3051,
        grandTotal: 20000,
        balanceAmount: 20000,
      },
    });

    // Company B: 2 bookings (CANCELLED unpaid, EXPIRED unpaid) -> ONLY cancelled/expired bookings
    await prisma.booking.create({
      data: {
        bookingReference: `REF-B1-${Date.now()}`,
        companyId: compB.id,
        exhibitionId: testExhibitionId,
        status: 'CANCELLED',
        paymentStatus: 'UNPAID',
        paidAmount: 0,
        totalAmount: 12712,
        taxAmount: 2288,
        grandTotal: 15000,
        balanceAmount: 15000,
      },
    });
    await prisma.booking.create({
      data: {
        bookingReference: `REF-B2-${Date.now()}`,
        companyId: compB.id,
        exhibitionId: testExhibitionId,
        status: 'EXPIRED',
        paymentStatus: 'UNPAID',
        paidAmount: 0,
        totalAmount: 12712,
        taxAmount: 2288,
        grandTotal: 15000,
        balanceAmount: 15000,
      },
    });

    // Company C: 2 bookings (INITIATED unpaid, HELD unpaid) -> Multiple active/in-progress bookings with preserved statuses
    await prisma.booking.create({
      data: {
        bookingReference: `REF-C1-${Date.now()}`,
        companyId: compC.id,
        exhibitionId: testExhibitionId,
        status: 'INITIATED',
        paymentStatus: 'UNPAID',
        paidAmount: 0,
        totalAmount: 21186,
        taxAmount: 3814,
        grandTotal: 25000,
        balanceAmount: 25000,
      },
    });
    await prisma.booking.create({
      data: {
        bookingReference: `REF-C2-${Date.now()}`,
        companyId: compC.id,
        exhibitionId: testExhibitionId,
        status: 'HELD',
        paymentStatus: 'UNPAID',
        paidAmount: 0,
        totalAmount: 21186,
        taxAmount: 3814,
        grandTotal: 25000,
        balanceAmount: 25000,
      },
    });

    const populatedOverview = await request(`/reports/overview?exhibitionId=${testExhibitionId}`, { token: saToken });
    assert(populatedOverview.status === 200, 'Populated event-scoped overview fetched (200)');
    assert(populatedOverview.data?.data?.totalBookings === 7, 'Total bookings count includes all 7 bookings across statuses');
    assert(populatedOverview.data?.data?.confirmedBookings === 1, 'Confirmed bookings count includes only paid/confirmed bookings (1)');
    assert(populatedOverview.data?.data?.totalRevenue === 50000, 'Total revenue sums only confirmed/paid bookings (50000)');
    assert(
      populatedOverview.data?.data?.totalExhibitors === 2,
      'Participating exhibitors count is 2 (compA and compC counted once each; compB with only cancelled/expired excluded)'
    );

    // Non-existent exhibition returns 404
    const notFoundOverview = await request('/reports/overview?exhibitionId=00000000-0000-0000-0000-000000000000', { token: saToken });
    assert(notFoundOverview.status === 404, 'Invalid exhibition ID returns 404 Not Found');

    // 5. Test User Governance Directory
    console.log('\n--- 4. User Directory & Governance ---');
    const allUsersRes = await request('/users', { token: saToken });
    assert(allUsersRes.status === 200, 'SuperAdmin can fetch user directory (200)');
    const usersList = Array.isArray(allUsersRes.data?.data) ? allUsersRes.data?.data : allUsersRes.data?.data?.users;
    assert(usersList && usersList.length > 0, 'User list contains records');
    
    // Ensure SuperAdmin is included
    const hasSuperAdmin = usersList.some((u: any) => u.role === 'SUPERADMIN');
    assert(hasSuperAdmin, 'SuperAdmin user is included in user directory');

    // Filter by role
    const staffOnlyRes = await request('/users?role=STAFF', { token: saToken });
    assert(staffOnlyRes.status === 200, 'Filter by role STAFF succeeded');
    const staffList = Array.isArray(staffOnlyRes.data?.data) ? staffOnlyRes.data?.data : staffOnlyRes.data?.data?.users;
    assert(staffList.every((u: any) => u.role === 'STAFF'), 'All returned records have role STAFF');

    // Filter by event
    const eventUsersRes = await request(`/users?exhibitionId=${testExhibitionId}`, { token: saToken });
    assert(eventUsersRes.status === 200, 'Filter by event succeeded');
    const eventUsersList = Array.isArray(eventUsersRes.data?.data) ? eventUsersRes.data?.data : eventUsersRes.data?.data?.users;
    // SuperAdmin must still be included as global governance user
    assert(eventUsersList.some((u: any) => u.role === 'SUPERADMIN'), 'SuperAdmin is preserved in event-scoped user directory');

    // Fix 2 verification: Staff matching exhibition SP code ('ST01') must have label 'Associated Sales Representative'
    const staffRep = eventUsersList.find((u: any) => u.email === 'staff@buoyantmedia.com');
    assert(!!staffRep, 'Staff user with matching SP code is found in event directory');
    assert(
      staffRep?.eventAssociation === 'Associated Sales Representative',
      'Matching sales SP code staff receives "Associated Sales Representative" label'
    );

    // 6. Test User Details Endpoint
    console.log('\n--- 5. User Details Endpoint ---');
    const userDetailRes = await request(`/users/${saUserId}`, { token: saToken });
    assert(userDetailRes.status === 200, 'Fetch user details succeeded (200)');
    assert(userDetailRes.data?.data?.id === saUserId, 'User ID matches');
    assert(Array.isArray(userDetailRes.data?.data?.rolePermissions), 'rolePermissions array is provided');
    assert(!('passwordHash' in userDetailRes.data?.data), 'passwordHash is NOT exposed');

    // 7. Security: Unauthorized User Blocked from /users
    console.log('\n--- 6. Security & RBAC Boundary ---');
    const unauthorizedList = await request('/users', { token: staffToken });
    assert(unauthorizedList.status === 403, 'Staff is blocked from accessing /users (403)');
    const unauthorizedDetail = await request(`/users/${saUserId}`, { token: staffToken });
    assert(unauthorizedDetail.status === 403, 'Staff is blocked from accessing /users/:id (403)');

    // Clean up test bookings, companies, and exhibition
    await prisma.booking.deleteMany({
      where: { exhibitionId: testExhibitionId },
    });
    await prisma.company.deleteMany({
      where: { id: { in: [compA.id, compB.id, compC.id] } },
    });
    await prisma.stall.deleteMany({
      where: { floorPlan: { exhibitionId: testExhibitionId } },
    });
    await prisma.floorPlan.deleteMany({
      where: { exhibitionId: testExhibitionId },
    });
    await prisma.exhibition.delete({
      where: { id: testExhibitionId },
    });
    console.log('\n🧹 Test bookings, companies, and exhibition cleaned up.');
  } catch (err: any) {
    console.error('Test suite exception:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
    console.log('\n========================================');
    console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runSuperAdminGovernanceSuite();
