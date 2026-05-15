const router = require('express').Router()
const { authenticate } = require('../middlewares/auth')
const {
  editMilestoneCtrl, deleteMilestoneCtrl,
  fundMilestoneCtrl, startWorkCtrl, submitMilestoneCtrl,
  clientApproveCtrl, clientRejectCtrl, requestReworkCtrl, refundMilestoneCtrl,
  adminUnlockCtrl, adminLockCtrl,
  getPayoutQueueCtrl, adminReleasePayoutCtrl, adminRejectPayoutCtrl,
} = require('../controllers/milestoneController')

router.use(authenticate)

// Milestone lifecycle
router.patch('/:id',          editMilestoneCtrl)    // client: edit LOCKED/UNLOCKED
router.delete('/:id',         deleteMilestoneCtrl)  // client: delete LOCKED/UNLOCKED
router.post('/:id/fund',      fundMilestoneCtrl)    // client: fund
router.post('/:id/start',     startWorkCtrl)        // freelancer: start work
router.post('/:id/submit',    submitMilestoneCtrl)  // freelancer: submit work
router.post('/:id/approve',   clientApproveCtrl)    // client: approve -> PAYMENT_UNDER_REVIEW
router.post('/:id/reject',    clientRejectCtrl)     // client: reject -> REJECTED
router.post('/:id/rework',    requestReworkCtrl)    // client: request rework -> REWORK_REQUESTED
router.post('/:id/refund',    refundMilestoneCtrl)  // admin/client: refund escrow

// Admin lock/unlock
router.post('/:id/unlock',    adminUnlockCtrl)      // admin: unlock any milestone
router.post('/:id/lock',      adminLockCtrl)        // admin: lock any milestone

// Payout queue (admin)
router.get('/payouts',                getPayoutQueueCtrl)
router.post('/payouts/:id/release',   adminReleasePayoutCtrl)
router.post('/payouts/:id/reject',    adminRejectPayoutCtrl)

module.exports = router
