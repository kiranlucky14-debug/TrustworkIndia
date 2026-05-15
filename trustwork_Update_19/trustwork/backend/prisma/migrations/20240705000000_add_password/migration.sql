-- Migration: add_password
-- Adds password hash, userId, and resetToken fields

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "passwordHash"       TEXT,
  ADD COLUMN IF NOT EXISTS "userId"             TEXT,
  ADD COLUMN IF NOT EXISTS "resetToken"         TEXT,
  ADD COLUMN IF NOT EXISTS "resetTokenExpiry"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastLoginAt"        TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "loginAttempts"      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lockedUntil"        TIMESTAMP(3);

-- Generate unique userId for existing users (e.g. TW-000001)
CREATE SEQUENCE IF NOT EXISTS "user_id_seq" START 1000;

UPDATE "User"
SET "userId" = 'TW-' || LPAD(nextval('user_id_seq')::TEXT, 6, '0')
WHERE "userId" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_userId_key" ON "User"("userId")
  WHERE "userId" IS NOT NULL;

-- Seed admin password (bcrypt of 'Admin@123')
UPDATE "User"
SET "passwordHash" = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewdBpj2cRHGmqhe6'
WHERE phone = '9876543214' AND role = 'ADMIN';
