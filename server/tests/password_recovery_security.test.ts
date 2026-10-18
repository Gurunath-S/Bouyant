import { createApp } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { AuthService, resetForgotPasswordCooldownForTesting, getForgotPasswordCooldownSizeForTesting } from '../src/modules/auth/auth.service.js';
import { EmailService, setEmailTransporterForTesting, resetEmailTransporterForTesting } from '../src/services/email.service.js';
import { escapeHtml } from '../src/utils/htmlEscape.js';
import { resolveClientOrigin } from '../src/utils/urlHelper.js';
import { generateTokens } from '../src/utils/jwt.js';
import { env } from '../src/config/env.js';
import jwt, { Secret } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

let server: any;
let baseUrl: string;

async function startTestServer() {
  const app = createApp();
  app.set('trust proxy', 1);
  return new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const port = (server.address() as any).port;
      baseUrl = `http://localhost:${port}/api/v1`;
      resolve();
    });
  });
}

async function request(endpoint: string, { method = 'GET', body, token, headers: customHeaders = {} }: any = {}) {
  const url = `${baseUrl}${endpoint}`;
  const headers: any = {
    'Content-Type': 'application/json',
    ...customHeaders,
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
  const resHeaders = res.headers;
  let data: any = null;
  try {
    data = await res.json();
  } catch (_e) {
    // not json
  }

  return { status, data, headers: resHeaders };
}

async function runPasswordRecoverySecuritySuite() {
  console.log('\n=================================================================');
  console.log('🛡️ PHASE 2.10: PASSWORD RECOVERY SECURITY & HARDENING SUITE');
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
    await startTestServer();

    // Setup a clean test user in DB
    const testEmail = `test.recovery.${testSuffix}@example.com`;
    const initialPassword = 'InitialValidPass123!';
    const passwordHash = await bcrypt.hash(initialPassword, 12);

    const testUser = await prisma.user.create({
      data: {
        email: testEmail,
        username: `recov_${testSuffix}`,
        name: 'Jane Doe',
        role: 'CLIENT',
        passwordHash,
        isActive: true,
      },
    });

    // =========================================================================
    // SECTION 1: HTML Escaping & Injection Prevention in Email Templates
    // =========================================================================
    console.log('\n--- Section 1: HTML Escaping & Injection Prevention ---');

    // 1.1 Test escapeHtml utility
    const rawMalicious = '<script>alert("XSS")</script>&<b>"test"</b>\'hello\'';
    const escaped = escapeHtml(rawMalicious);
    assert(
      !escaped.includes('<') &&
      !escaped.includes('>') &&
      !escaped.includes('"') &&
      !escaped.includes("'") &&
      escaped.includes('&lt;script&gt;') &&
      escaped.includes('&amp;&lt;b&gt;'),
      '1.1 escapeHtml correctly escapes <, >, &, ", and \'',
      `Got: ${escaped}`
    );

    // 1.2 Test email template dispatch with malicious payload
    let capturedEmailHtml = '';
    setEmailTransporterForTesting({
      sendMail: async (opts: any) => {
        capturedEmailHtml = opts.html || '';
        return { messageId: `msg-${Date.now()}` };
      },
    });

    await EmailService.sendPasswordResetEmail({
      toEmail: 'target@example.com',
      toName: 'Hacker<script>alert(1)</script>"\'',
      resetUrl: 'https://example.com/reset-password?token=xyz123',
    });

    assert(
      !capturedEmailHtml.includes('<script>') &&
      capturedEmailHtml.includes('Hacker&lt;script&gt;alert(1)&lt;/script&gt;&quot;&#39;'),
      '1.2 sendPasswordResetEmail escapes malicious user name and does not render raw script tags',
      `HTML snippet: ${capturedEmailHtml.slice(0, 300)}`
    );

    await EmailService.sendAccountCredentialsEmail({
      toEmail: 'target@example.com',
      toName: 'Evil<img src=x onerror=alert(1)>',
      companyName: 'Acme & <Co>',
      username: 'evil."user',
      temporaryPassword: 'Temp<123>&',
    });

    assert(
      !capturedEmailHtml.includes('<img src=x') &&
      capturedEmailHtml.includes('Evil&lt;img src=x') &&
      capturedEmailHtml.includes('Acme &amp; &lt;Co&gt;') &&
      capturedEmailHtml.includes('Temp&lt;123&gt;&amp;'),
      '1.3 sendAccountCredentialsEmail escapes company, name, username, and temporary password',
      `HTML snippet: ${capturedEmailHtml.slice(0, 300)}`
    );

    resetEmailTransporterForTesting();

    // =========================================================================
    // SECTION 2: Reset Link Origin Resolution (P4)
    // =========================================================================
    console.log('\n--- Section 2: Reset Link Origin Resolution (P4) ---');

    // 2.1 Single origin
    const origin1 = resolveClientOrigin('https://portal.buoyantmedia.com', false);
    assert(origin1 === 'https://portal.buoyantmedia.com', '2.1 Resolves standard single HTTPS origin', `Got: ${origin1}`);

    // 2.2 Multiple comma-separated origins (CORS multi-origin config)
    const origin2 = resolveClientOrigin('https://portal.buoyantmedia.com, https://admin.buoyantmedia.com', false);
    assert(origin2 === 'https://portal.buoyantmedia.com', '2.2 Resolves first origin from comma-separated list', `Got: ${origin2}`);

    // 2.3 Whitespace trimming and trailing slash stripping
    const origin3 = resolveClientOrigin('   https://portal.buoyantmedia.com/   ', false);
    assert(origin3 === 'https://portal.buoyantmedia.com', '2.3 Trims leading/trailing whitespace and strips trailing slash', `Got: ${origin3}`);

    // 2.4 Malformed URL safely falls back in non-production
    const origin4 = resolveClientOrigin('not-a-valid-url', false);
    assert(origin4 === 'http://localhost:5173', '2.4 Safely falls back to localhost:5173 in dev/test when config is malformed', `Got: ${origin4}`);

    // 2.5 Malformed URL or localhost throws in production
    let prodThrew = false;
    try {
      resolveClientOrigin('http://localhost:5173', true);
    } catch {
      prodThrew = true;
    }
    assert(prodThrew, '2.5 Rejects localhost origin in production environment');

    // 2.6 Rejects other loopback and unspecified addresses in production
    let loopback0Threw = false;
    try {
      resolveClientOrigin('http://0.0.0.0:5173', true);
    } catch {
      loopback0Threw = true;
    }
    assert(loopback0Threw, '2.6a Rejects 0.0.0.0 origin in production');

    let ipv6LoopbackThrew = false;
    try {
      resolveClientOrigin('http://[::1]:5173', true);
    } catch {
      ipv6LoopbackThrew = true;
    }
    assert(ipv6LoopbackThrew, '2.6b Rejects [::1] IPv6 loopback in production');

    let loopback127Threw = false;
    try {
      resolveClientOrigin('http://127.0.0.99:5173', true);
    } catch {
      loopback127Threw = true;
    }
    assert(loopback127Threw, '2.6c Rejects 127.0.0.99 loopback in production');

    // 2.7 Rejects invalid schemes in production
    let ftpThrew = false;
    try {
      resolveClientOrigin('ftp://portal.buoyantmedia.com', true);
    } catch {
      ftpThrew = true;
    }
    assert(ftpThrew, '2.7a Rejects non-HTTP(S) ftp:// scheme in production');

    let jsThrew = false;
    try {
      resolveClientOrigin('javascript:alert(1)', true);
    } catch {
      jsThrew = true;
    }
    assert(jsThrew, '2.7b Rejects javascript: scheme in production');

    // 2.8 Empty or all-comma config throws in production
    let emptyThrew = false;
    try {
      resolveClientOrigin('   ,   ,   ', true);
    } catch {
      emptyThrew = true;
    }
    assert(emptyThrew, '2.8 Rejects empty comma-only origin configuration in production');

    // 2.9 Valid production HTTPS origin with trailing slash resolves cleanly
    const prodValidOrigin = resolveClientOrigin('   https://portal.buoyantmedia.com/   ', true);
    assert(prodValidOrigin === 'https://portal.buoyantmedia.com', '2.9 Strips trailing slash from valid production HTTPS origin');

    // =========================================================================
    // SECTION 3: Account Enumeration Prevention & Per-Account Cooldown
    // =========================================================================
    console.log('\n--- Section 3: Account Enumeration Prevention & Cooldown ---');

    resetForgotPasswordCooldownForTesting();

    // 3.1 Non-existent user request
    const resNonExistent = await request('/auth/forgot-password', {
      method: 'POST',
      body: { email: 'nonexistent.user.999@example.com' },
    });
    assert(resNonExistent.status === 200, '3.1 Nonexistent account returns 200 OK');

    // 3.1b Cooldown map bounds: Non-existent emails do not pollute cooldown map
    assert(
      getForgotPasswordCooldownSizeForTesting() === 0,
      '3.1b Non-existent email queries do not populate or bloat cooldown timestamps map'
    );

    // 3.2 Existing user request
    const resExisting = await request('/auth/forgot-password', {
      method: 'POST',
      body: { email: testEmail },
    });
    assert(resExisting.status === 200, '3.2 Existing account returns 200 OK');
    assert(
      getForgotPasswordCooldownSizeForTesting() === 1,
      '3.2b Existing email query correctly tracks cooldown timestamp'
    );

    // 3.2c Another non-existent user request does not increment map size
    await request('/auth/forgot-password', {
      method: 'POST',
      body: { email: 'another.nonexistent@example.com' },
    });
    assert(
      getForgotPasswordCooldownSizeForTesting() === 1,
      '3.2c Subsequent non-existent email does not increment cooldown map size'
    );

    assert(
      resExisting.data.message === resNonExistent.data.message,
      '3.3 Response messages are identical for existing and non-existing accounts (enumeration protection)',
      `Existing: "${resExisting.data.message}", Non-existent: "${resNonExistent.data.message}"`
    );

    // 3.4 Per-account cooldown: rapid second request returns 200 without duplicate email dispatch
    let emailDispatches = 0;
    setEmailTransporterForTesting({
      sendMail: async () => {
        emailDispatches++;
        return { messageId: 'msg-cooldown' };
      },
    });

    // Reset cooldown and trigger first dispatch
    resetForgotPasswordCooldownForTesting();
    await AuthService.forgotPassword(testEmail);
    assert(emailDispatches === 1, '3.4a First forgot-password request dispatches recovery email');

    // Immediate second call should be throttled by cooldown
    await AuthService.forgotPassword(testEmail);
    assert(emailDispatches === 1, '3.4b Second immediate request throttled by per-account cooldown (duplicate email suppressed)');

    resetEmailTransporterForTesting();
    resetForgotPasswordCooldownForTesting();

    // =========================================================================
    // SECTION 4: Token Verification Hardening & Lifecycle
    // =========================================================================
    console.log('\n--- Section 4: Token Verification Hardening ---');

    // 4.1 Generate legitimate token
    const legitimateSecret = `${env.JWT_SECRET}:${testUser.passwordHash}`;
    const validToken = jwt.sign(
      { userId: testUser.id, email: testUser.email, type: 'password_reset' },
      legitimateSecret as Secret,
      { expiresIn: '1h', algorithm: 'HS256' }
    );

    // 4.2 Wrong purpose claim (e.g. access token or wrong type)
    const wrongPurposeToken = jwt.sign(
      { userId: testUser.id, email: testUser.email, type: 'access' },
      legitimateSecret as Secret,
      { expiresIn: '1h', algorithm: 'HS256' }
    );
    const resWrongPurpose = await request('/auth/reset-password', {
      method: 'POST',
      body: { token: wrongPurposeToken, password: 'NewValidPassword123!' },
      headers: { 'x-forwarded-for': '203.0.113.10' },
    });
    assert(resWrongPurpose.status === 400, '4.2 Token with wrong purpose claim is rejected with 400 Bad Request');

    // 4.3 Expired token
    const expiredToken = jwt.sign(
      { userId: testUser.id, email: testUser.email, type: 'password_reset' },
      legitimateSecret as Secret,
      { expiresIn: '-10s', algorithm: 'HS256' }
    );
    const resExpired = await request('/auth/reset-password', {
      method: 'POST',
      body: { token: expiredToken, password: 'NewValidPassword123!' },
      headers: { 'x-forwarded-for': '203.0.113.11' },
    });
    assert(
      resExpired.status === 400 && resExpired.data.message.toLowerCase().includes('expired'),
      '4.3 Expired token is rejected with explicit expiration error message',
      `Got: ${resExpired.data?.message}`
    );

    // 4.4 Tampered token (invalid signature)
    const tamperedToken = validToken.slice(0, -6) + 'abcdef';
    const resTampered = await request('/auth/reset-password', {
      method: 'POST',
      body: { token: tamperedToken, password: 'NewValidPassword123!' },
      headers: { 'x-forwarded-for': '203.0.113.12' },
    });
    assert(resTampered.status === 400, '4.4 Tampered signature is rejected with 400 Bad Request');

    // 4.5 Standard access token rejected by reset-password endpoint
    const normalTokens = generateTokens({
      userId: testUser.id,
      email: testUser.email,
      role: testUser.role,
    });
    const resAccessTokenAsReset = await request('/auth/reset-password', {
      method: 'POST',
      body: { token: normalTokens.accessToken, password: 'NewValidPassword123!' },
      headers: { 'x-forwarded-for': '203.0.113.13' },
    });
    assert(resAccessTokenAsReset.status === 400, '4.5 Standard access token cannot be used to reset password');

    // 4.6 Reset token rejected by normal authenticated route (authenticateToken)
    const resResetTokenAsAuth = await request('/auth/me', {
      method: 'GET',
      token: validToken,
      headers: { 'x-forwarded-for': '203.0.113.14' },
    });
    assert(resResetTokenAsAuth.status === 401, '4.6 Reset token cannot authenticate as a normal user session');

    // 4.7 Successful password reset
    const newPassword = 'BrandNewSecretPassword2026!';
    const resSuccessfulReset = await request('/auth/reset-password', {
      method: 'POST',
      body: { token: validToken, password: newPassword },
      headers: { 'x-forwarded-for': '203.0.113.15' },
    });
    assert(resSuccessfulReset.status === 200, '4.7 Successful password reset returns 200 OK');

    // Verify login works with new password
    const resLoginWithNew = await request('/auth/login', {
      method: 'POST',
      body: { email: testEmail, password: newPassword },
      headers: { 'x-forwarded-for': '203.0.113.15' },
    });
    assert(resLoginWithNew.status === 200, '4.8 Exhibitor can successfully log in with new password');

    // Verify login with OLD password fails after reset
    const resLoginWithOld = await request('/auth/login', {
      method: 'POST',
      body: { email: testEmail, password: initialPassword },
      headers: { 'x-forwarded-for': '203.0.113.15' },
    });
    assert(resLoginWithOld.status !== 200, '4.8b Exhibitor cannot log in with previous password after password reset');

    // 4.9 Replay attack: previously used token is now invalid because passwordHash changed
    const resReusedToken = await request('/auth/reset-password', {
      method: 'POST',
      body: { token: validToken, password: 'AnotherNewPassword999!' },
      headers: { 'x-forwarded-for': '203.0.113.16' },
    });
    assert(
      resReusedToken.status === 400,
      '4.9 Reused reset token is rejected because passwordHash changed upon reset (single-use guarantee)',
      `Got status: ${resReusedToken.status}`
    );

    // =========================================================================
    // SECTION 5: Rate Limiting & 429 Behavior (P1)
    // =========================================================================
    console.log('\n--- Section 5: Rate Limiting & 429 Behavior (P1) ---');

    // Use a unique spoofed forwarded IP header or direct requests
    // Let's verify rate limiting by exhausting the 5-request limit for /forgot-password
    const testIp = '198.51.100.55';
    let hit429 = false;
    let retryAfterHeader = false;

    for (let i = 1; i <= 7; i++) {
      const res = await request('/auth/forgot-password', {
        method: 'POST',
        body: { email: `user_${i}_${testSuffix}@example.com` },
        headers: { 'x-forwarded-for': testIp },
      });
      if (res.status === 429) {
        hit429 = true;
        if (res.headers.get('retry-after') || res.headers.get('ratelimit-reset')) {
          retryAfterHeader = true;
        }
        break;
      }
    }

    assert(hit429, '5.1 forgot-password rate limiter triggers HTTP 429 after 5 requests from same IP');
    assert(retryAfterHeader, '5.2 forgot-password response includes Retry-After or RateLimit headers');

    // 5.3 Rate limiting on POST /auth/reset-password endpoint (max 5 requests per window)
    const testIpReset = '198.51.100.56';
    let hit429Reset = false;
    let retryAfterHeaderReset = false;
    let resetLimiterMessageMatch = false;

    for (let i = 1; i <= 7; i++) {
      const res = await request('/auth/reset-password', {
        method: 'POST',
        body: { token: `invalid_token_sample_${i}_${testSuffix}`, password: 'ValidPassword123!' },
        headers: { 'x-forwarded-for': testIpReset },
      });
      if (res.status === 429) {
        hit429Reset = true;
        if (res.headers.get('retry-after') || res.headers.get('ratelimit-reset')) {
          retryAfterHeaderReset = true;
        }
        if (res.data?.message && res.data.message.toLowerCase().includes('too many password reset attempts')) {
          resetLimiterMessageMatch = true;
        }
        break;
      }
    }

    assert(hit429Reset, '5.3 reset-password rate limiter triggers HTTP 429 after 5 requests from same IP');
    assert(retryAfterHeaderReset, '5.4 reset-password 429 response includes Retry-After or RateLimit headers');
    assert(resetLimiterMessageMatch, '5.5 reset-password 429 response includes configured rate limiter message');

    // Cleanup test user
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });

  } catch (err: any) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
    await prisma.$disconnect();
  }

  console.log('\n=================================================================');
  console.log(`📊 PHASE 2.10 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPasswordRecoverySecuritySuite();
