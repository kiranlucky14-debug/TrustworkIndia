# TrustWork  Complete DB + Connection Setup Guide

Both frontend and backend are already running.
Follow these steps **in order** to wire up the PostgreSQL database.

---

## Prerequisites

| Tool | Check | Install |
|------|-------|---------|
| Node.js  18 | `node -v` | https://nodejs.org |
| npm  9 | `npm -v` | comes with Node |
| PostgreSQL  14 | `psql --version` | https://postgresql.org/download |

---

## Step 1  Start PostgreSQL

### macOS (Homebrew)
```bash
brew services start postgresql@16
# verify
pg_isready
#  localhost:5432 - accepting connections 
```

### Ubuntu / Debian
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql    # auto-start on boot
pg_isready
```

### Windows
Open **Services**  start **postgresql-x64-16** service,
or from pgAdmin, or from PowerShell:
```powershell
net start postgresql-x64-16
```

### Docker (no local install needed)
```bash
docker run -d \
  --name trustwork-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=trustwork \
  -p 5432:5432 \
  postgres:16-alpine

# verify
docker ps | grep trustwork-db
```

---

## Step 2  Create the database

```bash
# Option A  psql CLI
psql -U postgres -c "CREATE DATABASE trustwork;"

# Option B  createdb shortcut
createdb -U postgres trustwork

# Option C  if password is needed
psql -U postgres -W -c "CREATE DATABASE trustwork;"

# Verify
psql -U postgres -c "\l" | grep trustwork
```

---

## Step 3  Configure backend .env

File is at: `backend/.env`  
It has already been created for you with sane defaults.

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/trustwork"
JWT_SECRET="trustwork-super-secret-jwt-key-change-in-production-2024"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
RAZORPAY_KEY_ID="rzp_test_your_key_id"
RAZORPAY_KEY_SECRET="your_razorpay_secret"
RAZORPAY_WEBHOOK_SECRET="your_webhook_secret"
```

###  If your PostgreSQL user or password differs:

```
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/trustwork"
```

Common variations:
| Scenario | DATABASE_URL |
|----------|-------------|
| Default local install | `postgresql://postgres:postgres@localhost:5432/trustwork` |
| No password set | `postgresql://postgres@localhost:5432/trustwork` |
| Docker setup above | `postgresql://postgres:password@localhost:5432/trustwork` |
| Custom port | `postgresql://postgres:password@localhost:5433/trustwork` |

---

## Step 4  Configure frontend .env

File is at: `frontend/.env`  
Already created:

```
VITE_API_URL=http://localhost:5000
```

**Only change this** if your backend runs on a different port.

---

## Step 5  Run Prisma migrations

This creates all tables in the database.

```bash
cd backend

# Generate the Prisma client (must run after any schema change)
npx prisma generate

# Create tables (run once, or after schema changes)
npx prisma migrate dev --name init

# Expected output:
#  Database reset successful
#  Generated Prisma Client
#  The following migration(s) have been applied: 20xx_init
```

---

## Step 6  Seed demo data

Populates 5 users + 10 jobs + escrow records.

```bash
# Still inside backend/
node prisma/seed.js

# Expected output:
#  Seeding database...
#  Created users: Arjun Sharma, Priya Mehta, Rahul Dev, Sneha Patil, Admin User
#  Created jobs: React Dashboard...  (10 jobs)
#  Created escrows: 4
#  Seed complete!
```

---

## Step 7  Start the backend

```bash
cd backend
npm run dev

# Expected output:
#  PostgreSQL connected via Prisma
#  TrustWork API    http://localhost:5000
#  Health check     http://localhost:5000/health
#  Mode             development
#  Frontend CORS    http://localhost:5173
```

### Verify the connection:
```bash
curl http://localhost:5000/health
# Expected:
# {"status":"OK","database":"connected","time":"...","env":"development"}
```

---

## Step 8  Start the frontend

```bash
cd frontend
npm run dev

# Expected output:
#   VITE v5.x ready in Xms
#     Local:   http://localhost:5173/
#     Network: http://YOUR_IP:5173/
```

Open **http://localhost:5173** in your browser.

---

## Step 9  Log in and test

Use these demo credentials (OTP is always **123456** in dev mode):

| Role | Phone | Name |
|------|-------|------|
| Client | 9876543210 | Arjun Sharma |
| Client | 9876543211 | Priya Mehta |
| Freelancer | 9876543212 | Rahul Dev |
| Freelancer | 9876543213 | Sneha Patil |
| Admin | 9876543214 | Admin User |

---

## All-in-one setup (after DB is running)

```bash
# Terminal 1  Backend
cd trustwork/backend
npm install
npx prisma generate
npx prisma migrate dev --name init
node prisma/seed.js
npm run dev

# Terminal 2  Frontend
cd trustwork/frontend
npm install
npm run dev
```

---

## Troubleshooting

###  "Can't reach database server"
```bash
# Is postgres running?
pg_isready -h localhost -p 5432

# Does the database exist?
psql -U postgres -c "\l"

# Fix: create it
psql -U postgres -c "CREATE DATABASE trustwork;"
```

###  "FATAL: password authentication failed"
```bash
# Find your PostgreSQL auth config
sudo find / -name pg_hba.conf 2>/dev/null

# Temporarily allow password-less local connections:
# Edit pg_hba.conf, change "md5" to "trust" for local connections
# Then restart postgres and try without a password:
DATABASE_URL="postgresql://postgres@localhost:5432/trustwork"
```

###  "Table does not exist" / Prisma errors
```bash
cd backend
npx prisma migrate reset   # WARNING: wipes the DB
npx prisma migrate dev --name init
node prisma/seed.js
```

###  Frontend shows "Network Error" or blank dashboard
1. Confirm backend is running: `curl http://localhost:5000/health`
2. Check `frontend/.env` has correct `VITE_API_URL=http://localhost:5000`
3. Restart the Vite dev server after any `.env` change

###  CORS errors in browser console
Check `backend/.env`:
```
FRONTEND_URL="http://localhost:5173"
```
Must exactly match the URL in your browser bar (including protocol, no trailing slash).

###  "Cannot find module '@prisma/client'"
```bash
cd backend
npm install
npx prisma generate
```

###  Port already in use
```bash
# Find what's using port 5000
lsof -i :5000   # macOS/Linux
netstat -ano | findstr :5000   # Windows

# Kill it, or change PORT in backend/.env
PORT=5001
```

---

## Useful commands

```bash
# View database in browser UI
cd backend && npx prisma studio
# Opens http://localhost:5555  browse all tables visually

# Re-seed without full reset
node prisma/seed.js

# Full reset (wipes DB, re-migrates, re-seeds)
cd backend
npx prisma migrate reset
node prisma/seed.js

# Check migration status
npx prisma migrate status

# View generated SQL
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
```

---

## Architecture overview

```
Browser (localhost:5173)
    
      HTTP requests (Axios)
      Authorization: Bearer <JWT>
    
Vite Dev Server proxy /api/* Express API (localhost:5000)
                                        
                                          Prisma ORM
                                        
                                  PostgreSQL (localhost:5432)
                                  Database: trustwork
```

