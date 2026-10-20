-- Migration: 20261020_shared_exhibitor_contacts
-- Description: Allow shared exhibitor contacts under same company while preserving privileged-role uniqueness

-- 1. Drop global email unique index from User
DROP INDEX IF EXISTS "User_email_key";

-- 2. Enforce email uniqueness for privileged administrative and staff roles
CREATE UNIQUE INDEX IF NOT EXISTS "User_privileged_email_key" 
ON "User"("email") 
WHERE "role" IN ('SUPERADMIN', 'ADMIN', 'STAFF');

-- 3. Prevent duplicate exhibitor identities under the same company where both email and phone are identical
CREATE UNIQUE INDEX IF NOT EXISTS "User_company_email_phone_key" 
ON "User"("companyId", "email", "phone") 
WHERE "companyId" IS NOT NULL AND "phone" IS NOT NULL;

-- 4. Ensure unique index on username
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" 
ON "User"("username");
