-- Migration: add_search_fields
-- Adds category, type (FIXED/HOURLY), isRemote to Job table
-- Run AFTER 20240701000000_add_skills migration

CREATE TYPE "JobType" AS ENUM ('FIXED', 'HOURLY');

ALTER TABLE "Job"
    ADD COLUMN "category"   TEXT        DEFAULT 'General',
    ADD COLUMN "type"       "JobType"   NOT NULL DEFAULT 'FIXED',
    ADD COLUMN "isRemote"   BOOLEAN     NOT NULL DEFAULT true,
    ADD COLUMN "hourlyRate" DOUBLE PRECISION;

CREATE INDEX "Job_category_idx" ON "Job"("category");
CREATE INDEX "Job_type_idx"     ON "Job"("type");
CREATE INDEX "Job_status_idx"   ON "Job"("status");