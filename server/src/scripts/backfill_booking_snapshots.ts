import { prisma } from '../config/db.js';
import { BookingsService } from '../modules/bookings/bookings.service.js';

async function runBackfill() {
  console.log('===========================================================');
  console.log('🔄 STARTING IDEMPOTENT BOOKING SNAPSHOT BACKFILL (Phase 2.3)');
  console.log('===========================================================');

  try {
    const beforeCount: any = await prisma.$queryRawUnsafe(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE "billingName" IS NULL) as missing_billing,
        COUNT(*) FILTER (WHERE "contactEmail" IS NULL) as missing_contact
      FROM "Booking";
    `);
    console.log('Pre-backfill booking state:', beforeCount);

    const result = await BookingsService.backfillHistoricalSnapshots();
    console.log(`✅ Backfill completed: Processed ${result.totalProcessed} bookings, updated ${result.updated} records.`);

    const afterCount: any = await prisma.$queryRawUnsafe(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE "billingName" IS NULL) as missing_billing,
        COUNT(*) FILTER (WHERE "contactEmail" IS NULL) as missing_contact
      FROM "Booking";
    `);
    console.log('Post-backfill booking state:', afterCount);

    // Verify idempotency
    const secondPass = await BookingsService.backfillHistoricalSnapshots();
    console.log(`✅ Idempotency check: Second pass processed ${secondPass.totalProcessed} records, updated ${secondPass.updated}.`);

  } catch (err) {
    console.error('❌ Backfill failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runBackfill();
