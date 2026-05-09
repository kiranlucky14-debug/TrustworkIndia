# TrustWork — Freelancer Escrow Platform 🔒

India's trusted freelance escrow platform. Clients post jobs, freelancers accept them, money is locked in escrow, and released only after work is approved.

---

## 🗂️ Project Structure

```
trustwork/
├── backend/               # Node.js + Express + Prisma
│   ├── app.js
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   └── src/
│       ├── controllers/   # authController, jobController, escrowController…
│       ├── routes/        # auth.js, jobs.js, index.js
│       ├── middlewares/   # auth.js, errorHandler.js
│       └── config/        # database.js (Prisma client)
│
└── frontend/              # React + Vite + Tailwind CSS
    └── src/
        ├── pages/         # Login, Dashboard, JobList, JobDetail, PostJob…
        ├── components/    # Layout, JobCard, UI primitives
        ├── context/       # AuthContext
        ├── services/      # api.js (Axios)
        └── utils/         # helpers.js (formatting, constants)
```

---

## ⚙️ Prerequisites

- **Node.js** v18+ 
- **PostgreSQL** v14+ (running locally or Docker)
- **npm** or **yarn**

---

## 🚀 Quick Setup

### 1. Clone and enter the project

```bash
git clone <your-repo>
cd trustwork
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

**Create your `.env` file:**

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/trustwork"
JWT_SECRET="change-this-to-a-long-random-string"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"

# Razorpay (optional — platform works in demo mode without these)
RAZORPAY_KEY_ID="rzp_test_xxxxxxxx"
RAZORPAY_KEY_SECRET="xxxxxxxxxxxxxxxx"
RAZORPAY_WEBHOOK_SECRET="xxxxxxxxxxxxxxxx"
```

**Create the database:**

```bash
# If using psql
createdb trustwork

# Or via psql prompt
psql -U postgres -c "CREATE DATABASE trustwork;"
```

**Run migrations and seed:**

```bash
npm run setup
# This runs: prisma generate + prisma migrate dev + seed
```

Or step by step:

```bash
npx prisma generate
npx prisma migrate dev --name init
node prisma/seed.js
```

**Start the backend:**

```bash
npm run dev        # development (nodemon)
npm start          # production
```

Backend runs at: **http://localhost:5000**  
Health check: **http://localhost:5000/health**

---

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

**Create your `.env` file:**

```bash
cp .env.example .env
```

`.env` contents:
```env
VITE_API_URL=http://localhost:5000
```

**Start the frontend:**

```bash
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## 🧪 Demo Accounts

After seeding, these accounts are ready (OTP is always **123456** in dev mode):

| Phone        | Name         | Role       |
|--------------|--------------|------------|
| 9876543210   | Arjun Sharma | CLIENT     |
| 9876543211   | Priya Mehta  | CLIENT     |
| 9876543212   | Rahul Dev    | FREELANCER |
| 9876543213   | Sneha Patil  | FREELANCER |
| 9876543214   | Admin User   | ADMIN      |

---

## 🔄 Core Workflow

### Full escrow lifecycle:

```
1. CLIENT posts a job           → status: CREATED
2. FREELANCER applies           → JobApplication created
3. CLIENT assigns freelancer    → status: ASSIGNED
4. CLIENT funds escrow          → status: FUNDED, Escrow: LOCKED
5. FREELANCER submits work      → status: SUBMITTED
6. CLIENT approves              → status: COMPLETED, Escrow: RELEASED
   OR
   CLIENT rejects               → status: DISPUTED, Dispute: OPEN
7. ADMIN resolves dispute       → Escrow: RELEASED or REFUNDED
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint             | Description           |
|--------|---------------------|-----------------------|
| POST   | /auth/send-otp      | Send OTP to phone     |
| POST   | /auth/verify-otp    | Verify OTP, get token |

**verify-otp body (new user):**
```json
{ "phone": "9876543210", "otp": "123456", "name": "Your Name", "role": "CLIENT" }
```

### Jobs
| Method | Endpoint               | Auth | Description             |
|--------|------------------------|------|-------------------------|
| GET    | /jobs                  | ✅   | List jobs (with filters)|
| POST   | /jobs                  | ✅   | Create job (CLIENT)     |
| GET    | /jobs/:id              | ✅   | Get job details         |
| POST   | /jobs/:id/apply        | ✅   | Apply (FREELANCER)      |
| POST   | /jobs/:id/assign       | ✅   | Assign freelancer       |
| POST   | /jobs/:id/submit       | ✅   | Submit work             |
| POST   | /jobs/:id/approve      | ✅   | Approve & release pay   |
| POST   | /jobs/:id/reject       | ✅   | Reject & open dispute   |

**GET /jobs query params:** `?status=CREATED&search=react&page=1&limit=10`

### Escrow
| Method | Endpoint               | Description            |
|--------|------------------------|------------------------|
| POST   | /escrow/fund           | Lock funds in escrow   |
| POST   | /escrow/release        | Release to freelancer  |
| POST   | /escrow/refund         | Refund to client       |
| GET    | /escrow/status/:jobId  | Get escrow status      |

### Payments
| Method | Endpoint                    | Description              |
|--------|-----------------------------|--------------------------|
| POST   | /payments/create-order      | Create Razorpay order    |
| POST   | /payments/verify            | Verify payment signature |
| POST   | /payments/webhook           | Razorpay webhook handler |
| GET    | /payments/transactions      | User transaction history |

### Disputes
| Method | Endpoint               | Description              |
|--------|------------------------|--------------------------|
| GET    | /disputes              | List disputes            |
| POST   | /disputes              | Raise dispute            |
| POST   | /disputes/:id/resolve  | Resolve dispute (ADMIN)  |

### Users
| Method | Endpoint        | Description        |
|--------|-----------------|--------------------|
| GET    | /users/me       | Get own profile    |
| PUT    | /users/me       | Update profile     |
| GET    | /users/:id      | Get user profile   |
| POST   | /users/:id/rate | Rate a user (1-5)  |

---

## 💳 Razorpay Integration

The platform works in **demo mode** without Razorpay keys — payments are simulated.

To enable real payments:

1. Sign up at [razorpay.com](https://razorpay.com)
2. Get your test API keys from the dashboard
3. Add them to `backend/.env`
4. Set up webhook: Dashboard → Webhooks → `http://yourserver.com/payments/webhook`
5. Select events: `payment.captured`, `payment.failed`

---

## 🐳 Docker (Optional)

Start PostgreSQL with Docker:

```bash
docker run --name trustwork-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=trustwork \
  -p 5432:5432 \
  -d postgres:16
```

Then use:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/trustwork"
```

---

## 🔐 Security Notes

- JWT tokens expire in 7 days (configurable via `JWT_EXPIRES_IN`)
- OTPs expire in 10 minutes
- In production: replace `NODE_ENV=production` to hide OTP from API response
- Add rate limiting (e.g. `express-rate-limit`) before going live
- Use HTTPS in production

---

## 🛠 Prisma Commands

```bash
npx prisma studio          # Visual DB browser at localhost:5555
npx prisma migrate dev     # Run new migrations
npx prisma migrate reset   # Reset DB (WARNING: deletes all data)
npx prisma generate        # Regenerate client after schema changes
node prisma/seed.js        # Re-seed the database
```

---

## 📦 Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18, Vite, Tailwind CSS        |
| Routing    | React Router v6                     |
| HTTP       | Axios                               |
| Toasts     | react-hot-toast                     |
| Backend    | Node.js, Express                    |
| ORM        | Prisma                              |
| Database   | PostgreSQL                          |
| Auth       | JWT + OTP (SMS-ready)               |
| Payments   | Razorpay (India) + UPI simulation   |

---

## 🎯 Features Checklist

- [x] OTP-based mobile login (mock SMS, real in prod)
- [x] JWT authentication with role-based access
- [x] CLIENT: Post jobs, assign freelancers, fund escrow, approve/reject
- [x] FREELANCER: Browse jobs, apply, submit work
- [x] ADMIN: Resolve disputes
- [x] Full escrow lifecycle (LOCKED → RELEASED / REFUNDED)
- [x] Razorpay order creation + signature verification
- [x] Simulated UPI payment flow
- [x] Dispute system with admin resolution
- [x] Transaction history
- [x] Job search + filter + pagination
- [x] Job progress timeline
- [x] Rating system
- [x] Responsive dark UI

---

## 🐛 Troubleshooting

**"Cannot connect to database"**  
→ Check PostgreSQL is running: `pg_isready`  
→ Verify `DATABASE_URL` in `.env`

**"Prisma client not generated"**  
→ Run `npx prisma generate`

**CORS errors in browser**  
→ Make sure `FRONTEND_URL` in backend `.env` matches your frontend URL exactly

**OTP not working**  
→ In dev mode OTP is always `123456`; check server console for the OTP value

**"relation does not exist" error**  
→ Run migrations: `npx prisma migrate dev`
