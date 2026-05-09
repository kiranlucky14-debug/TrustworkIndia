const { prisma } = require('../config/database');

const JOB_CATEGORIES = [
  'Web Development', 'Mobile Apps', 'Design & Creative',
  'Data & Analytics', 'DevOps & Cloud', 'Writing & Content',
  'Marketing & SEO', 'Video & Animation', 'General',
];

const createJob = async (req, res) => {
  try {
    const { title, description, budget, deadline, category, type, isRemote, hourlyRate, skillIds } = req.body;
    if (!title || !description || !budget || !deadline) {
      return res.status(400).json({ error: 'title, description, budget and deadline are required' });
    }

    const job = await prisma.job.create({
      data: {
        title,
        description,
        budget:     parseFloat(budget),
        deadline:   new Date(deadline),
        clientId:   req.user.id,
        category:   category || 'General',
        type:       type || 'FIXED',
        isRemote:   isRemote !== false,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
      },
      include: { client: { select: { id: true, name: true, rating: true } } },
    });

    // Attach skills if provided
    if (Array.isArray(skillIds) && skillIds.length > 0) {
      await prisma.$transaction(
        skillIds.map(skillId => prisma.jobSkill.create({ data: { jobId: job.id, skillId } }))
      );
    }

    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getJobs = async (req, res) => {
  try {
    const {
      status, search, skills,
      category, type,
      minBudget, maxBudget,
      sort = 'newest',
      page = 1, limit = 9,
    } = req.query;

    const where = {};

    // Status filter
    if (status) where.status = status;

    // Role-based scoping
    if (req.user.role === 'FREELANCER') {
      where.status = where.status || 'CREATED';
    } else if (req.user.role === 'CLIENT') {
      where.clientId = req.user.id;
    }

    // Text search
    if (search) {
      where.OR = [
        { title:       { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Skill filter
    if (skills) {
      const skillNames = skills.split(',').map(s => s.trim()).filter(Boolean);
      if (skillNames.length > 0) {
        where.skills = {
          some: { skill: { name: { in: skillNames, mode: 'insensitive' } } },
        };
      }
    }

    // Category filter
    if (category) where.category = category;

    // Job type filter
    if (type && ['FIXED', 'HOURLY'].includes(type)) where.type = type;

    // Budget range filter
    if (minBudget || maxBudget) {
      where.budget = {};
      if (minBudget) where.budget.gte = parseFloat(minBudget);
      if (maxBudget) where.budget.lte = parseFloat(maxBudget);
    }

    // Sort
    const orderBy =
      sort === 'budget_high' ? { budget: 'desc' } :
      sort === 'budget_low'  ? { budget: 'asc'  } :
      sort === 'deadline'    ? { deadline: 'asc' } :
                               { createdAt: 'desc' };

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          client:    { select: { id: true, name: true, rating: true } },
          freelancer: { select: { id: true, name: true, rating: true } },
          escrows:   { select: { status: true, amount: true, milestoneId: true }, orderBy: { createdAt: 'asc' } },
          skills:    { include: { skill: true } },
          _count:    { select: { applicants: true } },
        },
        orderBy,
        skip:  (parseInt(page) - 1) * parseInt(limit),
        take:  parseInt(limit),
      }),
      prisma.job.count({ where }),
    ]);

    res.json({ jobs, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getJob = async (req, res) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: {
        client:     { select: { id: true, name: true, phone: true, rating: true, ratingCount: true } },
        freelancer: { select: { id: true, name: true, phone: true, rating: true, ratingCount: true } },
        escrows:    { include: { milestone: { select: { id: true, title: true, order: true } } }, orderBy: { createdAt: 'asc' } },
        dispute:    true,
        skills:     { include: { skill: { select: { id: true, name: true, category: true } } } },
        applicants: true,
      },
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const hasApplied = job.applicants.some(a => a.userId === req.user.id);
    res.json({ ...job, hasApplied });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const applyForJob = async (req, res) => {
  try {
    const { message } = req.body;
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status !== 'CREATED') return res.status(400).json({ error: 'Job is not open for applications' });
    if (req.user.role !== 'FREELANCER') return res.status(403).json({ error: 'Only freelancers can apply' });

    const existing = await prisma.jobApplication.findUnique({
      where: { jobId_userId: { jobId: job.id, userId: req.user.id } },
    });
    if (existing) return res.status(400).json({ error: 'Already applied to this job' });

    const application = await prisma.jobApplication.create({
      data: { jobId: job.id, userId: req.user.id, message },
    });

    res.status(201).json({ message: 'Applied successfully', application });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const assignFreelancer = async (req, res) => {
  try {
    const { freelancerId } = req.body;
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.clientId !== req.user.id) return res.status(403).json({ error: 'Not your job' });
    if (job.status !== 'CREATED') return res.status(400).json({ error: 'Job cannot be assigned in current state' });

    const updated = await prisma.job.update({
      where: { id: job.id },
      data:  { freelancerId, status: 'ASSIGNED' },
      include: {
        client:     { select: { id: true, name: true } },
        freelancer: { select: { id: true, name: true } },
      },
    });

    res.json({ message: 'Freelancer assigned', job: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const submitWork = async (req, res) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.freelancerId !== req.user.id) return res.status(403).json({ error: 'Not your job' });
    if (!['IN_PROGRESS', 'FUNDED'].includes(job.status)) {
      return res.status(400).json({ error: 'Job must be in progress to submit' });
    }

    const updated = await prisma.job.update({ where: { id: job.id }, data: { status: 'SUBMITTED' } });
    res.json({ message: 'Work submitted successfully', job: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const approveWork = async (req, res) => {
  try {
    const job = await prisma.job.findUnique({
      where:   { id: req.params.id },
      include: { escrows: { where: { milestoneId: null } } },
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.clientId !== req.user.id) return res.status(403).json({ error: 'Not your job' });
    if (job.status !== 'SUBMITTED') return res.status(400).json({ error: 'Work must be submitted first' });

    const legacyEscrow = job.escrows[0] || null;
    if (legacyEscrow) {
      await prisma.escrow.update({ where: { id: legacyEscrow.id }, data: { status: 'RELEASED' } });
      await prisma.transaction.create({
        data: {
          userId:    job.freelancerId,
          amount:    legacyEscrow.amount,
          type:      'RELEASE',
          status:    'SUCCESS',
          reference: legacyEscrow.paymentId,
        },
      });
    }

    const updated = await prisma.job.update({ where: { id: job.id }, data: { status: 'COMPLETED' } });
    res.json({ message: 'Work approved and payment released', job: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const rejectWork = async (req, res) => {
  try {
    const { reason } = req.body;
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.clientId !== req.user.id) return res.status(403).json({ error: 'Not your job' });
    if (job.status !== 'SUBMITTED') return res.status(400).json({ error: 'Work must be submitted first' });

    await prisma.$transaction([
      prisma.job.update({ where: { id: job.id }, data: { status: 'DISPUTED' } }),
      prisma.dispute.create({
        data: { jobId: job.id, raisedById: req.user.id, reason: reason || 'Work not satisfactory', status: 'OPEN' },
      }),
    ]);

    res.json({ message: 'Work rejected. Dispute created.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /jobs/meta -- categories and stats for filter UI
const getJobMeta = async (req, res) => {
  try {
    const [categoryCounts, budgetStats] = await Promise.all([
      prisma.job.groupBy({
        by:     ['category'],
        _count: { id: true },
        where:  { status: 'CREATED' },
      }),
      prisma.job.aggregate({
        _min: { budget: true },
        _max: { budget: true },
        where: { status: 'CREATED' },
      }),
    ]);

    res.json({
      categories: JOB_CATEGORIES,
      categoryCounts: categoryCounts.reduce((acc, r) => {
        acc[r.category] = r._count.id;
        return acc;
      }, {}),
      budgetRange: {
        min: budgetStats._min.budget || 500,
        max: budgetStats._max.budget || 500000,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createJob, getJobs, getJob, applyForJob,
  assignFreelancer, submitWork, approveWork, rejectWork,
  getJobMeta,
};