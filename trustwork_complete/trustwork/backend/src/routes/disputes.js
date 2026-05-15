const router = require('express').Router()
const { authenticate } = require('../middlewares/auth')
const {
  getDisputes, raiseDispute, submitEvidence,
  submitNote, resolveDispute,
} = require('../controllers/disputeController')

router.use(authenticate)
router.get('/',              getDisputes)
router.post('/',             raiseDispute)
router.post('/:id/evidence', submitEvidence)
router.post('/:id/note',     submitNote)
router.post('/:id/resolve',  resolveDispute)

module.exports = router
