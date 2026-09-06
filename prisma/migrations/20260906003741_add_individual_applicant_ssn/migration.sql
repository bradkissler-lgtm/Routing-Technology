/*
  Warnings:

  - Added the required column `ssnLast4` to the `individual_applicants` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "individual_applicants" ADD COLUMN     "ssnLast4" TEXT NOT NULL;
