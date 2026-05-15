// disputeController.js  Dispute Resolution v2 with evidence submission
const { prisma } = require('../config/database')
const { N }      = require('../services/notificationService')

//  GET /disputes 
const getDisputes = async (req, res) => {
  try {
    const user    = await prisma.user.findUnique({ where: { id: req.user.id } })
    const isAdmin = user?.role === 'ADMIN'

    const where = isAdmin ? {} : {
      job: { OR: [{ clientId: req.user.id }, { freelancerId: req.user.id }] },
    }

    const disputes = await prisma.dispute.findMany({
      where,
      include: {
        job: {
          select: {
            id: true, title: true, budget: true, status: true,
            clientId: true, freelancerId: true,
            client:     { select: { id: true, name: true } },
            freelancer: { select: { id: true, name: true } },
            agreement: {
              select: {
                id: true, status: true, scope: true, deliverables: true,
                milestonesAgreed: true, clientChecklist: true, freelancerChecklist: true,
                clientSignedAt: true, freelancerSignedAt: true, agreedAt: true,
                submissionNote: true, freelancerSubmitConfirmedAt: true,
              },
            },
            escrows: { where: { milestoneId: null }, select: { id: true, amount: true, status: true } },
          },
        },
        raisedBy: { select: { id: true, name: true, role: true } },
        evidence: {
          include: { uploader: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(disputes)
  } catch (err) { res.status(500).json({ error: err.message }) }
}

//  POST /disputes 
const raiseDispute = async (req, res) => {
  try {
    const { jobId, reason } = req.body
    if (!reason?.trim()) return res.status(400).json({ error: 'Reason required' })

    const job = await prisma.job.findUnique({ where: { id: jobId } })
    if (!job) return res.status(404).json({ error: 'Job not found' })

    const isParty = job.clientId === req.user.id || job.freelancerId === req.user.id
    if (!isParty) return res.status(403).json({ error: 'You are not a party to this job' })

    const existing = await prisma.dispute.findUnique({ where: { jobId } })
    if (existing) return res.status(400).json({ error: 'Dispute already exists for this job' })

    const dispute = await prisma.dispute.create({
      data: {
        jobId,
        raisedById: req.user.id,
        reason:     reason.trim(),
        status:     'OPEN',
      },
    })

    await prisma.job.update({ where: { id: jobId }, data: { status: 'DISPUTED' } })

    // Notify the other party
    const otherId = job.clientId === req.user.id ? job.freelancerId : job.clientId
    if (otherId) {
      const { notify } = require('../services/notificationService')
      await notify(otherId, {
        type: 'REJECTED', title: 'Dispute raised',
        message: `A dispute has been raised for "${job.title}": ${reason.trim().slice(0, 100)}`,
        jobId,
      })
    }

    res.status(201).json({ dispute })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

//  POST /disputes/:id/evidence 
const submitEvidence = async (req, res) => {
  try {
    const { type = 'NOTE', content, fileName } = req.body
    if (!content?.trim()) return res.status(400).json({ error: 'Evidence content required' })

    const dispute = await prisma.dispute.findUnique({
      where:   { id: req.params.id },
      include: { job: true },
    })
    if (!dispute) return res.status(404).json({ error: 'Dispute not found' })
    if (dispute.status !== 'OPEN') return res.status(400).json({ error: 'Dispute is already resolved' })

    const isParty = dispute.job.clientId === req.user.id || dispute.job.freelancerId === req.user.id
    const user    = await prisma.user.findUnique({ where: { id: req.user.id } })
    const isAdmin = user?.role === 'ADMIN'
    if (!isParty && !isAdmin) return res.status(403).json({ error: 'Access denied' })

    const evidence = await prisma.disputeEvidence.create({
      data: {
        disputeId:  dispute.id,
        uploadedBy: req.user.id,
        role:       user.role,
        type:       type.toUpperCase(),
        content:    content.trim(),
        fileName:   fileName || null,
      },
      include: { uploader: { select: { id: true, name: true, role: true } } },
    })

    // Add to dispute timeline
    await prisma.dispute.update({
      where: { id: dispute.id },
      data:  {
        timeline: {
          push: {
            event:  'EVIDENCE_SUBMITTED',
            by:     user.name,
            role:   user.role,
            note:   type + ': ' + content.slice(0, 80),
            at:     new Date().toISOString(),
          },
        },
      },
    }).catch(() => {})  // timeline is JSONB - non-critical

    const io = req.app.get('io')
    if (io) io.to(`dispute:${dispute.id}`).emit('evidence_added', evidence)

    res.status(201).json({ evidence })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

//  POST /disputes/:id/note 
const submitNote = async (req, res) => {
  try {
    const { note, side } = req.body  // side: 'client' | 'freelancer'
    const dispute = await prisma.dispute.findUnique({ where: { id: req.params.id } })
    if (!dispute) return res.status(404).json({ error: 'Dispute not found' })

    const data = side === 'client' ? { clientNote: note } : { freelancerNote: note }
    const updated = await prisma.dispute.update({ where: { id: req.params.id }, data })

    res.json({ dispute: updated })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

//  POST /disputes/:id/resolve 
const resolveDispute = async (req, res) => {
  try {
    const { outcome, resolution, splitPercent } = req.body
    if (!['RELEASE', 'REFUND', 'SPLIT'].includes(outcome))
      return res.status(400).json({ error: 'Invalid outcome' })
    if (!resolution?.trim()) return res.status(400).json({ error: 'Resolution note required' })

    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' })

    const dispute = await prisma.dispute.findUnique({
      where:   { id: req.params.id },
      include: { job: { include: { escrows: true } } },
    })
    if (!dispute) return res.status(404).json({ error: 'Dispute not found' })
    if (dispute.status !== 'OPEN') return res.status(400).json({ error: 'Already resolved' })

    // Update dispute
    await prisma.dispute.update({
      where: { id: dispute.id },
      data:  {
        status:     'RESOLVED',
        resolution,
        outcome,
        splitPercent: splitPercent || null,
        resolvedAt:  new Date(),
        resolvedBy:  req.user.id,
      },
    })

    // Update escrow
    const lockedEscrow = dispute.job.escrows.find(e => e.status === 'LOCKED')
    if (lockedEscrow) {
      if (outcome === 'REFUND') {
        await prisma.escrow.update({ where: { id: lockedEscrow.id }, data: { status: 'REFUNDED' } })
      } else if (outcome === 'RELEASE') {
        await prisma.escrow.update({ where: { id: lockedEscrow.id }, data: { status: 'RELEASED' } })
      } else if (outcome === 'SPLIT') {
        await prisma.escrow.update({ where: { id: lockedEscrow.id }, data: { status: 'RELEASED' } })
      }
    }

    // Update job status
    const newJobStatus = outcome === 'REFUND' ? 'REFUNDED' : 'COMPLETED'
    await prisma.job.update({ where: { id: dispute.jobId }, data: { status: newJobStatus } })

    // Notify both parties
    const job = dispute.job
    const msg = `Dispute for "${job.title}" resolved: ${outcome}. ${resolution.slice(0, 100)}`
    const { notify } = require('../services/notificationService')
    await Promise.all([
      notify(job.clientId, { type: 'APPROVED', title: 'Dispute resolved', message: msg, jobId: job.id }),
      job.freelancerId && notify(job.freelancerId, { type: 'APPROVED', title: 'Dispute resolved', message: msg, jobId: job.id }),
    ])

    // Admin log
    await prisma.adminLog.create({ data: {
      adminId: req.user.id, action: 'DISPUTE_RESOLVED',
      target: 'Dispute', targetId: dispute.id,
      note: resolution,
      after: { outcome, splitPercent },
    }})

    res.json({ message: `Dispute resolved  ${outcome}` })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

module.exports = { getDisputes, raiseDispute, submitEvidence, submitNote, resolveDispute }
