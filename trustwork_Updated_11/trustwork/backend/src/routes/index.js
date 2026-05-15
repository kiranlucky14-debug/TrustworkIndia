const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
const { fundEscrow, releaseEscrow, refundEscrow, getEscrowStatus } = require('../controllers/escrowController');
const { createOrder, verifyPayment, handleWebhook, getTransactions } = require('../controllers/paymentController');
const { createDispute, getDisputes, resolveDispute } = require('../controllers/disputeController');
const { getProfile, updateProfile, rateUser } = require('../controllers/userController');

// Escrow
const escrowRouter = require('express').Router();
escrowRouter.use(authenticate);
escrowRouter.post('/fund', fundEscrow);
escrowRouter.post('/release', releaseEscrow);
escrowRouter.post('/refund', refundEscrow);
escrowRouter.get('/status/:jobId', getEscrowStatus);

// Payments
const paymentRouter = require('express').Router();
paymentRouter.post('/webhook', handleWebhook); // No auth - called by Razorpay
paymentRouter.use(authenticate);
paymentRouter.post('/create-order', createOrder);
paymentRouter.post('/verify', verifyPayment);
paymentRouter.get('/transactions', getTransactions);

// Disputes
const disputeRouter = require('express').Router();
disputeRouter.use(authenticate);
disputeRouter.get('/', getDisputes);
disputeRouter.post('/', createDispute);
disputeRouter.post('/:id/resolve', resolveDispute);

// Users
const userRouter = require('express').Router();
userRouter.use(authenticate);
userRouter.get('/me', getProfile);
userRouter.put('/me', updateProfile);
userRouter.get('/:id', getProfile);
userRouter.post('/:id/rate', rateUser);

module.exports = { escrowRouter, paymentRouter, disputeRouter, userRouter };
