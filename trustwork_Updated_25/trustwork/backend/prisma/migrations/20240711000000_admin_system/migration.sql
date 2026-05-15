-- =============================================================================
-- Admin System Migration
-- Platform fee, admin action log, escrow audit
-- =============================================================================

-- 1. Add platformFee / netAmount fields to Escrow
ALTER TABLE "Escrow"
  ADD COLUMN IF NOT EXISTS "platformFeeRate"  DECIMAL(5,4) NOT NULL DEFAULT 0.02,
  ADD COLUMN IF NOT EXISTS "platformFee"      DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "netAmount"        DECIMAL(12,2);

-- 2. Add platformFee / netAmount fields to Transaction  
ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "platformFee"  DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "netAmount"    DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "description"  TEXT;

-- 3. Admin action log
CREATE TABLE IF NOT EXISTS "AdminLog" (
  "id"         TEXT NOT NULL,
  "adminId"    TEXT NOT NULL,
  "action"     TEXT NOT NULL,
  "target"     TEXT,
  "targetId"   TEXT,
  "before"     JSONB,
  "after"      JSONB,
  "note"       TEXT,
  "ip"         TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdminLog_adminId_idx" ON "AdminLog"("adminId");
CREATE INDEX IF NOT EXISTS "AdminLog_action_idx"  ON "AdminLog"("action");

DO $$ BEGIN
  ALTER TABLE "AdminLog"
    ADD CONSTRAINT "AdminLog_adminId_fkey"
    FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. User suspend/freeze columns
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "suspended"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "suspendReason" TEXT,
  ADD COLUMN IF NOT EXISTS "suspendedAt"   TIMESTAMP(3);
