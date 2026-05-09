-- Migration: add_milestones
-- Safe to run on existing DB. Does NOT drop any existing data.
--
-- Changes:
--   1. New enum  MilestoneStatus
--   2. New table Milestone
--   3. Escrow.jobId — drop old UNIQUE constraint (job now has many escrows)
--   4. Escrow.milestoneId column (nullable, unique per row)
--   5. Transaction.milestoneId column (nullable)

-- 1. New enum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'FUNDED', 'RELEASED', 'REFUNDED');

-- 2. Milestone table
CREATE TABLE "Milestone" (
    "id"        TEXT                NOT NULL,
    "jobId"     TEXT                NOT NULL,
    "title"     TEXT                NOT NULL,
    "amount"    DOUBLE PRECISION    NOT NULL,
    "status"    "MilestoneStatus"   NOT NULL DEFAULT 'PENDING',
    "order"     INTEGER             NOT NULL,
    "createdAt" TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Milestone_jobId_idx"       ON "Milestone"("jobId");
CREATE INDEX "Milestone_jobId_order_idx" ON "Milestone"("jobId", "order");

ALTER TABLE "Milestone"
    ADD CONSTRAINT "Milestone_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. Drop the old UNIQUE constraint on Escrow.jobId
--    (job now has many escrow rows — one per milestone)
--    The constraint name is "Escrow_jobId_key" in the original schema.
--    If it doesn't exist this is harmless — the DO block catches it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'Escrow_jobId_key'
    AND conrelid = '"Escrow"'::regclass
  ) THEN
    ALTER TABLE "Escrow" DROP CONSTRAINT "Escrow_jobId_key";
  END IF;
END$$;

-- 4. Add milestoneId to Escrow
ALTER TABLE "Escrow" ADD COLUMN IF NOT EXISTS "milestoneId" TEXT;

ALTER TABLE "Escrow"
    ADD CONSTRAINT "Escrow_milestoneId_key" UNIQUE ("milestoneId");

CREATE INDEX IF NOT EXISTS "Escrow_jobId_idx" ON "Escrow"("jobId");

ALTER TABLE "Escrow"
    ADD CONSTRAINT "Escrow_milestoneId_fkey"
    FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. Add milestoneId to Transaction
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "milestoneId" TEXT;
