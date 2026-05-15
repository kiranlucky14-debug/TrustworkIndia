-- =============================================================================
-- Milestone Workflow Rewrite
-- LOCKED -> UNLOCKED -> SUBMITTED -> CLIENT_APPROVED -> UNDER_ADMIN_REVIEW -> RELEASED
-- =============================================================================

-- 1. New MilestoneStatus values
DO $$ BEGIN ALTER TYPE "MilestoneStatus" ADD VALUE 'LOCKED';             EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "MilestoneStatus" ADD VALUE 'UNLOCKED';           EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "MilestoneStatus" ADD VALUE 'CLIENT_APPROVED';    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "MilestoneStatus" ADD VALUE 'UNDER_ADMIN_REVIEW'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. New JobStatus values
DO $$ BEGIN ALTER TYPE "JobStatus" ADD VALUE 'JOB_WITHDRAWN';  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "JobStatus" ADD VALUE 'REFUND_PENDING'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "JobStatus" ADD VALUE 'REFUNDED';       EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Add new Milestone fields
ALTER TABLE "Milestone"
  ADD COLUMN IF NOT EXISTS "isLocked"          BOOLEAN      NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "unlockedAt"        TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "clientApprovedAt"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "adminReviewAt"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "releasedAt"        TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectedAt"        TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectReason"      TEXT;

-- 4. Add withdrawal fields to Job
ALTER TABLE "Job"
  ADD COLUMN IF NOT EXISTS "withdrawnAt"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "withdrawReason" TEXT,
  ADD COLUMN IF NOT EXISTS "withdrawnById"  TEXT;

-- 5. Seed: unlock first milestone for active jobs
UPDATE "Milestone" SET "isLocked" = false
WHERE "order" = 1
  AND EXISTS (SELECT 1 FROM "Job" j WHERE j.id = "Milestone"."jobId"
              AND j.status IN ('ASSIGNED','FUNDED','IN_PROGRESS'));

SELECT 'Milestone workflow rewrite migration applied' AS result;
