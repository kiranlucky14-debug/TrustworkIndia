-- Milestone Workflow v2 Migration
-- New statuses: IN_PROGRESS, REWORK_REQUESTED, PAYMENT_UNDER_REVIEW, REJECTED

DO $$ BEGIN ALTER TYPE "MilestoneStatus" ADD VALUE 'IN_PROGRESS';         EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "MilestoneStatus" ADD VALUE 'REWORK_REQUESTED';    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "MilestoneStatus" ADD VALUE 'PAYMENT_UNDER_REVIEW'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "MilestoneStatus" ADD VALUE 'REJECTED';            EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Milestone"
  ADD COLUMN IF NOT EXISTS "reworkNote"      TEXT,
  ADD COLUMN IF NOT EXISTS "reworkCount"     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "startedAt"       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reworkRequestedAt" TIMESTAMP(3);

SELECT 'Milestone workflow v2 applied' AS result;
