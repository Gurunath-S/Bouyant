/*
  Warnings:

  - A unique constraint covering the columns `[regNo]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[spcode]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "regNo" TEXT,
ADD COLUMN     "spcode" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "spcode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Company_regNo_key" ON "Company"("regNo");

-- CreateIndex
CREATE UNIQUE INDEX "User_spcode_key" ON "User"("spcode");
