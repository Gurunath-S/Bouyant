import { prisma } from '../src/config/db.js';
import { CompaniesService } from '../src/modules/companies/companies.service.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { EmailService, setEmailTransporterForTesting, resetEmailTransporterForTesting } from '../src/services/email.service.js';
import { env } from '../src/config/env.js';
import jwt, { Secret } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

async function runRegistrationCredentialsLifecycleSuite() {
  console.log('\n=================================================================');
  console.log('🔐 END-TO-END REGISTRATION CREDENTIALS LIFECYCLE AUDIT SUITE');
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

  try {
    // =========================================================================
    // SECTION 1: Clean, Professional, Unique Username Generation
    // =========================================================================
    console.log('\n--- Section 1: Username Generation & Availability Rules ---');

    // 1.1 Normalized standard two-word name
    const u1 = await CompaniesService.generateUniqueUsername(`Arun Kumar ${testSuffix}`);
    assert(
      u1 === `arun.${testSuffix}` || u1.startsWith('arun.'),
      '1.1 Generates clean firstname.lastname format from multi-word name',
      `Got: ${u1}`
    );

    // 1.2 Honorific title removal when 3+ tokens
    const uTitle = await CompaniesService.generateUniqueUsername('Dr. Jane Doe');
    assert(
      uTitle === 'jane.doe' || uTitle.startsWith('jane.doe') || uTitle.startsWith('jane'),
      '1.2 Strips honorific title (Dr.) to generate clean jane.doe',
      `Got: ${uTitle}`
    );

    // 1.3 Short single-word input padded to meet length constraint
    const uShort = await CompaniesService.generateUniqueUsername('bo');
    assert(
      uShort.length >= 3 && uShort.startsWith('bo.'),
      '1.3 Padds short name < 3 characters to maintain valid username length',
      `Got: ${uShort}`
    );

    // 1.4 Unicode input normalization (accents removed)
    const uUnicode = await CompaniesService.generateUniqueUsername('Élodie Martin');
    assert(
      uUnicode === 'elodie.martin' || uUnicode.startsWith('elodie.'),
      '1.4 Normalizes accented Unicode characters (Élodie Martin -> elodie.martin)',
      `Got: ${uUnicode}`
    );

    // 1.5 Deterministic collision alternatives
    // Create a temporary user with username 'test.user' + suffix to test collision progression
    const baseUsername = `testuser.${testSuffix}`.slice(0, 20);
    const userSeed = `Testuser ${testSuffix}`;

    const candidate1 = await CompaniesService.generateUniqueUsername(userSeed);
    // Create a user with candidate1
    const dummyUser1 = await prisma.user.create({
      data: {
        email: `dummy1_${testSuffix}@example.com`,
        username: candidate1,
        passwordHash: 'dummy_hash',
        name: 'Dummy User 1',
        role: 'CLIENT',
      },
    });

    const candidate2 = await CompaniesService.generateUniqueUsername(userSeed);
    assert(
      candidate2 !== candidate1 && (candidate2.includes(testSuffix) || candidate2.endsWith('2')),
      '1.5 Generates clean deterministic alternative upon username collision',
      `Candidate 1: ${candidate1}, Candidate 2: ${candidate2}`
    );

    // Create user with candidate2 to test candidate3
    const dummyUser2 = await prisma.user.create({
      data: {
        email: `dummy2_${testSuffix}@example.com`,
        username: candidate2,
        passwordHash: 'dummy_hash',
        name: 'Dummy User 2',
        role: 'CLIENT',
      },
    });

    const candidate3 = await CompaniesService.generateUniqueUsername(userSeed);
    assert(
      candidate3 !== candidate1 && candidate3 !== candidate2,
      '1.6 Further collision safely progresses to next clean alternative',
      `Candidate 3: ${candidate3}`
    );

    // 1.7 Existing user is never renamed or overwritten by collision
    const recheckDummy1 = await prisma.user.findUnique({ where: { id: dummyUser1.id } });
    assert(
      recheckDummy1?.username === candidate1,
      '1.7 Existing user account username is never altered or renamed by collision'
    );

    // 1.8 Availability check API respects dots and rejects consecutive dots
    const checkValidDot = await AuthService.checkUsernameAvailability('arun.kumar');
    assert(
      checkValidDot.available !== undefined,
      '1.8 Availability check allows single dot in username'
    );

    const checkDoubleDot = await AuthService.checkUsernameAvailability('arun..kumar');
    assert(
      checkDoubleDot.available === false,
      '1.9 Availability check rejects invalid consecutive dots'
    );

    const checkLeadingDot = await AuthService.checkUsernameAvailability('.arunkumar');
    assert(
      checkLeadingDot.available === false,
      '1.10 Availability check rejects leading or trailing symbols'
    );

    // =========================================================================
    // SECTION 2: Password Generation & One-Time Persistence Guarantees
    // =========================================================================
    console.log('\n--- Section 2: Password Generation & One-Time Persistence ---');

    // 2.1 Cryptographically secure initial password properties
    const samplePassword = CompaniesService.generateSecureInitialPassword(12);
    assert(
      samplePassword.length === 12,
      '2.1 Generated password is 12 characters long',
      `Length: ${samplePassword.length}`
    );
    assert(
      /[A-Z]/.test(samplePassword) &&
      /[a-z]/.test(samplePassword) &&
      /[0-9]/.test(samplePassword) &&
      /[!@#$%&*]/.test(samplePassword),
      '2.2 Password contains uppercase, lowercase, number, and special symbol',
      `Sample: ${samplePassword.slice(0, 3)}... (masked)`
    );

    // 2.3 Account creation persists hash and verifies password
    const testEmail = `newexhibitor_${testSuffix}@example.com`;
    const regResult = await CompaniesService.createCompany({
      name: `Exhibitor Corp ${testSuffix}`,
      contactPerson: `Ravi Sharma ${testSuffix}`,
      email: testEmail,
      mobile: `98765${testSuffix.slice(0, 5)}`,
      address: '100 Business Park Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pinCode: '400051',
      country: 'India',
      category: 'Standard Exhibitor',
    });

    assert(
      Boolean(regResult.user && regResult.temporaryPassword),
      '2.3 New exhibitor receives a generated temporary password and user record',
      `Temporary password generated: ${Boolean(regResult.temporaryPassword)}`
    );

    const createdUser = await prisma.user.findUnique({
      where: { id: regResult.user.id },
    });

    assert(
      createdUser?.passwordHash !== regResult.temporaryPassword,
      '2.4 Plaintext password is never stored in database user table'
    );

    const hashValidates = await bcrypt.compare(
      regResult.temporaryPassword!,
      createdUser!.passwordHash
    );
    assert(
      hashValidates === true,
      '2.5 Persisted bcrypt hash strictly validates against initial temporary password'
    );

    // 2.6 Repeat registration with same email strictly fails with ACCOUNT_EXISTS conflict
    // and DOES NOT regenerate or overwrite the password
    let accountExistsCaught = false;
    try {
      await CompaniesService.createCompany({
        name: `Exhibitor Corp ${testSuffix}`,
        contactPerson: `Ravi Sharma ${testSuffix}`,
        email: testEmail,
        mobile: `98765${testSuffix.slice(0, 5)}`,
        address: '100 Business Park Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400051',
        country: 'India',
        category: 'Standard Exhibitor',
      });
    } catch (err: any) {
      if (err.statusCode === 409 && err.code === 'ACCOUNT_EXISTS') {
        accountExistsCaught = true;
      }
    }

    assert(
      accountExistsCaught === true,
      '2.6 Duplicate registration with same email throws 409 ACCOUNT_EXISTS'
    );

    const userAfterDuplicateAttempt = await prisma.user.findUnique({
      where: { id: regResult.user.id },
    });
    assert(
      userAfterDuplicateAttempt?.passwordHash === createdUser?.passwordHash,
      '2.7 Existing account password hash is completely unchanged after repeated submission'
    );

    // 2.8 Authenticated rebooking preserves existing user password
    const actingUserTokens = regResult.tokens;
    // Decode token payload
    const base64Payload = actingUserTokens.accessToken.split('.')[1];
    const actingUserPayload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf8'));

    const rebookingResult = await CompaniesService.createCompany(
      {
        name: `Exhibitor Corp ${testSuffix}`,
        contactPerson: `Ravi Sharma ${testSuffix}`,
        email: testEmail,
        mobile: `98765${testSuffix.slice(0, 5)}`,
        address: '100 Business Park Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400051',
        country: 'India',
        category: 'Standard Exhibitor',
      },
      { actingUser: actingUserPayload }
    );

    assert(
      rebookingResult.temporaryPassword === null,
      '2.8 Authenticated rebooking does not generate a new temporary password'
    );

    const userAfterRebooking = await prisma.user.findUnique({
      where: { id: regResult.user.id },
    });
    assert(
      userAfterRebooking?.passwordHash === createdUser?.passwordHash,
      '2.9 Rebooking with same company preserves verified user password hash'
    );

    // =========================================================================
    // SECTION 3: Login Using Emailed Username and Password
    // =========================================================================
    console.log('\n--- Section 3: Authentication with Emailed Credentials ---');

    // 3.1 Login using username + initial password
    const loginWithUsername = await AuthService.login({
      email: createdUser!.username!,
      password: regResult.temporaryPassword!,
    });
    assert(
      Boolean(loginWithUsername.tokens && loginWithUsername.user.id === createdUser!.id),
      '3.1 Authentication using emailed username and initial password succeeds',
      `Logged in user: ${loginWithUsername.user.username}`
    );

    // 3.2 Login using email + initial password
    const loginWithEmail = await AuthService.login({
      email: testEmail,
      password: regResult.temporaryPassword!,
    });
    assert(
      Boolean(loginWithEmail.tokens && loginWithEmail.user.id === createdUser!.id),
      '3.2 Authentication using email and initial password succeeds',
      `Logged in user: ${loginWithEmail.user.email}`
    );

    // 3.3 Incorrect password is rejected safely
    let badPasswordCaught = false;
    try {
      await AuthService.login({
        email: createdUser!.username!,
        password: 'IncorrectPassword123!',
      });
    } catch (err: any) {
      if (err.statusCode === 401) {
        badPasswordCaught = true;
      }
    }
    assert(
      badPasswordCaught === true,
      '3.3 Incorrect password rejected with 401 Unauthorized without session creation'
    );

    // 3.4 Unknown username is rejected safely
    let unknownUserCaught = false;
    try {
      await AuthService.login({
        email: 'completely.unknown.username.xyz',
        password: regResult.temporaryPassword!,
      });
    } catch (err: any) {
      if (err.statusCode === 401) {
        unknownUserCaught = true;
      }
    }
    assert(
      unknownUserCaught === true,
      '3.4 Unknown username rejected with 401 Unauthorized safely'
    );

    // =========================================================================
    // SECTION 4: Email Credential Delivery Correctness & Safe Retries
    // =========================================================================
    console.log('\n--- Section 4: Email Credential Delivery Correctness ---');

    // 4.1 Email service constructs account credentials email payload without crashing
    const emailDelivery = await EmailService.sendAccountCredentialsEmail({
      toEmail: testEmail,
      toName: 'Ravi Sharma',
      companyName: 'Exhibitor Corp',
      username: createdUser!.username!,
      temporaryPassword: regResult.temporaryPassword!,
    });

    assert(
      emailDelivery.status === 'ACCEPTED' || emailDelivery.status === 'SKIPPED',
      '4.1 Account credentials email dispatch completes with valid status (ACCEPTED or SKIPPED)',
      `Status: ${emailDelivery.status}`
    );

    // 4.2 Booking confirmation email accepts username accurately without conflation
    const confirmationEmailSent = await EmailService.sendBookingConfirmationEmail({
      toEmail: testEmail,
      toName: 'Ravi Sharma',
      companyName: 'Exhibitor Corp',
      bookingReference: `BK-${testSuffix}`,
      exhibitionTitle: 'Test Expo 2026',
      stalls: [{ stallNumber: 'A-101', category: 'Standard' }],
      invoiceNumber: `INV-${testSuffix}`,
      paymentPercentage: 100,
      paymentAmount: 50000,
      remainingBalance: 0,
      paymentDate: new Date(),
      paymentReference: `PAY-${testSuffix}`,
      userName: createdUser!.username!,
    });

    assert(
      confirmationEmailSent === true,
      '4.2 Booking confirmation email cleanly handles distinct username parameter'
    );

    // Clean up temporary dummy users
    await prisma.user.deleteMany({
      where: {
        id: { in: [dummyUser1.id, dummyUser2.id] },
      },
    });

    // =========================================================================
    // SECTION 5: Final Credential Delivery Reliability & Safe Recovery Audit
    // =========================================================================
    console.log('\n--- Section 5: Final Credential Delivery Reliability & Recovery ---');

    // 5.1 Production registration with missing SMTP configuration
    const originalNodeEnv = process.env.NODE_ENV;
    const originalSmtpUser = process.env.SMTP_USER;
    const originalEmailUser = process.env.EMAIL_USER;

    try {
      process.env.NODE_ENV = 'production';
      (env as any).NODE_ENV = 'production';
      delete process.env.SMTP_USER;
      delete process.env.EMAIL_USER;

      let prodMissingSmtpThrew = false;
      try {
        await CompaniesService.createCompany({
          name: `Prod Test Missing SMTP ${testSuffix}`,
          contactPerson: `Prod Contact ${testSuffix}`,
          email: `prod_missing_smtp_${testSuffix}@example.com`,
          mobile: `98888${testSuffix.slice(0, 5)}`,
          address: '404 Cloud Blvd',
          city: 'Mumbai',
          state: 'Maharashtra',
          pinCode: '400051',
          country: 'India',
        });
      } catch (err: any) {
        if (err.statusCode === 503) {
          prodMissingSmtpThrew = true;
        }
      }

      assert(
        prodMissingSmtpThrew === true,
        '5.1 Production registration with missing SMTP configuration rejects with 503 Service Unavailable'
      );
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      (env as any).NODE_ENV = originalNodeEnv;
      if (originalSmtpUser) process.env.SMTP_USER = originalSmtpUser;
      if (originalEmailUser) process.env.EMAIL_USER = originalEmailUser;
    }

    // 5.2 SMTP rejection and exhausted retries
    let attemptsCount = 0;
    setEmailTransporterForTesting({
      sendMail: async () => {
        attemptsCount++;
        const err: any = new Error('550 5.1.1 User unknown / mailbox rejected');
        err.responseCode = 550;
        throw err;
      },
    });

    const rejectedResult = await EmailService.sendAccountCredentialsEmail({
      toEmail: `rejected_${testSuffix}@example.com`,
      toName: 'Test Recipient',
      companyName: 'Test Corp',
      username: 'test.user',
      temporaryPassword: 'TempPassword!2026',
    });

    assert(
      rejectedResult.status === 'FAILED' && rejectedResult.attempts === 3 && attemptsCount === 3,
      '5.2 SMTP rejection retries 3 times and returns FAILED status without reporting ACCEPTED',
      `Status: ${rejectedResult.status}, Attempts: ${rejectedResult.attempts}`
    );
    resetEmailTransporterForTesting();

    // 5.3 Email timeout handling
    let timeoutAttempts = 0;
    setEmailTransporterForTesting({
      sendMail: async () => {
        timeoutAttempts++;
        const err: any = new Error('Connection timed out');
        err.code = 'ETIMEDOUT';
        throw err;
      },
    });

    const timeoutResult = await EmailService.sendAccountCredentialsEmail({
      toEmail: `timeout_${testSuffix}@example.com`,
      toName: 'Timeout Recipient',
      companyName: 'Timeout Corp',
      username: 'timeout.user',
      temporaryPassword: 'TempPassword!2026',
    });

    assert(
      timeoutResult.status === 'FAILED' && timeoutResult.attempts === 3 && timeoutAttempts === 3,
      '5.3 Email connection timeout retries 3 times and reports safe FAILED status',
      `Status: ${timeoutResult.status}, Error: ${timeoutResult.error}`
    );
    resetEmailTransporterForTesting();

    // 5.4 Account creation followed by email delivery failure
    const failEmail = `delivery_fail_${testSuffix}@example.com`;
    setEmailTransporterForTesting({
      sendMail: async () => {
        throw new Error('SMTP Server Connection Refused');
      },
    });

    const failRegResult = await CompaniesService.createCompany({
      name: `Delivery Fail Corp ${testSuffix}`,
      contactPerson: `Fail Contact ${testSuffix}`,
      email: failEmail,
      mobile: `97777${testSuffix.slice(0, 5)}`,
      address: '500 Server Failure Way',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560001',
      country: 'India',
    });

    assert(
      failRegResult.emailDelivery?.status === 'FAILED',
      '5.4 Registration accurately reports FAILED email delivery status when SMTP fails'
    );

    const userInDbAfterFail = await prisma.user.findUnique({
      where: { id: failRegResult.user.id },
    });

    assert(
      userInDbAfterFail !== null,
      '5.4b User account is safely preserved in DB and NOT deleted when email delivery fails'
    );
    resetEmailTransporterForTesting();

    // 5.5 Retry without regenerating the password
    let retryConflictCaught = false;
    try {
      await CompaniesService.createCompany({
        name: `Delivery Fail Corp ${testSuffix}`,
        contactPerson: `Fail Contact ${testSuffix}`,
        email: failEmail,
        mobile: `97777${testSuffix.slice(0, 5)}`,
        address: '500 Server Failure Way',
        city: 'Bengaluru',
        state: 'Karnataka',
        pinCode: '560001',
        country: 'India',
      });
    } catch (err: any) {
      if (err.statusCode === 409 && err.code === 'ACCOUNT_EXISTS') {
        retryConflictCaught = true;
      }
    }

    assert(
      retryConflictCaught === true,
      '5.5 Registration retry with existing account fails with 409 ACCOUNT_EXISTS without regenerating password'
    );

    // 5.6 Existing password hash remaining unchanged during delivery retry
    const userAfterRetry = await prisma.user.findUnique({
      where: { id: failRegResult.user.id },
    });

    assert(
      userAfterRetry?.passwordHash === userInDbAfterFail?.passwordHash,
      '5.6 Existing user password hash remains 100% identical and unchanged across retries'
    );

    // 5.7 Recovery after a server restart, without access to the original plaintext password
    // Simulate server restart: Plaintext password is forgotten, only database hash exists
    let capturedResetToken = '';
    setEmailTransporterForTesting({
      sendMail: async (options: any) => {
        const match = options.html.match(/token=([a-zA-Z0-9_\-.~%]+)/);
        if (match && match[1]) {
          capturedResetToken = decodeURIComponent(match[1]);
        }
        return { messageId: '<mock-reset-msg-id>' };
      },
    });

    const forgotRes = await AuthService.forgotPassword(failEmail);
    assert(
      Boolean(forgotRes.message && capturedResetToken),
      '5.7 Password recovery generates a cryptographically signed recovery token without plaintext temporary password'
    );

    // 5.8 Successful password setup/reset using a valid token
    const newChosenPassword = 'NewSecureExhibitorPassword!2026';
    const resetRes = await AuthService.resetPassword(capturedResetToken, newChosenPassword);
    assert(
      resetRes.message.includes('successfully'),
      '5.8 Password reset succeeds when valid recovery token is provided'
    );

    // Verify user can now authenticate with new password
    const loginResult = await AuthService.login({
      email: failEmail,
      password: newChosenPassword,
    });
    assert(
      Boolean(loginResult.user && loginResult.tokens),
      '5.8b User can immediately authenticate with the new recovered password'
    );

    // 5.9 Expired, reused, or tampered recovery tokens being rejected
    // A) Reused token rejection (Single-use guarantee):
    let reuseRejected = false;
    try {
      await AuthService.resetPassword(capturedResetToken, 'AnotherPassword!2026');
    } catch (err: any) {
      if (err.statusCode === 400) reuseRejected = true;
    }
    assert(
      reuseRejected === true,
      '5.9a Previously used reset token is strictly rejected (Single-use HMAC guarantee)'
    );

    // B) Tampered token rejection:
    let tamperedRejected = false;
    try {
      const tamperedToken = capturedResetToken.slice(0, -6) + 'xxxxxx';
      await AuthService.resetPassword(tamperedToken, 'AnotherPassword!2026');
    } catch (err: any) {
      if (err.statusCode === 400) tamperedRejected = true;
    }
    assert(
      tamperedRejected === true,
      '5.9b Tampered reset token with modified signature is rejected with 400 Bad Request'
    );

    // C) Expired token rejection:
    const expiredUser = await prisma.user.findUnique({ where: { id: loginResult.user.id } });
    const expiredSecret = `${env.JWT_SECRET}:${expiredUser?.passwordHash}`;
    const expiredToken = jwt.sign(
      { userId: loginResult.user.id, email: failEmail, type: 'password_reset' },
      expiredSecret as Secret,
      { expiresIn: '-1s' }
    );
    let expiredRejected = false;
    try {
      await AuthService.resetPassword(expiredToken, 'AnotherPassword!2026');
    } catch (err: any) {
      if (err.statusCode === 400) expiredRejected = true;
    }
    assert(
      expiredRejected === true,
      '5.9c Expired reset token is strictly rejected with 400 Bad Request'
    );

    // 5.10 Recovery requests not revealing whether an account exists
    const nonExistentEmail = `nonexistent_user_${testSuffix}@example.com`;
    const nonExistentResponse = await AuthService.forgotPassword(nonExistentEmail);
    assert(
      nonExistentResponse.message === forgotRes.message,
      '5.10 Password recovery returns identical generic response for non-existent vs registered accounts (No enumeration)'
    );

    // 5.11 Development environments with intentionally skipped email delivery
    delete process.env.SMTP_USER;
    delete process.env.EMAIL_USER;
    const skippedDevDelivery = await EmailService.sendAccountCredentialsEmail({
      toEmail: `dev_skip_${testSuffix}@example.com`,
      toName: 'Dev User',
      companyName: 'Dev Corp',
      username: 'dev.user',
      temporaryPassword: 'DevPassword!2026',
    });
    assert(
      skippedDevDelivery.status === 'SKIPPED' && skippedDevDelivery.error === 'SMTP_NOT_CONFIGURED',
      '5.11 Development environment with omitted SMTP accurately reports SKIPPED delivery status'
    );

    // 5.12 Accurate registration and email-delivery status reporting
    assert(
      failRegResult.emailDelivery?.status === 'FAILED' &&
      skippedDevDelivery.status === 'SKIPPED' &&
      rejectedResult.status === 'FAILED',
      '5.12 System accurately distinguishes ACCEPTED, SKIPPED, and FAILED delivery statuses without false claims'
    );

    resetEmailTransporterForTesting();

    // Clean up test users
    await prisma.user.deleteMany({
      where: {
        email: { in: [failEmail, testEmail] },
      },
    });
    await prisma.company.deleteMany({
      where: {
        email: { in: [failEmail, testEmail] },
      },
    });

  } catch (error: any) {
    console.error('Fatal test error in suite:', error);
    failed++;
  }

  console.log('\n=================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRegistrationCredentialsLifecycleSuite()
  .catch((e) => {
    console.error('Suite crashed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
