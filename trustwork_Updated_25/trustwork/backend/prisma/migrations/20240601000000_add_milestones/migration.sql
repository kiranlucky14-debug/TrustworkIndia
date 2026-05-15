-- Migration: add_milestones
-- Runs AFTER init migration
-- Adds: MilestoneStatus enum, Milestone table,
--       milestoneId unique constraint on Escrow, FK from Escrow to Milestone

-- 1. New enum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING','FUNDED','RELEASED','REFUNDED');

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
CREATE INDEX "Milestone_jobId_order_idx" ON "Milestone"("jobId","order");
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. Add unique on Escrow.milestoneId (each milestone gets one escrow row)
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_milestoneId_key" UNIQUE ("milestoneId");

-- 4. FK: Escrow to Milestone
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_milestoneId_fkey"
    FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
