const router = require('express').Router()
const { authenticate } = require('../middlewares/auth')
const {
  editMilestoneCtrl, deleteMilestoneCtrl,
  fundMilestoneCtrl, submitMilestoneCtrl, approveMilestoneCtrl, refundMilestoneCtrl,
  getPayoutQueueCtrl, adminApprovePayoutCtrl, adminRejectPayoutCtrl,
} = require('../controllers/milestoneController')

router.use(authenticate)

// Milestone lifecycle
router.patch('/:id',         editMilestoneCtrl)    // client edits
router.delete('/:id',        deleteMilestoneCtrl)  // client deletes
router.post('/:id/fund',     fundMilestoneCtrl)    // client funds
router.post('/:id/submit',   submitMilestoneCtrl)  // freelancer submits
router.post('/:id/approve',  approveMilestoneCtrl) // client approves -> payout queue
router.post('/:id/refund',   refundMilestoneCtrl)  // admin/client refunds

// Payout queue (admin)
router.get('/payouts',              getPayoutQueueCtrl)
router.post('/payouts/:id/approve', adminApprovePayoutCtrl)
router.post('/payouts/:id/reject',  adminRejectPayoutCtrl)

module.exports = router
