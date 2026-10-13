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

let adminToken: string;

async function setupAuth() {
  const saLogin = await request('/auth/login', {
    method: 'POST',
    body: {
      email: 'superadmin@buoyantmedia.com',
      password: 'SuperAdminPassword123!',
    },
  });

  if (saLogin.status === 200 && saLogin.data?.data?.tokens?.accessToken) {
    adminToken = saLogin.data.data.tokens.accessToken;
  }

  if (!adminToken) {
    throw new Error('Could not authenticate test superadmin');
  }
}

async function runPaginationSuite() {
  await startTestServer();
  await setupAuth();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${desc}`);
      failed++;
    }
  }

  console.log('\n--- 1. Bookings Server Pagination ---');
  {
    const res = await request('/bookings?page=1&limit=2', { token: adminToken });
    assert(res.status === 200, 'GET /bookings?page=1&limit=2 returned 200');
    assert(Array.isArray(res.data?.data), 'res.data.data is an array');
    assert(res.data?.data.length <= 2, 'Page size does not exceed limit 2');
    assert(res.data?.meta?.page === 1, 'meta.page is 1');
    assert(res.data?.meta?.limit === 2, 'meta.limit is 2');
    assert(typeof res.data?.meta?.total === 'number', 'meta.total is a number');
    assert(typeof res.data?.meta?.totalPages === 'number', 'meta.totalPages is a number');
    assert(typeof res.data?.meta?.totalValue === 'number', 'meta.totalValue aggregate is present and numeric');

    // Page 2
    if (res.data?.meta?.total > 2) {
      const page2 = await request('/bookings?page=2&limit=2', { token: adminToken });
      assert(page2.status === 200, 'GET /bookings?page=2&limit=2 returned 200');
      assert(page2.data?.meta?.page === 2, 'meta.page is 2 on page 2');
      const id1 = res.data?.data[0]?.id;
      const id2 = page2.data?.data[0]?.id;
      assert(id1 !== id2, 'Page 1 and Page 2 have distinct records (deterministic offset)');
    }

    // Invalid parameters clamp
    const clamped = await request('/bookings?page=-5&limit=500', { token: adminToken });
    assert(clamped.status === 200, 'Clamped invalid pagination returns 200');
    assert(clamped.data?.meta?.page === 1, 'Negative page clamped to 1');
    assert(clamped.data?.meta?.limit <= 100, 'Excessive limit clamped to max 100');
  }

  console.log('\n--- 2. Payments Server Pagination ---');
  {
    const res = await request('/payments?page=1&limit=2', { token: adminToken });
    assert(res.status === 200, 'GET /payments?page=1&limit=2 returned 200');
    assert(Array.isArray(res.data?.data) || Array.isArray(res.data?.data?.payments), 'Payments array returned');
    const payments = Array.isArray(res.data?.data) ? res.data.data : res.data?.data?.payments;
    assert(payments.length <= 2, 'Payment page size does not exceed limit 2');
    const meta = res.data?.meta || res.data?.data;
    assert(meta?.page === 1, 'Payment meta.page is 1');
    assert(typeof meta?.total === 'number', 'Payment meta.total is a number');
    assert(typeof meta?.totalFilteredAmount === 'number', 'Payment meta.totalFilteredAmount aggregate is numeric');
  }

  console.log('\n--- 3. Companies Server Pagination ---');
  {
    const res = await request('/companies?page=1&limit=2', { token: adminToken });
    assert(res.status === 200, 'GET /companies?page=1&limit=2 returned 200');
    assert(Array.isArray(res.data?.data), 'Companies data is an array');
    assert(res.data?.data.length <= 2, 'Company page size does not exceed limit 2');
    assert(res.data?.meta?.page === 1, 'meta.page is 1');
    assert(typeof res.data?.meta?.total === 'number', 'meta.total is numeric');
    assert(typeof res.data?.meta?.summary?.paidCount === 'number', 'meta.summary.paidCount is numeric');
    assert(typeof res.data?.meta?.summary?.notPaidCount === 'number', 'meta.summary.notPaidCount is numeric');
  }

  console.log('\n--- 4. Users Server Pagination & Role Counts ---');
  {
    const res = await request('/users?page=1&limit=2', { token: adminToken });
    assert(res.status === 200, 'GET /users?page=1&limit=2 returned 200');
    const users = Array.isArray(res.data?.data) ? res.data.data : res.data?.data?.users;
    assert(Array.isArray(users), 'Users array returned');
    assert(users.length <= 2, 'Users page size does not exceed limit 2');
    const meta = res.data?.meta || res.data?.data;
    assert(meta?.page === 1, 'User meta.page is 1');
    assert(typeof meta?.total === 'number', 'User meta.total is a number');
    assert(typeof meta?.roleCounts?.ALL === 'number', 'meta.roleCounts.ALL is present and numeric');
    assert(typeof meta?.roleCounts?.SUPERADMIN === 'number', 'meta.roleCounts.SUPERADMIN is numeric');
    assert(typeof meta?.roleCounts?.ADMIN === 'number', 'meta.roleCounts.ADMIN is numeric');
    assert(typeof meta?.roleCounts?.STAFF === 'number', 'meta.roleCounts.STAFF is numeric');
    assert(typeof meta?.roleCounts?.CLIENT === 'number', 'meta.roleCounts.CLIENT is numeric');
  }

  console.log('\n--- 5. Invoices Server Pagination ---');
  {
    const res = await request('/invoices?page=1&limit=2', { token: adminToken });
    assert(res.status === 200, 'GET /invoices?page=1&limit=2 returned 200');
    const invoices = Array.isArray(res.data?.data) ? res.data.data : res.data?.data?.invoices;
    assert(Array.isArray(invoices), 'Invoices data array returned');
    assert(invoices.length <= 2, 'Invoice page size does not exceed limit 2');
  }

  console.log(`\n========================================`);
  console.log(`📊 PAGINATION TESTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  server.close();
  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runPaginationSuite().catch((err) => {
  console.error('Test suite failed:', err);
  if (server) server.close();
  process.exit(1);
});
