const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
const {
  sendOTP, verifyOTP,
  loginWithPassword, signup,
  forgotPassword, resetPassword,
  adminLogin, adminLoginAs,
  getMe, register,
} = require('../controllers/authController');

// OTP flow
router.post('/send-otp',      sendOTP);
router.post('/verify-otp',    verifyOTP);

// Email + password
router.post('/login',         loginWithPassword);
router.post('/signup',        signup);

// Password reset
router.post('/forgot-password', forgotPassword);
router.post('/reset-password',  resetPassword);

// Admin
router.post('/admin/login',    adminLogin);
router.post('/admin/login-as', authenticate, adminLoginAs);

// Protected
router.post('/register', authenticate, register);
router.get('/me',        authenticate, getMe);

module.exports = router;
