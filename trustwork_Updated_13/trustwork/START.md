# TrustWork - Complete Setup Guide

## Prerequisites
- Node.js v18+
- PostgreSQL 14+

## Step 1 - Configure database

Edit backend/.env:
  DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/trustwork"

## Step 2 - Create the database (if it doesn't exist)

psql -U postgres -c "CREATE DATABASE trustwork;"

## Step 3 - Apply ALL migrations (single command)

psql -U postgres -d trustwork -f backend/prisma/migrations/20240709000000_all_phases_combined/migration.sql

This single file applies Phase 1 + 2 + 3 and all earlier migrations.
All statements are IF NOT EXISTS safe - will not fail if run multiple times.

## Step 4 - Backend

cd backend
npm install
.\node_modules\.bin\prisma generate
node prisma/seed.js
node prisma/skillsSeed.js
npm run dev

Expected: TrustWork API running on http://localhost:5000

## Step 5 - Frontend

cd frontend
npm install
npm run dev

Open: http://localhost:5173 (or 5174 if 5173 is in use)

## Demo credentials (OTP: 123456 | Admin password: Admin@123)

Role        Phone          Name
CLIENT      9876543210     Arjun Sharma
CLIENT      9876543211     Priya Mehta
FREELANCER  9876543212     Rahul Dev
FREELANCER  9876543213     Sneha Patil
ADMIN       9876543214     Admin User

## Features included

Core platform:
  Job lifecycle, escrow, milestones, disputes, transactions, reviews

Phase 1 enhancements:
  Skill tags, advanced search, reviews and ratings

Auth flow:
  OTP + email/password login, signup wizard, admin panel, forgot password

Work Agreement System (Phases 1-3):
  Phase 1 - Work Agreement gate before escrow funding
    - Client fills: scope, deliverables, milestones, revision policy
    - Freelancer reviews and signs: escrow terms + checklist
    - Fund Escrow button locked until both parties sign

  Phase 2 - Re-confirmation at submission and release
    - Freelancer: delivery checklist + Section C re-confirm before submit
    - Client: approval checklist + Section C re-confirm before payment release

  Phase 3 - Agreement Certificate (PDF)
    - Professional HTML certificate generated server-side
    - Contains all 4 sections + both checklists + signatures
    - Opens in browser with one-click Save as PDF

## IMPORTANT

Always use: .\node_modules\.bin\prisma (not npx prisma)
Prisma is pinned to 5.10.0 - npx would download incompatible v7
