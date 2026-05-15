const { prisma } = require('../config/database');
const { N } = require('../services/notificationService');

const createJob = async (req, res) => {
  try {
    const { title, description, budget, deadline } = req.body;
    if (!title || !description || !budget || !deadline) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const job = await prisma.job.create({
      data: {
        title,
        description,
        budget: parseFloat(budget),
        deadline: new Date(deadline),
        clientId: req.user.id,
      },
      include: { client: { select: { id: true, name: true, rating: true } } },
    });

    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getJobs = async (req, res) => {
  try {
    const { status, search, skills, page = 1, limit = 10 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (search) where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
    if (skills) {
      const skillNames = skills.split(',').map(s => s.trim()).filter(Boolean);
      if (skillNames.length > 0) {
        where.skills = { some: { skill: { name: { in: skillNames, mode: 'insensitive' } } } };
      }
    }

    // Freelancers: MyJobs mode shows only their assigned/active jobs
    // Browse mode (no status filter) shows open CREATED jobs
    const myJobs = req.query.myJobs === 'true'
    if (req.user.role === 'FREELANCER') {
      if (myJobs) {
        // My Jobs page: all jobs assigned to this freelancer
        where.freelancerId = req.user.id
        // Remove status override so all statuses show
        delete where.status
      } else {
        // Browse Jobs page: show open jobs + their own assigned jobs
        if (!status) {
          where.OR = [
            { status: 'CREATED' },
            { freelancerId: req.user.id },
          ]
        }
      }
    } else if (req.user.role === 'CLIENT') {
      where.clientId = req.user.id;
    }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, rating: true } },
          freelancer: { select: { id: true, name: true, rating: true } },
          escrows: { select: { status: true, amount: true, milestoneId: true }, orderBy: { createdAt: 'asc' } },
          _count: { select: { applicants: true } },
          skills: { include: { skill: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.job.count({ where }),
    ]);

    res.json({ jobs, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
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
        milestones: {
          orderBy: { order: 'asc' },
          select: {
            id: true, title: true, amount: true, status: true,
            order: true, isLocked: true, dueDate: true,
            deliverable: true, platformFee: true, netAmount: true,
            submittedAt: true, clientApprovedAt: true, releasedAt: true,
          },
        },
        agreement: {
          select: {
            id: true, status: true, version: true, agreedAt: true,
            clientSignedAt: true, freelancerSignedAt: true,
            superseded: true,
          },
        },
        applicants: {
          orderBy: [{ shortlisted: 'desc' }, { createdAt: 'asc' }],
          include: {
            user: {
              select: {
                id: true, name: true, role: true,
                title: true, bio: true, profilePhoto: true,
                experienceLevel: true, yearsOfExperience: true,
                rating: true, ratingCount: true, trustScore: true,
                city: true, state: true,
                portfolioUrl: true, linkedinUrl: true, githubUrl: true,
                instagramUrl: true, facebookUrl: true, website: true,
                hourlyRate: true, demoRate: true,
                profileCompleted: true,
                email: true, phone: true,
                // Fetch skills through UserSkill join table
                skills: {
                  include: {
                    skill: { select: { id: true, name: true, category: true } },
                  },
                  orderBy: { skill: { name: 'asc' } },
                },
                _count: { select: { freelancerJobs: true, reviewsReceived: true } },
              },
            },
          },
        },
      },
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Check if current user has applied
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

    const updatedJob = await prisma.job.update({
      where: { id: job.id },
      data: { freelancerId, status: 'ASSIGNED' },
      include: {
        client: { select: { id: true, name: true } },
        freelancer: { select: { id: true, name: true } },
      },
    });

    // Notify freelancer
    await N.assigned(freelancerId, updatedJob)

    res.json({ message: 'Freelancer assigned', job: updatedJob });
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

    const updatedJob = await prisma.job.update({
      where: { id: job.id },
      data: { status: 'SUBMITTED' },
    });

    // Notify client
    await N.submitted(job.clientId, updatedJob)

    res.json({ message: 'Work submitted successfully', job: updatedJob });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const approveWork = async (req, res) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: { escrows: { where: { milestoneId: null } } },
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.clientId !== req.user.id) return res.status(403).json({ error: 'Not your job' });
    if (job.status !== 'SUBMITTED') return res.status(400).json({ error: 'Work must be submitted first' });

    // Release legacy (non-milestone) escrow if exists
    const legacyEscrow = job.escrows[0] || null;
    if (legacyEscrow) {
      await prisma.escrow.update({
        where: { id: legacyEscrow.id },
        data: { status: 'RELEASED' },
      });
      await prisma.transaction.create({
        data: {
          userId: job.freelancerId,
          amount: legacyEscrow.amount,
          type: 'RELEASE',
          status: 'SUCCESS',
          reference: legacyEscrow.paymentId,
        },
      });
    }

    const updatedJob = await prisma.job.update({
      where: { id: job.id },
      data: { status: 'COMPLETED' },
    });

    // Notify freelancer
    if (job.freelancerId) await N.approved(job.freelancerId, updatedJob)

    res.json({ message: 'Work approved and payment released', job: updatedJob });
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

    const [updatedJob] = await prisma.$transaction([
      prisma.job.update({ where: { id: job.id }, data: { status: 'DISPUTED' } }),
      prisma.dispute.create({
        data: { jobId: job.id, raisedById: req.user.id, reason: reason || 'Work not satisfactory', status: 'OPEN' },
      }),
    ]);

    // Notify freelancer
    if (job.freelancerId) await N.rejected(job.freelancerId, { id: job.id, title: job.title }, reason)

    res.json({ message: 'Work rejected. Dispute created.', job: updatedJob });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const shortlistApplicant = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { shortlisted } = req.body;

    // Find the application and verify the client owns the job
    const application = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: { job: { select: { clientId: true } } },
    });
    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (application.job.clientId !== req.user.id)
      return res.status(403).json({ error: 'Not your job' });

    const updated = await prisma.jobApplication.update({
      where: { id: applicationId },
      data: { shortlisted: !!shortlisted },
    });

    res.json({ message: shortlisted ? 'Freelancer shortlisted' : 'Removed from shortlist', application: updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { createJob, getJobs, getJob, applyForJob, assignFreelancer, shortlistApplicant, submitWork, approveWork, rejectWork };
