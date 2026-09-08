/*
  Warnings:

  - Made the column `tanNumber` on table `Company` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SUPERADMIN';

-- AlterTable
ALTER TABLE "Company" ALTER COLUMN "tanNumber" SET NOT NULL;
