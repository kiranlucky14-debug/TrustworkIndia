// milestoneService.js  
// Full milestone lifecycle: PENDING -> FUNDED -> SUBMITTED -> PENDING_REVIEW -> APPROVED -> RELEASED
// Platform fee: 2% deducted on payout approval before freelancer receives funds

const { prisma } = require('../config/database')
const PLATFORM_FEE_RATE = 0.02

//  Internal helper 
async function getMilestoneWithJob(milestoneId) {
  const m = await prisma.milestone.findUnique({
    where:   { id: milestoneId },
    include: { job: true, escrow: true, payoutQueue: true },
  })
  if (!m) throw { status: 404, message: 'Milestone not found' }
  return m
}

//  CREATE / REPLACE milestones 
async function createMilestones(jobId, userId, items) {
  const job = await prisma.job.findUnique({
    where:   { id: jobId },
    include: { milestones: true, agreement: true },
  })
  if (!job)                    throw { status: 404, message: 'Job not found' }
  if (job.clientId !== userId) throw { status: 403, message: 'Only the client can set milestones' }
  if (!['CREATED','ASSIGNED','IN_PROGRESS'].includes(job.status))
    throw { status: 400, message: 'Cannot set milestones at this job stage' }
  if (!Array.isArray(items) || items.length === 0)
    throw { status: 400, message: 'Provide at least one milestone' }

  // If any milestone is past PENDING, prevent full replacement
  const locked = job.milestones.filter(m => !['PENDING'].includes(m.status))
  if (locked.length > 0)
    throw { status: 400, message: 'Cannot replace milestones after funding has started. Edit individual milestones instead.' }

  for (const [i, m] of items.entries()) {
    if (!m.title?.trim())  throw { status: 400, message: `Milestone ${i+1}: title required` }
    if (!m.amount || Number(m.amount) <= 0)
      throw { status: 400, message: `Milestone ${i+1}: valid amount required` }
  }

  const ops = [
    prisma.milestone.deleteMany({ where: { jobId } }),
    ...items.map((m, idx) => prisma.milestone.create({
      data: {
        jobId,
        title:       m.title.trim(),
        description: m.description?.trim() || null,
        deliverable: m.deliverable?.trim() || null,
        amount:      Number(m.amount),
        order:       idx + 1,
        dueDate:     m.dueDate ? new Date(m.dueDate) : null,
        status:      'PENDING',
      },
    })),
  ]

  const total = items.reduce((s, m) => s + Number(m.amount), 0)
  ops.push(prisma.job.update({ where: { id: jobId }, data: { budget: total } }))

  const results = await prisma.$transaction(ops)
  const milestones = results.slice(1, -1)

  // If agreement is ACTIVE, mark it superseded and create a version snapshot
  if (job.agreement && ['ACTIVE','CLIENT_SIGNED'].includes(job.agreement.status)) {
    await _versionAgreement(job.agreement, userId, 'Milestones revised by client')
    await prisma.workAgreement.update({
      where: { id: job.agreement.id },
      data: {
        status:    'DRAFT',
        superseded: false,
        version:   (job.agreement.version || 1) + 1,
        milestonesAgreed: JSON.stringify(milestones.map(m => ({
          id: m.id, title: m.title, amount: m.amount, dueDate: m.dueDate,
          deliverable: m.deliverable,
        }))),
        // Reset freelancer signature  needs re-sign
        freelancerSignedAt:   null,
        freelancerSignedById: null,
        agreedAt:             null,
        freelancerSubmitConfirmedAt: null,
      },
    })
    await prisma.job.update({ where: { id: jobId }, data: { agreementStatus: 'DRAFT' } })
  }

  return { milestones, jobBudget: total, total, agreementReset: !!job.agreement }
}

// Internal: snapshot an agreement before it's modified
async function _versionAgreement(agreement, changedBy, reason) {
  await prisma.agreementVersion.create({
    data: {
      jobId:        agreement.jobId,
      agreementId:  agreement.id,
      version:      agreement.version || 1,
      changedBy,
      changeReason: reason,
      snapshotJson: {
        status:             agreement.status,
        scope:              agreement.scope,
        deliverables:       agreement.deliverables,
        milestonesAgreed:   agreement.milestonesAgreed,
        startDate:          agreement.startDate,
        endDate:            agreement.endDate,
        revisionRounds:     agreement.revisionRounds,
        paymentTerms:       agreement.paymentTerms,
        clientSignedAt:     agreement.clientSignedAt,
        freelancerSignedAt: agreement.freelancerSignedAt,
        agreedAt:           agreement.agreedAt,
      },
    },
  })
}

//  EDIT single milestone 
async function editMilestone(milestoneId, userId, fields) {
  const m = await getMilestoneWithJob(milestoneId)
  if (m.job.clientId !== userId)
    throw { status: 403, message: 'Only the client can edit milestones' }
  if (m.status !== 'PENDING')
    throw { status: 400, message: 'Only PENDING milestones can be edited' }

  const data = {}
  if (fields.title       !== undefined) data.title       = String(fields.title).trim()
  if (fields.description !== undefined) data.description = fields.description?.trim() || null
  if (fields.deliverable !== undefined) data.deliverable = fields.deliverable?.trim() || null
  if (fields.amount      !== undefined) {
    if (Number(fields.amount) <= 0) throw { status: 400, message: 'Amount must be positive' }
    data.amount = Number(fields.amount)
  }
  if (fields.dueDate     !== undefined) data.dueDate = fields.dueDate ? new Date(fields.dueDate) : null

  const updated = await prisma.milestone.update({ where: { id: milestoneId }, data })

  // Recalculate job budget
  const allMilestones = await prisma.milestone.findMany({ where: { jobId: m.jobId } })
  const total = allMilestones.reduce((s, ms) => s + Number(ms.amount), 0)
  await prisma.job.update({ where: { id: m.jobId }, data: { budget: total } })

  return { milestone: updated, jobBudget: total }
}

//  DELETE single milestone 
async function deleteMilestone(milestoneId, userId) {
  const m = await getMilestoneWithJob(milestoneId)
  if (m.job.clientId !== userId)
    throw { status: 403, message: 'Only the client can delete milestones' }
  if (m.status !== 'PENDING')
    throw { status: 400, message: 'Only PENDING milestones can be deleted' }

  await prisma.milestone.delete({ where: { id: milestoneId } })

  // Reorder remaining + recalculate budget
  const remaining = await prisma.milestone.findMany({
    where:   { jobId: m.jobId },
    orderBy: { order: 'asc' },
  })
  let total = 0
  await prisma.$transaction(
    remaining.map((ms, idx) => {
      total += Number(ms.amount)
      return prisma.milestone.update({ where: { id: ms.id }, data: { order: idx + 1 } })
    })
  )
  await prisma.job.update({ where: { id: m.jobId }, data: { budget: total } })

  return { message: 'Milestone deleted', remainingCount: remaining.length, jobBudget: total }
}

//  GET milestones 
async function getMilestones(jobId, userId) {
  const job  = await prisma.job.findUnique({ where: { id: jobId } })
  if (!job) throw { status: 404, message: 'Job not found' }

  const user    = await prisma.user.findUnique({ where: { id: userId } })
  const isParty = job.clientId === userId || job.freelancerId === userId
  const isAdmin = user?.role === 'ADMIN'
  if (!isParty && !isAdmin) throw { status: 403, message: 'Access denied' }

  const milestones = await prisma.milestone.findMany({
    where:   { jobId },
    include: { escrow: true, payoutQueue: true },
    orderBy: { order: 'asc' },
  })

  const summary = milestones.reduce((acc, m) => {
    acc.total        += Number(m.amount)
    acc.pending      += m.status === 'PENDING'       ? Number(m.amount) : 0
    acc.funded       += m.status === 'FUNDED'        ? Number(m.amount) : 0
    acc.submitted    += m.status === 'SUBMITTED'     ? Number(m.amount) : 0
    acc.pendingReview += m.status === 'PENDING_REVIEW' ? Number(m.amount) : 0
    acc.approved     += m.status === 'APPROVED'      ? Number(m.amount) : 0
    acc.released     += m.status === 'RELEASED'      ? Number(m.amount) : 0
    acc.refunded     += m.status === 'REFUNDED'      ? Number(m.amount) : 0
    return acc
  }, { total:0, pending:0, funded:0, submitted:0, pendingReview:0, approved:0, released:0, refunded:0 })

  return { milestones, summary }
}

//  FUND milestone 
async function fundMilestone(milestoneId, userId, paymentId) {
  const m = await getMilestoneWithJob(milestoneId)
  if (m.job.clientId !== userId)
    throw { status: 403, message: 'Only the client can fund milestones' }
  if (m.status !== 'PENDING')
    throw { status: 400, message: 'Only PENDING milestones can be funded. Current: ' + m.status }
  if (m.escrow)
    throw { status: 400, message: 'Escrow already exists for this milestone' }
  if (!['ASSIGNED','IN_PROGRESS','FUNDED'].includes(m.job.status))
    throw { status: 400, message: 'Job must be ASSIGNED or IN_PROGRESS to fund milestones' }

  const mockPaymentId = paymentId || ('pay_mock_ms_' + Date.now())
  const alreadyFunded = await prisma.milestone.count({
    where: { jobId: m.job.id, status: { in: ['FUNDED','SUBMITTED','PENDING_REVIEW','APPROVED','RELEASED'] } },
  })
  const newJobStatus = alreadyFunded === 0 ? 'IN_PROGRESS' : m.job.status

  const [escrow, milestone, , txn] = await prisma.$transaction([
    prisma.escrow.create({ data: {
      jobId: m.job.id, milestoneId: m.id,
      amount: m.amount, status: 'LOCKED', paymentId: mockPaymentId,
      platformFeeRate: PLATFORM_FEE_RATE,
    }}),
    prisma.milestone.update({ where: { id: m.id }, data: { status: 'FUNDED' } }),
    prisma.job.update({ where: { id: m.job.id }, data: { status: newJobStatus } }),
    prisma.transaction.create({ data: {
      userId: userId, amount: m.amount,
      type: 'DEPOSIT', status: 'SUCCESS',
      reference: mockPaymentId, milestoneId: m.id,
      description: 'Escrow funded: ' + m.title,
    }}),
  ])

  return { message: `"${m.title}" funded  ${m.amount} locked in escrow`, milestone, escrow }
}

//  SUBMIT milestone (freelancer) 
async function submitMilestone(milestoneId, userId, submissionNote) {
  const m = await getMilestoneWithJob(milestoneId)
  if (m.job.freelancerId !== userId)
    throw { status: 403, message: 'Only the assigned freelancer can submit milestones' }
  if (m.status !== 'FUNDED')
    throw { status: 400, message: 'Only FUNDED milestones can be submitted. Current: ' + m.status }

  const updated = await prisma.milestone.update({
    where: { id: m.id },
    data: {
      status:        'SUBMITTED',
      submittedAt:   new Date(),
      submissionNote: submissionNote?.trim() || null,
    },
  })

  return { message: `"${m.title}" submitted for client approval`, milestone: updated }
}

//  APPROVE milestone (client)  enters payout queue 
async function approveMilestone(milestoneId, userId) {
  const m = await getMilestoneWithJob(milestoneId)
  if (m.job.clientId !== userId)
    throw { status: 403, message: 'Only the client can approve milestones' }
  if (m.status !== 'SUBMITTED')
    throw { status: 400, message: 'Only SUBMITTED milestones can be approved. Current: ' + m.status }
  if (!m.job.freelancerId)
    throw { status: 400, message: 'No freelancer assigned to this job' }

  const gross      = Number(m.amount)
  const fee        = Math.round(gross * PLATFORM_FEE_RATE * 100) / 100
  const net        = gross - fee

  const [updated, payout] = await prisma.$transaction([
    prisma.milestone.update({
      where: { id: m.id },
      data: {
        status:      'PENDING_REVIEW',
        approvedAt:  new Date(),
        approvedById: userId,
        payoutStatus: 'PENDING_REVIEW',
        platformFee: fee,
        netAmount:   net,
      },
    }),
    prisma.payoutQueue.create({ data: {
      milestoneId:     m.id,
      jobId:           m.job.id,
      freelancerId:    m.job.freelancerId,
      grossAmount:     gross,
      platformFeeRate: PLATFORM_FEE_RATE,
      platformFee:     fee,
      netAmount:       net,
      status:          'PENDING_REVIEW',
    }}),
  ])

  return {
    message: `"${m.title}" approved  entered payout review queue (${fee} fee, ${net} net)`,
    milestone: updated,
    payout,
  }
}

//  ADMIN: approve payout 
async function adminApprovePayout(payoutId, adminId, adminNote) {
  const payout = await prisma.payoutQueue.findUnique({
    where:   { id: payoutId },
    include: {
      milestone: { include: { escrow: true, job: true } },
      freelancer: { select: { id: true, name: true } },
    },
  })
  if (!payout) throw { status: 404, message: 'Payout not found' }
  if (payout.status !== 'PENDING_REVIEW')
    throw { status: 400, message: 'Payout is already ' + payout.status }

  const admin = await prisma.user.findUnique({ where: { id: adminId } })
  if (!admin || admin.role !== 'ADMIN')
    throw { status: 403, message: 'Admin access required' }

  const m        = payout.milestone
  const escrow   = m.escrow
  const net      = Number(payout.netAmount)
  const fee      = Number(payout.platformFee)
  const [totalCount, releasedCount] = await Promise.all([
    prisma.milestone.count({ where: { jobId: m.jobId } }),
    prisma.milestone.count({ where: { jobId: m.jobId, status: 'RELEASED' } }),
  ])
  const isLast = (releasedCount + 1) >= totalCount

  const ops = [
    // Update payout queue
    prisma.payoutQueue.update({ where: { id: payoutId }, data: {
      status: 'RELEASED', adminNote: adminNote || null,
      reviewedById: adminId, reviewedAt: new Date(),
    }}),
    // Update milestone
    prisma.milestone.update({ where: { id: m.id }, data: {
      status: 'RELEASED', payoutStatus: 'RELEASED',
      payoutApprovedAt: new Date(), payoutApprovedBy: adminId,
    }}),
    // Update escrow
    ...(escrow ? [prisma.escrow.update({ where: { id: escrow.id }, data: {
      status: 'RELEASED', platformFee: fee, netAmount: net,
      platformFeeRate: payout.platformFeeRate,
    }})] : []),
    // Platform fee transaction (TrustWork revenue)
    prisma.transaction.create({ data: {
      userId: adminId, amount: fee, type: 'DEPOSIT', status: 'SUCCESS',
      reference: 'fee_' + payoutId, milestoneId: m.id,
      description: 'Platform fee: ' + m.title,
      platformFee: fee, netAmount: fee,
    }}),
    // Freelancer payout transaction (net amount)
    prisma.transaction.create({ data: {
      userId: m.job.freelancerId, amount: net, type: 'RELEASE', status: 'SUCCESS',
      reference: escrow?.paymentId || payoutId, milestoneId: m.id,
      description: 'Payout: ' + m.title,
      platformFee: fee, netAmount: net,
    }}),
    // Log admin action
    prisma.adminLog.create({ data: {
      adminId, action: 'PAYOUT_APPROVED',
      target: 'PayoutQueue', targetId: payoutId,
      note: adminNote || null,
      after: { milestoneId: m.id, net, fee },
    }}),
  ]

  if (isLast) ops.push(
    prisma.job.update({ where: { id: m.jobId }, data: { status: 'COMPLETED' } })
  )

  await prisma.$transaction(ops)

  return {
    message: `Payout approved. ${net} released to freelancer (fee: ${fee}).`,
    net, fee, jobCompleted: isLast,
  }
}

//  ADMIN: reject payout 
async function adminRejectPayout(payoutId, adminId, rejectNote) {
  const payout = await prisma.payoutQueue.findUnique({
    where:   { id: payoutId },
    include: { milestone: true },
  })
  if (!payout) throw { status: 404, message: 'Payout not found' }
  if (payout.status !== 'PENDING_REVIEW')
    throw { status: 400, message: 'Payout is already ' + payout.status }

  const admin = await prisma.user.findUnique({ where: { id: adminId } })
  if (!admin || admin.role !== 'ADMIN')
    throw { status: 403, message: 'Admin access required' }

  await prisma.$transaction([
    prisma.payoutQueue.update({ where: { id: payoutId }, data: {
      status: 'REJECTED', adminNote: rejectNote || null,
      reviewedById: adminId, reviewedAt: new Date(),
    }}),
    prisma.milestone.update({ where: { id: payout.milestoneId }, data: {
      status: 'APPROVED',  // revert to APPROVED so admin can re-review
      payoutStatus: 'REJECTED',
      payoutRejectedAt: new Date(),
      payoutRejectNote: rejectNote || null,
    }}),
    prisma.adminLog.create({ data: {
      adminId, action: 'PAYOUT_REJECTED',
      target: 'PayoutQueue', targetId: payoutId,
      note: rejectNote || null,
    }}),
  ])

  return { message: 'Payout rejected. Milestone returned to APPROVED for re-review.' }
}

//  GET payout queue (admin) 
async function getPayoutQueue(filters = {}) {
  const where = {}
  if (filters.status) where.status = filters.status
  if (filters.freelancerId) where.freelancerId = filters.freelancerId

  const payouts = await prisma.payoutQueue.findMany({
    where,
    include: {
      milestone: { select: {
        id:true, title:true, amount:true, status:true,
        submittedAt:true, approvedAt:true, submissionNote:true,
      }},
      job: { select: { id:true, title:true, status:true,
        client:     { select:{ id:true, name:true } },
        freelancer: { select:{ id:true, name:true } },
      }},
      freelancer: { select: { id:true, name:true, rating:true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return payouts
}

//  REFUND milestone (admin/client dispute) 
async function refundMilestone(milestoneId, userId) {
  const m = await getMilestoneWithJob(milestoneId)
  const user = await prisma.user.findUnique({ where: { id: userId } })
  const isAdmin  = user?.role === 'ADMIN'
  const isClient = m.job.clientId === userId

  if (!isAdmin && !isClient)
    throw { status: 403, message: 'Only admin or client can refund a milestone' }
  if (!['FUNDED','SUBMITTED','PENDING_REVIEW'].includes(m.status))
    throw { status: 400, message: 'Milestone cannot be refunded at status: ' + m.status }
  if (!m.escrow || m.escrow.status !== 'LOCKED')
    throw { status: 400, message: 'No locked escrow found for this milestone' }

  await prisma.$transaction([
    prisma.escrow.update({ where: { id: m.escrow.id }, data: { status: 'REFUNDED' } }),
    prisma.milestone.update({ where: { id: m.id }, data: {
      status: 'REFUNDED', payoutStatus: 'UNPAID',
    }}),
    ...(m.payoutQueue ? [prisma.payoutQueue.update({
      where: { id: m.payoutQueue.id }, data: { status: 'REJECTED' },
    })] : []),
    prisma.transaction.create({ data: {
      userId: m.job.clientId, amount: m.amount,
      type: 'REFUND', status: 'SUCCESS',
      reference: m.escrow.paymentId || milestoneId,
      milestoneId: m.id,
      description: 'Refund: ' + m.title,
    }}),
  ])

  return { message: `${m.amount} refunded to client for "${m.title}"` }
}

module.exports = {
  createMilestones, editMilestone, deleteMilestone,
  getMilestones, fundMilestone,
  submitMilestone, approveMilestone,
  adminApprovePayout, adminRejectPayout, getPayoutQueue,
  refundMilestone,
}
