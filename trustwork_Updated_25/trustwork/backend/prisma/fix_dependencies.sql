-- =============================================================================
-- TrustWork: Fix dependencies after manual column additions
-- Run this after your manual ALTER TABLE statements
-- =============================================================================

-- 1. Add missing enum values to MilestoneStatus
--    (safe - IF NOT EXISTS prevents errors on re-run)
DO $$ BEGIN
  ALTER TYPE "MilestoneStatus" ADD VALUE 'SUBMITTED';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE "MilestoneStatus" ADD VALUE 'PENDING_REVIEW';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE "MilestoneStatus" ADD VALUE 'APPROVED';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Fix payoutStatus default to match Prisma schema ('UNPAID' not 'PENDING')
ALTER TABLE "Milestone"
  ALTER COLUMN "payoutStatus" SET DEFAULT 'UNPAID';

-- Update any rows that have 'PENDING' (from the manual migration) to 'UNPAID'
UPDATE "Milestone" SET "payoutStatus" = 'UNPAID' WHERE "payoutStatus" = 'PENDING';

-- 3. Fix version column on WorkAgreement (schema has NOT NULL DEFAULT 1, manual had no default)
ALTER TABLE "WorkAgreement"
  ALTER COLUMN "version" SET DEFAULT 1;
UPDATE "WorkAgreement" SET "version" = 1 WHERE "version" IS NULL;

-- 4. Fix superseded column (schema has NOT NULL DEFAULT false)
ALTER TABLE "WorkAgreement"
  ALTER COLUMN "superseded" SET DEFAULT false;
UPDATE "WorkAgreement" SET "superseded" = false WHERE "superseded" IS NULL;

-- 5. Create AgreementVersion table if not exists
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

CREATE INDEX IF NOT EXISTS "AgreementVersion_jobId_idx"
  ON "AgreementVersion"("jobId");
CREATE INDEX IF NOT EXISTS "AgreementVersion_agreementId_idx"
  ON "AgreementVersion"("agreementId");

DO $$ BEGIN
  ALTER TABLE "AgreementVersion"
    ADD CONSTRAINT "AgreementVersion_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. Create PayoutQueue table if not exists
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
CREATE INDEX IF NOT EXISTS "PayoutQueue_status_idx"
  ON "PayoutQueue"("status");
CREATE INDEX IF NOT EXISTS "PayoutQueue_jobId_idx"
  ON "PayoutQueue"("jobId");
CREATE INDEX IF NOT EXISTS "PayoutQueue_freelancerId_idx"
  ON "PayoutQueue"("freelancerId");

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

-- 7. Fix platformFee and netAmount columns on Milestone
--    User created them as DOUBLE PRECISION; Prisma expects DECIMAL.
--    We cast them to be compatible.
ALTER TABLE "Milestone"
  ALTER COLUMN "platformFee" TYPE DECIMAL(12,2) USING "platformFee"::DECIMAL(12,2),
  ALTER COLUMN "netAmount"   TYPE DECIMAL(12,2) USING "netAmount"::DECIMAL(12,2);

-- 8. Verify
SELECT
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'Milestone') AS milestone_cols,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'WorkAgreement') AS agreement_cols,
  (SELECT COUNT(*) > 0 FROM pg_type WHERE typname = 'MilestoneStatus') AS enum_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'PayoutQueue') AS payout_queue_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'AgreementVersion') AS agreement_version_exists;

SELECT 'fix_dependencies.sql applied successfully' AS result;
