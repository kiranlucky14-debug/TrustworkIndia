-- Migration: init
-- Creates all base tables for TrustWork
-- Run this FIRST before the add_milestones migration

-- Enums
CREATE TYPE "Role"              AS ENUM ('CLIENT', 'FREELANCER', 'ADMIN');
CREATE TYPE "JobStatus"         AS ENUM ('CREATED','ASSIGNED','FUNDED','IN_PROGRESS','SUBMITTED','APPROVED','COMPLETED','DISPUTED','CANCELLED');
CREATE TYPE "EscrowStatus"      AS ENUM ('LOCKED','RELEASED','REFUNDED');
CREATE TYPE "TransactionType"   AS ENUM ('DEPOSIT','RELEASE','REFUND');
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING','SUCCESS','FAILED');
CREATE TYPE "DisputeStatus"     AS ENUM ('OPEN','RESOLVED','CLOSED');

-- User
CREATE TABLE "User" (
    "id"          TEXT         NOT NULL,
    "name"        TEXT         NOT NULL,
    "phone"       TEXT         NOT NULL,
    "role"        "Role"       NOT NULL DEFAULT 'CLIENT',
    "rating"      DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER      NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- OTP
CREATE TABLE "OTP" (
    "id"        TEXT         NOT NULL,
    "phone"     TEXT         NOT NULL,
    "code"      TEXT         NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used"      BOOLEAN      NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId"    TEXT,
    CONSTRAINT "OTP_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "OTP" ADD CONSTRAINT "OTP_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Job
CREATE TABLE "Job" (
    "id"           TEXT         NOT NULL,
    "title"        TEXT         NOT NULL,
    "description"  TEXT         NOT NULL,
    "budget"       DOUBLE PRECISION NOT NULL,
    "deadline"     TIMESTAMP(3) NOT NULL,
    "status"       "JobStatus"  NOT NULL DEFAULT 'CREATED',
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId"     TEXT         NOT NULL,
    "freelancerId" TEXT,
    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Job" ADD CONSTRAINT "Job_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_freelancerId_fkey"
    FOREIGN KEY ("freelancerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- JobApplication
CREATE TABLE "JobApplication" (
    "id"        TEXT         NOT NULL,
    "jobId"     TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "message"   TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "JobApplication_jobId_userId_key" ON "JobApplication"("jobId","userId");
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Escrow  (jobId NOT unique — one job can have many escrow rows)
CREATE TABLE "Escrow" (
    "id"          TEXT            NOT NULL,
    "jobId"       TEXT            NOT NULL,
    "amount"      DOUBLE PRECISION NOT NULL,
    "status"      "EscrowStatus"  NOT NULL DEFAULT 'LOCKED',
    "paymentId"   TEXT,
    "orderId"     TEXT,
    "milestoneId" TEXT,
    "createdAt"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Escrow_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Escrow_jobId_idx" ON "Escrow"("jobId");
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Transaction
CREATE TABLE "Transaction" (
    "id"          TEXT                NOT NULL,
    "userId"      TEXT                NOT NULL,
    "amount"      DOUBLE PRECISION    NOT NULL,
    "type"        "TransactionType"   NOT NULL,
    "status"      "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "reference"   TEXT,
    "milestoneId" TEXT,
    "createdAt"   TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Dispute
CREATE TABLE "Dispute" (
    "id"         TEXT            NOT NULL,
    "jobId"      TEXT            NOT NULL,
    "raisedById" TEXT            NOT NULL,
    "reason"     TEXT            NOT NULL,
    "status"     "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "createdAt"  TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Dispute_jobId_key" ON "Dispute"("jobId");
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_raisedById_fkey"
    FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
