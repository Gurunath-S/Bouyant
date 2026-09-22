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

async function runSuite() {
  await startTestServer();

  console.log('\n========================================');
  console.log('🏢 TESTING ADMIN EVENT REGISTRATION & SEPARATED COMPANIES');
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

  let createdExpoId: string | undefined;

  try {
    // 1. Authenticate as Admin
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@buoyantmedia.com', password: 'AdminPassword123!' },
    });
    assert(adminLogin.status === 200, 'Admin can login successfully', JSON.stringify(adminLogin.data));
    const adminToken = adminLogin.data?.data?.tokens?.accessToken;

    // 2. Admin registers a new event
    const testCode = 'AR';
    const testEdition = String(Date.now()).slice(-4);
    const registerRes = await request('/exhibitions', {
      method: 'POST',
      token: adminToken,
      body: {
        title: 'Admin Registered Auto Summit 2026',
        edition: testEdition,
        eventCode: testCode,
        spcode: 'B001',
        venue: 'Pragati Maidan Hall 5',
        city: 'New Delhi',
        startDate: '2026-09-22T00:00:00.000Z',
        endDate: '2026-09-26T00:00:00.000Z',
        bookingEndDate: '2026-09-25T00:00:00.000Z',
        totalStalls: 60,
        description: 'Premier automotive exhibition registered directly by platform Admin.',
        status: 'PUBLISHED',
      },
    });

    assert(
      registerRes.status === 201 && registerRes.data?.data?.id,
      'Admin can register new event via API (201)',
      JSON.stringify(registerRes.data)
    );
    createdExpoId = registerRes.data?.data?.id;

    // 3. Admin lists all companies and verifies bookings relation
    const allCompaniesRes = await request('/companies', {
      token: adminToken,
    });
    assert(
      allCompaniesRes.status === 200 && Array.isArray(allCompaniesRes.data?.data),
      'Admin can fetch companies directory (200)'
    );
    const companies = allCompaniesRes.data?.data || [];
    assert(companies.length >= 3, `Companies directory returns at least 3 companies (found ${companies.length})`);
    assert(
      companies[0].bookings !== undefined,
      'Company payload includes bookings relation array'
    );

    // 4. Admin filters companies by status=REGISTERED
    const registeredRes = await request('/companies?status=REGISTERED', {
      token: adminToken,
    });
    assert(registeredRes.status === 200, 'Admin can query status=REGISTERED companies (200)');
    const regCompanies = registeredRes.data?.data || [];
    assert(
      regCompanies.length > 0 && regCompanies.every((c: any) => c.bookings && c.bookings.length > 0),
      `All companies in REGISTERED filter have at least 1 booking (found ${regCompanies.length})`
    );

    // 5. Admin filters companies by status=UNREGISTERED
    const unregRes = await request('/companies?status=UNREGISTERED', {
      token: adminToken,
    });
    assert(unregRes.status === 200, 'Admin can query status=UNREGISTERED companies (200)');
    const unregCompanies = unregRes.data?.data || [];
    assert(
      unregCompanies.length > 0 && unregCompanies.every((c: any) => !c.bookings || c.bookings.length === 0),
      `All companies in UNREGISTERED filter have 0 bookings (found ${unregCompanies.length})`
    );

    // 6. Admin filters companies by exhibitionId
    const firstRegCompany = regCompanies[0];
    const registeredExpoId = firstRegCompany?.bookings?.[0]?.exhibition?.id;
    if (registeredExpoId) {
      const byExpoRes = await request(`/companies?exhibitionId=${registeredExpoId}`, {
        token: adminToken,
      });
      assert(byExpoRes.status === 200, 'Admin can filter companies by specific exhibitionId (200)');
      const expoCompanies = byExpoRes.data?.data || [];
      assert(
        expoCompanies.some((c: any) => c.id === firstRegCompany.id),
        `Company ${firstRegCompany.name} is correctly listed for exhibitionId ${registeredExpoId}`
      );
    }

    // 7. Direct Admin Event Registration into Exhibition Stalls
    // Create floor plan & stall for createdExpoId
    const floorPlan = await prisma.floorPlan.create({
      data: {
        exhibitionId: createdExpoId!,
        name: 'Main Pavilion Hall A',
        width: 1000,
        height: 600,
        gridColumns: 20,
        gridRows: 12,
        isPublished: true,
      },
    });

    const testStall = await prisma.stall.create({
      data: {
        floorPlanId: floorPlan.id,
        stallNumber: 'ADM-101',
        name: 'Admin Demo Stall',
        price: 50000,
        status: 'AVAILABLE',
        areaSqFt: 12,
        width: 3,
        height: 4,
        xPosition: 10,
        yPosition: 10,
      },
    });

    // Pick an existing company for direct admin registration
    const targetCompany = unregCompanies[0] || regCompanies[0];
    const adminDirectRegRes = await request('/bookings', {
      method: 'POST',
      token: adminToken,
      body: {
        exhibitionId: createdExpoId,
        stallIds: [testStall.id],
        companyId: targetCompany.id,
        confirmDirectly: true,
        paymentMethod: 'OFFLINE_ADMIN_DIRECT',
        notes: 'Direct corporate allocation approved by Admin',
      },
    });

    assert(adminDirectRegRes.status === 201, 'Admin can directly register exhibitor into event (201)', JSON.stringify(adminDirectRegRes.data));
    const createdAdminBooking = adminDirectRegRes.data?.data;
    assert(
      createdAdminBooking && createdAdminBooking.status === 'CONFIRMED' && createdAdminBooking.paymentStatus === 'PAID_FULL',
      'Admin direct registration is immediately marked CONFIRMED with PAID_FULL status'
    );

    // Verify stall status updated to BOOKED_CONFIRMED
    const updatedStall = await prisma.stall.findUnique({ where: { id: testStall.id } });
    assert(
      updatedStall?.status === 'BOOKED_CONFIRMED',
      'Allocated stall is atomically updated to BOOKED_CONFIRMED'
    );

    // 8. Admin queries Admin Registered Data separately
    const adminDataRes = await request('/bookings?registeredByRole=ADMIN', {
      token: adminToken,
    });
    assert(adminDataRes.status === 200, 'Admin can query admin-registered data separately (200)');
    const adminBookingsList = adminDataRes.data?.data || [];
    assert(
      adminBookingsList.some((b: any) => b.id === createdAdminBooking.id),
      `Admin registered data includes the newly allocated booking ${createdAdminBooking.bookingReference}`
    );

  } catch (err: any) {
    console.error('Test error:', err);
    failed++;
  } finally {
    if (createdExpoId) {
      // Clean up bookings, stalls, floor plan, and exhibition
      await prisma.payment.deleteMany({ where: { booking: { exhibitionId: createdExpoId } } }).catch(() => {});
      await prisma.invoice.deleteMany({ where: { booking: { exhibitionId: createdExpoId } } }).catch(() => {});
      await prisma.bookingStall.deleteMany({ where: { booking: { exhibitionId: createdExpoId } } }).catch(() => {});
      await prisma.booking.deleteMany({ where: { exhibitionId: createdExpoId } }).catch(() => {});
      await prisma.stall.deleteMany({ where: { floorPlan: { exhibitionId: createdExpoId } } }).catch(() => {});
      await prisma.floorPlan.deleteMany({ where: { exhibitionId: createdExpoId } }).catch(() => {});
      await prisma.exhibition.delete({ where: { id: createdExpoId } }).catch(() => {});
      console.log('🧹 Cleaned up test exhibition and associated admin registrations:', createdExpoId);
    }
    await prisma.$disconnect();
    server.close();

    console.log('\n========================================');
    console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runSuite();
