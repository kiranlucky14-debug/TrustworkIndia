/**
 * milestoneService.js
 * All milestone-escrow business logic lives here.
 * Controllers stay thin — they only validate HTTP input and call these functions.
 */

const { prisma } = require('../config/database');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fetch milestone + job + existing escrow. Throws on missing. */
async function getMilestoneWithJob(milestoneId) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      job:    { include: { escrows: { where: { milestoneId: null } } } },
      escrow: true,
    },
  });
  if (!milestone) throw { status: 404, message: 'Milestone not found' };
  return milestone;
}

// ─── createMilestones ─────────────────────────────────────────────────────────
/**
 * Replace all milestones for a job (before any funding starts).
 * Accepts array: [{ title, amount, order }, ...]
 * Updates job.budget to match the new total.
 */
async function createMilestones(jobId, userId, items) {
  const job = await prisma.job.findUnique({
    where:   { id: jobId },
    include: { milestones: true },
  });
  if (!job)                          throw { status: 404, message: 'Job not found' };
  if (job.clientId !== userId)       throw { status: 403, message: 'Only the client can set milestones' };
  if (!['CREATED', 'ASSIGNED'].includes(job.status)) {
    throw { status: 400, message: 'Milestones can only be set when job is CREATED or ASSIGNED' };
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw { status: 400, message: 'Provide at least one milestone' };
  }

  // Validate each item
  for (const [i, m] of items.entries()) {
    if (!m.title || !String(m.title).trim())
      throw { status: 400, message: `Milestone ${i + 1}: title is required` };
    if (!m.amount || isNaN(m.amount) || Number(m.amount) <= 0)
      throw { status: 400, message: `Milestone ${i + 1}: amount must be a positive number` };
    if (!m.order || isNaN(m.order) || Number(m.order) < 1)
      throw { status: 400, message: `Milestone ${i + 1}: order must be >= 1` };
  }

  // No duplicate order values in payload
  const orders = items.map(m => Number(m.order));
  if (new Set(orders).size !== orders.length)
    throw { status: 400, message: 'Each milestone must have a unique order value' };

  // Block re-definition if any milestone has already been funded
  const funded = job.milestones.filter(m => m.status !== 'PENDING');
  if (funded.length > 0)
    throw { status: 400, message: 'Cannot redefine milestones after funding has started' };

  // Delete existing PENDING milestones and re-create
  await prisma.milestone.deleteMany({ where: { jobId } });

  const total = items.reduce((s, m) => s + Number(m.amount), 0);

  const results = await prisma.$transaction([
    ...items.map(m =>
      prisma.milestone.create({
        data: {
          jobId,
          title:  String(m.title).trim(),
          amount: Number(m.amount),
          order:  Number(m.order),
          status: 'PENDING',
        },
      })
    ),
    prisma.job.update({ where: { id: jobId }, data: { budget: total } }),
  ]);

  const milestones  = results.slice(0, -1);
  const updatedJob  = results[results.length - 1];

  return { milestones, jobBudget: updatedJob.budget, total };
}

// ─── getMilestones ────────────────────────────────────────────────────────────
/** Return all milestones + summary stats for a job. */
async function getMilestones(jobId, userId) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw { status: 404, message: 'Job not found' };

  const user     = await prisma.user.findUnique({ where: { id: userId } });
  const isParty  = job.clientId === userId || job.freelancerId === userId;
  const isAdmin  = user?.role === 'ADMIN';
  if (!isParty && !isAdmin) throw { status: 403, message: 'Access denied' };

  const milestones = await prisma.milestone.findMany({
    where:   { jobId },
    include: { escrows: { where: { status: { in: ['FUNDED','RELEASED'] }, milestoneId: { not: null } } } },
    orderBy: { order: 'asc' },
  });

  const summary = milestones.reduce(
    (acc, m) => {
      acc.total += m.amount;
      if (m.status === 'PENDING')  acc.pending  += m.amount;
      if (m.status === 'FUNDED')   acc.funded   += m.amount;
      if (m.status === 'RELEASED') acc.released += m.amount;
      if (m.status === 'REFUNDED') acc.refunded += m.amount;
      return acc;
    },
    { total: 0, pending: 0, funded: 0, released: 0, refunded: 0 }
  );

  return { milestones, summary };
}

// ─── fundMilestone ────────────────────────────────────────────────────────────
/**
 * Lock money for a single PENDING milestone.
 * Creates an Escrow row linked to the milestone.
 * Creates a DEPOSIT Transaction for the client.
 * Advances job to IN_PROGRESS on first funding.
 */
async function fundMilestone(milestoneId, userId, paymentId) {
  const milestone = await getMilestoneWithJob(milestoneId);
  const { job }   = milestone;

  if (job.clientId !== userId)
    throw { status: 403, message: 'Only the client can fund milestones' };
  if (milestone.status !== 'PENDING')
    throw { status: 400, message: `Milestone is already ${milestone.status} — only PENDING milestones can be funded` };
  if (milestone.escrow)
    throw { status: 400, message: 'An escrow entry already exists for this milestone' };
  if (!['ASSIGNED', 'IN_PROGRESS', 'FUNDED'].includes(job.status))
    throw { status: 400, message: 'Job must be ASSIGNED or IN_PROGRESS to fund a milestone' };

  const mockPaymentId = paymentId || `pay_mock_ms_${Date.now()}`;

  // First funded milestone? → move job to IN_PROGRESS
  const alreadyFundedCount = await prisma.milestone.count({
    where: { jobId: job.id, status: { in: ['FUNDED', 'RELEASED'] } },
  });
  const newJobStatus = alreadyFundedCount === 0 ? 'IN_PROGRESS' : job.status;

  const [escrow, updatedMilestone] = await prisma.$transaction([
    prisma.escrow.create({
      data: {
        jobId:       job.id,
        milestoneId: milestone.id,
        amount:      milestone.amount,
        status:      'LOCKED',
        paymentId:   mockPaymentId,
      },
    }),
    prisma.milestone.update({
      where: { id: milestone.id },
      data:  { status: 'FUNDED' },
    }),
    prisma.job.update({
      where: { id: job.id },
      data:  { status: newJobStatus },
    }),
    prisma.transaction.create({
      data: {
        userId:      userId,
        amount:      milestone.amount,
        type:        'DEPOSIT',
        status:      'SUCCESS',
        reference:   mockPaymentId,
        milestoneId: milestone.id,
      },
    }),
  ]);

  return {
    message:   `Milestone "${milestone.title}" funded — ₹${milestone.amount} locked in escrow`,
    milestone: updatedMilestone,
    escrow,
  };
}

// ─── releaseMilestone ─────────────────────────────────────────────────────────
/**
 * Release a FUNDED milestone — pays the freelancer.
 * Creates a RELEASE Transaction for the freelancer.
 * If ALL milestones are now released → marks the job COMPLETED.
 */
async function releaseMilestone(milestoneId, userId) {
  const milestone = await getMilestoneWithJob(milestoneId);
  const { job }   = milestone;

  if (job.clientId !== userId)
    throw { status: 403, message: 'Only the client can release milestones' };
  if (milestone.status !== 'FUNDED')
    throw { status: 400, message: `Cannot release — milestone is ${milestone.status}, not FUNDED` };
  if (!job.freelancerId)
    throw { status: 400, message: 'No freelancer assigned to this job' };
  if (!milestone.escrow)
    throw { status: 400, message: 'No escrow record found for this milestone' };
  if (milestone.escrow.status !== 'LOCKED')
    throw { status: 400, message: `Escrow is ${milestone.escrow.status}, not LOCKED` };

  // Will this be the last milestone to release?
  const [totalCount, releasedCount] = await Promise.all([
    prisma.milestone.count({ where: { jobId: job.id } }),
    prisma.milestone.count({ where: { jobId: job.id, status: 'RELEASED' } }),
  ]);
  const isLastMilestone = releasedCount + 1 >= totalCount;

  const ops = [
    prisma.escrow.update({
      where: { id: milestone.escrow.id },
      data:  { status: 'RELEASED' },
    }),
    prisma.milestone.update({
      where: { id: milestone.id },
      data:  { status: 'RELEASED' },
    }),
    prisma.transaction.create({
      data: {
        userId:      job.freelancerId,
        amount:      milestone.amount,
        type:        'RELEASE',
        status:      'SUCCESS',
        reference:   milestone.escrow.paymentId,
        milestoneId: milestone.id,
      },
    }),
  ];

  if (isLastMilestone) {
    ops.push(prisma.job.update({ where: { id: job.id }, data: { status: 'COMPLETED' } }));
  }

  const results        = await prisma.$transaction(ops);
  const updatedEscrow  = results[0];
  const updatedMilestone = results[1];

  return {
    message:      `₹${milestone.amount} released to freelancer for "${milestone.title}"`,
    milestone:    updatedMilestone,
    escrow:       updatedEscrow,
    jobCompleted: isLastMilestone,
  };
}

module.exports = {
  createMilestones,
  getMilestones,
  fundMilestone,
  releaseMilestone,
};
