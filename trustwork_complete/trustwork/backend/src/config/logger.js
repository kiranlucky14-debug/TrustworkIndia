// logger.js  Structured logging with Winston
// In production: JSON logs to file + console
// In development: coloured console only

const winston = require('winston')
const path    = require('path')

const { combine, timestamp, json, colorize, printf, errors } = winston.format
const isProd = process.env.NODE_ENV === 'production'

const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''
  return `${timestamp} [${level}] ${stack || message}${metaStr}`
})

const transports = [
  new winston.transports.Console({
    format: isProd
      ? combine(timestamp(), json())
      : combine(colorize(), timestamp({ format:'HH:mm:ss' }), errors({ stack:true }), devFormat),
  }),
]

if (isProd) {
  const logDir = process.env.LOG_DIR || 'logs'
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level:    'error',
      format:   combine(timestamp(), errors({ stack:true }), json()),
      maxsize:  10 * 1024 * 1024,  // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format:   combine(timestamp(), json()),
      maxsize:  50 * 1024 * 1024,
      maxFiles: 10,
    })
  )
}

const logger = winston.createLogger({
  level:       process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  transports,
  exceptionHandlers: isProd ? [
    new winston.transports.File({ filename: path.join(process.env.LOG_DIR||'logs','exceptions.log') }),
  ] : [],
  rejectionHandlers: isProd ? [
    new winston.transports.File({ filename: path.join(process.env.LOG_DIR||'logs','rejections.log') }),
  ] : [],
})

module.exports = logger
