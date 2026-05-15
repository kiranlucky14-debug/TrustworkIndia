-- Migration: add_profile_fields
-- Adds all registration fields to the User table

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

-- Email unique index (only where email is set)
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key"
  ON "User"("email") WHERE "email" IS NOT NULL;
