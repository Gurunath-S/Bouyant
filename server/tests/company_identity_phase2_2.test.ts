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

async function runPhase2_2Suite() {
  await startTestServer();

  console.log('\n=================================================================');
  console.log('🏛️ PHASE 2.2: COMPANY IDENTITY MATCHING & NON-DESTRUCTIVE REG TESTS');
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

  const testSuffix = Date.now().toString().slice(-6);
  const createdCompanyIds: string[] = [];
  const createdUserEmails: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // Setup Base Master Company for Non-Destructive Testing
    // -------------------------------------------------------------------------
    const baseGstin = `27AABCB${testSuffix.slice(-4)}A1Z1`;
    const basePan = `AABCB${testSuffix.slice(-4)}A`;
    const baseMobile = `98200${testSuffix.slice(-5)}`;
    const baseEmail = `master_${testSuffix}@corp.example.com`;

    const masterCompany = await prisma.company.create({
      data: {
        companyCode: `CMP-BASE-${testSuffix}`,
        name: `Acme Industrial Enterprises Ltd ${testSuffix}`,
        contactPerson: 'Director R. Sharma',
        mobile: baseMobile,
        email: baseEmail,
        address: '100 Industrial Estate, Nariman Point',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400021',
        country: 'India',
        gstNumber: baseGstin,
        panNumber: basePan,
        tanNumber: null,
        industry: 'Heavy Machinery',
      },
    });
    createdCompanyIds.push(masterCompany.id);
    createdUserEmails.push(baseEmail);

    // Create an authenticated user for master company
    const masterUser = await prisma.user.create({
      data: {
        email: baseEmail,
        username: `director_${testSuffix}`,
        name: 'Director R. Sharma',
        phone: baseMobile,
        role: 'CLIENT',
        companyId: masterCompany.id,
        passwordHash: await bcrypt.hash('DirectorPass123!', 10),
      },
    });

    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: baseEmail, password: 'DirectorPass123!' },
    });
    const masterToken = loginRes.data?.data?.tokens?.accessToken;

    // -------------------------------------------------------------------------
    // Scenario 1: Exact GSTIN, phone, and email match
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 1: Exact GSTIN, phone, and email match ---');
    const s1Res = await request('/companies', {
      method: 'POST',
      token: masterToken,
      body: {
        name: 'Overwritten Acme Ltd',
        contactPerson: 'New Contact Person',
        mobile: baseMobile,
        email: baseEmail,
        address: '999 Overwritten Street',
        city: 'Pune',
        state: 'Maharashtra',
        pinCode: '411001',
        country: 'India',
        gstNumber: baseGstin,
        panNumber: basePan,
        industry: 'Robotics',
      },
    });

    assert(
      s1Res.status === 200 || s1Res.status === 201,
      'Scenario 1: API returns success on exact legal entity match',
      `Status: ${s1Res.status}`
    );
    assert(
      s1Res.data?.data?.company?.id === masterCompany.id,
      'Scenario 1: Existing company record is reused',
      `Returned ID: ${s1Res.data?.data?.company?.id}`
    );

    const s1DbCompany = await prisma.company.findUnique({ where: { id: masterCompany.id } });
    assert(
      s1DbCompany?.name === `Acme Industrial Enterprises Ltd ${testSuffix}` &&
      s1DbCompany?.address === '100 Industrial Estate, Nariman Point',
      'Scenario 1: Master legal name and address are strictly unchanged in database',
      `DB Name: ${s1DbCompany?.name}, Address: ${s1DbCompany?.address}`
    );

    // -------------------------------------------------------------------------
    // Scenario 2: Same GSTIN with a different phone
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 2: Same GSTIN with a different phone ---');
    const s2Phone = `98299${testSuffix.slice(-5)}`;
    const s2Email = `rep2_${testSuffix}@example.com`;
    createdUserEmails.push(s2Email);

    const s2Res = await request('/companies', {
      method: 'POST',
      body: {
        name: 'Agent Booking For Acme',
        contactPerson: 'Agent 2',
        mobile: s2Phone,
        email: s2Email,
        address: 'Agent Address',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400021',
        country: 'India',
        gstNumber: baseGstin,
        panNumber: basePan,
      },
    });

    assert(
      s2Res.status === 201,
      'Scenario 2: Registration with same GSTIN and different phone succeeds',
      `Status: ${s2Res.status}`
    );
    assert(
      s2Res.data?.data?.company?.id === masterCompany.id,
      'Scenario 2: Legal company is reused without creating a duplicate company',
      `Returned ID: ${s2Res.data?.data?.company?.id}`
    );

    const s2DbCompany = await prisma.company.findUnique({ where: { id: masterCompany.id } });
    assert(
      s2DbCompany?.mobile === baseMobile,
      'Scenario 2: Master company phone number remains original in database',
      `Expected: ${baseMobile}, Actual: ${s2DbCompany?.mobile}`
    );

    // -------------------------------------------------------------------------
    // Scenario 3: Same GSTIN with a different email
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 3: Same GSTIN with a different email ---');
    const s3Email = `rep3_${testSuffix}@example.com`;
    createdUserEmails.push(s3Email);

    const s3Res = await request('/companies', {
      method: 'POST',
      body: {
        name: 'Another Booking Agent',
        contactPerson: 'Agent 3',
        mobile: baseMobile,
        email: s3Email,
        address: 'Agent 3 Address',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400021',
        country: 'India',
        gstNumber: baseGstin,
        panNumber: basePan,
      },
    });

    assert(
      s3Res.status === 201,
      'Scenario 3: Registration with same GSTIN and different email succeeds',
      `Status: ${s3Res.status}`
    );
    assert(
      s3Res.data?.data?.company?.id === masterCompany.id,
      'Scenario 3: Legal company is reused without duplicating company record',
      `Returned ID: ${s3Res.data?.data?.company?.id}`
    );

    const s3DbCompany = await prisma.company.findUnique({ where: { id: masterCompany.id } });
    assert(
      s3DbCompany?.email === baseEmail,
      'Scenario 3: Master company email remains original in database',
      `Expected: ${baseEmail}, Actual: ${s3DbCompany?.email}`
    );

    // -------------------------------------------------------------------------
    // Scenario 4: Same phone and email with a different GSTIN
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 4: Same phone and email with a different GSTIN ---');
    const s4Gstin = `27XYZAB${testSuffix.slice(-4)}A1Z2`;
    const s4Pan = `XYZAB${testSuffix.slice(-4)}A`;

    // Authenticated user (masterUser) registering a second distinct company entity
    const s4Res = await request('/companies', {
      method: 'POST',
      token: masterToken,
      body: {
        name: `Sister Entity Ltd ${testSuffix}`,
        contactPerson: 'Director R. Sharma',
        mobile: baseMobile,
        email: baseEmail,
        address: '456 Sister Corp Tower',
        city: 'Nagpur',
        state: 'Maharashtra',
        pinCode: '440001',
        country: 'India',
        gstNumber: s4Gstin,
        panNumber: s4Pan,
        industry: 'Chemicals',
      },
    });

    assert(
      s4Res.status === 200 || s4Res.status === 201,
      'Scenario 4: Registering second legal entity with same contact details succeeds',
      `Status: ${s4Res.status}`
    );
    const s4CompanyId = s4Res.data?.data?.company?.id;
    if (s4CompanyId) createdCompanyIds.push(s4CompanyId);

    assert(
      s4CompanyId !== masterCompany.id,
      'Scenario 4: Creates a distinct new company rather than overwriting existing company',
      `New ID: ${s4CompanyId}, Master ID: ${masterCompany.id}`
    );

    const checkMasterAfterS4 = await prisma.company.findUnique({ where: { id: masterCompany.id } });
    assert(
      checkMasterAfterS4?.gstNumber === baseGstin && checkMasterAfterS4?.name.startsWith('Acme Industrial'),
      'Scenario 4: Original master company identity is untouched by the new entity creation',
      `Master GST: ${checkMasterAfterS4?.gstNumber}`
    );

    // -------------------------------------------------------------------------
    // Scenario 5: Same PAN across different GSTINs (Multi-state branches)
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 5: Same PAN across different GSTINs ---');
    // In India: State 27 (MH) and State 29 (KA) share the same 10-digit PAN
    const sharedPan = `PANST${testSuffix.slice(-4)}K`;
    const branch1Gst = `27${sharedPan}1Z5`;
    const branch2Gst = `29${sharedPan}2Z8`;

    const branch1Email = `branch1_${testSuffix}@example.com`;
    const branch2Email = `branch2_${testSuffix}@example.com`;
    createdUserEmails.push(branch1Email, branch2Email);

    const b1Res = await request('/companies', {
      method: 'POST',
      body: {
        name: `MultiState Corp Maharashtra ${testSuffix}`,
        contactPerson: 'MH Manager',
        mobile: `98701${testSuffix.slice(-5)}`,
        email: branch1Email,
        address: 'MH Branch Office',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400001',
        country: 'India',
        gstNumber: branch1Gst,
        panNumber: sharedPan,
      },
    });
    const b1Id = b1Res.data?.data?.company?.id;
    if (b1Id) createdCompanyIds.push(b1Id);

    const b2Res = await request('/companies', {
      method: 'POST',
      body: {
        name: `MultiState Corp Karnataka ${testSuffix}`,
        contactPerson: 'KA Manager',
        mobile: `98702${testSuffix.slice(-5)}`,
        email: branch2Email,
        address: 'KA Branch Office',
        city: 'Bengaluru',
        state: 'Karnataka',
        pinCode: '560001',
        country: 'India',
        gstNumber: branch2Gst,
        panNumber: sharedPan,
      },
    });
    const b2Id = b2Res.data?.data?.company?.id;
    if (b2Id) createdCompanyIds.push(b2Id);

    assert(
      b1Res.status === 201 && b2Res.status === 201,
      'Scenario 5: Both multi-state branch registrations succeed',
      `B1: ${b1Res.status}, B2: ${b2Res.status}`
    );
    assert(
      b1Id !== b2Id,
      'Scenario 5: Multi-state branches with same PAN are separate companies',
      `B1 ID: ${b1Id}, B2 ID: ${b2Id}`
    );

    const [dbB1, dbB2] = await Promise.all([
      prisma.company.findUnique({ where: { id: b1Id } }),
      prisma.company.findUnique({ where: { id: b2Id } }),
    ]);
    assert(
      dbB1?.panNumber === sharedPan && dbB2?.panNumber === sharedPan && dbB1?.gstNumber !== dbB2?.gstNumber,
      'Scenario 5: Both branches coexist in database with identical PAN and distinct GSTINs',
      `B1 PAN: ${dbB1?.panNumber}, B2 PAN: ${dbB2?.panNumber}`
    );

    // -------------------------------------------------------------------------
    // Scenario 6: Missing or unregistered GSTIN
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 6: Missing or unregistered GSTIN ---');
    const unregEmail = `unreg1_${testSuffix}@example.com`;
    const unregPhone = `97701${testSuffix.slice(-5)}`;
    createdUserEmails.push(unregEmail);

    // 6a: Create first unregistered company
    const u1Res = await request('/companies', {
      method: 'POST',
      body: {
        name: `Artisan Studio ${testSuffix}`,
        contactPerson: 'Artisan Owner',
        mobile: unregPhone,
        email: unregEmail,
        address: 'Artisan Lane 1',
        city: 'Jaipur',
        state: 'Rajasthan',
        pinCode: '302001',
        country: 'India',
      },
    });
    const u1Id = u1Res.data?.data?.company?.id;
    if (u1Id) createdCompanyIds.push(u1Id);

    assert(u1Res.status === 201, 'Scenario 6a: Unregistered company creates successfully', `Status: ${u1Res.status}`);

    // Login as artisan owner
    const u1Login = await request('/auth/login', {
      method: 'POST',
      body: { email: unregEmail, password: u1Res.data?.data?.temporaryPassword },
    });
    const u1Token = u1Login.data?.data?.tokens?.accessToken;

    // 6b: Authenticated repeat booking with exact name + email + phone reuses unregistered company
    const u2Res = await request('/companies', {
      method: 'POST',
      token: u1Token,
      body: {
        name: `Artisan Studio ${testSuffix}`,
        contactPerson: 'Artisan Owner',
        mobile: unregPhone,
        email: unregEmail,
        address: 'Attempt Overwrite Address',
        city: 'Jaipur',
        state: 'Rajasthan',
        pinCode: '302001',
        country: 'India',
      },
    });
    assert(
      u2Res.data?.data?.company?.id === u1Id,
      'Scenario 6b: Exact matching name + email + phone safely reuses unregistered company',
      `Returned ID: ${u2Res.data?.data?.company?.id}`
    );

    // 6c: Unregistered submission with different name does NOT reuse, creates separate company
    const u3Email = `unreg3_${testSuffix}@example.com`;
    createdUserEmails.push(u3Email);
    const u3Res = await request('/companies', {
      method: 'POST',
      body: {
        name: `Different Craft Shop ${testSuffix}`,
        contactPerson: 'Artisan Owner',
        mobile: unregPhone,
        email: u3Email,
        address: 'Artisan Lane 2',
        city: 'Jaipur',
        state: 'Rajasthan',
        pinCode: '302001',
        country: 'India',
      },
    });
    const u3Id = u3Res.data?.data?.company?.id;
    if (u3Id) createdCompanyIds.push(u3Id);

    assert(
      u3Id !== u1Id,
      'Scenario 6c: Different unregistered company name creates distinct company',
      `U1: ${u1Id}, U3: ${u3Id}`
    );

    // -------------------------------------------------------------------------
    // Scenario 7: Conflicting or incomplete company identity fields
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 7: Conflicting or incomplete company identity fields ---');
    // Guest registers without GSTIN, but with phone and email belonging to master company
    const s7Email = `conflict_${testSuffix}@example.com`;
    createdUserEmails.push(s7Email);

    const s7Res = await request('/companies', {
      method: 'POST',
      body: {
        name: 'Unregistered Ambiguous Company',
        contactPerson: 'Conflict Person',
        mobile: baseMobile, // phone matches masterCompany
        email: s7Email,
        address: 'Some Address',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400001',
        country: 'India',
        // No GSTIN
      },
    });
    const s7Id = s7Res.data?.data?.company?.id;
    if (s7Id) createdCompanyIds.push(s7Id);

    assert(
      s7Res.status === 201,
      'Scenario 7: Registration without GSTIN succeeds as new company',
      `Status: ${s7Res.status}`
    );
    assert(
      s7Id !== masterCompany.id,
      'Scenario 7: Does NOT hijack or merge with GST-registered master company',
      `S7 ID: ${s7Id}, Master ID: ${masterCompany.id}`
    );

    // -------------------------------------------------------------------------
    // Scenario 8: Existing company master fields remain unchanged
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 8: Existing company master fields remain unchanged ---');
    const finalMaster = await prisma.company.findUnique({ where: { id: masterCompany.id } });
    assert(
      finalMaster?.name === masterCompany.name &&
      finalMaster?.gstNumber === masterCompany.gstNumber &&
      finalMaster?.panNumber === masterCompany.panNumber &&
      finalMaster?.tanNumber === masterCompany.tanNumber &&
      finalMaster?.address === masterCompany.address &&
      finalMaster?.city === masterCompany.city &&
      finalMaster?.state === masterCompany.state &&
      finalMaster?.pinCode === masterCompany.pinCode &&
      finalMaster?.contactPerson === masterCompany.contactPerson &&
      finalMaster?.mobile === masterCompany.mobile &&
      finalMaster?.email === masterCompany.email,
      'Scenario 8: All master company fields are 100% identical before and after all registrations',
      `Final master company matches original snapshot`
    );

    // -------------------------------------------------------------------------
    // Scenario 9: Existing user identity and company association remain unchanged
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 9: Existing user identity and company association remain unchanged ---');
    const finalMasterUser = await prisma.user.findUnique({ where: { id: masterUser.id } });
    assert(
      finalMasterUser?.companyId === masterCompany.id &&
      finalMasterUser?.name === masterUser.name &&
      finalMasterUser?.phone === masterUser.phone &&
      finalMasterUser?.email === masterUser.email,
      'Scenario 9: Authenticated user identity and company association remain completely unchanged',
      `User companyId: ${finalMasterUser?.companyId}`
    );

    // -------------------------------------------------------------------------
    // Scenario 10: Concurrent company creation and company-code uniqueness
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 10: Concurrent company creation and company-code uniqueness ---');
    const concurrentCount = 6;
    const concurrentPromises = [];

    for (let i = 0; i < concurrentCount; i++) {
      const cEmail = `concurrent_${i}_${testSuffix}@example.com`;
      createdUserEmails.push(cEmail);
      concurrentPromises.push(
        request('/companies', {
          method: 'POST',
          body: {
            name: `Concurrent Firm ${i} ${testSuffix}`,
            contactPerson: `Concurrent Person ${i}`,
            mobile: `9660${i}${testSuffix.slice(-5)}`,
            email: cEmail,
            address: `Concurrent Street ${i}`,
            city: 'Chennai',
            state: 'Tamil Nadu',
            pinCode: '600001',
            country: 'India',
          },
        })
      );
    }

    const concurrentResults = await Promise.all(concurrentPromises);
    const concurrentCompanyCodes: string[] = [];
    let allSuccessful = true;

    for (const res of concurrentResults) {
      if (res.status !== 201) {
        allSuccessful = false;
      }
      const code = res.data?.data?.company?.companyCode;
      const cId = res.data?.data?.company?.id;
      if (cId) createdCompanyIds.push(cId);
      if (code) concurrentCompanyCodes.push(code);
    }

    assert(
      allSuccessful,
      'Scenario 10: All concurrent company registrations return 201 Created',
      `Success count: ${concurrentResults.filter((r) => r.status === 201).length}/${concurrentCount}`
    );

    const uniqueCodes = new Set(concurrentCompanyCodes);
    assert(
      uniqueCodes.size === concurrentCount,
      'Scenario 10: Every generated companyCode is distinct under high concurrency',
      `Generated codes: ${concurrentCompanyCodes.join(', ')}`
    );

    const validCodeFormat = concurrentCompanyCodes.every((c) => /^CMP-\d{4}-\d{3}$/.test(c));
    assert(
      validCodeFormat,
      'Scenario 10: All company codes follow CMP-[Year]-[Sequence] standard format',
      `Sample: ${concurrentCompanyCodes[0]}`
    );

    // -------------------------------------------------------------------------
    // Scenario 11: Phase 2.1 Account-takeover regression check
    // -------------------------------------------------------------------------
    console.log('\n--- Scenario 11: Phase 2.1 Account-takeover regression check ---');
    // Unauthenticated guest attempting to register with masterUser's email
    const s11GuestRes = await request('/companies', {
      method: 'POST',
      body: {
        name: 'Attacker Fake Company',
        contactPerson: 'Attacker',
        mobile: '9999999999',
        email: baseEmail, // Existing account email
        address: 'Attacker Address',
        city: 'Delhi',
        state: 'Delhi',
        pinCode: '110001',
        country: 'India',
      },
    });

    assert(
      s11GuestRes.status === 409,
      'Scenario 11: Unauthenticated registration with existing email rejected with 409 Conflict',
      `Status: ${s11GuestRes.status}`
    );
    assert(
      s11GuestRes.data?.code === 'ACCOUNT_EXISTS' || s11GuestRes.data?.error?.code === 'ACCOUNT_EXISTS' || s11GuestRes.data?.details?.[0]?.code === 'ACCOUNT_EXISTS',
      'Scenario 11: Error payload returns ACCOUNT_EXISTS code',
      `Payload: ${JSON.stringify(s11GuestRes.data)}`
    );
    assert(
      !s11GuestRes.data?.data?.tokens,
      'Scenario 11: No JWT tokens issued to unauthenticated guest',
      'Tokens omitted'
    );

  } finally {
    // Cleanup created test records safely
    try {
      if (createdUserEmails.length > 0) {
        await prisma.user.deleteMany({
          where: { email: { in: createdUserEmails } },
        });
      }
      if (createdCompanyIds.length > 0) {
        await prisma.company.deleteMany({
          where: { id: { in: createdCompanyIds } },
        });
      }
    } catch (cleanupErr) {
      console.warn('Test cleanup warning:', cleanupErr);
    }

    if (server) {
      server.close();
    }
  }

  console.log('\n=================================================================');
  console.log(`📊 PHASE 2.2 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2_2Suite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
