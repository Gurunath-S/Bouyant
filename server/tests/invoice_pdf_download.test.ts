import http from 'http';
import { prisma } from '../src/config/db.js';

function fetchBuffer(url: string): Promise<{ status: number; contentType: string; buffer: Buffer }> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      res.on('end', () => {
        resolve({
          status: res.statusCode || 0,
          contentType: res.headers['content-type'] || '',
          buffer: Buffer.concat(chunks),
        });
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('Testing Invoice & Bill PDF Download endpoints...');

  // 1. Get sample payment
  const payment = await prisma.payment.findFirst({
    include: { booking: true },
  });

  if (payment) {
    console.log(`Testing with payment reference: ${payment.paymentReference} (ID: ${payment.id})`);
    
    // Test by paymentReference
    const refRes = await fetchBuffer(`http://localhost:5000/api/v1/invoices/public/${payment.paymentReference}/pdf`);
    console.log(`Payment ref ${payment.paymentReference} status:`, refRes.status, 'contentType:', refRes.contentType, 'bytes:', refRes.buffer.length);
    if (refRes.status !== 200 || !refRes.contentType.includes('application/pdf') || !refRes.buffer.toString('utf-8', 0, 4).startsWith('%PDF')) {
      throw new Error(`Failed PDF test for payment reference ${payment.paymentReference}`);
    }
    console.log('✅ PASS: paymentReference returns valid %PDF buffer');

    // Test by payment ID
    const payIdRes = await fetchBuffer(`http://localhost:5000/api/v1/invoices/public/${payment.id}/pdf`);
    console.log(`Payment ID ${payment.id} status:`, payIdRes.status, 'contentType:', payIdRes.contentType, 'bytes:', payIdRes.buffer.length);
    if (payIdRes.status !== 200 || !payIdRes.contentType.includes('application/pdf') || !payIdRes.buffer.toString('utf-8', 0, 4).startsWith('%PDF')) {
      throw new Error(`Failed PDF test for payment ID ${payment.id}`);
    }
    console.log('✅ PASS: paymentId returns valid %PDF buffer');
  }

  // 2. Get sample invoice
  const invoice = await prisma.invoice.findFirst();
  if (invoice) {
    console.log(`Testing with invoiceNumber: ${invoice.invoiceNumber} (ID: ${invoice.id})`);
    
    const invNumRes = await fetchBuffer(`http://localhost:5000/api/v1/invoices/public/${invoice.invoiceNumber}/pdf`);
    console.log(`Invoice number ${invoice.invoiceNumber} status:`, invNumRes.status, 'contentType:', invNumRes.contentType, 'bytes:', invNumRes.buffer.length);
    if (invNumRes.status !== 200 || !invNumRes.contentType.includes('application/pdf') || !invNumRes.buffer.toString('utf-8', 0, 4).startsWith('%PDF')) {
      throw new Error(`Failed PDF test for invoiceNumber ${invoice.invoiceNumber}`);
    }
    console.log('✅ PASS: invoiceNumber returns valid %PDF buffer');

    const invIdRes = await fetchBuffer(`http://localhost:5000/api/v1/invoices/public/${invoice.id}/pdf`);
    console.log(`Invoice ID ${invoice.id} status:`, invIdRes.status, 'contentType:', invIdRes.contentType, 'bytes:', invIdRes.buffer.length);
    if (invIdRes.status !== 200 || !invIdRes.contentType.includes('application/pdf') || !invIdRes.buffer.toString('utf-8', 0, 4).startsWith('%PDF')) {
      throw new Error(`Failed PDF test for invoice ID ${invoice.id}`);
    }
    console.log('✅ PASS: invoice ID returns valid %PDF buffer');
  }

  // 3. Get sample booking
  const booking = await prisma.booking.findFirst({
    where: { status: { not: 'CANCELLED' } },
  });
  if (booking) {
    console.log(`Testing with bookingReference: ${booking.bookingReference} (ID: ${booking.id})`);
    
    const bkRefRes = await fetchBuffer(`http://localhost:5000/api/v1/invoices/public/${booking.bookingReference}/pdf`);
    console.log(`Booking ref ${booking.bookingReference} status:`, bkRefRes.status, 'contentType:', bkRefRes.contentType, 'bytes:', bkRefRes.buffer.length);
    if (bkRefRes.status !== 200 || !bkRefRes.contentType.includes('application/pdf') || !bkRefRes.buffer.toString('utf-8', 0, 4).startsWith('%PDF')) {
      throw new Error(`Failed PDF test for bookingReference ${booking.bookingReference}`);
    }
    console.log('✅ PASS: bookingReference returns valid %PDF buffer');
  }

  console.log('\n🎉 ALL BILL & INVOICE PDF DOWNLOAD TESTS PASSED! Never HTML, strictly binary PDF.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
