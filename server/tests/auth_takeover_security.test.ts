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
    // not json
  }

  return { status, data };
}

async function runAuthSecuritySuite() {
  await startTestServer();

  console.log('\n======================================================');
  console.log('🔒 PHASE 2.1: AUTHENTICATION & ACCOUNT TAKEOVER TESTS');
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

  const testSuffix = Date.now().toString().slice(-6);
  const victimEmail = `victim_${testSuffix}@example.com`;
  const victimPhone = `98765${testSuffix.slice(-5)}`;
  const phoneOwnerEmail = `phoneowner_${testSuffix}@example.com`;
  const phoneShared = `91234${testSuffix.slice(-5)}`;

  let victimUserId: string;
  let originalCompanyId: string;
  let phoneOwnerUserId: string;

  try {
    // 0. Setup: Create existing company and user
    const victimCompany = await prisma.company.create({
      data: {
        companyCode: `CMP-TEST-${testSuffix}`,
        name: `Victim Original Company ${testSuffix}`,
        contactPerson: 'Victim User',
        mobile: victimPhone,
        email: victimEmail,
        address: '123 Victim Street',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pinCode: '600001',
        country: 'India',
        industry: 'Testing',
      },
    });
    originalCompanyId = victimCompany.id;

    const passwordHash = await bcrypt.hash('VictimPass123!', 10);
    const victimUser = await prisma.user.create({
      data: {
        email: victimEmail,
        username: `victim_${testSuffix}`,
        name: 'Victim Original Name',
        phone: victimPhone,
        passwordHash,
        role: 'CLIENT',
        companyId: originalCompanyId,
      },
    });
    victimUserId = victimUser.id;

    const phoneOwnerUser = await prisma.user.create({
      data: {
        email: phoneOwnerEmail,
        username: `phoneowner_${testSuffix}`,
        name: 'Phone Owner Original Name',
        phone: phoneShared,
        passwordHash,
        role: 'CLIENT',
        companyId: originalCompanyId,
      },
    });
    phoneOwnerUserId = phoneOwnerUser.id;

    // TEST 1: Unauthenticated guest submits existing user's email
    // MUST NOT issue JWT tokens for victimUser
    // MUST NOT overwrite victimUser's name or companyId
    // MUST return 409 Conflict with code ACCOUNT_EXISTS
    const guestAttempt = await request('/companies', {
      method: 'POST',
      body: {
        name: `Attacker Fake Company ${testSuffix}`,
        contactPerson: 'Attacker Impersonator',
        mobile: '9999999999',
        email: victimEmail, // COLLISION ON EXISTING USER EMAIL
        address: '666 Rogue Road',
        city: 'Delhi',
        state: 'Delhi',
        country: 'India',
      },
    });

    assert(
      guestAttempt.status === 409,
      'Unauthenticated submission with existing email returns 409 Conflict',
      `Got status ${guestAttempt.status}: ${JSON.stringify(guestAttempt.data)}`
    );

    assert(
      guestAttempt.data?.code === 'ACCOUNT_EXISTS' || guestAttempt.data?.errors?.[0]?.code === 'ACCOUNT_EXISTS',
      'Conflict response includes ACCOUNT_EXISTS error code',
      JSON.stringify(guestAttempt.data)
    );

    // Verify victim user was NOT modified in the database
    const victimInDb = await prisma.user.findUnique({ where: { id: victimUserId } });
    assert(
      victimInDb?.name === 'Victim Original Name',
      'Victim user name was NOT overwritten by unauthenticated guest',
      `Current in DB: "${victimInDb?.name}"`
    );
    assert(
      victimInDb?.companyId === originalCompanyId,
      'Victim user companyId was NOT changed by unauthenticated guest',
      `Current in DB: "${victimInDb?.companyId}" vs original "${originalCompanyId}"`
    );

    // TEST 2: Phone Number Collision does NOT hijack existing user
    // A new guest uses phoneShared, but with a brand new email
    const newGuestEmail = `newguest_${testSuffix}@example.com`;
    const phoneCollisionAttempt = await request('/companies', {
      method: 'POST',
      body: {
        name: `New Guest Company ${testSuffix}`,
        contactPerson: 'Legitimate New Guest',
        mobile: phoneShared, // COLLISION ON PHONE
        email: newGuestEmail,
        address: '777 Clean Ave',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
      },
    });

    const phoneOwnerInDb = await prisma.user.findUnique({ where: { id: phoneOwnerUserId } });
    assert(
      phoneOwnerInDb?.name === 'Phone Owner Original Name',
      'Existing user was NOT mutated by another registration sharing their phone number',
      `Current in DB: "${phoneOwnerInDb?.name}"`
    );
    assert(
      phoneOwnerInDb?.companyId === originalCompanyId,
      'Existing user companyId was NOT hijacked by phone collision',
      `Current in DB: "${phoneOwnerInDb?.companyId}"`
    );

    // TEST 3: Authenticated user CAN link company profile
    // Login as victimUser to get legitimate tokens
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: victimEmail,
        password: 'VictimPass123!',
      },
    });

    assert(loginRes.status === 200, 'Legitimate user can authenticate via POST /auth/login');
    const validToken = loginRes.data?.data?.tokens?.accessToken;

    if (validToken) {
      const authAttempt = await request('/companies', {
        method: 'POST',
        token: validToken,
        body: {
          name: `Victim Updated Company ${testSuffix}`,
          contactPerson: 'Victim User Verified',
          mobile: victimPhone,
          email: victimEmail,
          address: '123 Victim Street',
          city: 'Chennai',
          state: 'Tamil Nadu',
          country: 'India',
        },
      });

      assert(
        authAttempt.status === 200 || authAttempt.status === 201,
        'Authenticated user can successfully register/link their company profile (200/201)',
        `Got status ${authAttempt.status}: ${JSON.stringify(authAttempt.data)}`
      );
    }

  } catch (err: any) {
    console.error('Unexpected test error:', err);
    failed++;
  } finally {
    // Cleanup
    try {
      await prisma.user.deleteMany({
        where: { email: { in: [victimEmail, phoneOwnerEmail, `newguest_${testSuffix}@example.com`] } },
      });
      await prisma.company.deleteMany({
        where: { email: { in: [victimEmail, phoneOwnerEmail, `newguest_${testSuffix}@example.com`] } },
      });
    } catch (_e) {
      // ignore cleanup errors
    }

    if (server) server.close();
    await prisma.$disconnect();

    console.log('\n======================================================');
    console.log(`📊 PHASE 2.1 RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  }
}

runAuthSecuritySuite().catch(console.error);
