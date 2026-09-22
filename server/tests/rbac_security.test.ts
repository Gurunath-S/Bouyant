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
      console.log(`🚀 Test server listening on ${baseUrl}`);
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

async function runSecuritySuite() {
  await startTestServer();

  console.log('\n========================================');
  console.log('🛡️  STARTING COMPREHENSIVE RBAC SECURITY TESTS');
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

  let createdAdminId: string | undefined;
  let createdStaffId: string | undefined;
  let createdExpo: any;

  try {
    // 1. Authenticate all 4 roles
    console.log('--- 1. Authenticating Roles ---');
    const saLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'superadmin@buoyantmedia.com', password: 'SuperAdminPassword123!' },
    });
    assert(saLogin.status === 200 && saLogin.data.data.user.role === 'SUPERADMIN', 'SuperAdmin Login (200, role SUPERADMIN)');
    const saToken = saLogin.data?.data?.tokens?.accessToken;

    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@buoyantmedia.com', password: 'AdminPassword123!' },
    });
    assert(adminLogin.status === 200 && adminLogin.data.data.user.role === 'ADMIN', 'Admin Login (200, role ADMIN)');
    const adminToken = adminLogin.data?.data?.tokens?.accessToken;

    const staffLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'staff@buoyantmedia.com', password: 'StaffPassword123!' },
    });
    assert(staffLogin.status === 200 && staffLogin.data.data.user.role === 'STAFF', 'Staff Login (200, role STAFF)');
    const staffToken = staffLogin.data?.data?.tokens?.accessToken;

    const clientLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'user@buoyantmedia.com', password: 'UserPassword123!' },
    });
    assert(clientLogin.status === 200 && clientLogin.data.data.user.role === 'CLIENT', 'Client Login (200, role CLIENT)');
    const clientToken = clientLogin.data?.data?.tokens?.accessToken;

    // 2. User Management Restrictions
    console.log('\n--- 2. User Management Authorization & Super Admin Protections ---');
    // Client cannot create Admin
    const clientCreateAdmin = await request('/users/admin', {
      method: 'POST',
      token: clientToken,
      body: { name: 'Hacker Admin', email: 'hack@admin.com', password: 'Password123!' },
    });
    assert(clientCreateAdmin.status === 403, 'Client CANNOT create Admin (403)');

    // Staff cannot create Admin
    const staffCreateAdmin = await request('/users/admin', {
      method: 'POST',
      token: staffToken,
      body: { name: 'Staff Hacker Admin', email: 'hack2@admin.com', password: 'Password123!' },
    });
    assert(staffCreateAdmin.status === 403, 'Staff CANNOT create Admin (403)');

    // Admin cannot create Staff
    const adminCreateStaff = await request('/users/staff', {
      method: 'POST',
      token: adminToken,
      body: { name: 'Admin Created Staff', email: 'staff_hack@test.com', password: 'Password123!' },
    });
    assert(adminCreateStaff.status === 403, 'Admin CANNOT create Staff (403)');

    // SuperAdmin CAN create Admin
    const testAdminEmail = `newadmin_${Date.now()}@buoyantmedia.com`;
    const saCreateAdmin = await request('/users/admin', {
      method: 'POST',
      token: saToken,
      body: { name: 'New Regional Admin', email: testAdminEmail, password: 'Password123!', spcode: `A${Date.now().toString().slice(-3)}` },
    });
    assert(saCreateAdmin.status === 201 && saCreateAdmin.data.data.role === 'ADMIN', 'SuperAdmin CAN create Admin (201)');
    createdAdminId = saCreateAdmin.data?.data?.id;

    // SuperAdmin CAN create Staff
    const testStaffEmail = `newstaff_${Date.now()}@buoyantmedia.com`;
    const saCreateStaff = await request('/users/staff', {
      method: 'POST',
      token: saToken,
      body: { name: 'New Regional Staff', email: testStaffEmail, password: 'Password123!', spcode: `S${Date.now().toString().slice(-3)}` },
    });
    assert(saCreateStaff.status === 201 && saCreateStaff.data.data.role === 'STAFF', 'SuperAdmin CAN create Staff (201)');
    createdStaffId = saCreateStaff.data?.data?.id;

    // 3. Deactivation & Login Enforcement
    console.log('\n--- 3. Deactivation & Account Lifecycle ---');
    // SuperAdmin deactivates the newly created Admin
    const deactivateRes = await request(`/users/${createdAdminId}/status`, {
      method: 'PATCH',
      token: saToken,
      body: { isActive: false },
    });
    assert(deactivateRes.status === 200 && deactivateRes.data.data.isActive === false, 'SuperAdmin can deactivate user (200)');

    // Deactivated user tries to log in -> MUST FAIL (403)
    const deactLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: testAdminEmail, password: 'Password123!' },
    });
    assert(deactLogin.status === 403, 'Deactivated user rejected on login (403)');

    // Re-activate user -> login succeeds
    await request(`/users/${createdAdminId}/status`, {
      method: 'PATCH',
      token: saToken,
      body: { isActive: true },
    });
    const reactLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: testAdminEmail, password: 'Password123!' },
    });
    assert(reactLogin.status === 200, 'Re-activated user can login successfully (200)');

    // 4. Staff Capabilities vs Boundaries
    console.log('\n--- 4. Staff Capabilities vs Boundaries ---');
    // Staff registers an event -> MUST SUCCEED (201)
    const testEventSlug = `staff-expo-${Date.now()}`;
    const staffRegisterEvent = await request('/exhibitions', {
      method: 'POST',
      token: staffToken,
      body: {
        title: 'Staff Registered Robotics Expo 2026',
        slug: testEventSlug,
        edition: '05',
        eventCode: 'SR',
        spcode: 'ST01',
        venue: 'Exhibition Ground',
        city: 'Chennai',
        startDate: '2026-11-01T09:00:00.000Z',
        endDate: '2026-11-05T18:00:00.000Z',
        totalStalls: 40,
        status: 'DRAFT',
      },
    });
    assert(
      staffRegisterEvent.status === 201 && !!staffRegisterEvent.data?.data?.createdByUserId,
      'Staff CAN register exhibition with creator attribution (201)'
    );
    createdExpo = staffRegisterEvent.data?.data;

    // Staff tries to manage floor plans -> MUST BE FORBIDDEN (403)
    const dummyFpId = 'dummy-fp-id';
    const staffManageFp = await request(`/floor-plans/${dummyFpId}`, {
      method: 'PUT',
      token: staffToken,
      body: { name: 'Staff Modified Layout' },
    });
    assert(staffManageFp.status === 403, 'Staff CANNOT modify floor plans (403)');

    // Staff tries to create or modify stalls -> MUST BE FORBIDDEN (403)
    const staffCreateStall = await request('/stalls', {
      method: 'POST',
      token: staffToken,
      body: { floorPlanId: dummyFpId, stallNumber: 'HACK-1', price: 1000 },
    });
    assert(staffCreateStall.status === 403, 'Staff CANNOT create stalls (403)');

    // Staff tries to access all bookings -> MUST BE FORBIDDEN (403)
    const staffGetBookings = await request('/bookings', {
      method: 'GET',
      token: staffToken,
    });
    assert(staffGetBookings.status === 403, 'Staff CANNOT manage all bookings (403)');

    // 5. Reports Scoping
    console.log('\n--- 5. Role-Scoped Reports ---');
    // Staff report: has registered events, NO totalRevenue or user admin metrics
    const staffReport = await request('/reports/overview', {
      method: 'GET',
      token: staffToken,
    });
    assert(
      staffReport.status === 200 &&
      staffReport.data.data.roleScope === 'STAFF' &&
      staffReport.data.data.totalRevenue === undefined,
      'Staff receives scoped operational report without platform financials (200)'
    );

    // Admin report: has totalRevenue, occupancy, but NO activeAdmins or activeStaff
    const adminReport = await request('/reports/overview', {
      method: 'GET',
      token: adminToken,
    });
    assert(
      adminReport.status === 200 &&
      adminReport.data.data.roleScope === 'ADMIN' &&
      adminReport.data.data.activeAdmins === undefined,
      'Admin receives business report (200)'
    );

    // SuperAdmin report: has totalRevenue, activeAdmins, activeStaff
    const saReport = await request('/reports/overview', {
      method: 'GET',
      token: saToken,
    });
    assert(
      saReport.status === 200 &&
      saReport.data.data.roleScope === 'SUPERADMIN' &&
      saReport.data.data.activeAdmins !== undefined &&
      saReport.data.data.activeStaff !== undefined,
      'SuperAdmin receives platform-wide report with full governance metrics (200)'
    );

    // 6. Admin & SuperAdmin Access
    console.log('\n--- 6. Admin & SuperAdmin Capability Checks ---');
    // Admin can manage bookings
    const adminBookings = await request('/bookings', {
      method: 'GET',
      token: adminToken,
    });
    assert(adminBookings.status === 200, 'Admin can view all bookings (200)');

    // SuperAdmin can manage bookings
    const saBookings = await request('/bookings', {
      method: 'GET',
      token: saToken,
    });
    assert(saBookings.status === 200, 'SuperAdmin can view all bookings (200)');

    // SuperAdmin can manage exhibition created by staff
    if (createdExpo?.id) {
      const updateExpo = await request(`/exhibitions/${createdExpo.id}`, {
        method: 'PUT',
        token: saToken,
        body: { status: 'PUBLISHED' },
      });
      assert(updateExpo.status === 200, 'SuperAdmin can manage/publish exhibition (200)');
    }

    console.log('\n========================================');
    console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================\n');

    // Clean up temporary users and test exhibition
    if (createdExpo?.id) {
      await prisma.exhibition.delete({ where: { id: createdExpo.id } }).catch(() => {});
    }
    if (createdAdminId) {
      await prisma.user.delete({ where: { id: createdAdminId } }).catch(() => {});
    }
    if (createdStaffId) {
      await prisma.user.delete({ where: { id: createdStaffId } }).catch(() => {});
    }

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    if (server) server.close();
    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runSecuritySuite();
