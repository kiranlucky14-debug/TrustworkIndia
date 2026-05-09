const { prisma } = require('../config/database');

// Helper: get the legacy (non-milestone) escrow for a job
// For backward compat — returns first escrow where milestoneId is null
async function getLegacyEscrow(jobId) {
  return prisma.escrow.findFirst({
    where: { jobId, milestoneId: null },
    orderBy: { createdAt: 'asc' },
  });
}

const fundEscrow = async (req, res) => {
  try {
    const { jobId, paymentId, orderId } = req.body;
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { escrows: { where: { milestoneId: null } } },
    });

    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.clientId !== req.user.id) return res.status(403).json({ error: 'Not your job' });
    if (!['ASSIGNED', 'CREATED'].includes(job.status)) {
      return res.status(400).json({ error: 'Job must be assigned before funding' });
    }
    // Check no legacy escrow already exists
    if (job.escrows.length > 0) return res.status(400).json({ error: 'Escrow already funded' });

    const [escrow, updatedJob] = await prisma.$transaction([
      prisma.escrow.create({
        data: { jobId, amount: job.budget, status: 'LOCKED', paymentId, orderId, milestoneId: null },
      }),
      prisma.job.update({ where: { id: jobId }, data: { status: 'FUNDED' } }),
      prisma.transaction.create({
        data: { userId: req.user.id, amount: job.budget, type: 'DEPOSIT', status: 'SUCCESS', reference: paymentId },
      }),
    ]);

    res.json({ message: 'Escrow funded successfully', escrow, job: updatedJob });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const releaseEscrow = async (req, res) => {
  try {
    const { jobId } = req.body;
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.clientId !== req.user.id) return res.status(403).json({ error: 'Not your job' });

    const escrow = await getLegacyEscrow(jobId);
    if (!escrow) return res.status(404).json({ error: 'No escrow for this job' });
    if (escrow.status !== 'LOCKED') return res.status(400).json({ error: 'Escrow is not locked' });

    const [updatedEscrow] = await prisma.$transaction([
      prisma.escrow.update({ where: { id: escrow.id }, data: { status: 'RELEASED' } }),
      prisma.job.update({ where: { id: jobId }, data: { status: 'COMPLETED' } }),
      prisma.transaction.create({
        data: { userId: job.freelancerId, amount: escrow.amount, type: 'RELEASE', status: 'SUCCESS', reference: escrow.paymentId },
      }),
    ]);

    res.json({ message: 'Escrow released to freelancer', escrow: updatedEscrow });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const refundEscrow = async (req, res) => {
  try {
    const { jobId } = req.body;
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    if (req.user.role !== 'ADMIN' && job.clientId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to refund' });
    }

    const escrow = await getLegacyEscrow(jobId);
    if (!escrow) return res.status(404).json({ error: 'No escrow for this job' });
    if (escrow.status !== 'LOCKED') return res.status(400).json({ error: 'Escrow is not locked' });

    const [updatedEscrow] = await prisma.$transaction([
      prisma.escrow.update({ where: { id: escrow.id }, data: { status: 'REFUNDED' } }),
      prisma.job.update({ where: { id: jobId }, data: { status: 'CANCELLED' } }),
      prisma.transaction.create({
        data: { userId: job.clientId, amount: escrow.amount, type: 'REFUND', status: 'SUCCESS', reference: escrow.paymentId },
      }),
    ]);

    res.json({ message: 'Escrow refunded to client', escrow: updatedEscrow });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getEscrowStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    // Return all escrows for this job (legacy + milestone-based)
    const escrows = await prisma.escrow.findMany({
      where: { jobId },
      include: {
        job:       { select: { title: true, status: true, clientId: true, freelancerId: true } },
        milestone: { select: { id: true, title: true, order: true, status: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    if (escrows.length === 0) return res.status(404).json({ error: 'No escrow found' });

    // Summary
    const summary = escrows.reduce(
      (acc, e) => {
        acc.total += e.amount;
        if (e.status === 'LOCKED')   acc.locked   += e.amount;
        if (e.status === 'RELEASED') acc.released += e.amount;
        if (e.status === 'REFUNDED') acc.refunded += e.amount;
        return acc;
      },
      { total: 0, locked: 0, released: 0, refunded: 0 }
    );

    res.json({ escrows, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { fundEscrow, releaseEscrow, refundEscrow, getEscrowStatus };
