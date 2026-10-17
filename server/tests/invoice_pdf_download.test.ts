import http from 'http';
import { prisma } from '../src/config/db.js';
import { generateTokens } from '../src/utils/jwt.js';
import { createApp } from '../src/app.js';

let server: any;
let baseUrl: string;

function fetchBuffer(
  path: string,
  token?: string
): Promise<{ status: number; contentType: string; buffer: Buffer; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const url = `${baseUrl}${path}`;
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            contentType: (res.headers['content-type'] as string) || '',
            buffer: Buffer.concat(chunks),
            headers: res.headers,
          });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('Testing Invoice & Bill PDF Download access control...');

  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const port = (server.address() as any).port;
      baseUrl = `http://localhost:${port}/api/v1`;
      resolve();
    });
  });

  const adminToken = generateTokens({
    userId: 'admin-test-id',
    email: 'admin-test@buoyantmedia.com',
    role: 'ADMIN',
    pageAccess: ['*'],
  }).accessToken;

  // 1. Get sample payment
  const payment = await prisma.payment.findFirst({
    include: { booking: true },
  });

  if (payment) {
    console.log(`Testing with payment reference: ${payment.paymentReference} (ID: ${payment.id})`);

    // Verify unauthenticated is rejected
    const unauthRef = await fetchBuffer(`/invoices/public/${payment.paymentReference}/pdf`);
    if (unauthRef.status !== 401 && unauthRef.status !== 404) {
      throw new Error(`Expected 401/404 for unauthenticated public download, got ${unauthRef.status}`);
    }
    console.log('✅ PASS: Unauthenticated public paymentReference request rejected (401/404)');

    // Authenticated download by payment reference
    const refRes = await fetchBuffer(`/invoices/${payment.paymentReference}/pdf`, adminToken);
    if (refRes.status !== 200 || !refRes.contentType.includes('application/pdf') || !refRes.buffer.toString('utf-8', 0, 4).startsWith('%PDF')) {
      throw new Error(`Failed PDF test for authenticated payment reference ${payment.paymentReference}`);
    }
    console.log('✅ PASS: Authenticated paymentReference returns valid %PDF buffer');

    // Authenticated download by payment ID
    const payIdRes = await fetchBuffer(`/invoices/${payment.id}/pdf`, adminToken);
    if (payIdRes.status !== 200 || !payIdRes.contentType.includes('application/pdf') || !payIdRes.buffer.toString('utf-8', 0, 4).startsWith('%PDF')) {
      throw new Error(`Failed PDF test for authenticated payment ID ${payment.id}`);
    }
    console.log('✅ PASS: Authenticated paymentId returns valid %PDF buffer');
  }

  // 2. Get sample invoice
  const invoice = await prisma.invoice.findFirst();
  if (invoice) {
    console.log(`Testing with invoiceNumber: ${invoice.invoiceNumber} (ID: ${invoice.id})`);

    // Verify unauthenticated is rejected
    const unauthInv = await fetchBuffer(`/invoices/${invoice.invoiceNumber}/pdf`);
    if (unauthInv.status !== 401) {
      throw new Error(`Expected 401 for unauthenticated invoiceNumber download, got ${unauthInv.status}`);
    }
    console.log('✅ PASS: Unauthenticated invoiceNumber request rejected (401)');

    const invNumRes = await fetchBuffer(`/invoices/${invoice.invoiceNumber}/pdf`, adminToken);
    if (invNumRes.status !== 200 || !invNumRes.contentType.includes('application/pdf') || !invNumRes.buffer.toString('utf-8', 0, 4).startsWith('%PDF')) {
      throw new Error(`Failed PDF test for authenticated invoiceNumber ${invoice.invoiceNumber}`);
    }
    console.log('✅ PASS: Authenticated invoiceNumber returns valid %PDF buffer');

    const invIdRes = await fetchBuffer(`/invoices/${invoice.id}/pdf`, adminToken);
    if (invIdRes.status !== 200 || !invIdRes.contentType.includes('application/pdf') || !invIdRes.buffer.toString('utf-8', 0, 4).startsWith('%PDF')) {
      throw new Error(`Failed PDF test for authenticated invoice ID ${invoice.id}`);
    }
    if (!invIdRes.headers['cache-control']?.includes('no-store')) {
      throw new Error('Missing Cache-Control: no-store header');
    }
    if (invIdRes.headers['x-content-type-options'] !== 'nosniff') {
      throw new Error('Missing X-Content-Type-Options: nosniff header');
    }
    console.log('✅ PASS: Authenticated invoice ID returns valid %PDF buffer with security headers');
  }

  // 3. Get sample booking
  const booking = await prisma.booking.findFirst({
    where: { status: { not: 'CANCELLED' } },
  });
  if (booking) {
    console.log(`Testing with bookingReference: ${booking.bookingReference} (ID: ${booking.id})`);

    const unauthBk = await fetchBuffer(`/invoices/public/${booking.bookingReference}/pdf`);
    if (unauthBk.status !== 401 && unauthBk.status !== 404) {
      throw new Error(`Expected 401/404 for unauthenticated bookingReference, got ${unauthBk.status}`);
    }
    console.log('✅ PASS: Unauthenticated bookingReference rejected (401/404)');

    const bkRefRes = await fetchBuffer(`/invoices/${booking.bookingReference}/pdf`, adminToken);
    if (bkRefRes.status !== 200 || !bkRefRes.contentType.includes('application/pdf') || !bkRefRes.buffer.toString('utf-8', 0, 4).startsWith('%PDF')) {
      throw new Error(`Failed PDF test for authenticated bookingReference ${booking.bookingReference}`);
    }
    console.log('✅ PASS: Authenticated bookingReference returns valid %PDF buffer');
  }

  if (server) {
    server.close();
  }

  console.log('\n🎉 ALL INVOICE PDF ACCESS CONTROL TESTS PASSED!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
