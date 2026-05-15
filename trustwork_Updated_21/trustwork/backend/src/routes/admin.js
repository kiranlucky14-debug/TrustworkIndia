const router  = require('express').Router()
const { authenticate } = require('../middlewares/auth')
const {
  getStats,
  getUsers, suspendUser, unsuspendUser,
  getJobs,
  getEscrows, getMilestoneEscrows, getPayoutPending, adminReleaseEscrow, adminRefundEscrow, adminSplitEscrow,
  getDisputes,
  getTransactions,
  getLogs,
} = require('../controllers/adminController')

// All admin routes require authentication + ADMIN role
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

router.use(authenticate, requireAdmin)

// Platform stats (polled every 30s by dashboard)
router.get('/stats',                          getStats)

// Users
router.get('/users',                          getUsers)
router.post('/users/:id/suspend',             suspendUser)
router.post('/users/:id/unsuspend',           unsuspendUser)

// Jobs
router.get('/jobs',                           getJobs)

// Escrow management
router.get('/milestone-escrows',              getMilestoneEscrows)
router.get('/payout-pending',                  getPayoutPending)
router.get('/escrows',                        getEscrows)
router.post('/escrows/:escrowId/release',     adminReleaseEscrow)
router.post('/escrows/:escrowId/refund',      adminRefundEscrow)
router.post('/escrows/:escrowId/split',       adminSplitEscrow)

// Disputes
router.get('/disputes',                       getDisputes)

// Transactions
router.get('/transactions',                   getTransactions)

// Audit log
router.get('/logs',                           getLogs)

module.exports = router
