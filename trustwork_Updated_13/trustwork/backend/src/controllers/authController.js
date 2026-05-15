const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { prisma } = require('../config/database');
const { validateClientRegistration, validateFreelancerRegistration } = require('../validators/registerValidator');

const generateOTP   = () => Math.floor(100000 + Math.random() * 900000).toString();
const generateToken = (userId, role) =>
  jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const safeUser = (u) => ({
  id: u.id, name: u.name, phone: u.phone, email: u.email,
  role: u.role, userId: u.userId,
  profileCompleted: u.profileCompleted, isVerified: u.isVerified,
  rating: u.rating, ratingCount: u.ratingCount,
  city: u.city, state: u.state, title: u.title, bio: u.bio,
  designation: u.designation, companyName: u.companyName,
  profilePhoto: u.profilePhoto, createdAt: u.createdAt,
});

//  OTP 

// POST /auth/send-otp
const sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !/^[6-9]\d{9}$/.test(phone))
      return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number' });

    const otp = process.env.NODE_ENV === 'production' ? generateOTP() : '123456';
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.oTP.updateMany({ where: { phone, used: false }, data: { used: true } });
    await prisma.oTP.create({ data: { phone, code: otp, expiresAt } });

    console.log('OTP for ' + phone + ': ' + otp);
    res.json({
      message: 'OTP sent successfully',
      ...(process.env.NODE_ENV !== 'production' && { otp }),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /auth/verify-otp   { token, user, isNewUser }
const verifyOTP = async (req, res) => {
  try {
    const { phone, otp, role } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP are required' });

    const rec = await prisma.oTP.findFirst({
      where: { phone, code: otp, used: false, expiresAt: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!rec) return res.status(400).json({ error: 'Invalid or expired OTP' });

    await prisma.oTP.update({ where: { id: rec.id }, data: { used: true } });

    let user = await prisma.user.findUnique({ where: { phone } });
    const isNewUser = !user;

    if (!user) {
      const assignedRole = role && ['CLIENT','FREELANCER'].includes(role) ? role : 'CLIENT';
      user = await prisma.user.create({
        data: { phone, name: 'New User', role: assignedRole, profileCompleted: false },
      });
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    res.json({ token: generateToken(user.id, user.role), user: safeUser(user), isNewUser });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

//  EMAIL / PASSWORD 

// POST /auth/login  { identifier: email|userId|phone, password, role? }
const loginWithPassword = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password)
      return res.status(400).json({ error: 'Email/User ID and password are required' });

    // Find by email, userId, or phone
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email:  identifier.toLowerCase().trim() },
          { userId: identifier.trim() },
          { phone:  identifier.trim() },
        ],
      },
    });

    if (!user) return res.status(401).json({ error: 'No account found with these credentials' });

    // Check account lock
    if (user.lockedUntil && user.lockedUntil > new Date())
      return res.status(429).json({ error: 'Account temporarily locked. Try again in 15 minutes.' });

    if (!user.passwordHash)
      return res.status(400).json({ error: 'This account uses OTP login. Please use mobile number + OTP.' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      const attempts = (user.loginAttempts || 0) + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await prisma.user.update({ where: { id: user.id }, data: { loginAttempts: attempts, lockedUntil } });
      const remaining = 5 - attempts;
      return res.status(401).json({
        error: remaining > 0
          ? `Incorrect password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
          : 'Account locked for 15 minutes due to too many failed attempts.',
      });
    }

    // Reset login attempts on success
    await prisma.user.update({
      where: { id: user.id },
      data:  { loginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    res.json({
      token: generateToken(user.id, user.role),
      user: safeUser(user),
      isNewUser: false,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /auth/signup  { name, email, password, phone?, role }
const signup = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name?.trim())  return res.status(400).json({ error: 'Full name is required' });
    if (!email?.trim()) return res.status(400).json({ error: 'Email is required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Enter a valid email address' });
    if (!password || password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password))
      return res.status(400).json({ error: 'Password must contain uppercase, lowercase, and a number' });

    const validRole = role && ['CLIENT','FREELANCER'].includes(role) ? role : 'CLIENT';

    // Check duplicates
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: email.toLowerCase() }, ...(phone ? [{ phone }] : [])] },
    });
    if (existing) {
      if (existing.email === email.toLowerCase())
        return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
      return res.status(409).json({ error: 'This phone number is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone || null,
        role: validRole,
        passwordHash,
        profileCompleted: false,
      },
    });

    res.status(201).json({
      token: generateToken(user.id, user.role),
      user: safeUser(user),
      isNewUser: true,
    });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email or phone already registered' });
    res.status(500).json({ error: err.message });
  }
};

//  PASSWORD RESET 

// POST /auth/forgot-password  { email }
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await prisma.user.findFirst({ where: { email: email.toLowerCase() } });

    // Always return success (don't reveal if email exists)
    if (!user) {
      return res.json({ message: 'If this email is registered, a reset link has been sent.' });
    }

    const resetToken  = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data:  { resetToken, resetTokenExpiry: resetExpiry },
    });

    // In production: send email with reset link
    // For demo: expose token in response (dev only)
    console.log('Password reset token for ' + email + ': ' + resetToken);
    res.json({
      message: 'If this email is registered, a reset link has been sent.',
      ...(process.env.NODE_ENV !== 'production' && { resetToken, devNote: 'Token exposed in dev mode only' }),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /auth/reset-password  { token, password }
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and new password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password))
      return res.status(400).json({ error: 'Password must contain uppercase, lowercase, and a number' });

    const user = await prisma.user.findFirst({
      where: { resetToken: token, resetTokenExpiry: { gte: new Date() } },
    });
    if (!user) return res.status(400).json({ error: 'Reset link is invalid or has expired' });

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data:  { passwordHash, resetToken: null, resetTokenExpiry: null, loginAttempts: 0, lockedUntil: null },
    });

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

//  ADMIN 

// POST /auth/admin/login  { identifier, password }
const adminLogin = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password)
      return res.status(400).json({ error: 'Credentials are required' });

    const user = await prisma.user.findFirst({
      where: {
        role: 'ADMIN',
        OR: [
          { email:  identifier.toLowerCase() },
          { userId: identifier },
          { phone:  identifier },
        ],
      },
    });

    if (!user) return res.status(401).json({ error: 'Invalid admin credentials' });
    if (!user.passwordHash) return res.status(400).json({ error: 'Admin password not set' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid admin credentials' });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    res.json({
      token: generateToken(user.id, user.role),
      user:  safeUser(user),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /auth/admin/login-as  { targetRole }  (admin impersonation for testing)
const adminLoginAs = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN')
      return res.status(403).json({ error: 'Only admins can use this endpoint' });

    const { targetRole } = req.body;
    if (!['CLIENT','FREELANCER','ADMIN'].includes(targetRole))
      return res.status(400).json({ error: 'Invalid role. Must be CLIENT, FREELANCER, or ADMIN' });

    // Find the first demo user with that role (or use the admin themselves)
    let targetUser = await prisma.user.findFirst({
      where: { role: targetRole, profileCompleted: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!targetUser) targetUser = req.user;

    // Issue a token for the target user but keep admin audit trail
    const token = jwt.sign(
      { userId: targetUser.id, role: targetUser.role, adminId: req.user.id },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({ token, user: safeUser(targetUser), impersonating: true, originalAdmin: req.user.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

//  PROFILE 

// GET /auth/me
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(safeUser(user));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /auth/register
const register = async (req, res) => {
  try {
    const userId = req.user.id;
    const user   = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const validator = user.role === 'CLIENT'
      ? validateClientRegistration : validateFreelancerRegistration;
    const { valid, errors } = validator(req.body);
    if (!valid) return res.status(400).json({ error: 'Validation failed', errors });

    const {
      name, email, designation, companyName, businessType,
      gstNumber, panNumber, cinNumber, website,
      addressLine1, addressLine2, city, state, pincode, country,
      bio, title, experienceLevel, yearsOfExperience,
      portfolioUrl, linkedinUrl, githubUrl, aadhaarNumber,
      upiId, bankHolderName, bankName, accountNumber, ifscCode, preferredPayment,
    } = req.body;

    const updateData = {
      name: name?.trim(), email: email?.trim().toLowerCase(),
      city, state, pincode, country: country || 'India',
      addressLine1, addressLine2, profileCompleted: true,
    };

    if (user.role === 'CLIENT') {
      Object.assign(updateData, {
        designation, companyName, businessType,
        gstNumber: gstNumber?.toUpperCase() || null,
        panNumber: panNumber?.toUpperCase() || null,
        cinNumber: cinNumber?.toUpperCase() || null,
        website,
      });
    }
    if (user.role === 'FREELANCER') {
      Object.assign(updateData, {
        bio, title, experienceLevel,
        yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience) : null,
        portfolioUrl, linkedinUrl, githubUrl,
        panNumber: panNumber?.toUpperCase() || null,
        aadhaarNumber: aadhaarNumber ? aadhaarNumber.replace(/.(?=.{4})/g, '*') : null,
      });
    }
    if (upiId || bankName || accountNumber) {
      Object.assign(updateData, {
        upiId, bankHolderName, bankName, accountNumber,
        ifscCode: ifscCode?.toUpperCase() || null,
        preferredPayment: preferredPayment || 'UPI',
      });
    }

    const updated = await prisma.user.update({ where: { id: userId }, data: updateData });
    res.json({ message: 'Profile completed successfully', user: safeUser(updated) });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  sendOTP, verifyOTP,
  loginWithPassword, signup,
  forgotPassword, resetPassword,
  adminLogin, adminLoginAs,
  getMe, register,
};
