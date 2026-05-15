const router = require('express').Router()
const { authenticate } = require('../middlewares/auth')
const {
  getAgreement, createAgreement, saveDraft,
  clientSign, freelancerSign, requestChanges,
  submitConfirm, releaseConfirm, getPhase2Status, generatePdf, getVersionHistory,
  milestoneAmendment, amendmentAccept, amendmentReject, listAgreements,
} = require('../controllers/agreementController')

router.use(authenticate)

router.get('/:jobId',                   getAgreement)     // GET  /agreements/:jobId
router.post('/:jobId',                  createAgreement)  // POST /agreements/:jobId
router.patch('/:jobId/draft',           saveDraft)        // PATCH /agreements/:jobId/draft
router.post('/:jobId/client-sign',      clientSign)       // POST /agreements/:jobId/client-sign
router.post('/:jobId/freelancer-sign',  freelancerSign)   // POST /agreements/:jobId/freelancer-sign
router.post('/:jobId/request-changes',  requestChanges)   // POST /agreements/:jobId/request-changes

router.post('/:jobId/submit-confirm',   submitConfirm)    // POST /agreements/:jobId/submit-confirm
router.post('/:jobId/release-confirm',  releaseConfirm)   // POST /agreements/:jobId/release-confirm
router.get('/:jobId/phase2-status',     getPhase2Status)  // GET  /agreements/:jobId/phase2-status

router.get('/:jobId/pdf',      generatePdf)      // GET /agreements/:jobId/pdf
router.get('/:jobId/versions', getVersionHistory)  // GET /agreements/:jobId/versions

// Amendment flow (lightweight - no full re-sign)
router.post('/:jobId/milestone-amendment',  milestoneAmendment)  // client amends milestones
router.post('/:jobId/amendment-accept',     amendmentAccept)     // freelancer accepts
router.post('/:jobId/amendment-reject',     amendmentReject)     // freelancer rejects

// Agreement Center
router.get('/',  listAgreements)  // GET /agreements - list all for current user

module.exports = router
