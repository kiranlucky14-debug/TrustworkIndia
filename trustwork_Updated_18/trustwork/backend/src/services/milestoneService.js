// milestoneService.js  
// Status flow: LOCKED -> UNLOCKED -> SUBMITTED -> CLIENT_APPROVED -> UNDER_ADMIN_REVIEW -> RELEASED
// Rules:
//   - Only first milestone is UNLOCKED when agreement goes ACTIVE
//   - Each subsequent milestone unlocks only after previous is RELEASED
//   - Client approves submission -> enters payout queue (UNDER_ADMIN_REVIEW)
//   - Admin releases payment with 2% fee deducted
//   - Withdrawal: client can withdraw within 24h, 2% penalty of first milestone

const { prisma } = require('../config/database')
const { N }      = require('./notificationService')
const PLATFORM_FEE_RATE = 0.02

//  Internal helpers 
async function getMilestoneWithJob(milestoneId) {
  const m = await prisma.milestone.findUnique({
    where:   { id: milestoneId },
    include: { job: true, escrow: true, payoutQueue: true },
  })
  if (!m) throw { status: 404, message: 'Milestone not found' }
  return m
}

function calcFee(amount) {
  const gross = Number(amount)
  const fee   = Math.round(gross * PLATFORM_FEE_RATE * 100) / 100
  const net   = Math.round((gross - fee) * 100) / 100
  return { gross, fee, net }
}

async function _versionAgreement(agreement, changedBy, reason) {
  if (!agreement) return
  try {
    await prisma.agreementVersion.create({
      data: {
        jobId:        agreement.jobId,
        agreementId:  agreement.id,
        version:      agreement.version || 1,
        changedBy,
        changeReason: reason,
        snapshotJson: {
          status:           agreement.status,
          scope:            agreement.scope,
          deliverables:     agreement.deliverables,
          milestonesAgreed: agreement.milestonesAgreed,
          startDate:        agreement.startDate,
          endDate:          agreement.endDate,
          revisionRounds:   agreement.revisionRounds,
          paymentTerms:     agreement.paymentTerms,
          clientSignedAt:   agreement.clientSignedAt,
          freelancerSignedAt: agreement.freelancerSignedAt,
          agreedAt:         agreement.agreedAt,
        },
      },
    })
  } catch {}
}

//  CREATE / REPLACE milestones 
async function createMilestones(jobId, userId, items) {
  const job = await prisma.job.findUnique({
    where:   { id: jobId },
    include: { milestones: true, agreement: true },
  })
  if (!job)                    throw { status: 404, message: 'Job not found' }
  if (job.clientId !== userId) throw { status: 403, message: 'Only the client can set milestones' }

  const locked = job.milestones.filter(m =>
    !['LOCKED','UNLOCKED','PENDING'].includes(m.status)
  )
  if (locked.length > 0)
    throw { status: 400, message: 'Cannot replace milestones after work has started. Edit individual milestones.' }

  if (!Array.isArray(items) || items.length === 0)
    throw { status: 400, message: 'Provide at least one milestone' }

  for (const [i, m] of items.entries()) {
    if (!m.title?.trim())           throw { status: 400, message: `Milestone ${i+1}: title required` }
    if (!m.amount || Number(m.amount) <= 0) throw { status: 400, message: `Milestone ${i+1}: valid amount required` }
  }

  const total = items.reduce((s, m) => s + Number(m.amount), 0)

  // Delete old LOCKED/UNLOCKED milestones and recreate
  await prisma.milestone.deleteMany({
    where: { jobId, status: { in: ['LOCKED','UNLOCKED','PENDING'] } },
  })

  const created = []
  for (let idx = 0; idx < items.length; idx++) {
    const m = items[idx]
    const { fee, net } = calcFee(m.amount)
    created.push(await prisma.milestone.create({
      data: {
        jobId,
        title:       m.title.trim(),
        description: m.description?.trim() || null,
        deliverable: m.deliverable?.trim() || null,
        amount:      Number(m.amount),
        order:       idx + 1,
        dueDate:     m.dueDate ? new Date(m.dueDate) : null,
        // Only first milestone is UNLOCKED; rest are LOCKED
        status:      idx === 0 ? 'UNLOCKED' : 'LOCKED',
        isLocked:    idx !== 0,
        unlockedAt:  idx === 0 ? new Date() : null,
        platformFee: fee,
        netAmount:   net,
      },
    }))
  }

  await prisma.job.update({ where: { id: jobId }, data: { budget: total } })

  // If agreement was ACTIVE, version it and reset to require re-signing
  if (job.agreement && ['ACTIVE','CLIENT_SIGNED'].includes(job.agreement.status)) {
    await _versionAgreement(job.agreement, userId, 'Milestones revised by client  re-signing required')
    await prisma.workAgreement.update({
      where: { id: job.agreement.id },
      data:  {
        status:              'DRAFT',
        version:             (job.agreement.version || 1) + 1,
        superseded:          false,
        freelancerSignedAt:  null,
        freelancerSignedById: null,
        agreedAt:            null,
        freelancerSubmitConfirmedAt: null,
        milestonesAgreed: created.map(m => ({
          id: m.id, title: m.title, amount: m.amount,
          dueDate: m.dueDate, deliverable: m.deliverable,
          fee: m.platformFee, net: m.netAmount,
        })),
      },
    })
    await prisma.job.update({
      where: { id: jobId },
      data:  { agreementStatus: 'DRAFT' },
    })
    // Notify freelancer
    if (job.freelancerId) {
      await N.agreementPending(job.freelancerId, { id: jobId, title: job.title })
    }
  }

  return { milestones: created, total, agreementReset: !!job.agreement }
}

//  UNLOCK first milestone when agreement goes ACTIVE 
async function unlockFirstMilestone(jobId) {
  const first = await prisma.milestone.findFirst({
    where:   { jobId, order: 1 },
    orderBy: { order: 'asc' },
  })
  if (!first) return null
  if (!first.isLocked) return first  // already unlocked

  return prisma.milestone.update({
    where: { id: first.id },
    data:  { isLocked: false, status: 'UNLOCKED', unlockedAt: new Date() },
  })
}

//  UNLOCK next milestone after previous is RELEASED 
async function unlockNextMilestone(jobId, releasedOrder) {
  const next = await prisma.milestone.findFirst({
    where:   { jobId, order: releasedOrder + 1 },
  })
  if (!next || !next.isLocked) return null

  const updated = await prisma.milestone.update({
    where: { id: next.id },
    data:  { isLocked: false, status: 'UNLOCKED', unlockedAt: new Date() },
  })

  // Notify freelancer
  const job = await prisma.job.findUnique({
    where:  { id: jobId },
    select: { title: true, freelancerId: true },
  })
  if (job?.freelancerId) {
    await N.funded(job.freelancerId, { id: jobId, title: job.title })
  }

  return updated
}

//  ADMIN: manually unlock a specific milestone 
async function adminUnlockMilestone(milestoneId, adminId) {
  const m = await getMilestoneWithJob(milestoneId)
  const actor = await prisma.user.findUnique({ where: { id: adminId } })
  // Allow client who owns the job OR admin
  const isAdminActor  = actor?.role === 'ADMIN'
  const isClientActor = m.job.clientId === adminId
  if (!isAdminActor && !isClientActor) throw { status: 403, message: 'Only the client or admin can unlock milestones' }

  const updated = await prisma.milestone.update({
    where: { id: milestoneId },
    data:  { isLocked: false, status: 'UNLOCKED', unlockedAt: new Date() },
  })

  await prisma.adminLog.create({ data: {
    adminId, action: 'MILESTONE_UNLOCKED',
    target: 'Milestone', targetId: milestoneId,
    note: `Milestone "${m.title}" unlocked`,
  }}).catch(() => {})  // non-critical

  return { message: `Milestone "${m.title}" unlocked`, milestone: updated }
}

//  ADMIN: lock a milestone 
async function adminLockMilestone(milestoneId, adminId, reason) {
  const m = await getMilestoneWithJob(milestoneId)
  const admin = await prisma.user.findUnique({ where: { id: adminId } })
  if (!admin || admin.role !== 'ADMIN') throw { status: 403, message: 'Admin only' }

  if (['RELEASED','REFUNDED'].includes(m.status))
    throw { status: 400, message: 'Cannot lock a released or refunded milestone' }

  const updated = await prisma.milestone.update({
    where: { id: milestoneId },
    data:  { isLocked: true, status: 'LOCKED' },
  })

  await prisma.adminLog.create({ data: {
    adminId, action: 'MILESTONE_LOCKED',
    target: 'Milestone', targetId: milestoneId,
    note: reason || `Admin locked milestone "${m.title}"`,
  }})

  return { message: `Milestone "${m.title}" locked`, milestone: updated }
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

  // Freelancers see locked milestones but with amount/fee info (no edit access)
  const isFreelancer = user?.role === 'FREELANCER'

  const enriched = milestones.map(m => ({
    ...m,
    // Always show fee breakdown regardless of role
    feeBreakdown: {
      gross:       Number(m.amount),
      platformFee: Number(m.platformFee || calcFee(m.amount).fee),
      netPayout:   Number(m.netAmount   || calcFee(m.amount).net),
      feeRate:     PLATFORM_FEE_RATE,
      feePercent:  (PLATFORM_FEE_RATE * 100).toFixed(0) + '%',
    },
    canSubmit:     !isFreelancer ? false : m.status === 'FUNDED' && !m.isLocked,
    canUnlock:     (user?.role === 'CLIENT' || user?.role === 'ADMIN') && m.status === 'LOCKED',
    canApprove:    user?.role === 'CLIENT' && m.status === 'SUBMITTED',
    canAdminAction: isAdmin,
  }))

  const summary = milestones.reduce((acc, m) => {
    const a = Number(m.amount)
    acc.total    += a
    acc.locked   += m.status === 'LOCKED'    ? a : 0
    acc.unlocked += m.status === 'UNLOCKED'  ? a : 0
    acc.submitted += m.status === 'SUBMITTED' ? a : 0
    acc.clientApproved += m.status === 'CLIENT_APPROVED' ? a : 0
    acc.underReview    += m.status === 'UNDER_ADMIN_REVIEW' ? a : 0
    acc.released       += m.status === 'RELEASED' ? a : 0
    acc.refunded       += m.status === 'REFUNDED' ? a : 0
    acc.count     += 1
    acc.released_count += m.status === 'RELEASED' ? 1 : 0
    return acc
  }, { total:0, locked:0, unlocked:0, submitted:0, clientApproved:0, underReview:0, released:0, refunded:0, count:0, released_count:0 })

  return { milestones: enriched, summary, job }
}

//  EDIT single milestone 
async function editMilestone(milestoneId, userId, fields) {
  const m = await getMilestoneWithJob(milestoneId)
  if (m.job.clientId !== userId)
    throw { status: 403, message: 'Only the client can edit milestones' }
  if (!['LOCKED','UNLOCKED','PENDING'].includes(m.status))
    throw { status: 400, message: 'Only LOCKED or UNLOCKED milestones can be edited. Current: ' + m.status }

  const data = {}
  if (fields.title       != null) data.title       = String(fields.title).trim()
  if (fields.description != null) data.description = fields.description?.trim() || null
  if (fields.deliverable != null) data.deliverable = fields.deliverable?.trim() || null
  if (fields.dueDate     != null) data.dueDate = fields.dueDate ? new Date(fields.dueDate) : null
  if (fields.amount      != null) {
    if (Number(fields.amount) <= 0) throw { status: 400, message: 'Amount must be positive' }
    const { fee, net } = calcFee(fields.amount)
    data.amount     = Number(fields.amount)
    data.platformFee = fee
    data.netAmount  = net
  }

  const updated = await prisma.milestone.update({ where: { id: milestoneId }, data })

  // Recalculate job budget
  const all   = await prisma.milestone.findMany({ where: { jobId: m.jobId } })
  const total = all.reduce((s, ms) => s + Number(ms.amount), 0)
  await prisma.job.update({ where: { id: m.jobId }, data: { budget: total } })

  // If agreement is ACTIVE, reset it for re-signing
  const agreement = await prisma.workAgreement.findUnique({ where: { jobId: m.jobId } })
  if (agreement && ['ACTIVE','CLIENT_SIGNED'].includes(agreement.status)) {
    await _versionAgreement(agreement, userId, `Milestone "${m.title}" edited  budget change`)
    await prisma.workAgreement.update({
      where: { id: agreement.id },
      data:  {
        status: 'DRAFT', version: (agreement.version || 1) + 1,
        freelancerSignedAt: null, freelancerSignedById: null, agreedAt: null,
      },
    })
    await prisma.job.update({ where: { id: m.jobId }, data: { agreementStatus: 'DRAFT' } })
    if (m.job.freelancerId) {
      await N.agreementPending(m.job.freelancerId, { id: m.jobId, title: m.job.title })
    }
  }

  return { milestone: updated, jobBudget: total }
}

//  DELETE milestone 
async function deleteMilestone(milestoneId, userId) {
  const m = await getMilestoneWithJob(milestoneId)
  if (m.job.clientId !== userId)
    throw { status: 403, message: 'Only the client can delete milestones' }
  if (!['LOCKED','UNLOCKED','PENDING'].includes(m.status))
    throw { status: 400, message: 'Only LOCKED/UNLOCKED milestones can be deleted. Current: ' + m.status }

  await prisma.milestone.delete({ where: { id: milestoneId } })

  // Reorder remaining + recalculate budget + fix first unlock
  const remaining = await prisma.milestone.findMany({
    where: { jobId: m.jobId }, orderBy: { order: 'asc' },
  })
  let total = 0
  for (let i = 0; i < remaining.length; i++) {
    total += Number(remaining[i].amount)
    const updates = { order: i + 1 }
    // Ensure first is unlocked
    if (i === 0 && remaining[i].isLocked) {
      updates.isLocked = false
      updates.status   = 'UNLOCKED'
      updates.unlockedAt = new Date()
    }
    await prisma.milestone.update({ where: { id: remaining[i].id }, data: updates })
  }
  await prisma.job.update({ where: { id: m.jobId }, data: { budget: total } })

  return { message: 'Milestone deleted', remainingCount: remaining.length, jobBudget: total }
}

//  FUND milestone (escrow lock) 
async function fundMilestone(milestoneId, userId, paymentId) {
  const m = await getMilestoneWithJob(milestoneId)
  if (m.job.clientId !== userId)
    throw { status: 403, message: 'Only the client can fund milestones' }
  if (m.status !== 'UNLOCKED')
    throw { status: 400, message: 'Only UNLOCKED milestones can be funded. Current: ' + m.status }
  if (m.isLocked)
    throw { status: 400, message: 'Milestone is locked. Previous milestone must be completed first.' }
  if (m.escrow)
    throw { status: 400, message: 'Escrow already exists for this milestone' }

  const mockPaymentId = paymentId || ('pay_ms_' + Date.now())
  const { fee, net }  = calcFee(m.amount)
  const alreadyFunded = await prisma.milestone.count({
    where: { jobId: m.job.id, status: { in: ['FUNDED','SUBMITTED','CLIENT_APPROVED','UNDER_ADMIN_REVIEW','RELEASED'] } },
  })
  const newJobStatus = alreadyFunded === 0 ? 'IN_PROGRESS' : m.job.status

  const [escrow, milestone] = await prisma.$transaction([
    prisma.escrow.create({ data: {
      jobId: m.job.id, milestoneId: m.id,
      amount: m.amount, status: 'LOCKED', paymentId: mockPaymentId,
      platformFeeRate: PLATFORM_FEE_RATE, platformFee: fee, netAmount: net,
    }}),
    prisma.milestone.update({ where: { id: m.id }, data: {
      status: 'FUNDED', platformFee: fee, netAmount: net,
    }}),
    prisma.job.update({ where: { id: m.job.id }, data: { status: newJobStatus } }),
    prisma.transaction.create({ data: {
      userId, amount: m.amount, type: 'DEPOSIT', status: 'SUCCESS',
      reference: mockPaymentId, milestoneId: m.id,
      description: 'Escrow funded: ' + m.title,
    }}),
  ])

  if (m.job.freelancerId) {
    await N.funded(m.job.freelancerId, { id: m.job.id, title: m.job.title })
  }

  return { message: `"${m.title}" funded  ${m.amount} locked in escrow`, milestone, escrow }
}

//  SUBMIT milestone (freelancer) 
async function submitMilestone(milestoneId, userId, submissionNote) {
  const m = await getMilestoneWithJob(milestoneId)
  if (m.job.freelancerId !== userId)
    throw { status: 403, message: 'Only the assigned freelancer can submit milestones' }
  if (m.isLocked)
    throw { status: 400, message: 'This milestone is still locked' }
  if (m.status !== 'FUNDED')
    throw { status: 400, message: 'Only FUNDED milestones can be submitted. Current: ' + m.status }

  const updated = await prisma.milestone.update({
    where: { id: m.id },
    data:  {
      status:        'SUBMITTED',
      submittedAt:   new Date(),
      submissionNote: submissionNote?.trim() || null,
    },
  })

  // Notify client
  await N.submitted(m.job.clientId, { id: m.job.id, title: m.job.title })

  return { message: `"${m.title}" submitted for client approval`, milestone: updated }
}

//  CLIENT APPROVE  enters UNDER_ADMIN_REVIEW 
async function clientApproveMilestone(milestoneId, userId) {
  const m = await getMilestoneWithJob(milestoneId)
  if (m.job.clientId !== userId)
    throw { status: 403, message: 'Only the client can approve milestones' }
  if (m.status !== 'SUBMITTED')
    throw { status: 400, message: 'Only SUBMITTED milestones can be approved. Current: ' + m.status }
  if (!m.job.freelancerId)
    throw { status: 400, message: 'No freelancer assigned' }

  const { gross, fee, net } = calcFee(m.amount)

  const [updated, payout] = await prisma.$transaction([
    prisma.milestone.update({
      where: { id: m.id },
      data:  {
        status:          'UNDER_ADMIN_REVIEW',
        clientApprovedAt: new Date(),
        approvedById:    userId,
        payoutStatus:    'PENDING_REVIEW',
        platformFee:     fee,
        netAmount:       net,
        adminReviewAt:   new Date(),
      },
    }),
    prisma.payoutQueue.upsert({
      where: { milestoneId: m.id },
      create: {
        milestoneId: m.id, jobId: m.job.id,
        freelancerId: m.job.freelancerId,
        grossAmount: gross, platformFeeRate: PLATFORM_FEE_RATE,
        platformFee: fee, netAmount: net, status: 'PENDING_REVIEW',
      },
      update: { status: 'PENDING_REVIEW', grossAmount: gross, platformFee: fee, netAmount: net },
    }),
  ])

  // Notify freelancer: payment is in TrustWork review
  await N.approved(m.job.freelancerId, { id: m.job.id, title: m.job.title })

  return {
    message: `"${m.title}" approved  Awaiting TrustWork payment release (fee: Rs.${fee}, you receive: Rs.${net})`,
    milestone: updated, payout,
    feeBreakdown: { gross, fee, net, feeRate: PLATFORM_FEE_RATE },
  }
}

//  CLIENT REJECT milestone submission 
async function clientRejectMilestone(milestoneId, userId, rejectReason) {
  const m = await getMilestoneWithJob(milestoneId)
  if (m.job.clientId !== userId)
    throw { status: 403, message: 'Only the client can reject milestones' }
  if (m.status !== 'SUBMITTED')
    throw { status: 400, message: 'Only SUBMITTED milestones can be rejected. Current: ' + m.status }
  if (!rejectReason?.trim())
    throw { status: 400, message: 'Rejection reason is required' }

  const updated = await prisma.milestone.update({
    where: { id: m.id },
    data:  {
      status:       'FUNDED',   // Back to FUNDED so freelancer can resubmit
      rejectedAt:   new Date(),
      rejectReason: rejectReason.trim(),
      submittedAt:  null,
      submissionNote: null,
    },
  })

  // Notify freelancer
  await N.rejected(m.job.freelancerId, { id: m.job.id, title: m.job.title }, rejectReason)

  return { message: `Submission rejected. Reason sent to freelancer.`, milestone: updated }
}

//  ADMIN: approve payout  RELEASED 
async function adminReleasePayout(payoutId, adminId, adminNote) {
  const payout = await prisma.payoutQueue.findUnique({
    where:   { id: payoutId },
    include: { milestone: { include: { escrow: true, job: true } }, freelancer: true },
  })
  if (!payout) throw { status: 404, message: 'Payout not found' }
  if (payout.status !== 'PENDING_REVIEW')
    throw { status: 400, message: 'Payout is already ' + payout.status }

  const admin = await prisma.user.findUnique({ where: { id: adminId } })
  if (!admin || admin.role !== 'ADMIN') throw { status: 403, message: 'Admin only' }

  const m     = payout.milestone
  const net   = Number(payout.netAmount)
  const fee   = Number(payout.platformFee)
  const escrow = m.escrow

  // Check if this is the last milestone
  const [total, released] = await Promise.all([
    prisma.milestone.count({ where: { jobId: m.jobId } }),
    prisma.milestone.count({ where: { jobId: m.jobId, status: 'RELEASED' } }),
  ])
  const isLast = (released + 1) >= total

  const ops = [
    prisma.payoutQueue.update({
      where: { id: payoutId },
      data:  { status: 'RELEASED', adminNote: adminNote || null, reviewedById: adminId, reviewedAt: new Date() },
    }),
    prisma.milestone.update({
      where: { id: m.id },
      data:  {
        status:          'RELEASED',
        payoutStatus:    'RELEASED',
        payoutApprovedAt: new Date(),
        payoutApprovedBy: adminId,
        releasedAt:      new Date(),
      },
    }),
    // Release escrow
    ...(escrow ? [prisma.escrow.update({
      where: { id: escrow.id },
      data:  { status: 'RELEASED', platformFee: fee, netAmount: net },
    })] : []),
    // Fee transaction (platform revenue)
    prisma.transaction.create({ data: {
      userId: adminId, amount: fee, type: 'DEPOSIT', status: 'SUCCESS',
      reference: 'fee_' + payoutId, milestoneId: m.id,
      platformFee: fee, netAmount: fee,
      description: 'Platform fee: ' + m.title,
    }}),
    // Freelancer payout
    prisma.transaction.create({ data: {
      userId: m.job.freelancerId, amount: net, type: 'RELEASE', status: 'SUCCESS',
      reference: escrow?.paymentId || payoutId, milestoneId: m.id,
      platformFee: fee, netAmount: net,
      description: 'Payout released: ' + m.title,
    }}),
    // Audit log
    prisma.adminLog.create({ data: {
      adminId, action: 'PAYOUT_RELEASED',
      target: 'PayoutQueue', targetId: payoutId,
      note: adminNote || null,
      after: { milestoneId: m.id, gross: m.amount, fee, net },
    }}),
  ]

  // Unlock next milestone
  const nextMilestone = await prisma.milestone.findFirst({
    where: { jobId: m.jobId, order: m.order + 1, isLocked: true },
  })
  if (nextMilestone) {
    ops.push(prisma.milestone.update({
      where: { id: nextMilestone.id },
      data:  { isLocked: false, status: 'UNLOCKED', unlockedAt: new Date() },
    }))
  }

  if (isLast) {
    ops.push(prisma.job.update({ where: { id: m.jobId }, data: { status: 'COMPLETED' } }))
  }

  await prisma.$transaction(ops)

  // Notify freelancer
  await N.approved(m.job.freelancerId, { id: m.job.id, title: m.job.title })

  return {
    message: `Rs.${net} released to freelancer (fee: Rs.${fee}). ${nextMilestone ? 'Next milestone unlocked.' : isLast ? 'Job completed.' : ''}`,
    net, fee, nextMilestoneUnlocked: !!nextMilestone, jobCompleted: isLast,
  }
}

//  ADMIN: reject payout 
async function adminRejectPayout(payoutId, adminId, rejectNote) {
  const payout = await prisma.payoutQueue.findUnique({
    where:   { id: payoutId },
    include: { milestone: { include: { job: true } } },
  })
  if (!payout) throw { status: 404, message: 'Payout not found' }
  if (payout.status !== 'PENDING_REVIEW')
    throw { status: 400, message: 'Payout is already ' + payout.status }

  const admin = await prisma.user.findUnique({ where: { id: adminId } })
  if (!admin || admin.role !== 'ADMIN') throw { status: 403, message: 'Admin only' }
  if (!rejectNote?.trim()) throw { status: 400, message: 'Rejection note required' }

  await prisma.$transaction([
    prisma.payoutQueue.update({
      where: { id: payoutId },
      data:  { status: 'REJECTED', adminNote: rejectNote, reviewedById: adminId, reviewedAt: new Date() },
    }),
    prisma.milestone.update({
      where: { id: payout.milestoneId },
      data:  {
        status:      'SUBMITTED',   // revert so client can re-review
        payoutStatus: 'REJECTED',
        payoutRejectedAt: new Date(),
        payoutRejectNote: rejectNote,
      },
    }),
    prisma.adminLog.create({ data: {
      adminId, action: 'PAYOUT_REJECTED',
      target: 'PayoutQueue', targetId: payoutId,
      note: rejectNote,
    }}),
  ])

  // Notify both parties
  const job = payout.milestone.job
  await N.rejected(job.freelancerId, { id: job.id, title: job.title }, rejectNote)

  return { message: 'Payout rejected. Milestone returned to SUBMITTED for client re-review.' }
}

//  ADMIN: get payout queue 
async function getPayoutQueue(filters = {}) {
  const where = {}
  if (filters.status)       where.status       = filters.status
  if (filters.freelancerId) where.freelancerId  = filters.freelancerId

  return prisma.payoutQueue.findMany({
    where,
    include: {
      milestone: { select: {
        id: true, title: true, amount: true, status: true, order: true,
        submittedAt: true, clientApprovedAt: true, submissionNote: true,
        dueDate: true, deliverable: true,
      }},
      job: { select: { id: true, title: true, status: true,
        client:     { select: { id: true, name: true } },
        freelancer: { select: { id: true, name: true } },
      }},
      freelancer: { select: { id: true, name: true, rating: true, trustScore: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
}

//  REFUND milestone 
async function refundMilestone(milestoneId, userId) {
  const m = await getMilestoneWithJob(milestoneId)
  const user    = await prisma.user.findUnique({ where: { id: userId } })
  const isAdmin  = user?.role === 'ADMIN'
  const isClient = m.job.clientId === userId

  if (!isAdmin && !isClient) throw { status: 403, message: 'Only admin or client can refund' }
  if (!['FUNDED','SUBMITTED','UNDER_ADMIN_REVIEW','CLIENT_APPROVED'].includes(m.status))
    throw { status: 400, message: 'Cannot refund at status: ' + m.status }
  if (!m.escrow || m.escrow.status !== 'LOCKED')
    throw { status: 400, message: 'No locked escrow for this milestone' }

  await prisma.$transaction([
    prisma.escrow.update({ where: { id: m.escrow.id }, data: { status: 'REFUNDED' } }),
    prisma.milestone.update({ where: { id: m.id }, data: {
      status: 'REFUNDED', payoutStatus: 'UNPAID',
    }}),
    ...(m.payoutQueue ? [prisma.payoutQueue.update({
      where: { id: m.payoutQueue.id }, data: { status: 'REJECTED' },
    })] : []),
    prisma.transaction.create({ data: {
      userId: m.job.clientId, amount: m.amount, type: 'REFUND', status: 'SUCCESS',
      reference: m.escrow.paymentId || milestoneId, milestoneId: m.id,
      description: 'Refund: ' + m.title,
    }}),
  ])

  return { message: `Rs.${m.amount} refunded for "${m.title}"` }
}

//  JOB WITHDRAWAL 
async function withdrawJob(jobId, userId, reason) {
  const job = await prisma.job.findUnique({
    where:   { id: jobId },
    include: { milestones: { include: { escrow: true } }, agreement: true },
  })
  if (!job)                    throw { status: 404, message: 'Job not found' }
  if (job.clientId !== userId) throw { status: 403, message: 'Only the client can withdraw a job' }
  if (!['ASSIGNED','FUNDED','IN_PROGRESS'].includes(job.status))
    throw { status: 400, message: 'Job cannot be withdrawn at status: ' + job.status }
  if (!job.agreement || job.agreement.status !== 'ACTIVE')
    throw { status: 400, message: 'Job must have an active agreement to withdraw' }
  if (!reason?.trim())
    throw { status: 400, message: 'Withdrawal reason is required' }

  const now         = new Date()
  const agreedAt    = job.agreement.agreedAt || job.agreement.clientSignedAt
  const hoursElapsed = agreedAt ? (now - new Date(agreedAt)) / (1000 * 60 * 60) : 999
  const isWithin24h  = hoursElapsed <= 24

  const firstMilestone = job.milestones.find(m => m.order === 1)
  const penalty = isWithin24h && firstMilestone
    ? Math.round(Number(firstMilestone.amount) * PLATFORM_FEE_RATE * 100) / 100
    : 0

  // Find all locked escrows to refund
  const lockedEscrows = job.milestones
    .filter(m => m.escrow && m.escrow.status === 'LOCKED')
    .map(m => m.escrow)
  const totalEscrow = lockedEscrows.reduce((s, e) => s + Number(e.amount), 0)
  const refundAmount = Math.max(0, totalEscrow - penalty)

  const ops = [
    prisma.job.update({ where: { id: jobId }, data: {
      status:        'JOB_WITHDRAWN',
      withdrawnAt:   now,
      withdrawReason: reason.trim(),
      withdrawnById: userId,
    }}),
    ...lockedEscrows.map(e => prisma.escrow.update({
      where: { id: e.id }, data: { status: 'REFUNDED' },
    })),
    ...job.milestones
      .filter(m => ['LOCKED','UNLOCKED','FUNDED','SUBMITTED'].includes(m.status))
      .map(m => prisma.milestone.update({
        where: { id: m.id }, data: { status: 'REFUNDED' },
      })),
    prisma.adminLog.create({ data: {
      adminId: userId, action: 'JOB_WITHDRAWN',
      target: 'Job', targetId: jobId,
      note: `Client withdrew job. Reason: ${reason}. Penalty: Rs.${penalty}. Refund: Rs.${refundAmount}`,
      after: { penalty, refundAmount, hoursElapsed, isWithin24h },
    }}),
  ]

  if (lockedEscrows.length > 0) {
    ops.push(prisma.transaction.create({ data: {
      userId, amount: refundAmount, type: 'REFUND', status: 'SUCCESS',
      reference: 'withdrawal_' + jobId,
      description: `Job withdrawal refund. Penalty: Rs.${penalty}`,
    }}))
  }

  await prisma.$transaction(ops)

  // Notify freelancer
  if (job.freelancerId) {
    const { notify } = require('./notificationService')
    await notify(job.freelancerId, {
      type:    'REJECTED',
      title:   'Job has been withdrawn',
      message: `Client has withdrawn the job "${job.title}". ${refundAmount > 0 ? `Refund of Rs.${refundAmount} processed.` : ''}`,
      jobId,
    })
  }

  return {
    message:       `Job withdrawn. ${refundAmount > 0 ? `Rs.${refundAmount} refund processed.` : 'No escrow to refund.'}`,
    penalty,
    refundAmount,
    hoursElapsed:  Math.round(hoursElapsed * 10) / 10,
    isWithin24h,
  }
}


//  SYNC Agreement milestones -> Milestone table 
// Called when client signs agreement or sends amendment
// Only creates/updates LOCKED and UNLOCKED milestones (not funded/submitted ones)
async function syncAgreementMilestones(jobId, milestonesAgreed, userId) {
  if (!Array.isArray(milestonesAgreed) || milestonesAgreed.length === 0) return

  // Get existing milestones - only touch LOCKED and UNLOCKED ones
  const existing = await prisma.milestone.findMany({
    where: { jobId, status: { in: ['LOCKED','UNLOCKED','PENDING'] } },
  })

  // Build set of existing IDs that are in the agreement
  const agreementIds = new Set(milestonesAgreed.filter(m => m.id).map(m => m.id))

  // Delete removed LOCKED/UNLOCKED milestones
  for (const ex of existing) {
    if (!agreementIds.has(ex.id)) {
      await prisma.milestone.delete({ where: { id: ex.id } }).catch(() => {})
    }
  }

  // Upsert each agreed milestone
  const total = milestonesAgreed.reduce((s, m) => s + Number(m.amount || 0), 0)
  for (let idx = 0; idx < milestonesAgreed.length; idx++) {
    const m = milestonesAgreed[idx]
    if (!m.title?.trim() || !m.amount) continue
    const { fee, net } = calcFee(m.amount)

    if (m.id) {
      // Update existing
      const exists = existing.find(e => e.id === m.id)
      if (exists) {
        await prisma.milestone.update({
          where: { id: m.id },
          data: {
            title:       m.title.trim(),
            description: m.description?.trim() || null,
            deliverable: m.deliverable?.trim() || null,
            amount:      Number(m.amount),
            dueDate:     m.dueDate ? new Date(m.dueDate) : null,
            order:       idx + 1,
            platformFee: fee,
            netAmount:   net,
          },
        }).catch(() => {})
      }
    } else {
      // Create new
      await prisma.milestone.create({
        data: {
          jobId,
          title:       m.title.trim(),
          description: m.description?.trim() || null,
          deliverable: m.deliverable?.trim() || null,
          amount:      Number(m.amount),
          order:       idx + 1,
          dueDate:     m.dueDate ? new Date(m.dueDate) : null,
          status:      idx === 0 ? 'UNLOCKED' : 'LOCKED',
          isLocked:    idx !== 0,
          unlockedAt:  idx === 0 ? new Date() : null,
          platformFee: fee,
          netAmount:   net,
        },
      }).catch(() => {})
    }
  }

  // Update job budget
  if (total > 0) {
    await prisma.job.update({ where: { id: jobId }, data: { budget: total } }).catch(() => {})
  }
}

// Internal version snapshot helper (exposed for agreementController)
async function _versionAgreementInternal(agreement, changedBy, reason) {
  return _versionAgreement(agreement, changedBy, reason)
}

module.exports = {
  createMilestones,
  editMilestone,
  deleteMilestone,
  getMilestones,
  fundMilestone,
  submitMilestone,
  clientApproveMilestone,
  clientRejectMilestone,
  adminReleasePayout,
  adminRejectPayout,
  getPayoutQueue,
  refundMilestone,
  unlockFirstMilestone,
  unlockNextMilestone,
  adminUnlockMilestone,
  adminLockMilestone,
  withdrawJob,
  syncAgreementMilestones,
  _versionAgreementInternal,
}
