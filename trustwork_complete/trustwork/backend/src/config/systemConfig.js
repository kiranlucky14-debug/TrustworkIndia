// systemConfig.js  Runtime platform configuration
// Settings are stored in DB (SystemConfig table) and cached in memory.
// Admin can update them via dashboard without restarting the server.

const { prisma } = require('./database')

// In-memory cache so every API call doesn't hit DB
let _cache = null
let _cacheAt = 0
const CACHE_TTL = 60 * 1000  // 1 minute

//  Defaults (used if DB entry doesn't exist) 
const DEFAULTS = {
  // Platform
  PLATFORM_NAME:         'TrustWork',
  PLATFORM_FEE_RATE:     '0.02',        // 2%
  MAINTENANCE_MODE:      'false',
  MAINTENANCE_MESSAGE:   'We are upgrading TrustWork. Back shortly!',

  // OTP
  OTP_PROVIDER:          'mock',         // mock | msg91 | twilio | fast2sms
  OTP_EXPIRY_MINUTES:    '10',
  OTP_RATE_LIMIT:        '5',            // max per phone per hour
  OTP_MOCK_CODE:         '123456',       // only used in mock mode

  // Email
  EMAIL_PROVIDER:        'mock',         // mock | smtp | sendgrid | resend
  EMAIL_FROM:            'noreply@trustwork.in',
  EMAIL_FROM_NAME:       'TrustWork',
  SMTP_HOST:             '',
  SMTP_PORT:             '587',
  SMTP_USER:             '',

  // Payment
  RAZORPAY_MODE:         'mock',         // mock | test | live
  MIN_MILESTONE_AMOUNT:  '500',          // Rs minimum
  MAX_MILESTONE_AMOUNT:  '500000',       // Rs maximum
  WITHDRAWAL_24H_PENALTY:'0.02',         // 2% of first milestone

  // Security
  JWT_EXPIRY:            '7d',
  MAX_LOGIN_ATTEMPTS:    '5',
  LOCKOUT_MINUTES:       '30',
  RATE_LIMIT_WINDOW_MIN: '15',
  RATE_LIMIT_MAX:        '100',

  // Features (feature flags)
  FEATURE_CHAT:          'true',
  FEATURE_MATCHING:      'true',
  FEATURE_DISPUTES:      'true',
  FEATURE_PUBLIC_PROFILE:'true',
  FEATURE_RAZORPAY:      'false',        // flip to true when keys are live

  // Notifications
  NOTIFY_PAYMENT_EMAIL:  'false',
  NOTIFY_DISPUTE_EMAIL:  'false',
  NOTIFY_SIGNUP_EMAIL:   'false',

  // Support
  SUPPORT_EMAIL:         'support@trustwork.in',
  SUPPORT_PHONE:         '',
}

//  Load all config from DB, merge with defaults 
async function loadConfig() {
  const now = Date.now()
  if (_cache && (now - _cacheAt) < CACHE_TTL) return _cache

  try {
    const rows = await prisma.systemConfig.findMany()
    const fromDB = Object.fromEntries(rows.map(r => [r.key, r.value]))
    _cache  = { ...DEFAULTS, ...fromDB }
    _cacheAt = now
    return _cache
  } catch {
    // Table may not exist yet  return defaults
    return { ...DEFAULTS }
  }
}

//  Get single value 
async function get(key) {
  const cfg = await loadConfig()
  return cfg[key] ?? DEFAULTS[key] ?? null
}

//  Get boolean 
async function getBool(key) {
  const v = await get(key)
  return v === 'true' || v === true || v === '1'
}

//  Get number 
async function getNum(key) {
  const v = await get(key)
  return Number(v) || 0
}

//  Set value (admin) 
async function set(key, value) {
  await prisma.systemConfig.upsert({
    where:  { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  })
  _cache = null  // invalidate cache
}

//  Set multiple values 
async function setMany(updates) {
  await Promise.all(Object.entries(updates).map(([k, v]) => set(k, v)))
}

//  Get all for admin panel 
async function getAll() {
  return loadConfig()
}

//  Invalidate cache (call after any update) 
function invalidate() { _cache = null }

//  Check maintenance mode 
async function isMaintenanceMode() {
  return getBool('MAINTENANCE_MODE')
}

module.exports = { get, getBool, getNum, set, setMany, getAll, invalidate, isMaintenanceMode, DEFAULTS }
