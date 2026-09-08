-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "FinancingProgramType" AS ENUM ('CAPTIVE', 'THIRD_PARTY');

-- CreateEnum
CREATE TYPE "ConsentParticipantType" AS ENUM ('BUSINESS', 'GUARANTOR', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "ConsentPurpose" AS ENUM ('CREDIT_PULL', 'DATA_SHARING', 'MARKETING');

-- CreateEnum
CREATE TYPE "ApplicantType" AS ENUM ('BUSINESS', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'IN_PROGRESS', 'ACCEPTED', 'FUNDED', 'CLOSED_LOST', 'PENDING_RECONCILIATION');

-- CreateEnum
CREATE TYPE "LenderSubmissionStatus" AS ENUM ('SUBMITTED', 'DECISIONED');

-- CreateEnum
CREATE TYPE "DecisionOutcome" AS ENUM ('APPROVED', 'DECLINED', 'COUNTERED');

-- CreateTable
CREATE TABLE "manufacturers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manufacturers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dealers" (
    "id" TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dealers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lenders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lenders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financing_programs" (
    "id" TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinancingProgramType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financing_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_applicants" (
    "id" TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "ein" TEXT,
    "addressLine1" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_applicants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owners" (
    "id" TEXT NOT NULL,
    "businessApplicantId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "title" TEXT,
    "ownershipPercent" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "individual_applicants" (
    "id" TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "individual_applicants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guarantors" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "ownerId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "ssnLast4" TEXT NOT NULL,
    "consentCreditPull" BOOLEAN NOT NULL DEFAULT false,
    "consentDataSharing" BOOLEAN NOT NULL DEFAULT false,
    "consentRecordedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guarantors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "participantType" "ConsentParticipantType" NOT NULL,
    "participantId" TEXT NOT NULL,
    "purpose" "ConsentPurpose" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "applicantType" "ApplicantType" NOT NULL,
    "businessApplicantId" TEXT,
    "individualApplicantId" TEXT,
    "equipmentDescription" TEXT NOT NULL,
    "requestedAmount" DECIMAL(12,2) NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "needsReconciliation" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lender_submissions" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "financingProgramId" TEXT NOT NULL,
    "status" "LenderSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lender_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decisions" (
    "id" TEXT NOT NULL,
    "lenderSubmissionId" TEXT NOT NULL,
    "outcome" "DecisionOutcome" NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "reasonText" TEXT NOT NULL,
    "termsJson" JSONB,
    "enteredBy" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accepted_offers" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accepted_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funded_transactions" (
    "id" TEXT NOT NULL,
    "acceptedOfferId" TEXT NOT NULL,
    "fundedAmount" DECIMAL(12,2) NOT NULL,
    "fundedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funded_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log_entries" (
    "id" TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_retention_events" (
    "id" TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_retention_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "manufacturers_slug_key" ON "manufacturers"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "dealers_manufacturerId_code_key" ON "dealers"("manufacturerId", "code");

-- CreateIndex
CREATE INDEX "business_applicants_manufacturerId_legalName_idx" ON "business_applicants"("manufacturerId", "legalName");

-- CreateIndex
CREATE INDEX "individual_applicants_manufacturerId_email_idx" ON "individual_applicants"("manufacturerId", "email");

-- CreateIndex
CREATE INDEX "consent_records_applicationId_participantType_participantId_idx" ON "consent_records"("applicationId", "participantType", "participantId");

-- CreateIndex
CREATE INDEX "applications_manufacturerId_dealerId_idx" ON "applications"("manufacturerId", "dealerId");

-- CreateIndex
CREATE INDEX "applications_manufacturerId_status_idx" ON "applications"("manufacturerId", "status");

-- CreateIndex
CREATE INDEX "lender_submissions_applicationId_idx" ON "lender_submissions"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "decisions_lenderSubmissionId_key" ON "decisions"("lenderSubmissionId");

-- CreateIndex
CREATE UNIQUE INDEX "accepted_offers_applicationId_key" ON "accepted_offers"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "accepted_offers_decisionId_key" ON "accepted_offers"("decisionId");

-- CreateIndex
CREATE UNIQUE INDEX "funded_transactions_acceptedOfferId_key" ON "funded_transactions"("acceptedOfferId");

-- CreateIndex
CREATE INDEX "audit_log_entries_manufacturerId_entityType_entityId_idx" ON "audit_log_entries"("manufacturerId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "data_retention_events_manufacturerId_entityType_entityId_idx" ON "data_retention_events"("manufacturerId", "entityType", "entityId");

-- AddForeignKey
ALTER TABLE "dealers" ADD CONSTRAINT "dealers_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financing_programs" ADD CONSTRAINT "financing_programs_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financing_programs" ADD CONSTRAINT "financing_programs_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "lenders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_applicants" ADD CONSTRAINT "business_applicants_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owners" ADD CONSTRAINT "owners_businessApplicantId_fkey" FOREIGN KEY ("businessApplicantId") REFERENCES "business_applicants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "individual_applicants" ADD CONSTRAINT "individual_applicants_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guarantors" ADD CONSTRAINT "guarantors_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guarantors" ADD CONSTRAINT "guarantors_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "owners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "dealers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_businessApplicantId_fkey" FOREIGN KEY ("businessApplicantId") REFERENCES "business_applicants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_individualApplicantId_fkey" FOREIGN KEY ("individualApplicantId") REFERENCES "individual_applicants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lender_submissions" ADD CONSTRAINT "lender_submissions_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lender_submissions" ADD CONSTRAINT "lender_submissions_financingProgramId_fkey" FOREIGN KEY ("financingProgramId") REFERENCES "financing_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_lenderSubmissionId_fkey" FOREIGN KEY ("lenderSubmissionId") REFERENCES "lender_submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accepted_offers" ADD CONSTRAINT "accepted_offers_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accepted_offers" ADD CONSTRAINT "accepted_offers_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "decisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funded_transactions" ADD CONSTRAINT "funded_transactions_acceptedOfferId_fkey" FOREIGN KEY ("acceptedOfferId") REFERENCES "accepted_offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log_entries" ADD CONSTRAINT "audit_log_entries_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_retention_events" ADD CONSTRAINT "data_retention_events_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
