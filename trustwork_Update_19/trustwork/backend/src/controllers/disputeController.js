const { prisma } = require('../config/database');
const { N }      = require('../services/notificationService');

const createDispute = async (req, res) => {
  try {
    const { jobId, reason } = req.body;
    if (!jobId || !reason) return res.status(400).json({ error: 'Job ID and reason are required' });

    const job = await prisma.job.findUnique({ where: { id: jobId }, include: { dispute: true } });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const isParty = job.clientId === req.user.id || job.freelancerId === req.user.id;
    if (!isParty) return res.status(403).json({ error: 'Not involved in this job' });
    if (job.dispute) return res.status(400).json({ error: 'Dispute already exists for this job' });

    const [dispute] = await prisma.$transaction([
      prisma.dispute.create({ data: { jobId, raisedById: req.user.id, reason } }),
      prisma.job.update({ where: { id: jobId }, data: { status: 'DISPUTED' } }),
    ]);

    res.status(201).json({ message: 'Dispute raised', dispute });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getDisputes = async (req, res) => {
  try {
    const where = req.user.role === 'ADMIN' ? {} : {
      job: { OR: [{ clientId: req.user.id }, { freelancerId: req.user.id }] },
    };

    const disputes = await prisma.dispute.findMany({
      where,
      include: {
        job: {
          select: {
            id: true, title: true, budget: true,
            status: true, clientId: true, freelancerId: true,
            client:     { select: { id: true, name: true, email: true, phone: true } },
            freelancer: { select: { id: true, name: true, email: true, phone: true } },
            agreement: {
              select: {
                id: true, status: true,
                scope: true, deliverables: true,
                startDate: true, endDate: true,
                revisionRounds: true, revisionPolicy: true,
                paymentTerms: true, specialConditions: true,
                milestonesAgreed: true,
                clientChecklist: true, freelancerChecklist: true,
                escrowTermsAccepted: true,
                clientSignedAt: true, clientSignedById: true,
                freelancerSignedAt: true, freelancerSignedById: true,
                agreedAt: true,
                freelancerSubmitConfirmedAt: true, submissionNote: true,
                clientReleaseConfirmedAt: true, releaseNote: true,
              },
            },
            escrows: {
              where: { milestoneId: null },
              select: { id: true, amount: true, status: true, paymentId: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        raisedBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(disputes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const resolveDispute = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });

    const { id } = req.params;
    const { outcome, resolution } = req.body; // outcome: 'RELEASE' | 'REFUND'

    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: { job: { include: { escrows: { where: { milestoneId: null }, orderBy: { createdAt: 'asc' } } } } },
    });
    if (!dispute) return res.status(404).json({ error: 'Dispute not found' });
    if (dispute.status !== 'OPEN') return res.status(400).json({ error: 'Dispute already resolved' });

    const transactions = [];

    const legacyEscrow = dispute.job.escrows?.[0] || null;
    if (outcome === 'RELEASE' && legacyEscrow) {
      transactions.push(
        prisma.escrow.update({ where: { id: legacyEscrow.id }, data: { status: 'RELEASED' } }),
        prisma.job.update({ where: { id: dispute.jobId }, data: { status: 'COMPLETED' } }),
        prisma.transaction.create({
          data: {
            userId: dispute.job.freelancerId,
            amount: legacyEscrow.amount,
            type: 'RELEASE',
            status: 'SUCCESS',
            reference: legacyEscrow.paymentId,
          },
        })
      );
    } else if (outcome === 'REFUND' && legacyEscrow) {
      transactions.push(
        prisma.escrow.update({ where: { id: legacyEscrow.id }, data: { status: 'REFUNDED' } }),
        prisma.job.update({ where: { id: dispute.jobId }, data: { status: 'CANCELLED' } }),
        prisma.transaction.create({
          data: {
            userId: dispute.job.clientId,
            amount: legacyEscrow.amount,
            type: 'REFUND',
            status: 'SUCCESS',
            reference: legacyEscrow.paymentId,
          },
        })
      );
    }

    transactions.push(
      prisma.dispute.update({ where: { id }, data: { status: 'RESOLVED', resolution } })
    );

    await prisma.$transaction(transactions);

    // Notify both parties
    const job = dispute.job
    if (outcome === 'RELEASE' && job.freelancerId) {
      await N.approved(job.freelancerId, { id: job.id, title: job.title })
    } else if (outcome === 'REFUND' && job.clientId) {
      // Notify client their refund is processed
      const { notify } = require('../services/notificationService')
      await notify(job.clientId, {
        type: 'APPROVED',
        title: 'Dispute resolved - refund processed',
        message: `Your dispute on "${job.title}" was resolved in your favour. Escrow refunded.`,
        jobId: job.id,
      })
    }
    // Notify both parties about resolution
    const otherUserId = outcome === 'RELEASE' ? job.clientId : job.freelancerId
    if (otherUserId) {
      const { notify } = require('../services/notificationService')
      await notify(otherUserId, {
        type: 'REJECTED',
        title: 'Dispute resolved',
        message: `The dispute on "${job.title}" has been resolved by a TrustWork mediator.`,
        jobId: job.id,
      })
    }
    res.json({ message: `Dispute resolved. ${outcome === 'RELEASE' ? 'Payment released to freelancer' : 'Funds refunded to client'}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createDispute, getDisputes, resolveDispute };
