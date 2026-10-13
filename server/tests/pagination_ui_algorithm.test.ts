import { createApp } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { getPaginationRange } from '../../client/src/components/ui/TablePagination.js';

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

async function runTests() {
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

  console.log('\n--- 1. Numbered Pagination Range Algorithm Unit Tests ---');
  {
    // Small ranges (<= 7 pages)
    assert(
      JSON.stringify(getPaginationRange(1, 1)) === JSON.stringify([1]),
      'Single page: returns [1]'
    );
    assert(
      JSON.stringify(getPaginationRange(3, 5)) === JSON.stringify([1, 2, 3, 4, 5]),
      '5 pages: returns [1, 2, 3, 4, 5]'
    );
    assert(
      JSON.stringify(getPaginationRange(4, 7)) === JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
      '7 pages: returns [1, 2, 3, 4, 5, 6, 7]'
    );

    // Near beginning (<= 4)
    assert(
      JSON.stringify(getPaginationRange(1, 10)) === JSON.stringify([1, 2, 3, 4, 5, 'ellipsis', 10]),
      'Page 1 of 10: [1, 2, 3, 4, 5, ellipsis, 10]'
    );
    assert(
      JSON.stringify(getPaginationRange(4, 10)) === JSON.stringify([1, 2, 3, 4, 5, 'ellipsis', 10]),
      'Page 4 of 10: [1, 2, 3, 4, 5, ellipsis, 10]'
    );

    // Near end (>= totalPages - 3)
    assert(
      JSON.stringify(getPaginationRange(7, 10)) === JSON.stringify([1, 'ellipsis', 6, 7, 8, 9, 10]),
      'Page 7 of 10: [1, ellipsis, 6, 7, 8, 9, 10]'
    );
    assert(
      JSON.stringify(getPaginationRange(10, 10)) === JSON.stringify([1, 'ellipsis', 6, 7, 8, 9, 10]),
      'Page 10 of 10: [1, ellipsis, 6, 7, 8, 9, 10]'
    );

    // Middle pages
    assert(
      JSON.stringify(getPaginationRange(5, 10)) === JSON.stringify([1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]),
      'Page 5 of 10 (middle): [1, ellipsis, 4, 5, 6, ellipsis, 10]'
    );
    assert(
      JSON.stringify(getPaginationRange(6, 10)) === JSON.stringify([1, 'ellipsis', 5, 6, 7, 'ellipsis', 10]),
      'Page 6 of 10 (middle): [1, ellipsis, 5, 6, 7, ellipsis, 10]'
    );

    // Large scale: 4000 pages (from user prompt)
    const largeFirst = getPaginationRange(1, 4000);
    assert(
      JSON.stringify(largeFirst) === JSON.stringify([1, 2, 3, 4, 5, 'ellipsis', 4000]),
      '4000 pages at page 1: [1, 2, 3, 4, 5, ellipsis, 4000]'
    );
    const largeMid = getPaginationRange(2000, 4000);
    assert(
      JSON.stringify(largeMid) === JSON.stringify([1, 'ellipsis', 1999, 2000, 2001, 'ellipsis', 4000]),
      '4000 pages at page 2000: [1, ellipsis, 1999, 2000, 2001, ellipsis, 4000]'
    );
    const largeLast = getPaginationRange(4000, 4000);
    assert(
      JSON.stringify(largeLast) === JSON.stringify([1, 'ellipsis', 3996, 3997, 3998, 3999, 4000]),
      '4000 pages at page 4000: [1, ellipsis, 3996, 3997, 3998, 3999, 4000]'
    );

    // Range size never exceeds 7
    assert(largeFirst.length <= 7, 'largeFirst length is <= 7');
    assert(largeMid.length <= 7, 'largeMid length is <= 7');
    assert(largeLast.length <= 7, 'largeLast length is <= 7');
  }

  console.log('\n--- 2. Record Count Range and Serial Number Math ---');
  {
    // Item range calculation
    function calcRange(totalItems: number, page: number, pageSize: number) {
      const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
      const endItem = Math.min(page * pageSize, totalItems);
      return { startItem, endItem };
    }

    const r1 = calcRange(40000, 3, 10);
    assert(r1.startItem === 21 && r1.endItem === 30, 'Page 3 of 40000 (size 10): 21–30');

    const r2 = calcRange(25, 3, 10);
    assert(r2.startItem === 21 && r2.endItem === 25, 'Page 3 of 25 (size 10): 21–25');

    const r3 = calcRange(0, 1, 10);
    assert(r3.startItem === 0 && r3.endItem === 0, 'Empty results: 0–0');

    // Serial number across pages
    function calcSerial(page: number, pageSize: number, idx: number) {
      return (page - 1) * pageSize + idx + 1;
    }

    assert(calcSerial(1, 10, 0) === 1, 'Page 1, item 0 -> S.No 1');
    assert(calcSerial(1, 10, 9) === 10, 'Page 1, item 9 -> S.No 10');
    assert(calcSerial(2, 10, 0) === 11, 'Page 2, item 0 -> S.No 11');
    assert(calcSerial(3, 25, 0) === 51, 'Page 3, size 25, item 0 -> S.No 51');
    assert(calcSerial(4, 50, 49) === 200, 'Page 4, size 50, item 49 -> S.No 200');
  }

  console.log('\n--- 3. Page Size Selector Backend Verification ---');
  await startTestServer();
  await setupAuth();

  // Test page sizes: 10, 25, 50, 100 on Bookings
  for (const limit of [10, 25, 50, 100]) {
    const res = await request(`/bookings?page=1&limit=${limit}`, { token: adminToken });
    assert(res.status === 200, `GET /bookings?limit=${limit} returns 200`);
    assert(res.data?.meta?.limit === limit, `meta.limit matches requested ${limit}`);
    assert(Array.isArray(res.data?.data), 'Data is array');
    assert(res.data?.data.length <= limit, `Returned items <= ${limit}`);
  }

  // Test page sizes on Payments
  {
    const res = await request('/payments?page=1&limit=25', { token: adminToken });
    assert(res.status === 200, 'GET /payments?limit=25 returns 200');
    assert(res.data?.meta?.limit === 25, 'Payment meta.limit matches 25');
  }

  // Test page sizes on Companies
  {
    const res = await request('/companies?page=1&limit=50', { token: adminToken });
    assert(res.status === 200, 'GET /companies?limit=50 returns 200');
    assert(res.data?.meta?.limit === 50, 'Company meta.limit matches 50');
  }

  // Test page sizes on Users
  {
    const res = await request('/users?page=1&limit=25', { token: adminToken });
    assert(res.status === 200, 'GET /users?limit=25 returns 200');
    assert(res.data?.meta?.limit === 25, 'Users meta.limit matches 25');
  }

  // Test page sizes on Invoices
  {
    const res = await request('/invoices?page=1&limit=25', { token: adminToken });
    assert(res.status === 200, 'GET /invoices?limit=25 returns 200');
    assert(res.data?.meta?.limit === 25, 'Invoices meta.limit matches 25');
  }

  server.close();
  await prisma.$disconnect();

  console.log(`\n========================================`);
  console.log(`📊 ALL PAGINATION UI & ALGORITHM TESTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  if (server) server.close();
  process.exit(1);
});
