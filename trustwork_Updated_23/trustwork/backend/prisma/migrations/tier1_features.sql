-- =============================================================================
-- Tier 1 Features Migration
-- 1. Chat/Messaging  2. Dispute Evidence  3. Match Scoring
-- =============================================================================

--  1. Chat Messages 
CREATE TABLE IF NOT EXISTS "Message" (
  "id"          TEXT NOT NULL,
  "jobId"       TEXT NOT NULL,
  "senderId"    TEXT NOT NULL,
  "content"     TEXT NOT NULL,
  "type"        TEXT NOT NULL DEFAULT 'TEXT',  -- TEXT | FILE | IMAGE | SYSTEM
  "fileUrl"     TEXT,
  "fileName"    TEXT,
  "fileSize"    INTEGER,
  "readAt"      TIMESTAMP(3),
  "editedAt"    TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Message_jobId_idx"      ON "Message"("jobId");
CREATE INDEX IF NOT EXISTS "Message_senderId_idx"   ON "Message"("senderId");
CREATE INDEX IF NOT EXISTS "Message_jobId_createdAt" ON "Message"("jobId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "Message" ADD CONSTRAINT "Message_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

--  2. Dispute Evidence 
ALTER TABLE "Dispute"
  ADD COLUMN IF NOT EXISTS "clientNote"       TEXT,
  ADD COLUMN IF NOT EXISTS "freelancerNote"   TEXT,
  ADD COLUMN IF NOT EXISTS "resolvedAt"       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "resolvedBy"       TEXT,
  ADD COLUMN IF NOT EXISTS "outcome"          TEXT,    -- RELEASE | REFUND | SPLIT
  ADD COLUMN IF NOT EXISTS "splitPercent"     INTEGER, -- freelancer % in split
  ADD COLUMN IF NOT EXISTS "timeline"         JSONB DEFAULT '[]';

CREATE TABLE IF NOT EXISTS "DisputeEvidence" (
  "id"          TEXT NOT NULL,
  "disputeId"   TEXT NOT NULL,
  "uploadedBy"  TEXT NOT NULL,
  "role"        TEXT NOT NULL,  -- CLIENT | FREELANCER
  "type"        TEXT NOT NULL,  -- FILE | NOTE | SCREENSHOT | LINK
  "content"     TEXT NOT NULL,  -- text note OR file URL
  "fileName"    TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DisputeEvidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DisputeEvidence_disputeId_idx" ON "DisputeEvidence"("disputeId");

DO $$ BEGIN
  ALTER TABLE "DisputeEvidence" ADD CONSTRAINT "DisputeEvidence_disputeId_fkey"
    FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "DisputeEvidence" ADD CONSTRAINT "DisputeEvidence_uploadedBy_fkey"
    FOREIGN KEY ("uploadedBy") REFERENCES "User"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

--  3. Job Match Score (cached on job) 
ALTER TABLE "Job"
  ADD COLUMN IF NOT EXISTS "matchScore"  INTEGER,
  ADD COLUMN IF NOT EXISTS "viewCount"   INTEGER NOT NULL DEFAULT 0;

--  4. Razorpay order tracking 
ALTER TABLE "Escrow"
  ADD COLUMN IF NOT EXISTS "razorpayOrderId"   TEXT,
  ADD COLUMN IF NOT EXISTS "razorpayPaymentId" TEXT,
  ADD COLUMN IF NOT EXISTS "razorpaySignature" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentMode"       TEXT DEFAULT 'MOCK';  -- MOCK | RAZORPAY

SELECT 'Tier 1 migration applied' AS result;
