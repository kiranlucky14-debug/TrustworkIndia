-- =============================================================================
-- TrustWork: Combined Migration - All Three Phases
-- Run this single file to apply Phase 1 + 2 + 3 in one shot.
-- All statements use IF NOT EXISTS / IF EXISTS guards - safe to run
-- even if individual phase migrations were already run.
-- =============================================================================


-- 
-- Phase 1: Work Agreement (Gate between ASSIGNED and FUNDED)
-- 

CREATE TABLE IF NOT EXISTS "WorkAgreement" (
  "id"                        TEXT NOT NULL,
  "jobId"                     TEXT NOT NULL,
  "status"                    TEXT NOT NULL DEFAULT 'DRAFT',

  -- Section A: Work Agreement
  "scope"                     TEXT,
  "deliverables"              JSONB NOT NULL DEFAULT '[]',
  "startDate"                 TIMESTAMP(3),
  "endDate"                   TIMESTAMP(3),
  "revisionRounds"            INTEGER NOT NULL DEFAULT 2,
  "revisionPolicy"            TEXT,
  "paymentTerms"              TEXT,
  "specialConditions"         TEXT,

  -- Section B: Milestone Agreement
  "milestonesAgreed"          JSONB NOT NULL DEFAULT '[]',

  -- Section C: Escrow Release Agreement
  "escrowTermsAccepted"       BOOLEAN NOT NULL DEFAULT false,

  -- Section D: Dispute Prevention Checklists
  "clientChecklist"           JSONB NOT NULL DEFAULT '{}',
  "freelancerChecklist"       JSONB NOT NULL DEFAULT '{}',

  -- Signatures
  "clientSignedAt"            TIMESTAMP(3),
  "clientSignedById"          TEXT,
  "freelancerSignedAt"        TIMESTAMP(3),
  "freelancerSignedById"      TEXT,
  "agreedAt"                  TIMESTAMP(3),

  "createdAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WorkAgreement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WorkAgreement_jobId_key"
  ON "WorkAgreement"("jobId");

DO $$ BEGIN
  ALTER TABLE "WorkAgreement"
    ADD CONSTRAINT "WorkAgreement_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "WorkAgreement"
    ADD CONSTRAINT "WorkAgreement_clientSignedById_fkey"
    FOREIGN KEY ("clientSignedById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "WorkAgreement"
    ADD CONSTRAINT "WorkAgreement_freelancerSignedById_fkey"
    FOREIGN KEY ("freelancerSignedById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- agreementStatus on Job (fast query field)
ALTER TABLE "Job"
  ADD COLUMN IF NOT EXISTS "agreementStatus" TEXT;

-- Freelancer rate + social fields on User
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "hourlyRate"    DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "demoRate"      DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "instagramUrl"  TEXT,
  ADD COLUMN IF NOT EXISTS "facebookUrl"   TEXT,
  ADD COLUMN IF NOT EXISTS "trustScore"    INTEGER NOT NULL DEFAULT 0;

-- JobApplication: shortlist + status
ALTER TABLE "JobApplication"
  ADD COLUMN IF NOT EXISTS "status"      TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "shortlisted" BOOLEAN NOT NULL DEFAULT false;


-- 
-- Phase 2: Escrow Release Re-confirmation
-- 

ALTER TABLE "WorkAgreement"
  ADD COLUMN IF NOT EXISTS "freelancerSubmitConfirmedAt"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "submissionNote"               TEXT,
  ADD COLUMN IF NOT EXISTS "clientReleaseConfirmedAt"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "releaseNote"                  TEXT;


-- 
-- Phase 3: PDF Certificate Tracking
-- 

ALTER TABLE "WorkAgreement"
  ADD COLUMN IF NOT EXISTS "pdfGeneratedAt" TIMESTAMP(3);


-- 
-- Profile fields (from earlier phases - safe to re-run)
-- 

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "email"             TEXT,
  ADD COLUMN IF NOT EXISTS "profileCompleted"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isVerified"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "city"              TEXT,
  ADD COLUMN IF NOT EXISTS "state"             TEXT,
  ADD COLUMN IF NOT EXISTS "country"           TEXT DEFAULT 'India',
  ADD COLUMN IF NOT EXISTS "pincode"           TEXT,
  ADD COLUMN IF NOT EXISTS "addressLine1"      TEXT,
  ADD COLUMN IF NOT EXISTS "addressLine2"      TEXT,
  ADD COLUMN IF NOT EXISTS "bio"               TEXT,
  ADD COLUMN IF NOT EXISTS "designation"       TEXT,
  ADD COLUMN IF NOT EXISTS "companyName"       TEXT,
  ADD COLUMN IF NOT EXISTS "businessType"      TEXT,
  ADD COLUMN IF NOT EXISTS "gstNumber"         TEXT,
  ADD COLUMN IF NOT EXISTS "panNumber"         TEXT,
  ADD COLUMN IF NOT EXISTS "cinNumber"         TEXT,
  ADD COLUMN IF NOT EXISTS "aadhaarNumber"     TEXT,
  ADD COLUMN IF NOT EXISTS "website"           TEXT,
  ADD COLUMN IF NOT EXISTS "linkedinUrl"       TEXT,
  ADD COLUMN IF NOT EXISTS "githubUrl"         TEXT,
  ADD COLUMN IF NOT EXISTS "portfolioUrl"      TEXT,
  ADD COLUMN IF NOT EXISTS "title"             TEXT,
  ADD COLUMN IF NOT EXISTS "experienceLevel"   TEXT,
  ADD COLUMN IF NOT EXISTS "yearsOfExperience" INTEGER,
  ADD COLUMN IF NOT EXISTS "upiId"             TEXT,
  ADD COLUMN IF NOT EXISTS "bankName"          TEXT,
  ADD COLUMN IF NOT EXISTS "accountNumber"     TEXT,
  ADD COLUMN IF NOT EXISTS "ifscCode"          TEXT,
  ADD COLUMN IF NOT EXISTS "bankHolderName"    TEXT,
  ADD COLUMN IF NOT EXISTS "profilePhoto"      TEXT,
  ADD COLUMN IF NOT EXISTS "companyLogo"       TEXT,
  ADD COLUMN IF NOT EXISTS "panDocument"       TEXT,
  ADD COLUMN IF NOT EXISTS "gstDocument"       TEXT,
  ADD COLUMN IF NOT EXISTS "resumeUrl"         TEXT,
  ADD COLUMN IF NOT EXISTS "preferredPayment"  TEXT DEFAULT 'UPI';

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key"
  ON "User"("email") WHERE "email" IS NOT NULL;

-- Password / auth fields
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "passwordHash"       TEXT,
  ADD COLUMN IF NOT EXISTS "userId"             TEXT,
  ADD COLUMN IF NOT EXISTS "resetToken"         TEXT,
  ADD COLUMN IF NOT EXISTS "resetTokenExpiry"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastLoginAt"        TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "loginAttempts"      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lockedUntil"        TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "User_userId_key"
  ON "User"("userId") WHERE "userId" IS NOT NULL;

-- Generate userId for existing users
CREATE SEQUENCE IF NOT EXISTS "user_id_seq" START 1000;

UPDATE "User"
SET "userId" = 'TW-' || LPAD(nextval('user_id_seq')::TEXT, 6, '0')
WHERE "userId" IS NULL;

-- Seed admin password (bcrypt of 'Admin@123')
UPDATE "User"
SET "passwordHash" = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewdBpj2cRHGmqhe6'
WHERE phone = '9876543214' AND role = 'ADMIN' AND "passwordHash" IS NULL;

-- Demo users: ensure profileCompleted = true
UPDATE "User"
SET "profileCompleted" = true
WHERE phone IN ('9876543210','9876543211','9876543212','9876543213','9876543214');


-- =============================================================================
-- Notification system (Phase 4)
-- =============================================================================

CREATE TABLE IF NOT EXISTS "Notification" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "type"      TEXT NOT NULL,
  "title"     TEXT NOT NULL,
  "message"   TEXT NOT NULL,
  "jobId"     TEXT,
  "read"      BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Notification_userId_idx"
  ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx"
  ON "Notification"("userId", "read");

DO $$ BEGIN
  ALTER TABLE "Notification"
    ADD CONSTRAINT "Notification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================================
-- Admin System (Phase 5)
-- =============================================================================

ALTER TABLE "Escrow"
  ADD COLUMN IF NOT EXISTS "platformFeeRate"  DECIMAL(5,4) NOT NULL DEFAULT 0.02,
  ADD COLUMN IF NOT EXISTS "platformFee"      DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "netAmount"        DECIMAL(12,2);

ALTER TABLE "Transaction"
  ADD COLUMN IF NOT EXISTS "platformFee"  DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "netAmount"    DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "description"  TEXT;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "suspended"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "suspendReason" TEXT,
  ADD COLUMN IF NOT EXISTS "suspendedAt"   TIMESTAMP(3);

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

-- =============================================================================
-- Done. All phases applied.
-- =============================================================================
