-- CreateEnum
CREATE TYPE "CreditBureau" AS ENUM ('EQUIFAX', 'EXPERIAN', 'TRANSUNION');

-- AlterTable
ALTER TABLE "financing_programs" ADD COLUMN     "minFicoScore" INTEGER;

-- CreateTable
CREATE TABLE "bureau_pulls" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "participantType" "ConsentParticipantType" NOT NULL,
    "participantId" TEXT NOT NULL,
    "financingProgramId" TEXT,
    "bureau" "CreditBureau" NOT NULL,
    "ficoScore" INTEGER,
    "pulledBy" TEXT NOT NULL,
    "pulledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bureau_pulls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bureau_pulls_applicationId_idx" ON "bureau_pulls"("applicationId");

-- AddForeignKey
ALTER TABLE "bureau_pulls" ADD CONSTRAINT "bureau_pulls_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bureau_pulls" ADD CONSTRAINT "bureau_pulls_financingProgramId_fkey" FOREIGN KEY ("financingProgramId") REFERENCES "financing_programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
