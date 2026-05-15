// paymentController.js  Razorpay Integration
// Wraps Razorpay SDK with fallback to mock mode when keys aren't set.
// Mock mode: works identically but skips real money movement.

const Razorpay = require('razorpay')
const crypto   = require('crypto')
const { prisma } = require('../config/database')
const { N }      = require('../services/notificationService')

const PLATFORM_FEE_RATE = 0.02
const IS_MOCK = !process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID.includes('your_key')

let razorpay
if (!IS_MOCK) {
  razorpay = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  })
}

//  POST /payments/create-order 
// Client creates a Razorpay order to fund a milestone
const createOrder = async (req, res) => {
  try {
    const { milestoneId } = req.body

    const milestone = await prisma.milestone.findUnique({
      where:   { id: milestoneId },
      include: { job: true },
    })
    if (!milestone)                         return res.status(404).json({ error: 'Milestone not found' })
    if (milestone.job.clientId !== req.user.id) return res.status(403).json({ error: 'Not your job' })
    if (milestone.status !== 'UNLOCKED')    return res.status(400).json({ error: 'Milestone is not unlocked' })

    const amountPaisa = Math.round(milestone.amount * 100)  // Razorpay uses paise

    if (IS_MOCK) {
      // Mock mode  return fake order
      return res.json({
        orderId:     'order_mock_' + Date.now(),
        amount:      amountPaisa,
        currency:    'INR',
        milestoneId,
        jobTitle:    milestone.job.title,
        mock:        true,
        keyId:       'rzp_test_mock',
      })
    }

    const order = await razorpay.orders.create({
      amount:   amountPaisa,
      currency: 'INR',
      receipt:  'ms_' + milestoneId.slice(0, 20),
      notes:    { milestoneId, jobId: milestone.jobId, jobTitle: milestone.job.title },
    })

    res.json({
      orderId:     order.id,
      amount:      order.amount,
      currency:    order.currency,
      milestoneId,
      jobTitle:    milestone.job.title,
      mock:        false,
      keyId:       process.env.RAZORPAY_KEY_ID,
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

//  POST /payments/verify 
// Verify Razorpay payment signature then lock escrow
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, milestoneId } = req.body

    if (!IS_MOCK) {
      // Verify HMAC signature
      const body      = razorpay_order_id + '|' + razorpay_payment_id
      const expected  = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex')
      if (expected !== razorpay_signature)
        return res.status(400).json({ error: 'Payment signature verification failed' })
    }

    // Fund the milestone via milestoneService
    const { fundMilestone } = require('../services/milestoneService')
    const result = await fundMilestone(milestoneId, req.user.id, razorpay_payment_id || 'pay_mock_' + Date.now())

    // Store Razorpay IDs on escrow
    if (result.escrow && !IS_MOCK) {
      await prisma.escrow.update({
        where: { id: result.escrow.id },
        data:  {
          razorpayOrderId:   razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          paymentMode:       'RAZORPAY',
        },
      })
    }

    res.json({ success: true, ...result })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

//  POST /payments/webhook 
// Razorpay webhook  called by Razorpay servers on payment events
const webhook = async (req, res) => {
  try {
    const sig  = req.headers['x-razorpay-signature']
    const body = JSON.stringify(req.body)

    if (process.env.RAZORPAY_WEBHOOK_SECRET && !IS_MOCK) {
      const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(body).digest('hex')
      if (expected !== sig) return res.status(400).json({ error: 'Invalid webhook signature' })
    }

    const event   = req.body.event
    const payload = req.body.payload

    if (event === 'payment.captured') {
      const paymentId = payload.payment?.entity?.id
      const orderId   = payload.payment?.entity?.order_id
      const notes     = payload.payment?.entity?.notes || {}
      const milestoneId = notes.milestoneId

      if (milestoneId) {
        // Update escrow payment mode
        await prisma.escrow.updateMany({
          where: { milestoneId },
          data:  { razorpayPaymentId: paymentId, razorpayOrderId: orderId, paymentMode: 'RAZORPAY' },
        })
      }
    }

    if (event === 'refund.created') {
      // Log refund event
      console.log('[Webhook] Refund created:', payload.refund?.entity?.id)
    }

    res.json({ status: 'ok' })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

//  GET /payments/transactions 
const getTransactions = async (req, res) => {
  try {
    const txns = await prisma.transaction.findMany({
      where:   { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take:    100,
    })
    res.json(txns)
  } catch (err) { res.status(500).json({ error: err.message }) }
}

//  GET /payments/config 
// Returns Razorpay key + mock status for frontend
const getConfig = async (req, res) => {
  res.json({
    keyId: IS_MOCK ? 'rzp_test_mock' : process.env.RAZORPAY_KEY_ID,
    mock:  IS_MOCK,
    currency: 'INR',
  })
}

module.exports = { createOrder, verifyPayment, webhook, getTransactions, getConfig }
