import { createApp } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import bcrypt from 'bcryptjs';
import { razorpay } from '../src/config/razorpay.js';
import { EmailService } from '../src/services/email.service.js';

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
  let raw: any = null;
  try {
    raw = await res.json();
  } catch (_e) {
    // not json
  }

  const data = raw && raw.data !== undefined ? raw.data : raw;
  return { status, data, raw, headers: res.headers };
}

async function runRound2Suite() {
  await startTestServer();

  console.log('\n================================================================================');
  console.log('🧪 ROUND 2: SHARED EXHIBITOR CONTACTS, GUEST BOOKING, ADMIN PASSWORDS SUITE');
  console.log('================================================================================\n');

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

  // Mock Razorpay orders
  const origOrdersCreate = razorpay.orders.create;
  (razorpay.orders as any).create = async (options: any) => ({
    id: `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    entity: 'order',
    amount: options.amount,
    currency: options.currency,
    receipt: options.receipt,
    status: 'created',
  });

  // Mock EmailService to capture email notifications without sending real emails
  const sentEmails: any[] = [];
  const origSendAdminPasswordResetNotificationEmail = EmailService.sendAdminPasswordResetNotificationEmail;
  const origSendAccountCredentialsEmail = EmailService.sendAccountCredentialsEmail;
  const origSendPasswordResetEmail = EmailService.sendPasswordResetEmail;
  const origSendAdminAlert = EmailService.sendAdminAlert;

  (EmailService as any).sendAdminPasswordResetNotificationEmail = async (payload: any) => {
    sentEmails.push({ type: 'ADMIN_PASSWORD_RESET', payload });
    return { status: 'ACCEPTED', messageId: 'mock-admin-reset-id', attempts: 1 };
  };
  (EmailService as any).sendAccountCredentialsEmail = async (payload: any) => {
    sentEmails.push({ type: 'ACCOUNT_CREDENTIALS', payload });
    return { status: 'ACCEPTED', messageId: 'mock-creds-id', attempts: 1 };
  };
  (EmailService as any).sendPasswordResetEmail = async (payload: any) => {
    sentEmails.push({ type: 'PASSWORD_RESET', payload });
    return { status: 'ACCEPTED', messageId: 'mock-pass-reset-id', attempts: 1 };
  };
  (EmailService as any).sendAdminAlert = async (payload: any) => {
    sentEmails.push({ type: 'ADMIN_ALERT', payload });
    return { status: 'ACCEPTED', messageId: 'mock-alert-id', attempts: 1 };
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
    // Setup Test Exhibition, Floor Plan, and Test Stalls
    // -------------------------------------------------------------------------
    const exhibition = await prisma.exhibition.create({
      data: {
        title: `Round2 Expo ${suffix}`,
        slug: `round2-expo-${suffix}`,
        description: `Round2 Expo Description ${suffix}`,
        edition: `R2-${suffix}`,
        eventCode: `EV-${suffix}`,
        venue: 'Exhibition Hall Round 2',
        city: 'Mumbai',
        startDate: new Date(Date.now() + 86400000 * 30),
        endDate: new Date(Date.now() + 86400000 * 33),
        bookingEndDate: new Date(Date.now() + 86400000 * 20),
        status: 'PUBLISHED',
      },
    });
    testExhibitionId = exhibition.id;

    const floorPlan = await prisma.floorPlan.create({
      data: {
        name: `Main Hall ${suffix}`,
        exhibitionId: exhibition.id,
      },
    });
    testFloorPlanId = floorPlan.id;

    const stall1 = await prisma.stall.create({
      data: {
        stallNumber: `R2-A1-${suffix}`,
        category: 'STANDARD',
        price: 15000,
        areaSqFt: 120,
        status: 'AVAILABLE',
        floorPlanId: floorPlan.id,
      },
    });
    createdStallIds.push(stall1.id);

    const stall2 = await prisma.stall.create({
      data: {
        stallNumber: `R2-A2-${suffix}`,
        category: 'STANDARD',
        price: 18000,
        areaSqFt: 150,
        status: 'AVAILABLE',
        floorPlanId: floorPlan.id,
      },
    });
    createdStallIds.push(stall2.id);

    // Setup Admin and Staff users
    const adminPassword = 'AdminSecret123!';
    const adminHash = await bcrypt.hash(adminPassword, 10);
    const adminUser = await prisma.user.create({
      data: {
        email: `admin_${suffix}@buoyantmedia.com`,
        username: `admin_${suffix}`,
        passwordHash: adminHash,
        name: `Admin User ${suffix}`,
        role: 'ADMIN',
      },
    });
    createdUserIds.push(adminUser.id);

    const staffPassword = 'StaffSecret123!';
    const staffHash = await bcrypt.hash(staffPassword, 10);
    const staffUser = await prisma.user.create({
      data: {
        email: `staff_${suffix}@buoyantmedia.com`,
        username: `staff_${suffix}`,
        spcode: `SP${suffix.slice(-4)}`,
        passwordHash: staffHash,
        name: `Staff User ${suffix}`,
        role: 'STAFF',
      },
    });
    createdUserIds.push(staffUser.id);

    // Login as Admin to get Admin token
    const adminLoginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: adminUser.email,
        password: adminPassword,
      },
    });
    assert(
      adminLoginRes.status === 200 && adminLoginRes.data?.tokens?.accessToken,
      'Requirement 13: Administrator email login works',
      JSON.stringify(adminLoginRes.data)
    );
    const adminToken = adminLoginRes.data?.tokens?.accessToken;

    // Login as Staff via SP-Code
    const staffLoginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: staffUser.spcode,
        password: staffPassword,
      },
    });
    assert(
      staffLoginRes.status === 200 && staffLoginRes.data?.tokens?.accessToken,
      'Requirement 13: Staff SP-code login works',
      JSON.stringify(staffLoginRes.data)
    );

    // -------------------------------------------------------------------------
    // TEST SECTION: Shared Exhibitor Contacts & Company Identity
    // -------------------------------------------------------------------------
    const validGstin = `27AAACT${suffix.slice(-4)}F1Z5`;
    const sharedEmail = `corp_${suffix}@techcorp.com`;
    const primaryPhone = `98200${suffix.slice(-5)}`;
    const siblingPhone = `98201${suffix.slice(-5)}`;
    const distinctEmail = `sales_${suffix}@techcorp.com`;

    // 1. Register first exhibitor under GSTIN
    const reg1Res = await request('/companies', {
      method: 'POST',
      body: {
        name: `TechCorp Solutions ${suffix}`,
        gstNumber: validGstin,
        panNumber: `AAACT${suffix.slice(-4)}F`,
        contactPerson: `Alice Manager ${suffix}`,
        email: sharedEmail,
        mobile: primaryPhone,
        address: '100 Tech Park, Andheri East',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400069',
        country: 'India',
        category: 'Information Technology',
      },
    });

    assert(
      reg1Res.status === 201 && reg1Res.data?.company?.id && reg1Res.data?.user?.username,
      'Initial company and primary exhibitor registration succeeds',
      JSON.stringify(reg1Res.data)
    );
    const company1Id = reg1Res.data?.company?.id;
    const user1 = reg1Res.data?.user;
    const user1Password = reg1Res.data?.temporaryPassword;
    createdCompanyIds.push(company1Id);
    createdUserIds.push(user1.id);

    // Verify company master data
    const initialCompanyRecord = await prisma.company.findUnique({
      where: { id: company1Id },
    });
    assert(
      initialCompanyRecord?.name === `TechCorp Solutions ${suffix}`,
      'Requirement 7: Initial company master record saved accurately'
    );

    // 2. Same GSTIN + same email + different phone: creates separate exhibitor account with unique username
    const reg2Res = await request('/companies', {
      method: 'POST',
      body: {
        name: `TechCorp Solutions ${suffix} (Should Not Overwrite)`,
        gstNumber: validGstin,
        panNumber: `AAACT${suffix.slice(-4)}F`,
        contactPerson: `Bob Engineer ${suffix}`,
        email: sharedEmail, // Shared email!
        mobile: siblingPhone, // Different phone
        address: '200 Different Floor',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400069',
        country: 'India',
        category: 'Information Technology',
      },
    });

    assert(
      reg2Res.status === 201 &&
        reg2Res.data?.company?.id === company1Id &&
        reg2Res.data?.user?.id !== user1.id &&
        reg2Res.data?.user?.username !== user1.username,
      'Requirement 4: Same GSTIN + same email + different phone creates separate exhibitor account with unique username',
      JSON.stringify(reg2Res.data)
    );
    const user2 = reg2Res.data?.user;
    const user2Password = reg2Res.data?.temporaryPassword;
    createdUserIds.push(user2.id);

    // 3. Same GSTIN + different email + same phone: creates separate exhibitor account with unique username
    const reg3Res = await request('/companies', {
      method: 'POST',
      body: {
        name: `TechCorp Solutions ${suffix}`,
        gstNumber: validGstin,
        panNumber: `AAACT${suffix.slice(-4)}F`,
        contactPerson: `Carol Sales ${suffix}`,
        email: distinctEmail, // Different email
        mobile: primaryPhone, // Shared phone!
        address: '100 Tech Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400069',
        country: 'India',
        category: 'Information Technology',
      },
    });

    assert(
      reg3Res.status === 201 &&
        reg3Res.data?.company?.id === company1Id &&
        reg3Res.data?.user?.id !== user1.id &&
        reg3Res.data?.user?.id !== user2.id &&
        reg3Res.data?.user?.username !== user1.username,
      'Requirement 5: Same GSTIN + different email + same phone creates separate exhibitor account with unique username',
      JSON.stringify(reg3Res.data)
    );
    const user3 = reg3Res.data?.user;
    createdUserIds.push(user3.id);

    // 4. Same GSTIN + different email + different phone: creates separate exhibitor account with unique username
    const anotherEmail = `ops_${suffix}@techcorp.com`;
    const anotherPhone = `98202${suffix.slice(-5)}`;
    const reg4Res = await request('/companies', {
      method: 'POST',
      body: {
        name: `TechCorp Solutions ${suffix}`,
        gstNumber: validGstin,
        panNumber: `AAACT${suffix.slice(-4)}F`,
        contactPerson: `Dave Ops ${suffix}`,
        email: anotherEmail,
        mobile: anotherPhone,
        address: '100 Tech Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400069',
        country: 'India',
        category: 'Information Technology',
      },
    });

    assert(
      reg4Res.status === 201 &&
        reg4Res.data?.company?.id === company1Id &&
        reg4Res.data?.user?.id !== user1.id &&
        reg4Res.data?.user?.username !== user1.username,
      'Requirement 6: Same GSTIN + different email + different phone creates separate exhibitor account with unique username',
      JSON.stringify(reg4Res.data)
    );
    const user4 = reg4Res.data?.user;
    createdUserIds.push(user4.id);

    // 5. Verify Requirement 7: Company master data was NOT overwritten
    const currentCompanyRecord = await prisma.company.findUnique({
      where: { id: company1Id },
    });
    assert(
      currentCompanyRecord?.name === `TechCorp Solutions ${suffix}` &&
        currentCompanyRecord?.address === '100 Tech Park, Andheri East',
      'Requirement 7: Existing company master data is not overwritten when sibling employees register'
    );

    // 6. Requirement 3 & Requirement 1 & 2: Same GSTIN + same email + same phone as guest booking
    // Must recognize existing account WITHOUT creating duplicate or blocking guest booking
    const guestSameIdentityRes = await request('/companies', {
      method: 'POST',
      body: {
        name: `TechCorp Solutions ${suffix}`,
        gstNumber: validGstin,
        panNumber: `AAACT${suffix.slice(-4)}F`,
        contactPerson: `Alice Manager ${suffix}`,
        email: sharedEmail,
        mobile: primaryPhone,
        address: '100 Tech Park, Andheri East',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400069',
        country: 'India',
        category: 'Information Technology',
      },
    });

    assert(
      guestSameIdentityRes.status === 201 &&
        guestSameIdentityRes.data?.isGuestBooking === true &&
        guestSameIdentityRes.data?.user === null &&
        guestSameIdentityRes.data?.recognizedAccount?.username === user1.username,
      'Requirement 3: Same GSTIN + same email + same phone recognizes existing account without duplicate creation or blocking guest booking',
      JSON.stringify(guestSameIdentityRes.data)
    );

    // 7. Test guest booking creation and submission
    const guestBookingRes = await request('/bookings', {
      method: 'POST',
      body: {
        exhibitionId: testExhibitionId,
        stallIds: [stall1.id],
        companyId: company1Id,
        contactPerson: `Guest Booking User ${suffix}`,
        contactEmail: sharedEmail,
        contactPhone: primaryPhone,
        address: '100 Tech Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400069',
        country: 'India',
      },
    });

    const createdBkgId =
      guestBookingRes.data?.data?.bookingId ||
      guestBookingRes.data?.bookingId ||
      guestBookingRes.data?.id;
    assert(
      guestBookingRes.status === 201 && createdBkgId,
      'Requirement 1 & 2: Unauthenticated user can submit a supported guest booking when existing account is recognized',
      JSON.stringify(guestBookingRes.data)
    );
    if (createdBkgId) {
      createdBookingIds.push(createdBkgId);
    }

    // 8. Requirement 8: Different-GSTIN cross-company conflicts cannot take over an existing account
    const conflictingGstin = `33BBBCX${suffix.slice(-4)}M1Z2`;
    const crossCompanyRes = await request('/companies', {
      method: 'POST',
      body: {
        name: `Conflicting Rival Ltd ${suffix}`,
        gstNumber: conflictingGstin,
        panNumber: `BBBCX${suffix.slice(-4)}M`,
        contactPerson: `Rival Impersonator ${suffix}`,
        email: sharedEmail, // Attempt to reuse TechCorp's email under a different GSTIN!
        mobile: `99999${suffix.slice(-5)}`,
        address: '500 Rival Towers',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pinCode: '600001',
        country: 'India',
        category: 'Manufacturing',
      },
    });

    assert(
      crossCompanyRes.status === 409,
      'Requirement 8: Different-GSTIN cross-company email conflicts are strictly rejected (409 Conflict)',
      JSON.stringify(crossCompanyRes.data)
    );

    // 9. Requirement 9: No-GSTIN company matching retains the strict existing fallback
    const strictFallbackEmail = `strict_${suffix}@fallback.com`;
    const strictFallbackPhone = `98111${suffix.slice(-5)}`;
    const regNoGstRes = await request('/companies', {
      method: 'POST',
      body: {
        name: `Strict Fallback Enterprise ${suffix}`,
        gstNumber: '',
        contactPerson: `Eve Director ${suffix}`,
        email: strictFallbackEmail,
        mobile: strictFallbackPhone,
        address: '12 Fallback Lane',
        city: 'Pune',
        state: 'Maharashtra',
        pinCode: '411001',
        country: 'India',
        category: 'Services',
      },
    });

    assert(
      regNoGstRes.status === 201 && regNoGstRes.data?.company?.id,
      'Initial No-GSTIN company created successfully'
    );
    const noGstCompanyId = regNoGstRes.data?.company?.id;
    createdCompanyIds.push(noGstCompanyId);
    if (regNoGstRes.data?.user?.id) createdUserIds.push(regNoGstRes.data.user.id);

    // Exact name + email + phone matches the existing no-GSTIN company
    const lookupExactFallback = await request('/auth/lookup-account', {
      method: 'GET',
      body: undefined,
    });
    const lookupExactRes = await request(
      `/auth/lookup-account?companyName=${encodeURIComponent(
        `Strict Fallback Enterprise ${suffix}`
      )}&email=${encodeURIComponent(strictFallbackEmail)}&phone=${strictFallbackPhone}`
    );
    assert(
      lookupExactRes.data?.company?.id === noGstCompanyId,
      'Requirement 9: Exact normalized company name + email + phone resolves existing no-GSTIN company',
      JSON.stringify(lookupExactRes.data)
    );

    // Different phone does NOT match no-GSTIN company (strict fallback preserved)
    const lookupDiffPhoneRes = await request(
      `/auth/lookup-account?companyName=${encodeURIComponent(
        `Strict Fallback Enterprise ${suffix}`
      )}&email=${encodeURIComponent(strictFallbackEmail)}&phone=9999900000`
    );
    assert(
      !lookupDiffPhoneRes.data?.company,
      'Requirement 9: Fallback does not match if phone differs',
      JSON.stringify(lookupDiffPhoneRes.data)
    );

    // 9b. Account Lookup Privacy & Server-Side Rate Limiter Verification (Round 3 Audit)
    const privacyLookupRes = await request(
      `/auth/lookup-account?gstNumber=${encodeURIComponent(validGstin)}&email=${encodeURIComponent(sharedEmail)}&phone=${primaryPhone}`
    );
    assert(
      privacyLookupRes.status === 200,
      'Account lookup endpoint returns 200 OK'
    );
    const hasRateLimitHeader =
      Boolean(privacyLookupRes.headers?.get('ratelimit-limit') ||
      privacyLookupRes.headers?.get('x-ratelimit-limit'));
    assert(
      hasRateLimitHeader,
      'Account lookup endpoint is protected by server-side rate limiter'
    );
    assert(
      privacyLookupRes.data?.username === user1.username &&
        !('passwordHash' in (privacyLookupRes.data || {})) &&
        !('password' in (privacyLookupRes.data || {})) &&
        !('tokens' in (privacyLookupRes.data || {})),
      'Account lookup exposes safe projection only without password hashes or tokens'
    );
    const emailOnlyLookup = await request(`/auth/lookup-account?email=${encodeURIComponent(sharedEmail)}`);
    assert(
      emailOnlyLookup.status === 200 && emailOnlyLookup.data?.exists === false,
      'Incomplete lookup by email alone returns exists:false without exposing account presence'
    );

    // 10. Requirement 10: Duplicate username error handling
    const dupUserCheck = await request(`/auth/check-username?username=${encodeURIComponent(user1.username)}`);
    assert(
      dupUserCheck.status === 200 && dupUserCheck.data?.available === false,
      'Requirement 10: Existing username availability check reports taken',
      JSON.stringify(dupUserCheck.data)
    );

    // 11. Requirement 11: Exhibitor username login works with shared email addresses
    const user1LoginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: user1.username, // using unique username!
        password: user1Password,
      },
    });
    assert(
      user1LoginRes.status === 200 && user1LoginRes.data?.user?.id === user1.id,
      'Requirement 11: Exhibitor 1 authenticates successfully with their unique username',
      JSON.stringify(user1LoginRes.data)
    );
    const user1Token = user1LoginRes.data?.tokens?.accessToken;

    const user2LoginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: user2.username, // sibling exhibitor username!
        password: user2Password,
      },
    });
    assert(
      user2LoginRes.status === 200 && user2LoginRes.data?.user?.id === user2.id,
      'Requirement 11: Sibling Exhibitor 2 authenticates successfully with their unique username',
      JSON.stringify(user2LoginRes.data)
    );

    // 12. Requirement 12: Email-based exhibitor login does not ambiguously authenticate a shared-email account
    const sharedEmailLoginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: sharedEmail, // Entering shared email instead of username
        password: user1Password,
      },
    });
    assert(
      sharedEmailLoginRes.status === 400 &&
        sharedEmailLoginRes.data?.message?.includes('username instead of your email address'),
      'Requirement 12: Exhibitor email login rejects with explicit instruction to use username',
      JSON.stringify(sharedEmailLoginRes.data)
    );

    // 13. Requirement 14: Exhibitors cannot access self-service password reset or forgot password
    // Test forgot password endpoint with exhibitor email
    const exhibitorForgotRes = await request('/auth/forgot-password', {
      method: 'POST',
      body: {
        email: sharedEmail,
      },
    });
    assert(
      exhibitorForgotRes.status === 403,
      'Requirement 14: Forgot password rejects CLIENT account requests with 403 Forbidden'
    );

    // Direct attempt to call reset-password with a CLIENT token
    const fakeClientResetToken = 'invalid_or_client_token';
    const directResetRes = await request('/auth/reset-password', {
      method: 'POST',
      body: {
        token: fakeClientResetToken,
        password: 'NewPassword123!',
      },
    });
    assert(
      directResetRes.status === 400 || directResetRes.status === 403,
      'Requirement 14: Direct self-service reset-password requests are strictly rejected'
    );

    // 14. Requirement 18: Unauthorized user (e.g. Exhibitor) cannot reset another user's password
    const unauthorizedResetRes = await request(`/users/${user2.id}/reset-password`, {
      method: 'POST',
      token: user1Token, // Exhibitor trying to reset sibling exhibitor's password
      body: {
        newPassword: 'HackedPassword123!',
      },
    });
    assert(
      unauthorizedResetRes.status === 403,
      'Requirement 18: Ordinary exhibitor cannot reset passwords (403 Forbidden)',
      JSON.stringify(unauthorizedResetRes.data)
    );

    // 15. Requirement 15 & 16: Authorized administrator can reset intended exhibitor account's password
    // Reset User 1 password
    const adminResetRes = await request(`/users/${user1.id}/reset-password`, {
      method: 'POST',
      token: adminToken,
      body: {
        newPassword: 'NewAdminSetPassword123!',
      },
    });
    assert(
      adminResetRes.status === 200,
      'Requirement 15: Authorized administrator successfully resets exhibitor password',
      JSON.stringify(adminResetRes.data)
    );

    // Verify Requirement 16: Resetting user1 does NOT change password of user2 (shared email)
    const user2StillWorksRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: user2.username,
        password: user2Password, // Old password still works!
      },
    });
    assert(
      user2StillWorksRes.status === 200 && user2StillWorksRes.data?.user?.id === user2.id,
      'Requirement 16: Resetting one account does not affect password of sibling exhibitor sharing the email'
    );

    // Verify Requirement 19: Password changes invalidate old credentials
    const user1OldPassLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        email: user1.username,
        password: user1Password, // Old password must fail
      },
    });
    assert(
      user1OldPassLogin.status === 401,
      'Requirement 19: Old password fails after admin password reset'
    );

    const user1NewPassLogin = await request('/auth/login', {
      method: 'POST',
      body: {
        email: user1.username,
        password: 'NewAdminSetPassword123!', // New password succeeds
      },
    });
    assert(
      user1NewPassLogin.status === 200 && user1NewPassLogin.data?.user?.id === user1.id,
      'Requirement 19: New password succeeds after admin password reset'
    );

    // Verify Requirement 17: Notification email sent identifies username without revealing plaintext password
    const resetNotification = sentEmails.find(
      (e) => e.type === 'ADMIN_PASSWORD_RESET' && e.payload?.toEmail === user1.email
    );
    assert(
      resetNotification &&
        resetNotification.payload?.username === user1.username &&
        !JSON.stringify(resetNotification.payload).includes('NewAdminSetPassword123!'),
      'Requirement 17: Password-reset notification identifies the username without revealing plaintext password',
      JSON.stringify(resetNotification)
    );

    // Check audit log / notification in DB
    const dbNotification = await prisma.notification.findFirst({
      where: {
        userId: user1.id,
        type: 'SECURITY_ALERT',
        message: { contains: user1.username },
      },
    });
    assert(
      Boolean(dbNotification),
      'Requirement 15: Admin password reset creates audit record in Notification log'
    );

    console.log('\n================================================================================');
    console.log(`🎉 ROUND 2 TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    // Restore mocks
    razorpay.orders.create = origOrdersCreate;
    EmailService.sendAdminPasswordResetNotificationEmail = origSendAdminPasswordResetNotificationEmail;
    EmailService.sendAccountCredentialsEmail = origSendAccountCredentialsEmail;
    EmailService.sendPasswordResetEmail = origSendPasswordResetEmail;
    EmailService.sendAdminAlert = origSendAdminAlert;

    // Clean up created entities safely
    try {
      if (createdBookingIds.length > 0) {
        await prisma.invoice.deleteMany({ where: { bookingId: { in: createdBookingIds } } });
        await prisma.booking.deleteMany({ where: { id: { in: createdBookingIds } } });
      }
      if (createdStallIds.length > 0) {
        await prisma.stall.deleteMany({ where: { id: { in: createdStallIds } } });
      }
      if (testFloorPlanId) {
        await prisma.floorPlan.deleteMany({ where: { id: testFloorPlanId } });
      }
      if (testExhibitionId) {
        await prisma.exhibition.deleteMany({ where: { id: testExhibitionId } });
      }
      if (createdUserIds.length > 0) {
        await prisma.notification.deleteMany({ where: { userId: { in: createdUserIds } } });
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      }
      if (createdCompanyIds.length > 0) {
        await prisma.company.deleteMany({ where: { id: { in: createdCompanyIds } } });
      }
    } catch (cleanupErr) {
      console.warn('Test cleanup warning:', cleanupErr);
    }

    if (server) {
      server.close();
    }
  }
}

runRound2Suite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
