-- =============================================================================
-- TrustWork: Milestone + Payout + Agreement Versioning Migration
-- Safe to re-run (IF NOT EXISTS / IF EXISTS guards throughout)
-- =============================================================================

--  1. Extend MilestoneStatus enum 
DO $$ BEGIN
  ALTER TYPE "MilestoneStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE "MilestoneStatus" ADD VALUE IF NOT EXISTS 'PENDING_REVIEW';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE "MilestoneStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

--  2. Extend Milestone table 
ALTER TABLE "Milestone"
  ADD COLUMN IF NOT EXISTS "dueDate"          TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "description"      TEXT,
  ADD COLUMN IF NOT EXISTS "deliverable"      TEXT,
  ADD COLUMN IF NOT EXISTS "submittedAt"      TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "submissionNote"   TEXT,
  ADD COLUMN IF NOT EXISTS "approvedAt"       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "approvedById"     TEXT,
  ADD COLUMN IF NOT EXISTS "payoutStatus"     TEXT NOT NULL DEFAULT 'UNPAID',
  ADD COLUMN IF NOT EXISTS "payoutApprovedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "payoutApprovedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "payoutRejectedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "payoutRejectNote" TEXT,
  ADD COLUMN IF NOT EXISTS "platformFee"      DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "netAmount"        DECIMAL(12,2);

--  3. Agreement versioning 
ALTER TABLE "WorkAgreement"
  ADD COLUMN IF NOT EXISTS "version"    INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "parentId"   TEXT,
  ADD COLUMN IF NOT EXISTS "superseded" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "AgreementVersion" (
  "id"           TEXT NOT NULL,
  "jobId"        TEXT NOT NULL,
  "agreementId"  TEXT NOT NULL,
  "version"      INTEGER NOT NULL,
  "changedBy"    TEXT NOT NULL,
  "changeReason" TEXT,
  "snapshotJson" JSONB NOT NULL DEFAULT '{}',
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgreementVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AgreementVersion_jobId_idx" ON "AgreementVersion"("jobId");
CREATE INDEX IF NOT EXISTS "AgreementVersion_agreementId_idx" ON "AgreementVersion"("agreementId");

DO $$ BEGIN
  ALTER TABLE "AgreementVersion"
    ADD CONSTRAINT "AgreementVersion_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

--  4. Payout queue table 
CREATE TABLE IF NOT EXISTS "PayoutQueue" (
  "id"              TEXT NOT NULL,
  "milestoneId"     TEXT NOT NULL,
  "jobId"           TEXT NOT NULL,
  "freelancerId"    TEXT NOT NULL,
  "grossAmount"     DECIMAL(12,2) NOT NULL,
  "platformFeeRate" DECIMAL(5,4)  NOT NULL DEFAULT 0.02,
  "platformFee"     DECIMAL(12,2) NOT NULL,
  "netAmount"       DECIMAL(12,2) NOT NULL,
  "status"          TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  "adminNote"       TEXT,
  "reviewedById"    TEXT,
  "reviewedAt"      TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PayoutQueue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PayoutQueue_milestoneId_key"
  ON "PayoutQueue"("milestoneId");
CREATE INDEX IF NOT EXISTS "PayoutQueue_status_idx"    ON "PayoutQueue"("status");
CREATE INDEX IF NOT EXISTS "PayoutQueue_jobId_idx"     ON "PayoutQueue"("jobId");
CREATE INDEX IF NOT EXISTS "PayoutQueue_freelancerId_idx" ON "PayoutQueue"("freelancerId");

DO $$ BEGIN
  ALTER TABLE "PayoutQueue"
    ADD CONSTRAINT "PayoutQueue_milestoneId_fkey"
    FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PayoutQueue"
    ADD CONSTRAINT "PayoutQueue_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PayoutQueue"
    ADD CONSTRAINT "PayoutQueue_freelancerId_fkey"
    FOREIGN KEY ("freelancerId") REFERENCES "User"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

--  Done 
SELECT 'Milestone + Payout + AgreementVersion migration applied' AS result;

--  System Config table (for runtime admin configuration) 
CREATE TABLE IF NOT EXISTS "SystemConfig" (
  "id"          TEXT NOT NULL,
  "key"         TEXT NOT NULL,
  "value"       TEXT NOT NULL,
  "description" TEXT,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedBy"   TEXT,
  CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SystemConfig_key_key" ON "SystemConfig"("key");

-- Seed default configs
INSERT INTO "SystemConfig" ("id","key","value","description") VALUES
  (gen_random_uuid(), 'PLATFORM_FEE_RATE',     '0.02',         'Platform fee rate (e.g. 0.02 = 2%)'),
  (gen_random_uuid(), 'OTP_PROVIDER',           'mock',         'OTP provider: mock | msg91 | twilio | fast2sms'),
  (gen_random_uuid(), 'OTP_MOCK_CODE',          '123456',       'OTP code used in mock mode only'),
  (gen_random_uuid(), 'EMAIL_PROVIDER',         'mock',         'Email provider: mock | smtp | sendgrid | resend'),
  (gen_random_uuid(), 'RAZORPAY_MODE',          'mock',         'Payment mode: mock | test | live'),
  (gen_random_uuid(), 'MAINTENANCE_MODE',       'false',        'Put site in maintenance mode'),
  (gen_random_uuid(), 'MAINTENANCE_MESSAGE',    'We are upgrading. Back shortly!', 'Maintenance banner message'),
  (gen_random_uuid(), 'FEATURE_CHAT',           'true',         'Enable in-platform chat'),
  (gen_random_uuid(), 'FEATURE_MATCHING',       'true',         'Enable job matching algorithm'),
  (gen_random_uuid(), 'FEATURE_RAZORPAY',       'false',        'Enable real Razorpay payments'),
  (gen_random_uuid(), 'RATE_LIMIT_MAX',         '100',          'Max requests per window per IP'),
  (gen_random_uuid(), 'MIN_MILESTONE_AMOUNT',   '500',          'Minimum milestone amount in Rs'),
  (gen_random_uuid(), 'SUPPORT_EMAIL',          'support@trustwork.in', 'Support contact email')
ON CONFLICT ("key") DO NOTHING;

SELECT 'SystemConfig table created' AS result;
