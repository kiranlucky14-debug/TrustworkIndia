const { prisma } = require('../config/database');

// Fetch one milestone with its parent job and its own escrow (singular)
async function getMilestoneWithJob(milestoneId) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      job:    { select: { id: true, status: true, clientId: true, freelancerId: true } },
      escrow: true,
    },
  });
  if (!milestone) throw { status: 404, message: 'Milestone not found' };
  return milestone;
}

async function createMilestones(jobId, userId, items) {
  const job = await prisma.job.findUnique({
    where:   { id: jobId },
    include: { milestones: true },
  });
  if (!job)                    throw { status: 404, message: 'Job not found' };
  if (job.clientId !== userId) throw { status: 403, message: 'Only the client can set milestones' };
  if (!['CREATED', 'ASSIGNED'].includes(job.status))
    throw { status: 400, message: 'Milestones can only be set when job is CREATED or ASSIGNED' };
  if (!Array.isArray(items) || items.length === 0)
    throw { status: 400, message: 'Provide at least one milestone' };

  for (const [i, m] of items.entries()) {
    if (!m.title || !String(m.title).trim())
      throw { status: 400, message: 'Milestone ' + (i + 1) + ': title is required' };
    if (!m.amount || isNaN(m.amount) || Number(m.amount) <= 0)
      throw { status: 400, message: 'Milestone ' + (i + 1) + ': amount must be a positive number' };
    if (!m.order || isNaN(m.order) || Number(m.order) < 1)
      throw { status: 400, message: 'Milestone ' + (i + 1) + ': order must be >= 1' };
  }

  const orders = items.map(m => Number(m.order));
  if (new Set(orders).size !== orders.length)
    throw { status: 400, message: 'Each milestone must have a unique order value' };

  const alreadyFunded = job.milestones.filter(m => m.status !== 'PENDING');
  if (alreadyFunded.length > 0)
    throw { status: 400, message: 'Cannot redefine milestones after funding has started' };

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

  const milestones = results.slice(0, -1);
  const updatedJob = results[results.length - 1];
  return { milestones, jobBudget: updatedJob.budget, total };
}

async function getMilestones(jobId, userId) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw { status: 404, message: 'Job not found' };

  const user    = await prisma.user.findUnique({ where: { id: userId } });
  const isParty = job.clientId === userId || job.freelancerId === userId;
  const isAdmin = user && user.role === 'ADMIN';
  if (!isParty && !isAdmin) throw { status: 403, message: 'Access denied' };

  const milestones = await prisma.milestone.findMany({
    where:   { jobId },
    include: { escrow: true },
    orderBy: { order: 'asc' },
  });

  const summary = milestones.reduce(
    (acc, m) => {
      acc.total    += m.amount;
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

async function fundMilestone(milestoneId, userId, paymentId) {
  const milestone = await getMilestoneWithJob(milestoneId);
  const { job }   = milestone;

  if (job.clientId !== userId)
    throw { status: 403, message: 'Only the client can fund milestones' };
  if (milestone.status !== 'PENDING')
    throw { status: 400, message: 'Only PENDING milestones can be funded. Current: ' + milestone.status };
  if (milestone.escrow)
    throw { status: 400, message: 'An escrow entry already exists for this milestone' };
  if (!['ASSIGNED', 'IN_PROGRESS', 'FUNDED'].includes(job.status))
    throw { status: 400, message: 'Job must be ASSIGNED or IN_PROGRESS to fund a milestone' };

  const mockPaymentId = paymentId || ('pay_mock_ms_' + Date.now());

  const alreadyFundedCount = await prisma.milestone.count({
    where: { jobId: job.id, status: { in: ['FUNDED', 'RELEASED'] } },
  });
  const newJobStatus = alreadyFundedCount === 0 ? 'IN_PROGRESS' : job.status;

  const results = await prisma.$transaction([
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
    message:   'Milestone "' + milestone.title + '" funded - ' + milestone.amount + ' locked in escrow',
    milestone: results[1],
    escrow:    results[0],
  };
}

async function releaseMilestone(milestoneId, userId) {
  const milestone = await getMilestoneWithJob(milestoneId);
  const { job }   = milestone;

  if (job.clientId !== userId)
    throw { status: 403, message: 'Only the client can release milestones' };
  if (milestone.status !== 'FUNDED')
    throw { status: 400, message: 'Cannot release - milestone is ' + milestone.status + ', not FUNDED' };
  if (!job.freelancerId)
    throw { status: 400, message: 'No freelancer assigned to this job' };
  if (!milestone.escrow)
    throw { status: 400, message: 'No escrow record found for this milestone' };
  if (milestone.escrow.status !== 'LOCKED')
    throw { status: 400, message: 'Escrow is ' + milestone.escrow.status + ', not LOCKED' };

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

  const results = await prisma.$transaction(ops);

  return {
    message:      milestone.amount + ' released to freelancer for "' + milestone.title + '"',
    milestone:    results[1],
    escrow:       results[0],
    jobCompleted: isLastMilestone,
  };
}

module.exports = { createMilestones, getMilestones, fundMilestone, releaseMilestone };
