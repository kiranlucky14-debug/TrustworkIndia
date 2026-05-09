const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');

// In production, use a real SMS provider (Twilio, MSG91, etc.)
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    // In dev/demo mode, OTP is always 123456
    const otp = process.env.NODE_ENV === 'production' ? generateOTP() : '123456';
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Invalidate old OTPs for this phone
    await prisma.oTP.updateMany({
      where: { phone, used: false },
      data: { used: true },
    });

    await prisma.oTP.create({ data: { phone, code: otp, expiresAt } });

    // In production: send SMS here
    console.log(`📱 OTP for ${phone}: ${otp}`);

    res.json({
      message: 'OTP sent successfully',
      ...(process.env.NODE_ENV !== 'production' && { otp }), // expose in dev
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { phone, otp, name, role } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });

    const otpRecord = await prisma.oTP.findFirst({
      where: { phone, code: otp, used: false, expiresAt: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) return res.status(400).json({ error: 'Invalid or expired OTP' });

    // Mark OTP as used
    await prisma.oTP.update({ where: { id: otpRecord.id }, data: { used: true } });

    // Find or create user
    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      if (!name) return res.status(400).json({ error: 'Name required for new users' });
      user = await prisma.user.create({
        data: {
          phone,
          name,
          role: role || 'CLIENT',
        },
      });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { sendOTP, verifyOTP };
