const router  = require('express').Router();
const { authenticate } = require('../middlewares/auth');
const { sendOTP, verifyOTP, register, getMe } = require('../controllers/authController');

router.post('/send-otp',   sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/register',   authenticate, register);  // protected - needs token
router.get('/me',          authenticate, getMe);

module.exports = router;
