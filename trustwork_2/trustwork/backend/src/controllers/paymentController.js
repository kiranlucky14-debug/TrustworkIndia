const crypto = require('crypto');
const { prisma } = require('../config/database');

// Lazily initialize Razorpay to avoid crash if keys not set
let razorpay = null;
const getRazorpay = () => {
  if (!razorpay) {
    const Razorpay = require('razorpay');
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
};

const createOrder = async (req, res) => {
  try {
    const { jobId } = req.body;
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.clientId !== req.user.id) return res.status(403).json({ error: 'Not your job' });

    const amountPaise = Math.round(job.budget * 100); // Razorpay uses paise

    // If no Razorpay keys, return a mock order (for demo)
    if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'rzp_test_your_key_id') {
      const mockOrder = {
        id: `order_mock_${Date.now()}`,
        amount: amountPaise,
        currency: 'INR',
        receipt: `receipt_${jobId.substring(0, 8)}`,
        status: 'created',
        mock: true,
      };
      return res.json({ order: mockOrder, key: 'DEMO_MODE' });
    }

    const order = await getRazorpay().orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `receipt_${jobId.substring(0, 8)}`,
      notes: { jobId, clientId: req.user.id },
    });

    res.json({ order, key: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, jobId } = req.body;

    // Skip verification in mock mode
    if (razorpay_order_id?.startsWith('order_mock_') || !process.env.RAZORPAY_KEY_SECRET) {
      return res.json({ verified: true, paymentId: razorpay_payment_id || `pay_mock_${Date.now()}` });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed' });
    }

    res.json({ verified: true, paymentId: razorpay_payment_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);

    if (process.env.RAZORPAY_WEBHOOK_SECRET) {
      const expectedSig = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(body)
        .digest('hex');
      if (expectedSig !== signature) return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const { event, payload } = req.body;
    console.log('📦 Razorpay Webhook:', event);

    if (event === 'payment.captured') {
      const paymentId = payload.payment.entity.id;
      const notes = payload.payment.entity.notes;
      if (notes?.jobId) {
        await prisma.transaction.updateMany({
          where: { reference: paymentId },
          data: { status: 'SUCCESS' },
        });
      }
    }

    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getTransactions = async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createOrder, verifyPayment, handleWebhook, getTransactions };
