# TrustWork - Quick Start

## Prerequisites
- Node.js v18+
- PostgreSQL 14+

## Step 1 - Start PostgreSQL

macOS:    brew services start postgresql@16
Ubuntu:   sudo systemctl start postgresql
Windows:  net start postgresql-x64-16
Docker:   docker run -d --name trustwork-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=trustwork -p 5432:5432 postgres:16-alpine

## Step 2 - Edit backend/.env

Change DATABASE_URL to match your PostgreSQL:
  DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/trustwork"

No password?  DATABASE_URL="postgresql://postgres@localhost:5432/trustwork"

## Step 3 - Backend setup (Terminal 1)

cd backend
npm install
.\node_modules\.bin\prisma generate
.\node_modules\.bin\prisma migrate reset --force
node prisma/seed.js
node prisma/skillsSeed.js
npm run dev

Expected output:
  PostgreSQL connected via Prisma
  TrustWork API running on http://localhost:5000

## Step 4 - Frontend (Terminal 2)

cd frontend
npm install
npm run dev

Open: http://localhost:5173

## Demo Login (OTP is always 123456)

Role        Phone
Client      9876543210  (Arjun Sharma)
Client      9876543211  (Priya Mehta)
Freelancer  9876543212  (Rahul Dev)
Freelancer  9876543213  (Sneha Patil)
Admin       9876543214  (Admin User)

## Features included

Core platform:
  - OTP login for Client, Freelancer, Admin
  - Job lifecycle: Create, Assign, Fund, Submit, Approve, Complete
  - Escrow system (lock, release, refund)
  - Milestone-based escrow (fund per milestone)
  - Dispute system with admin resolution
  - Payment simulation (Razorpay mock)
  - Transaction history

Phase 1 enhancements:
  - Skill tags on jobs and profiles (50 skills, 9 categories)
  - Advanced search and filters (budget, category, type, sort)
  - Reviews and ratings (3-category scoring, profile breakdown)

## IMPORTANT - Use local Prisma, not npx

Always use:    .\node_modules\.bin\prisma migrate
Never use:     npx prisma migrate   (downloads Prisma 7 which breaks this project)
