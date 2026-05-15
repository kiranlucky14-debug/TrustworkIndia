const { prisma } = require('../config/database');

//  GET /users/me  or  GET /users/:id 
const getProfile = async (req, res) => {
  try {
    const targetId     = req.params.id || req.user.id;
    const isOwnProfile = targetId === req.user.id;
    const isAdmin      = req.user.role === 'ADMIN';
    const showPrivate  = isOwnProfile || isAdmin;

    // Always-public fields
    const publicSelect = {
      id: true, name: true, phone: true, email: true, role: true,
      userId: true, profileCompleted: true, isVerified: true,
      rating: true, ratingCount: true, createdAt: true, lastLoginAt: true,
      city: true, state: true, country: true, pincode: true,
      addressLine1: true, addressLine2: true,
      bio: true, title: true, designation: true,
      experienceLevel: true, yearsOfExperience: true,
      portfolioUrl: true, linkedinUrl: true, githubUrl: true,
      profilePhoto: true, resumeUrl: true,
      companyName: true, businessType: true, website: true, companyLogo: true,
      _count: {
        select: {
          clientJobs: true, freelancerJobs: true,
          reviewsGiven: true, reviewsReceived: true,
        },
      },
    };

    // Private fields: only for own profile or admin
    if (showPrivate) {
      Object.assign(publicSelect, {
        upiId: true, bankName: true, bankHolderName: true,
        accountNumber: true, ifscCode: true, preferredPayment: true,
        panNumber: true, gstNumber: true, cinNumber: true,
        aadhaarNumber: true, panDocument: true, gstDocument: true,
      });
    }

    const user = await prisma.user.findUnique({
      where:  { id: targetId },
      select: publicSelect,
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Skills
    const userSkills = await prisma.userSkill.findMany({
      where:   { userId: targetId },
      include: { skill: { select: { id: true, name: true, category: true } } },
      orderBy: { skill: { name: 'asc' } },
    });

    // Earnings - freelancer
    let earnings = null;
    if (user.role === 'FREELANCER' && showPrivate) {
      const res2 = await prisma.transaction.aggregate({
        where:  { userId: targetId, type: 'RELEASE', status: 'SUCCESS' },
        _sum:   { amount: true },
        _count: { id: true },
      });
      earnings = { total: res2._sum.amount || 0, count: res2._count.id || 0 };
    }

    // Spending - client
    let spending = null;
    if (user.role === 'CLIENT' && showPrivate) {
      const res3 = await prisma.transaction.aggregate({
        where: { userId: targetId, type: 'DEPOSIT', status: 'SUCCESS' },
        _sum:  { amount: true },
        _count: { id: true },
      });
      spending = { total: res3._sum.amount || 0, count: res3._count.id || 0 };
    }

    // Platform stats - admin
    let platformStats = null;
    if (user.role === 'ADMIN' && showPrivate) {
      const [totalUsers, totalJobs, openDisputes, escrowVol] = await Promise.all([
        prisma.user.count(),
        prisma.job.count(),
        prisma.dispute.count({ where: { status: 'OPEN' } }),
        prisma.escrow.aggregate({ where: { status: 'LOCKED' }, _sum: { amount: true } }),
      ]);
      platformStats = {
        totalUsers, totalJobs, openDisputes,
        lockedEscrow: escrowVol._sum.amount || 0,
      };
    }

    // Recent transactions - own only
    let recentTxns = null;
    if (isOwnProfile) {
      recentTxns = await prisma.transaction.findMany({
        where:   { userId: targetId },
        orderBy: { createdAt: 'desc' },
        take:    5,
      });
    }

    res.json({
      ...user,
      skills: userSkills.map(s => s.skill),
      earnings, spending, platformStats, recentTxns,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//  PUT /users/me 
const updateProfile = async (req, res) => {
  try {
    const {
      name, email, bio, title, designation,
      city, state, country, pincode, addressLine1, addressLine2,
      companyName, businessType, website, cinNumber,
      gstNumber, panNumber,
      experienceLevel, yearsOfExperience,
      portfolioUrl, linkedinUrl, githubUrl, instagramUrl, facebookUrl,
      upiId, bankName, bankHolderName, accountNumber, ifscCode, preferredPayment,
      hourlyRate, demoRate,
    } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

    const update = {
      name:         name.trim(),
      bio:          bio          || null,
      title:        title        || null,
      designation:  designation  || null,
      city:         city         || null,
      state:        state        || null,
      country:      country      || 'India',
      pincode:      pincode      || null,
      addressLine1: addressLine1 || null,
      addressLine2: addressLine2 || null,
      companyName:  companyName  || null,
      businessType: businessType || null,
      website:      website      || null,
      cinNumber:    cinNumber    || null,
      gstNumber:    gstNumber?.toUpperCase() || null,
      panNumber:    panNumber?.toUpperCase() || null,
      experienceLevel: experienceLevel || null,
      yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience) : null,
      portfolioUrl: portfolioUrl || null,
      linkedinUrl:  linkedinUrl  || null,
      githubUrl:      githubUrl      || null,
      instagramUrl:   instagramUrl   || null,
      facebookUrl:    facebookUrl    || null,
      upiId:        upiId        || null,
      bankName:     bankName     || null,
      bankHolderName: bankHolderName || null,
      accountNumber:  accountNumber  || null,
      ifscCode:     ifscCode?.toUpperCase() || null,
      preferredPayment: preferredPayment || 'UPI',
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
      demoRate:   demoRate   ? parseFloat(demoRate)   : null,
    };

    // Email: only update if changed and valid
    if (email?.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return res.status(400).json({ error: 'Enter a valid email address' });
      if (email.toLowerCase() !== req.user.email)
        update.email = email.trim().toLowerCase();
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data:  update,
    });

    // Return the full updated profile (same shape as getProfile)
    const freshUser = await prisma.user.findUnique({
      where:  { id: req.user.id },
      select: {
        id: true, name: true, phone: true, email: true, role: true,
        userId: true, profileCompleted: true, isVerified: true,
        rating: true, ratingCount: true, createdAt: true,
        city: true, state: true, country: true, pincode: true,
        addressLine1: true, addressLine2: true,
        bio: true, title: true, designation: true,
        experienceLevel: true, yearsOfExperience: true,
        portfolioUrl: true, linkedinUrl: true, githubUrl: true,
        profilePhoto: true, resumeUrl: true, companyLogo: true,
        companyName: true, businessType: true, website: true,
        cinNumber: true, gstNumber: true, panNumber: true,
        upiId: true, bankName: true, bankHolderName: true,
        accountNumber: true, ifscCode: true, preferredPayment: true,
      },
    });

    // Update skills if provided
    if (Array.isArray(req.body.skillNames) && req.body.skillNames.length >= 0) {
      const names = req.body.skillNames;
      const found = await prisma.skill.findMany({ where: { name: { in: names } } });
      const foundIds = found.map(s => s.id);
      await prisma.$transaction([
        prisma.userSkill.deleteMany({ where: { userId: req.user.id } }),
        ...foundIds.map(skillId => prisma.userSkill.create({ data: { userId: req.user.id, skillId } })),
      ]);
    }

    // Update stored user in context (only safe public fields)
    const safeUser = {
      id: freshUser.id, name: freshUser.name, phone: freshUser.phone,
      email: freshUser.email, role: freshUser.role, userId: freshUser.userId,
      profileCompleted: freshUser.profileCompleted, isVerified: freshUser.isVerified,
      city: freshUser.city, state: freshUser.state,
      title: freshUser.title, designation: freshUser.designation,
      companyName: freshUser.companyName, profilePhoto: freshUser.profilePhoto,
      rating: freshUser.rating, ratingCount: freshUser.ratingCount,
      createdAt: freshUser.createdAt,
    };

    res.json({ message: 'Profile updated successfully', user: safeUser, full: freshUser });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email already in use by another account' });
    res.status(500).json({ error: err.message });
  }
};

//  POST /users/:id/rate 
const rateUser = async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const newRating = (user.rating * user.ratingCount + rating) / (user.ratingCount + 1);
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data:  { rating: newRating, ratingCount: { increment: 1 } },
      select: { id: true, name: true, rating: true, ratingCount: true },
    });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { getProfile, updateProfile, rateUser };
