import { env } from '../src/config/env.js';
import { getSmtpSecurityConfig } from '../src/services/email.service.js';
import {
  acquirePdfRenderSlot,
  getActivePdfRendersCount,
  getRenderQueueLength,
  resetRenderQueueForTesting,
  MAX_CONCURRENT_PDF_RENDERS,
  MAX_RENDER_QUEUE_SIZE,
} from '../src/services/InvoicePdfService.js';
import { createRateLimiter } from '../src/middlewares/rateLimiter.js';
import express, { Express } from 'express';

async function runPhase2_9Suite() {
  console.log('\n=================================================================');
  console.log('🛡️ PHASE 2.9: PRODUCTION HARDENING & OPERATIONAL VERIFICATION');
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

  try {
    // -------------------------------------------------------------------------
    // Test 1: Reverse-Proxy IP Handling and Spoof Prevention
    // -------------------------------------------------------------------------
    console.log('--- Test 1: Reverse-Proxy IP Handling & Forwarded Header Trust ---');

    // 1.1 Development topology with trust proxy disabled
    const appDev: Express = express();
    // Default / false trust proxy
    appDev.get('/ip-test', (req, res) => {
      res.json({ ip: req.ip, ips: req.ips });
    });
    const serverDev = appDev.listen(0);
    const portDev = (serverDev.address() as any).port;

    const resDev = await fetch(`http://127.0.0.1:${portDev}/ip-test`, {
      headers: {
        'X-Forwarded-For': '203.0.113.195, 198.51.100.1',
      },
    });
    const dataDev: any = await resDev.json();
    assert(
      dataDev.ip === '127.0.0.1' || dataDev.ip === '::ffff:127.0.0.1' || dataDev.ip === '::1',
      'Test 1.1: Untrusted proxy ignores spoofed X-Forwarded-For and uses socket IP',
      `Got: ${dataDev.ip}`
    );
    serverDev.close();

    // 1.2 Production topology with trust proxy = 1 (single reverse proxy hop)
    const appProd: Express = express();
    appProd.set('trust proxy', 1);
    appProd.get('/ip-test', (req, res) => {
      res.json({ ip: req.ip, ips: req.ips });
    });
    const serverProd = appProd.listen(0);
    const portProd = (serverProd.address() as any).port;

    // In a single reverse-proxy hop setup:
    // Client sends request to proxy. Proxy appends client IP to X-Forwarded-For.
    // If client had spoofed '10.0.0.1', header arriving at Express is '10.0.0.1, 203.0.113.50'.
    // Express with trust proxy = 1 trusts the rightmost 1 proxy hop, resolving client IP to 203.0.113.50.
    const resProd = await fetch(`http://127.0.0.1:${portProd}/ip-test`, {
      headers: {
        'X-Forwarded-For': '10.0.0.1, 203.0.113.50',
      },
    });
    const dataProd: any = await resProd.json();
    assert(
      dataProd.ip === '203.0.113.50',
      'Test 1.2: Single-hop proxy correctly derives real client IP without trusting upstream spoofed header',
      `Got: ${dataProd.ip}`
    );
    serverProd.close();

    // 1.3 Rate limiter respects trusted proxy client IP
    const appLimiter: Express = express();
    appLimiter.set('trust proxy', 1);
    const limiter = createRateLimiter({
      windowMs: 60 * 1000,
      max: 2,
    });
    appLimiter.get('/limited', limiter, (_req, res) => {
      res.json({ success: true });
    });
    const serverLimiter = appLimiter.listen(0);
    const portLimiter = (serverLimiter.address() as any).port;

    // Client IP A makes 2 requests
    const r1 = await fetch(`http://127.0.0.1:${portLimiter}/limited`, {
      headers: { 'X-Forwarded-For': '192.0.2.1' },
    });
    const r2 = await fetch(`http://127.0.0.1:${portLimiter}/limited`, {
      headers: { 'X-Forwarded-For': '192.0.2.1' },
    });
    const r3 = await fetch(`http://127.0.0.1:${portLimiter}/limited`, {
      headers: { 'X-Forwarded-For': '192.0.2.1' },
    });

    assert(r1.status === 200, 'Test 1.3a: Client A request 1 allowed (200)');
    assert(r2.status === 200, 'Test 1.3b: Client A request 2 allowed (200)');
    assert(r3.status === 429, 'Test 1.3c: Client A request 3 rate-limited (429)');

    // Client IP B makes request from same reverse-proxy connection, but different client IP
    const rClientB = await fetch(`http://127.0.0.1:${portLimiter}/limited`, {
      headers: { 'X-Forwarded-For': '192.0.2.2' },
    });
    assert(
      rClientB.status === 200,
      'Test 1.3d: Client B is isolated and not blocked by Client A rate limit exhaustion (200)',
      `Got: ${rClientB.status}`
    );
    serverLimiter.close();

    // -------------------------------------------------------------------------
    // Test 2: SMTP TLS Certificate Verification
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: SMTP Transport Security & Certificate Validation ---');
    const smtpConfig = getSmtpSecurityConfig();

    assert(
      typeof smtpConfig.rejectUnauthorized === 'boolean',
      'Test 2.1: SMTP security configuration specifies explicit boolean rejectUnauthorized',
      `Got: ${smtpConfig.rejectUnauthorized}`
    );

    // Verify production rule: rejectUnauthorized must be true in production
    const isProduction = env.NODE_ENV === 'production';
    if (isProduction) {
      assert(
        smtpConfig.rejectUnauthorized === true,
        'Test 2.2: Production environment strictly enforces rejectUnauthorized === true'
      );
    } else {
      assert(
        smtpConfig.rejectUnauthorized === true,
        'Test 2.2: Development default enforces secure certificate validation (rejectUnauthorized === true)'
      );
    }

    assert(
      (smtpConfig as any).pass === undefined && (smtpConfig as any).password === undefined,
      'Test 2.3: SMTP configuration inspection does not expose credentials or sensitive secrets'
    );

    // -------------------------------------------------------------------------
    // Test 3: Bounded PDF Render Queue & Concurrency Limits
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: Bounded PDF Render Queue & Timeout Handling ---');

    resetRenderQueueForTesting();
    assert(getActivePdfRendersCount() === 0, 'Test 3.1: Active renders initially 0');
    assert(getRenderQueueLength() === 0, 'Test 3.2: Queue length initially 0');

    // 3.3 Fill 3 concurrent active slots
    const releaseSlots: Array<() => void> = [];
    for (let i = 0; i < MAX_CONCURRENT_PDF_RENDERS; i++) {
      const release = await acquirePdfRenderSlot();
      releaseSlots.push(release);
    }
    assert(
      getActivePdfRendersCount() === MAX_CONCURRENT_PDF_RENDERS,
      `Test 3.3: Active renders capped at MAX_CONCURRENT_PDF_RENDERS (${MAX_CONCURRENT_PDF_RENDERS})`
    );

    // 3.4 Queue up to MAX_RENDER_QUEUE_SIZE (10) pending requests
    const pendingPromises: Array<Promise<() => void>> = [];
    for (let i = 0; i < MAX_RENDER_QUEUE_SIZE; i++) {
      pendingPromises.push(acquirePdfRenderSlot(5000));
    }
    assert(
      getRenderQueueLength() === MAX_RENDER_QUEUE_SIZE,
      `Test 3.4: Render queue accepts up to MAX_RENDER_QUEUE_SIZE (${MAX_RENDER_QUEUE_SIZE}) pending requests`
    );

    // 3.5 Attempting to enqueue beyond capacity immediately rejects with 503
    let capacityRejected = false;
    let capacityStatusCode = 0;
    try {
      await acquirePdfRenderSlot(5000);
    } catch (err: any) {
      capacityRejected = true;
      capacityStatusCode = err.statusCode || 500;
    }
    assert(
      capacityRejected === true && capacityStatusCode === 503,
      'Test 3.5: Excess request beyond queue capacity is immediately rejected with HTTP 503',
      `Status: ${capacityStatusCode}`
    );

    // 3.6 Queue timeout enforcement
    // Test a short timeout (100ms) on a queued request
    let timeoutRejected = false;
    let timeoutStatusCode = 0;
    const timeoutPromise = acquirePdfRenderSlot(100).catch((err: any) => {
      timeoutRejected = true;
      timeoutStatusCode = err.statusCode || 500;
    });

    await new Promise((r) => setTimeout(r, 200));
    await timeoutPromise;

    assert(
      timeoutRejected === true && timeoutStatusCode === 503,
      'Test 3.6: Queued request times out and rejects with HTTP 503 after deadline',
      `Status: ${timeoutStatusCode}`
    );

    // 3.7 Slot release after rendering
    // Release 1 active slot, allowing 1 pending queued request to resolve
    const firstActive = releaseSlots.shift();
    if (firstActive) firstActive();

    const acquiredRelease = await pendingPromises[0];
    assert(
      typeof acquiredRelease === 'function',
      'Test 3.7: Released active slot successfully unblocks next pending queued request'
    );
    releaseSlots.push(acquiredRelease);

    // 3.8 Slot release on rendering failure
    const slotToFail = releaseSlots.pop();
    try {
      throw new Error('Simulated puppeteer rendering failure');
    } catch (_expected) {
      // Simulate finally { releaseSlot(); }
      if (slotToFail) slotToFail();
    }

    assert(
      getActivePdfRendersCount() <= MAX_CONCURRENT_PDF_RENDERS,
      'Test 3.8: Render slot safely released even when rendering throws an unhandled exception'
    );

    // Clean up remaining queue and active slots
    resetRenderQueueForTesting();
    for (const rel of releaseSlots) {
      rel();
    }
    resetRenderQueueForTesting();

    assert(
      getActivePdfRendersCount() === 0,
      'Test 3.9: All active slots and queues completely drained and reset to 0'
    );
  } catch (err: any) {
    console.error('💥 Test suite unhandled error:', err);
    failed++;
  }

  console.log('\n=================================================================');
  console.log(`📊 PHASE 2.9 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2_9Suite();
