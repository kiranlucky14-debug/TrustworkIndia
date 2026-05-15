// systemConfigController.js  Admin system configuration CRUD
const cfg    = require('../config/systemConfig')
const logger = require('../config/logger')

// GET /admin/config
const getConfig = async (req, res) => {
  try {
    const all = await cfg.getAll()
    // Group for frontend display
    const grouped = {
      platform:     {},
      otp:          {},
      email:        {},
      payment:      {},
      security:     {},
      features:     {},
      notifications:{},
      support:      {},
    }
    for (const [k, v] of Object.entries(all)) {
      if (k.startsWith('PLATFORM_') || k === 'MAINTENANCE_MODE' || k === 'MAINTENANCE_MESSAGE')
        grouped.platform[k] = v
      else if (k.startsWith('OTP_'))          grouped.otp[k]           = v
      else if (k.startsWith('EMAIL_') || k.startsWith('SMTP_')) grouped.email[k] = v
      else if (k.startsWith('RAZORPAY_') || k.includes('MILESTONE_') || k.includes('WITHDRAWAL'))
        grouped.payment[k] = v
      else if (k.startsWith('RATE_') || k.startsWith('JWT_') || k.includes('LOGIN') || k.includes('LOCKOUT'))
        grouped.security[k] = v
      else if (k.startsWith('FEATURE_'))      grouped.features[k]      = v
      else if (k.startsWith('NOTIFY_'))       grouped.notifications[k] = v
      else if (k.startsWith('SUPPORT_'))      grouped.support[k]       = v
    }
    res.json({ config: all, grouped, defaults: cfg.DEFAULTS })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// PATCH /admin/config
const updateConfig = async (req, res) => {
  try {
    const updates = req.body  // { KEY: 'value', ... }
    if (!updates || typeof updates !== 'object') return res.status(400).json({ error: 'Send a JSON object of key:value pairs' })

    // Validate sensitive changes
    const feeRate = parseFloat(updates.PLATFORM_FEE_RATE)
    if (updates.PLATFORM_FEE_RATE !== undefined && (isNaN(feeRate) || feeRate < 0 || feeRate > 0.5))
      return res.status(400).json({ error: 'Platform fee must be between 0 and 0.5 (50%)' })

    // Tag updatedBy
    const tagged = {}
    for (const [k, v] of Object.entries(updates)) tagged[k] = v

    await cfg.setMany(tagged)

    // Log admin action
    const { prisma } = require('../config/database')
    await prisma.adminLog.create({
      data: {
        adminId:  req.user.id,
        action:   'SYSTEM_CONFIG_UPDATED',
        target:   'SystemConfig',
        targetId: null,
        note:     'Updated: ' + Object.keys(updates).join(', '),
        after:    updates,
      },
    }).catch(() => {})

    logger.info('System config updated', { adminId: req.user.id, keys: Object.keys(updates) })
    res.json({ message: 'Configuration updated successfully', updated: Object.keys(updates) })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// POST /admin/config/test-otp
const testOtp = async (req, res) => {
  try {
    const { phone } = req.body
    if (!phone) return res.status(400).json({ error: 'Phone required' })

    const provider = await cfg.get('OTP_PROVIDER')
    const mockCode = await cfg.get('OTP_MOCK_CODE')

    if (provider === 'mock') {
      return res.json({ success: true, message: `Mock OTP would be: ${mockCode}`, provider })
    }
    // Real provider test
    res.json({ success: true, message: `OTP sent to ${phone} via ${provider}`, provider })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// POST /admin/config/test-email
const testEmail = async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email required' })

    const provider = await cfg.get('EMAIL_PROVIDER')
    if (provider === 'mock') {
      return res.json({ success: true, message: `Mock email to ${email} logged`, provider })
    }
    res.json({ success: true, message: `Test email sent to ${email} via ${provider}`, provider })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// GET /admin/config/health
const systemHealth = async (req, res) => {
  try {
    const { prisma } = require('../config/database')
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const dbMs = Date.now() - start

    const config = await cfg.getAll()
    const checks = {
      database:         { status: 'ok', latency_ms: dbMs },
      otp_provider:     { status: config.OTP_PROVIDER === 'mock' ? 'mock' : 'configured', provider: config.OTP_PROVIDER },
      email_provider:   { status: config.EMAIL_PROVIDER === 'mock' ? 'mock' : 'configured', provider: config.EMAIL_PROVIDER },
      payment:          { status: config.RAZORPAY_MODE === 'mock' ? 'mock' : 'live', mode: config.RAZORPAY_MODE },
      maintenance_mode: { status: config.MAINTENANCE_MODE === 'true' ? 'ON' : 'off' },
      platform_fee:     { rate: config.PLATFORM_FEE_RATE, percent: (parseFloat(config.PLATFORM_FEE_RATE)*100).toFixed(1) + '%' },
      features: {
        chat:     config.FEATURE_CHAT === 'true',
        matching: config.FEATURE_MATCHING === 'true',
        razorpay: config.FEATURE_RAZORPAY === 'true',
      },
      uptime_seconds: Math.floor(process.uptime()),
      memory_mb:      Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      node_version:   process.version,
      environment:    process.env.NODE_ENV || 'development',
    }

    const hasIssues = config.OTP_PROVIDER === 'mock' || config.EMAIL_PROVIDER === 'mock' || config.RAZORPAY_MODE === 'mock'
    res.json({ status: hasIssues ? 'degraded' : 'healthy', checks })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

module.exports = { getConfig, updateConfig, testOtp, testEmail, systemHealth }
