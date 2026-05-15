// security.js  Production security middleware stack
// Import in app.js: const { applySecurityMiddleware } = require('./src/middlewares/security')

const helmet      = require('helmet')
const rateLimit   = require('express-rate-limit')
const compression = require('compression')
const morgan      = require('morgan')
const logger      = require('../config/logger')

//  Helmet  sets secure HTTP headers 
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'", 'checkout.razorpay.com'],
      styleSrc:    ["'self'", "'unsafe-inline'"],
      imgSrc:      ["'self'", 'data:', 'https:'],
      connectSrc:  ["'self'", 'https://api.razorpay.com'],
      frameSrc:    ['https://api.razorpay.com'],
    },
  },
  crossOriginEmbedderPolicy: false,
})

//  Rate limiter  general API 
const generalLimiter = rateLimit({
  windowMs:    15 * 60 * 1000,  // 15 min window
  max:         parseInt(process.env.RATE_LIMIT_MAX || '100'),
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => req.path === '/health',
})

//  OTP rate limiter  very strict 
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max:      5,
  message:  { error: 'Too many OTP requests. Try again in an hour.' },
  keyGenerator: (req) => req.body?.phone || req.ip,
})

//  Payment rate limiter 
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 min
  max:      10,
  message:  { error: 'Too many payment requests.' },
})

//  Morgan HTTP request logger 
const httpLogger = morgan(
  process.env.NODE_ENV === 'production' ? 'combined' : 'dev',
  {
    stream: { write: (msg) => logger.info(msg.trim(), { type: 'http' }) },
    skip:   (req) => req.path === '/health',
  }
)

//  Maintenance mode middleware 
const maintenanceMode = async (req, res, next) => {
  // Skip health checks and admin routes
  if (req.path === '/health' || req.path.startsWith('/admin') || req.path.startsWith('/auth/admin')) {
    return next()
  }
  try {
    const cfg = require('../config/systemConfig')
    const isDown = await cfg.isMaintenanceMode()
    if (isDown) {
      const msg = await cfg.get('MAINTENANCE_MESSAGE')
      return res.status(503).json({
        error:       'maintenance',
        message:     msg || 'TrustWork is under maintenance. Back soon!',
        retryAfter:  300,
      })
    }
  } catch {}
  next()
}

//  Input sanitiser  strip XSS from body strings 
const sanitiseInput = (req, res, next) => {
  try {
    const xss = require('xss')
    const clean = (obj) => {
      if (typeof obj === 'string') return xss(obj)
      if (Array.isArray(obj))     return obj.map(clean)
      if (obj && typeof obj === 'object') {
        const out = {}
        for (const [k, v] of Object.entries(obj)) out[k] = clean(v)
        return out
      }
      return obj
    }
    if (req.body)   req.body   = clean(req.body)
    if (req.query)  req.query  = clean(req.query)
    if (req.params) req.params = clean(req.params)
  } catch {}
  next()
}

//  Safe error handler  never leak stack traces to client 
const safeErrorHandler = (err, req, res, next) => {
  logger.error('Unhandled error', {
    message: err.message,
    stack:   err.stack,
    path:    req.path,
    method:  req.method,
    userId:  req.user?.id,
  })

  const status = err.status || err.statusCode || 500
  const isProd = process.env.NODE_ENV === 'production'

  res.status(status).json({
    error:   isProd && status === 500 ? 'Internal server error' : err.message,
    // Only include stack in development
    ...(isProd ? {} : { stack: err.stack }),
  })
}

//  Apply all to express app 
function applySecurityMiddleware(app) {
  app.use(helmetMiddleware)
  app.use(compression())
  app.use(httpLogger)
  app.use(generalLimiter)
  app.use(maintenanceMode)
  app.use(sanitiseInput)

  // Expose specific rate limiters for routes
  app.set('otpLimiter',     otpLimiter)
  app.set('paymentLimiter', paymentLimiter)

  return app
}

module.exports = {
  applySecurityMiddleware,
  helmetMiddleware, generalLimiter, otpLimiter, paymentLimiter,
  httpLogger, maintenanceMode, sanitiseInput, safeErrorHandler,
}
