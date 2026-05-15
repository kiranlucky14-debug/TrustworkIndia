# TrustWork — Quick Start

## 1. Extract
Unzip into any folder. You'll get a `trustwork/` folder with `backend/` and `frontend/` inside.

## 2. Backend setup
```cmd
cd trustwork\backend
npm install
.\node_modules\.bin\prisma generate
```

## 3. Configure database
Edit `backend\.env`:
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/trustwork"
```

## 4. Run migrations (first time only)
```cmd
psql -U postgres -d trustwork -f backend\prisma\migrations\20240709000000_all_phases_combined\migration.sql
psql -U postgres -d trustwork -f backend\prisma\migrations\20240710000000_add_notifications\migration.sql
psql -U postgres -d trustwork -f backend\prisma\migrations\fix_dependencies.sql
psql -U postgres -d trustwork -f backend\prisma\migrations\milestone_workflow_v2.sql
psql -U postgres -d trustwork -f backend\prisma\migrations\tier1_features.sql
.\node_modules\.bin\prisma generate
```

## 5. Seed database
```cmd
node prisma/seed.js
node prisma/seedJobCategories.js
```

## 6. Start backend
```cmd
npm run dev
```

## 7. Start frontend (new terminal)
```cmd
cd trustwork\frontend
npm install
npm run dev
```

## Demo accounts
| Role       | Phone       | Password  |
|------------|-------------|-----------|
| Client     | 9876543210  | OTP: 123456 |
| Freelancer | 9876543212  | OTP: 123456 |
| Admin      | 9876543214  | Admin@123 |

Admin URL: http://localhost:5174/admin/login
