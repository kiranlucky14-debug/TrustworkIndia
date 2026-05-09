# TrustWork — Quick Start (3 Terminals)

## Step 1 — PostgreSQL (run once)

```bash
# macOS
brew services start postgresql@16

# Ubuntu
sudo systemctl start postgresql

# Docker (no local install needed)
docker run -d --name trustwork-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=trustwork \
  -p 5432:5432 postgres:16-alpine
```

Create the database (skip if using Docker above):
```bash
psql -U postgres -c "CREATE DATABASE trustwork;"
```

---

## Step 2 — Backend (Terminal 1)

```bash
cd trustwork/backend
npm install
npx prisma generate
npx prisma migrate dev --name init
node prisma/seed.js
npm run dev
```

You should see:
```
✅ PostgreSQL connected via Prisma
🚀 TrustWork API  →  http://localhost:5000
```

---

## Step 3 — Frontend (Terminal 2)

```bash
cd trustwork/frontend
npm install
npm run dev
```

You should see:
```
➜  Local:   http://localhost:5173/
```

---

## Step 4 — Open Browser

Go to: **http://localhost:5173**

Login with (OTP is always **123456**):

| Role       | Phone      |
|------------|------------|
| Client     | 9876543210 |
| Freelancer | 9876543212 |
| Admin      | 9876543214 |

---

## Folder structure

```
trustwork/
├── START.md              ← you are here
├── SETUP.md              ← detailed setup guide
├── README.md             ← full documentation
├── backend/
│   ├── .env              ← edit DATABASE_URL if needed
│   ├── app.js
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   └── src/
│       ├── config/database.js
│       ├── controllers/
│       ├── middlewares/
│       └── routes/
└── frontend/
    ├── .env              ← VITE_API_URL=http://localhost:5000
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        ├── components/
        ├── context/
        ├── pages/
        ├── services/
        └── utils/
```

## If DATABASE_URL doesn't match your setup

Edit `backend/.env`:
```
# Default (most local installs)
DATABASE_URL="postgresql://postgres:password@localhost:5432/trustwork"

# No password set
DATABASE_URL="postgresql://postgres@localhost:5432/trustwork"

# Docker above
DATABASE_URL="postgresql://postgres:password@localhost:5432/trustwork"
```
