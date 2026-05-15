const router = require('express').Router()
const { authenticate } = require('../middlewares/auth')
const {
  createOrder, verifyPayment, webhook,
  getTransactions, getConfig,
} = require('../controllers/paymentController')

router.post('/webhook', webhook)   // no auth - called by Razorpay
router.use(authenticate)
router.get('/config',              getConfig)
router.post('/create-order',       createOrder)
router.post('/verify',             verifyPayment)
router.get('/transactions',        getTransactions)

module.exports = router
