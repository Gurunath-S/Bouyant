-- Migration: 20261017_phase2_booking_snapshots
-- Description: Non-destructive Phase 2.2 indexes, Phase 2.3 booking-level contact and billing snapshots, and userId association

-- 1. Relax Company field uniqueness and add lookup indexes (Phase 2.2)
DROP INDEX IF EXISTS "Company_mobile_key";
DROP INDEX IF EXISTS "Company_email_key";
DROP INDEX IF EXISTS "Company_panNumber_key";
DROP INDEX IF EXISTS "Company_tanNumber_key";

CREATE INDEX IF NOT EXISTS "Company_mobile_idx" ON "Company"("mobile");
CREATE INDEX IF NOT EXISTS "Company_email_idx" ON "Company"("email");
CREATE INDEX IF NOT EXISTS "Company_panNumber_idx" ON "Company"("panNumber");

-- 2. Add Booking-level Contact/Representative Snapshot fields (Phase 2.3)
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "contactPerson" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;

-- 3. Add Booking-level Legal/Billing Snapshot fields (Phase 2.3)
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "billingName" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "billingGst" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "billingPan" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "billingAddress" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "billingCity" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "billingState" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "billingPinCode" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "billingCountry" TEXT DEFAULT 'India';

-- 4. Add Booking User ownership relation (Phase 2.3)
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "userId" TEXT;
CREATE INDEX IF NOT EXISTS "Booking_userId_idx" ON "Booking"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Booking_userId_fkey'
  ) THEN
    ALTER TABLE "Booking"
      ADD CONSTRAINT "Booking_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 5. Atomic Company Code Sequence (Phase 2.2 / Phase 2.3)
CREATE SEQUENCE IF NOT EXISTS company_code_seq;
