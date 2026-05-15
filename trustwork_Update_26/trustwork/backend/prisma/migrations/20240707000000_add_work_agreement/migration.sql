-- Phase 1: Work Agreement gate between ASSIGNED and FUNDED

CREATE TABLE "WorkAgreement" (
  "id"                        TEXT NOT NULL,
  "jobId"                     TEXT NOT NULL,
  "status"                    TEXT NOT NULL DEFAULT 'DRAFT',

  -- Section A: Work Agreement
  "scope"                     TEXT,
  "deliverables"              JSONB NOT NULL DEFAULT '[]',
  "startDate"                 TIMESTAMP(3),
  "endDate"                   TIMESTAMP(3),
  "revisionRounds"            INTEGER NOT NULL DEFAULT 2,
  "revisionPolicy"            TEXT,
  "paymentTerms"              TEXT,
  "specialConditions"         TEXT,

  -- Section B: Milestone Agreement
  "milestonesAgreed"          JSONB NOT NULL DEFAULT '[]',

  -- Section C: Escrow Release Agreement
  "escrowTermsAccepted"       BOOLEAN NOT NULL DEFAULT false,

  -- Section D: Dispute Prevention Checklist
  "clientChecklist"           JSONB NOT NULL DEFAULT '{}',
  "freelancerChecklist"       JSONB NOT NULL DEFAULT '{}',

  -- Signatures
  "clientSignedAt"            TIMESTAMP(3),
  "clientSignedById"          TEXT,
  "freelancerSignedAt"        TIMESTAMP(3),
  "freelancerSignedById"      TEXT,
  "agreedAt"                  TIMESTAMP(3),

  "createdAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WorkAgreement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkAgreement_jobId_key" ON "WorkAgreement"("jobId");

ALTER TABLE "WorkAgreement"
  ADD CONSTRAINT "WorkAgreement_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkAgreement"
  ADD CONSTRAINT "WorkAgreement_clientSignedById_fkey"
  FOREIGN KEY ("clientSignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkAgreement"
  ADD CONSTRAINT "WorkAgreement_freelancerSignedById_fkey"
  FOREIGN KEY ("freelancerSignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add agreementStatus to Job for fast queries
ALTER TABLE "Job"
  ADD COLUMN IF NOT EXISTS "agreementStatus" TEXT;
