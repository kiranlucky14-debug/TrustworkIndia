const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const { validateClientRegistration, validateFreelancerRegistration } = require('../validators/registerValidator');

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// POST /auth/send-otp
const sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    const otp = process.env.NODE_ENV === 'production' ? generateOTP() : '123456';
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.oTP.updateMany({ where: { phone, used: false }, data: { used: true } });
    await prisma.oTP.create({ data: { phone, code: otp, expiresAt } });

    console.log('OTP for ' + phone + ': ' + otp);
    res.json({
      message: 'OTP sent successfully',
      ...(process.env.NODE_ENV !== 'production' && { otp }),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /auth/verify-otp
// Returns: { isNewUser, token, user }
const verifyOTP = async (req, res) => {
  try {
    const { phone, otp, role } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });

    const otpRecord = await prisma.oTP.findFirst({
      where: { phone, code: otp, used: false, expiresAt: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otpRecord) return res.status(400).json({ error: 'Invalid or expired OTP' });

    await prisma.oTP.update({ where: { id: otpRecord.id }, data: { used: true } });

    let user = await prisma.user.findUnique({ where: { phone } });
    const isNewUser = !user;

    if (!user) {
      // Create minimal user record - profile completed in /register
      user = await prisma.user.create({
        data: {
          phone,
          name:             'New User',
          role:             role || 'CLIENT',
          profileCompleted: false,
        },
      });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({ token, user, isNewUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /auth/register  -- complete profile after OTP
const register = async (req, res) => {
  try {
    const userId = req.user.id;
    const user   = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Validate based on role
    const validator = user.role === 'CLIENT'
      ? validateClientRegistration
      : validateFreelancerRegistration;

    const { valid, errors } = validator(req.body);
    if (!valid) return res.status(400).json({ error: 'Validation failed', errors });

    // Build update payload
    const {
      name, email, designation, companyName, businessType,
      gstNumber, panNumber, cinNumber, website,
      addressLine1, addressLine2, city, state, pincode, country,
      bio, title, experienceLevel, yearsOfExperience,
      portfolioUrl, linkedinUrl, githubUrl,
      aadhaarNumber,
      upiId, bankHolderName, bankName, accountNumber, ifscCode, preferredPayment,
    } = req.body;

    const updateData = {
      name:            name?.trim(),
      email:           email?.trim().toLowerCase(),
      city,
      state,
      pincode,
      country:         country || 'India',
      addressLine1,
      addressLine2,
      profileCompleted: true,
    };

    if (user.role === 'CLIENT') {
      Object.assign(updateData, {
        designation, companyName, businessType,
        gstNumber:   gstNumber?.toUpperCase()  || null,
        panNumber:   panNumber?.toUpperCase()   || null,
        cinNumber:   cinNumber?.toUpperCase()   || null,
        website,
      });
    }

    if (user.role === 'FREELANCER') {
      Object.assign(updateData, {
        bio, title,
        experienceLevel,
        yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience) : null,
        portfolioUrl, linkedinUrl, githubUrl,
        panNumber:     panNumber?.toUpperCase() || null,
        aadhaarNumber: aadhaarNumber ? aadhaarNumber.replace(/.(?=.{4})/g, '*') : null,
      });
    }

    // Payment fields (both roles)
    if (upiId || bankName || accountNumber) {
      Object.assign(updateData, {
        upiId, bankHolderName, bankName,
        accountNumber,
        ifscCode:        ifscCode?.toUpperCase() || null,
        preferredPayment: preferredPayment || 'UPI',
      });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data:  updateData,
    });

    res.json({ message: 'Profile completed successfully', user: updated });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Email already registered with another account' });
    }
    res.status(500).json({ error: err.message });
  }
};

// GET /auth/me
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, name: true, phone: true, role: true,
        email: true, profileCompleted: true, isVerified: true,
        rating: true, ratingCount: true,
        city: true, state: true, country: true,
        title: true, bio: true, designation: true,
        companyName: true, profilePhoto: true,
        createdAt: true,
      },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { sendOTP, verifyOTP, register, getMe };
