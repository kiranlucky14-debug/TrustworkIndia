-- Phase 2: Escrow Release Re-confirmation
-- Adds freelancer submission confirmation and client release confirmation
-- Both parties must re-confirm Section C terms at submission/approval stage

ALTER TABLE "WorkAgreement"
  ADD COLUMN IF NOT EXISTS "freelancerSubmitConfirmedAt"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "clientReleaseConfirmedAt"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "submissionNote"               TEXT,
  ADD COLUMN IF NOT EXISTS "releaseNote"                  TEXT;
