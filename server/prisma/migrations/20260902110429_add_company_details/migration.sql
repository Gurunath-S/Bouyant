/*
  Warnings:

  - You are about to drop the column `category` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `designation` on the `Company` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[mobile]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[gstNumber]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[panNumber]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tanNumber]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - Made the column `gstNumber` on table `Company` required. This step will fail if there are existing NULL values in that column.
  - Made the column `panNumber` on table `Company` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Company_companyCode_idx";

-- DropIndex
DROP INDEX "Company_gstNumber_idx";

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "category",
DROP COLUMN "designation",
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'Not Provided',
ADD COLUMN     "pinCode" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "remarks" TEXT DEFAULT 'Not Provided',
ADD COLUMN     "tanNumber" TEXT,
ALTER COLUMN "gstNumber" SET NOT NULL,
ALTER COLUMN "panNumber" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Company_mobile_key" ON "Company"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "Company_email_key" ON "Company"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Company_gstNumber_key" ON "Company"("gstNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Company_panNumber_key" ON "Company"("panNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Company_tanNumber_key" ON "Company"("tanNumber");
