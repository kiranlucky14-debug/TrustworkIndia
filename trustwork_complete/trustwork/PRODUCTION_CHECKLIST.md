# TrustWork  Production Deployment Checklist

## Before First Deployment

###  Secrets & Security
- [ ] Generate strong JWT_SECRET (64+ chars): `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- [ ] Set real DATABASE_URL pointing to production PostgreSQL
- [ ] Add `.env` to `.gitignore`  VERIFY it's not in git history
- [ ] Change admin password from `Admin@123` to something strong
- [ ] Set `NODE_ENV=production` in deployment environment

###  Payments
- [ ] Get live Razorpay keys from dashboard.razorpay.com/app/keys
- [ ] Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` in `.env`
- [ ] In Admin  Settings: set Razorpay Mode = `live`, Enable Real Razorpay = ON
- [ ] Set Razorpay webhook URL: `https://yourdomain.com/payments/webhook`
- [ ] Test a real payment with 1 before launch

###  OTP / SMS
- [ ] Sign up for MSG91 / Twilio / Fast2SMS
- [ ] Set `OTP_PROVIDER` in `.env` and Admin  Settings
- [ ] Set API keys for chosen provider in `.env`
- [ ] In Admin  Settings: Test OTP button  verify SMS received

###  Email
- [ ] Set up Resend (resend.com) or SMTP
- [ ] Set `EMAIL_PROVIDER` in Admin  Settings
- [ ] Test email button in Admin  Settings
- [ ] Verify emails land in inbox (not spam)

###  Database
- [ ] Run all migrations in order:
  ```
  psql -U postgres -d trustwork -f migrations/20240709000000_.../migration.sql
  psql -U postgres -d trustwork -f migrations/20240710000000_.../migration.sql
  psql -U postgres -d trustwork -f migrations/fix_dependencies.sql
  psql -U postgres -d trustwork -f migrations/milestone_payout_versioning.sql
  psql -U postgres -d trustwork -f migrations/milestone_workflow_v2.sql
  psql -U postgres -d trustwork -f migrations/tier1_features.sql
  ```
- [ ] Run seeds: `node prisma/seedJobCategories.js`
- [ ] Set up automated daily backup (pg_dump to S3)
- [ ] Test restore from backup

###  Infrastructure
- [ ] Buy domain from GoDaddy / Namecheap / Google Domains
- [ ] Point DNS A record to your server IP
- [ ] Install SSL: `sudo certbot --nginx -d yourdomain.com`
- [ ] Update `FRONTEND_URL` in `.env` to `https://yourdomain.com`
- [ ] Update `VITE_API_URL` in frontend `.env` to `https://yourdomain.com/api`
- [ ] Copy `nginx.conf` to `/etc/nginx/sites-available/trustwork` and enable
- [ ] Install PM2: `npm install -g pm2`
- [ ] Start app: `pm2 start ecosystem.config.js --env production`
- [ ] Enable PM2 on boot: `pm2 startup && pm2 save`

###  Legal (Required by Razorpay & Indian law)
- [ ] Write Terms of Service page (`/terms`)
- [ ] Write Privacy Policy page (`/privacy`)
- [ ] Write Refund Policy page (`/refund`)
- [ ] Add GST number (if registered) to invoices
- [ ] Display your business name and address on site

## Post-Deployment

### Monitoring
- [ ] Sign up for UptimeRobot (free): monitor `https://yourdomain.com/health`
- [ ] Set up Slack/email alert on downtime
- [ ] Check Admin  System Health dashboard after first 24h

### Admin  Settings Checklist
Open `https://yourdomain.com/admin`  Settings tab and verify:
- [ ] OTP Provider  mock
- [ ] Email Provider  mock
- [ ] Payment Mode = live
- [ ] Enable Real Razorpay = ON
- [ ] Platform Fee Rate = 0.02 (or your rate)
- [ ] Maintenance Mode = OFF

## Git Setup

```bash
# Initialize repo
cd trustwork
git init
git add .
git commit -m "Initial TrustWork commit"

# Push to GitHub
git remote add origin git@github.com:your-org/trustwork.git
git push -u origin main

# NEVER commit .env  verify:
git status | grep .env  # should show nothing
```

## Quick Deploy Commands

```bash
# On your server (after git pull)
cd trustwork/backend
npm install
npx prisma generate
pm2 reload ecosystem.config.js --env production

# Build frontend
cd trustwork/frontend
npm install
npm run build
# Copy dist/ to /var/www/trustwork/frontend/dist/
```
