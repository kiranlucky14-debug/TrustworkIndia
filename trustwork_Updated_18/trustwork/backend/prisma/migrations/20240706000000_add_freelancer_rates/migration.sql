-- Migration: add_freelancer_rates
-- Adds hourlyRate, demoRate, instagramUrl, facebookUrl, trustScore
-- and shortlist status to JobApplication

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "hourlyRate"    DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "demoRate"      DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "instagramUrl"  TEXT,
  ADD COLUMN IF NOT EXISTS "facebookUrl"   TEXT,
  ADD COLUMN IF NOT EXISTS "trustScore"    INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "JobApplication"
  ADD COLUMN IF NOT EXISTS "status"      TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "shortlisted" BOOLEAN NOT NULL DEFAULT false;
