const { authenticate } = require('../middlewares/auth')

const { fundEscrow, releaseEscrow, refundEscrow, getEscrowStatus } = require('../controllers/escrowController')
const { getProfile, updateProfile, rateUser } = require('../controllers/userController')

// ── Escrow router (legacy bulk escrow - still used by EscrowPage) ─────────────
const escrowRouter = require('express').Router()
escrowRouter.use(authenticate)
escrowRouter.post('/fund',         fundEscrow)
escrowRouter.post('/release',      releaseEscrow)
escrowRouter.post('/refund',       refundEscrow)
escrowRouter.get('/status/:jobId', getEscrowStatus)

// ── Payment router (now thin - full impl in src/routes/payments.js) ───────────
// Kept for backward compat; app.js now also mounts /src/routes/payments.js
const paymentRouter = require('express').Router()
paymentRouter.use((req, res) => res.status(410).json({ error: 'Use /payments endpoint' }))

// ── Dispute router (thin - full impl in src/routes/disputes.js) ───────────────
const disputeRouter = require('express').Router()
disputeRouter.use((req, res) => res.status(410).json({ error: 'Use /disputes endpoint' }))

// ── Users router ──────────────────────────────────────────────────────────────
const userRouter = require('express').Router()
userRouter.use(authenticate)
userRouter.get('/me',        getProfile)
userRouter.put('/me',        updateProfile)
userRouter.get('/:id',       getProfile)
userRouter.post('/:id/rate', rateUser)

module.exports = { escrowRouter, paymentRouter, disputeRouter, userRouter }
