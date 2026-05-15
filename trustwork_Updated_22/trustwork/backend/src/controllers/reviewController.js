const { prisma } = require('../config/database');

// POST /reviews  -- submit a review after job completion
const createReview = async (req, res) => {
  try {
    const { jobId, quality, communication, timeliness, comment } = req.body;

    // Validate scores
    for (const [field, val] of [['quality', quality], ['communication', communication], ['timeliness', timeliness]]) {
      const n = parseInt(val);
      if (!n || n < 1 || n > 5) {
        return res.status(400).json({ error: field + ' must be between 1 and 5' });
      }
    }

    // Load the job
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, status: true, clientId: true, freelancerId: true },
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Reviews can only be submitted for completed jobs' });
    }

    // Reviewer must be client or freelancer on this job
    const isClient     = req.user.id === job.clientId;
    const isFreelancer = req.user.id === job.freelancerId;
    if (!isClient && !isFreelancer) {
      return res.status(403).json({ error: 'You are not part of this job' });
    }
    if (!job.freelancerId) {
      return res.status(400).json({ error: 'No freelancer assigned to this job' });
    }

    // Who is being reviewed
    const toId = isClient ? job.freelancerId : job.clientId;

    // Check if already reviewed
    const existing = await prisma.review.findUnique({
      where: { jobId_fromId: { jobId, fromId: req.user.id } },
    });
    if (existing) return res.status(400).json({ error: 'You have already reviewed this job' });

    // Calculate overall score
    const q = parseInt(quality);
    const comm = parseInt(communication);
    const t = parseInt(timeliness);
    const overall = Math.round(((q + comm + t) / 3) * 10) / 10;

    // Create review + update user aggregate rating in one transaction
    const reviewee = await prisma.user.findUnique({ where: { id: toId }, select: { rating: true, ratingCount: true } });
    const newCount  = reviewee.ratingCount + 1;
    const newRating = Math.round(((reviewee.rating * reviewee.ratingCount + overall) / newCount) * 10) / 10;

    const [review] = await prisma.$transaction([
      prisma.review.create({
        data: { jobId, fromId: req.user.id, toId, quality: q, communication: comm, timeliness: t, overall, comment },
        include: {
          from: { select: { id: true, name: true } },
          to:   { select: { id: true, name: true } },
        },
      }),
      prisma.user.update({
        where: { id: toId },
        data:  { rating: newRating, ratingCount: newCount },
      }),
    ]);

    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /reviews/user/:userId  -- all reviews for a user
const getUserReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where:   { toId: req.params.userId },
        include: {
          from: { select: { id: true, name: true } },
          job:  { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip:    (parseInt(page) - 1) * parseInt(limit),
        take:    parseInt(limit),
      }),
      prisma.review.count({ where: { toId: req.params.userId } }),
    ]);

    // Aggregate breakdown
    const agg = await prisma.review.aggregate({
      where: { toId: req.params.userId },
      _avg:  { quality: true, communication: true, timeliness: true, overall: true },
    });

    res.json({
      reviews,
      total,
      page: parseInt(page),
      breakdown: {
        quality:       Math.round((agg._avg.quality       || 0) * 10) / 10,
        communication: Math.round((agg._avg.communication || 0) * 10) / 10,
        timeliness:    Math.round((agg._avg.timeliness    || 0) * 10) / 10,
        overall:       Math.round((agg._avg.overall       || 0) * 10) / 10,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /reviews/job/:jobId  -- reviews for a specific job
const getJobReviews = async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where:   { jobId: req.params.jobId },
      include: {
        from: { select: { id: true, name: true } },
        to:   { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /reviews/job/:jobId/mine  -- did the current user already review this job?
const getMyJobReview = async (req, res) => {
  try {
    const review = await prisma.review.findUnique({
      where: { jobId_fromId: { jobId: req.params.jobId, fromId: req.user.id } },
    });
    res.json({ reviewed: !!review, review: review || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createReview, getUserReviews, getJobReviews, getMyJobReview };
