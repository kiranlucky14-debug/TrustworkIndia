const { prisma } = require('../config/database')
const {
  validateSectionA, validateSectionB,
  validateClientChecklist, validateFreelancerChecklist,
} = require('../validators/agreementValidator')
const { generateAgreementHtml }  = require('../services/agreementPdfService')
const { unlockFirstMilestone }    = require('../services/milestoneService')
const { N } = require('../services/notificationService')

// helper - load job and verify party membership
async function loadJob(jobId, userId) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { agreement: true },
  })
  if (!job) return { error: 'Job not found', status: 404 }
  const isClient     = job.clientId     === userId
  const isFreelancer = job.freelancerId === userId
  const isAdmin      = false // set from req.user.role if needed
  if (!isClient && !isFreelancer)
    return { error: 'You are not a party to this job', status: 403 }
  return { job, isClient, isFreelancer }
}

// GET /agreements/:jobId
const getAgreement = async (req, res) => {
  try {
    const { jobId } = req.params
    const { error, status, job } = await loadJob(jobId, req.user.id)
    if (error) return res.status(status).json({ error })

    const agreement = job.agreement || null
    res.json({ agreement, job: { id: job.id, title: job.title, budget: job.budget, status: job.status, clientId: job.clientId, freelancerId: job.freelancerId } })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// POST /agreements/:jobId   client creates the agreement
const createAgreement = async (req, res) => {
  try {
    const { jobId } = req.params
    const { error, status, job, isClient } = await loadJob(jobId, req.user.id)
    if (error) return res.status(status).json({ error })
    if (!isClient) return res.status(403).json({ error: 'Only the client can create the agreement' })
    if (job.status !== 'ASSIGNED') return res.status(400).json({ error: 'Agreement can only be created after freelancer is assigned' })
    if (job.agreement) return res.status(409).json({ error: 'Agreement already exists for this job' })

    const agreement = await prisma.workAgreement.create({
      data: { jobId, status: 'DRAFT' },
    })
    await prisma.job.update({ where: { id: jobId }, data: { agreementStatus: 'DRAFT' } })
    res.status(201).json(agreement)
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// PATCH /agreements/:jobId/draft   client saves draft (A + B fields)
const saveDraft = async (req, res) => {
  try {
    const { jobId } = req.params
    const { error, status, job, isClient } = await loadJob(jobId, req.user.id)
    if (error) return res.status(status).json({ error })
    if (!isClient) return res.status(403).json({ error: 'Only the client can edit the agreement' })
    if (!job.agreement) return res.status(404).json({ error: 'No agreement found  create one first' })
    if (!['DRAFT', 'CHANGES_REQUESTED'].includes(job.agreement.status))
      return res.status(400).json({ error: 'Agreement cannot be edited in its current status' })

    const {
      scope, deliverables, startDate, endDate,
      revisionRounds, revisionPolicy, paymentTerms, specialConditions,
      milestonesAgreed,
    } = req.body

    const updated = await prisma.workAgreement.update({
      where: { jobId },
      data: {
        scope:             scope             || null,
        deliverables:      deliverables      || [],
        startDate:         startDate         ? new Date(startDate)  : null,
        endDate:           endDate           ? new Date(endDate)    : null,
        revisionRounds:    revisionRounds != null ? parseInt(revisionRounds) : 2,
        revisionPolicy:    revisionPolicy    || null,
        paymentTerms:      paymentTerms      || null,
        specialConditions: specialConditions || null,
        milestonesAgreed:  milestonesAgreed  || [],
      },
    })
    // Sync milestones to DB so they immediately appear in Job Details + Milestones page
    if (Array.isArray(milestonesAgreed) && milestonesAgreed.length > 0) {
      try {
        const { syncAgreementMilestones } = require('../services/milestoneService')
        await syncAgreementMilestones(jobId, milestonesAgreed, req.user.id)
      } catch (e) { console.warn('Milestone sync:', e.message) }
    }
    res.json(updated)
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// POST /agreements/:jobId/client-sign   client validates + signs A + B + D (client half)
const clientSign = async (req, res) => {
  try {
    const { jobId } = req.params
    const { error, status, job, isClient } = await loadJob(jobId, req.user.id)
    if (error) return res.status(status).json({ error })
    if (!isClient) return res.status(403).json({ error: 'Only the client can sign here' })
    if (!job.agreement) return res.status(404).json({ error: 'No agreement found' })
    if (!['DRAFT', 'CHANGES_REQUESTED'].includes(job.agreement.status))
      return res.status(400).json({ error: 'Agreement already signed or not in draft' })

    // Validate A
    const a = validateSectionA(job.agreement)
    if (!a.valid) return res.status(400).json({ error: 'Complete Section A first', errors: a.errors })

    // Validate B
    const b = validateSectionB(job.agreement)
    if (!b.valid) return res.status(400).json({ error: 'Complete Section B first', errors: b.errors })

    // Validate client checklist D
    const { clientChecklist } = req.body
    if (!clientChecklist) return res.status(400).json({ error: 'Client checklist (Section D) is required' })
    const d = validateClientChecklist(clientChecklist)
    if (!d.valid) return res.status(400).json({ error: 'Complete all checklist items', errors: d.errors })

    const updated = await prisma.workAgreement.update({
      where: { jobId },
      data: {
        clientChecklist,
        clientSignedAt:  new Date(),
        clientSignedById: req.user.id,
        status: 'CLIENT_SIGNED',
      },
    })
    await prisma.job.update({ where: { id: jobId }, data: { agreementStatus: 'CLIENT_SIGNED' } })
    // Sync milestones from agreement to Milestone table
    try {
      const { syncAgreementMilestones } = require('../services/milestoneService')
      await syncAgreementMilestones(jobId, job.agreement.milestonesAgreed || [], req.user.id)
    } catch {}
    // Notify freelancer
    await N.agreementPending(job.freelancerId, { id: job.id, title: job.title })
    res.json({ message: 'Agreement signed. Awaiting freelancer review.', agreement: updated })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// POST /agreements/:jobId/freelancer-sign  freelancer reviews + signs A+B+C+D
const freelancerSign = async (req, res) => {
  try {
    const { jobId } = req.params
    const { error, status, job, isFreelancer } = await loadJob(jobId, req.user.id)
    if (error) return res.status(status).json({ error })
    if (!isFreelancer) return res.status(403).json({ error: 'Only the assigned freelancer can sign here' })
    if (!job.agreement) return res.status(404).json({ error: 'No agreement found' })
    if (job.agreement.status !== 'CLIENT_SIGNED')
      return res.status(400).json({ error: 'Client must sign first' })

    const { freelancerChecklist, escrowTermsAccepted } = req.body

    // Validate freelancer checklist D
    if (!freelancerChecklist) return res.status(400).json({ error: 'Freelancer checklist is required' })
    const d = validateFreelancerChecklist(freelancerChecklist)
    if (!d.valid) return res.status(400).json({ error: 'Complete all checklist items', errors: d.errors })

    // Validate C  escrow terms
    if (!escrowTermsAccepted)
      return res.status(400).json({ error: 'You must accept the escrow release terms (Section C)' })

    const now = new Date()
    const updated = await prisma.workAgreement.update({
      where: { jobId },
      data: {
        freelancerChecklist,
        escrowTermsAccepted: true,
        freelancerSignedAt:  now,
        freelancerSignedById: req.user.id,
        agreedAt:   now,
        status:     'ACTIVE',
      },
    })
    await prisma.job.update({ where: { id: jobId }, data: { agreementStatus: 'ACTIVE' } })
    // Unlock first milestone now that agreement is active
    await unlockFirstMilestone(jobId)
    // Notify client
    await N.agreementSigned(job.clientId, { id: job.id, title: job.title })
    res.json({ message: 'Agreement fully signed. You may now fund the escrow.', agreement: updated })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// POST /agreements/:jobId/request-changes  freelancer requests changes before signing
const requestChanges = async (req, res) => {
  try {
    const { jobId } = req.params
    const { error, status, job, isFreelancer } = await loadJob(jobId, req.user.id)
    if (error) return res.status(status).json({ error })
    if (!isFreelancer) return res.status(403).json({ error: 'Only the freelancer can request changes' })
    if (job.agreement?.status !== 'CLIENT_SIGNED')
      return res.status(400).json({ error: 'No signed agreement to request changes on' })

    const { changeNote } = req.body
    if (!changeNote?.trim()) return res.status(400).json({ error: 'Provide details of what needs changing' })

    const updated = await prisma.workAgreement.update({
      where: { jobId },
      data: {
        specialConditions: `[CHANGE REQUEST] ${changeNote}\n\n${job.agreement.specialConditions || ''}`.trim(),
        status: 'CHANGES_REQUESTED',
        clientSignedAt:   null,
        clientSignedById: null,
      },
    })
    await prisma.job.update({ where: { id: jobId }, data: { agreementStatus: 'CHANGES_REQUESTED' } })
    // Notify client
    await N.changesRequested(job.clientId, { id: job.id, title: job.title }, changeNote)
    res.json({ message: 'Change request sent to client.', agreement: updated })
  } catch (err) { res.status(500).json({ error: err.message }) }
}


// POST /agreements/:jobId/submit-confirm
// Freelancer re-confirms escrow terms before submitting work
const submitConfirm = async (req, res) => {
  try {
    const { jobId } = req.params
    const { submissionNote, escrowTermsReconfirmed } = req.body
    const { error, status, job, isFreelancer } = await loadJob(jobId, req.user.id)
    if (error) return res.status(status).json({ error })
    if (!isFreelancer)
      return res.status(403).json({ error: 'Only the assigned freelancer can confirm submission' })
    if (!job.agreement || job.agreement.status !== 'ACTIVE')
      return res.status(400).json({ error: 'No active agreement found for this job' })
    if (!['FUNDED', 'IN_PROGRESS'].includes(job.status))
      return res.status(400).json({ error: 'Job must be funded before submitting' })
    if (!escrowTermsReconfirmed)
      return res.status(400).json({ error: 'You must re-confirm the escrow release terms before submitting' })

    // Mark re-confirmation on agreement
    await prisma.workAgreement.update({
      where: { jobId },
      data: {
        freelancerSubmitConfirmedAt: new Date(),
        submissionNote: submissionNote || null,
      },
    })

    // Now actually mark job as SUBMITTED
    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: { status: 'SUBMITTED' },
    })

    res.json({
      message: 'Work submitted and escrow terms re-confirmed. Awaiting client approval.',
      job: updatedJob,
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// POST /agreements/:jobId/release-confirm
// Client re-confirms and releases escrow payment to freelancer
const releaseConfirm = async (req, res) => {
  try {
    const { jobId } = req.params
    const { releaseNote, escrowReleaseAccepted } = req.body
    const { error, status, job, isClient } = await loadJob(jobId, req.user.id)
    if (error) return res.status(status).json({ error })
    if (!isClient)
      return res.status(403).json({ error: 'Only the client can release payment' })
    if (!job.agreement || job.agreement.status !== 'ACTIVE')
      return res.status(400).json({ error: 'No active agreement found' })
    if (job.status !== 'SUBMITTED')
      return res.status(400).json({ error: 'Work must be submitted before releasing payment' })
    if (!escrowReleaseAccepted)
      return res.status(400).json({ error: 'You must confirm work is complete before releasing payment' })

    // Find and release legacy escrow
    const escrow = await prisma.escrow.findFirst({
      where: { jobId, milestoneId: null },
      orderBy: { createdAt: 'asc' },
    })

    const now = new Date()
    const ops = [
      prisma.workAgreement.update({
        where: { jobId },
        data: {
          clientReleaseConfirmedAt: now,
          releaseNote: releaseNote || null,
          status: 'COMPLETED',
        },
      }),
      prisma.job.update({
        where: { id: jobId },
        data: { status: 'COMPLETED', agreementStatus: 'COMPLETED' },
      }),
    ]

    if (escrow && escrow.status === 'LOCKED') {
      ops.push(
        prisma.escrow.update({ where: { id: escrow.id }, data: { status: 'RELEASED' } }),
        prisma.transaction.create({
          data: {
            userId: job.freelancerId,
            amount: escrow.amount,
            type: 'RELEASE',
            status: 'SUCCESS',
            reference: escrow.paymentId,
          },
        })
      )
    }

    await prisma.$transaction(ops)

    res.json({
      message: 'Payment released to freelancer. Job completed.',
      escrowReleased: !!escrow,
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// GET /agreements/:jobId/phase2-status
// Returns phase 2 confirmation state for both parties
const getPhase2Status = async (req, res) => {
  try {
    const { jobId } = req.params
    const { error, status, job } = await loadJob(jobId, req.user.id)
    if (error) return res.status(status).json({ error })
    if (!job.agreement) return res.status(404).json({ error: 'No agreement for this job' })

    const ag = job.agreement
    res.json({
      jobStatus:                    job.status,
      agreementStatus:              ag.status,
      freelancerSubmitConfirmedAt:  ag.freelancerSubmitConfirmedAt,
      submissionNote:               ag.submissionNote,
      clientReleaseConfirmedAt:     ag.clientReleaseConfirmedAt,
      releaseNote:                  ag.releaseNote,
      canFreelancerSubmit:  job.status === 'IN_PROGRESS' || job.status === 'FUNDED',
      canClientRelease:     job.status === 'SUBMITTED',
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
}


// GET /agreements/:jobId/pdf
// Returns styled HTML certificate; user prints/saves as PDF from browser
const generatePdf = async (req, res) => {
  try {
    const { jobId } = req.params
    const { error, status, job } = await loadJob(jobId, req.user.id)
    if (error) return res.status(status).json({ error })
    if (!job.agreement)
      return res.status(404).json({ error: 'No agreement found for this job' })
    if (!['ACTIVE', 'COMPLETED'].includes(job.agreement.status))
      return res.status(400).json({ error: 'Agreement must be fully signed before generating certificate' })

    // Load full party profiles
    const [client, freelancer] = await Promise.all([
      prisma.user.findUnique({
        where: { id: job.clientId },
        select: { id: true, name: true, email: true, city: true, state: true,
          companyName: true, designation: true },
      }),
      prisma.user.findUnique({
        where: { id: job.freelancerId },
        select: { id: true, name: true, email: true, city: true, state: true, title: true },
      }),
    ])

    if (!client || !freelancer)
      return res.status(500).json({ error: 'Could not load party details' })

    // Record that PDF was generated
    await prisma.workAgreement.update({
      where: { jobId },
      data: { pdfGeneratedAt: new Date() },
    })

    const html = generateAgreementHtml({
      agreement:   job.agreement,
      job:         { id: job.id, title: job.title, budget: job.budget, status: job.status },
      client,
      freelancer,
      agreementId: job.agreement.id,
    })

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Content-Disposition', `inline; filename="trustwork-agreement-${jobId}.html"`)
    res.send(html)
  } catch (err) { res.status(500).json({ error: err.message }) }
}


// GET /agreements/:jobId/versions
// Agreement version history (audit log of changes)
const getVersionHistory = async (req, res) => {
  try {
    const { jobId } = req.params
    const { error, status } = await loadJob(jobId, req.user.id)
    if (error) return res.status(status).json({ error })

    const versions = await prisma.agreementVersion.findMany({
      where:   { jobId },
      orderBy: { createdAt: 'desc' },
      include: {
        // changedBy user name
      },
    })

    // Enrich with changer names
    const userIds  = [...new Set(versions.map(v => v.changedBy))]
    const users    = await prisma.user.findMany({
      where:  { id: { in: userIds } },
      select: { id: true, name: true, role: true },
    })
    const userMap  = Object.fromEntries(users.map(u => [u.id, u]))

    const enriched = versions.map(v => ({
      ...v,
      changedByUser: userMap[v.changedBy] || { name: 'Unknown', role: 'UNKNOWN' },
    }))

    res.json({ versions: enriched, count: enriched.length })
  } catch (err) { res.status(500).json({ error: err.message }) }
}


// POST /agreements/:jobId/milestone-amendment
// Lightweight amendment - client updates milestones without full re-sign
// Freelancer accepts or rejects the amendment only
const milestoneAmendment = async (req, res) => {
  try {
    const { jobId } = req.params
    const { milestonesAgreed, amendmentReason } = req.body
    const { error, status, job, isClient } = await loadJob(jobId, req.user.id)
    if (error) return res.status(status).json({ error })
    if (!isClient) return res.status(403).json({ error: 'Only the client can amend milestones' })
    if (!job.agreement) return res.status(404).json({ error: 'No agreement found' })
    if (!['ACTIVE'].includes(job.agreement.status))
      return res.status(400).json({ error: 'Agreement must be ACTIVE to amend milestones' })
    if (!Array.isArray(milestonesAgreed) || milestonesAgreed.length === 0)
      return res.status(400).json({ error: 'Provide at least one milestone' })
    if (!amendmentReason?.trim())
      return res.status(400).json({ error: 'Amendment reason is required' })

    // Snapshot current agreement version
    const { _versionAgreementInternal } = require('../services/milestoneService')
    await _versionAgreementInternal(job.agreement, req.user.id,
      'Milestone amendment: ' + amendmentReason.trim())

    const now = new Date()

    // Update agreement with new milestones, set to AMENDMENT_PENDING
    const updated = await prisma.workAgreement.update({
      where: { jobId },
      data: {
        milestonesAgreed,
        status:     'AMENDMENT_PENDING',
        version:    (job.agreement.version || 1) + 1,
        specialConditions: '[AMENDMENT] ' + amendmentReason.trim(),
      },
    })
    await prisma.job.update({ where: { id: jobId }, data: { agreementStatus: 'AMENDMENT_PENDING' } })

    // Sync milestones to DB (LOCKED/UNLOCKED ones only - don't touch funded/active)
    const { syncAgreementMilestones } = require('../services/milestoneService')
    await syncAgreementMilestones(jobId, milestonesAgreed, req.user.id)

    // Version record
    await prisma.agreementVersion.create({
      data: {
        jobId, agreementId: job.agreement.id,
        version: updated.version,
        changedBy: req.user.id,
        changeReason: 'Milestone amendment: ' + amendmentReason.trim(),
        snapshotJson: { milestonesAgreed, amendedAt: now },
      },
    })

    // Notify freelancer
    const { notify } = require('../services/notificationService')
    await notify(job.freelancerId, {
      type:    'AGREEMENT_PENDING',
      title:   'Milestone amendment requires your review',
      message: `Client updated milestones for "${job.title}": ${amendmentReason.trim().slice(0, 100)}. Please review and accept or reject.`,
      jobId:   job.id,
    })

    res.json({ message: 'Amendment sent to freelancer for review.', agreement: updated })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// POST /agreements/:jobId/amendment-accept  freelancer accepts amendment
const amendmentAccept = async (req, res) => {
  try {
    const { jobId } = req.params
    const { error, status, job, isFreelancer } = await loadJob(jobId, req.user.id)
    if (error) return res.status(status).json({ error })
    if (!isFreelancer) return res.status(403).json({ error: 'Only the freelancer can accept amendments' })
    if (!job.agreement || job.agreement.status !== 'AMENDMENT_PENDING')
      return res.status(400).json({ error: 'No pending amendment found' })

    const updated = await prisma.workAgreement.update({
      where: { jobId },
      data: { status: 'ACTIVE' },
    })
    await prisma.job.update({ where: { id: jobId }, data: { agreementStatus: 'ACTIVE' } })

    // Notify client
    const { notify } = require('../services/notificationService')
    await notify(job.clientId, {
      type:    'AGREEMENT_SIGNED',
      title:   'Milestone amendment accepted',
      message: `Freelancer accepted the milestone amendment for "${job.title}". Work continues.`,
      jobId:   job.id,
    })

    res.json({ message: 'Amendment accepted. Agreement remains active.', agreement: updated })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// POST /agreements/:jobId/amendment-reject  freelancer rejects amendment
const amendmentReject = async (req, res) => {
  try {
    const { jobId } = req.params
    const { rejectNote } = req.body
    const { error, status, job, isFreelancer } = await loadJob(jobId, req.user.id)
    if (error) return res.status(status).json({ error })
    if (!isFreelancer) return res.status(403).json({ error: 'Only the freelancer can reject amendments' })
    if (!job.agreement || job.agreement.status !== 'AMENDMENT_PENDING')
      return res.status(400).json({ error: 'No pending amendment found' })
    if (!rejectNote?.trim()) return res.status(400).json({ error: 'Rejection reason required' })

    // Revert to previous milestone snapshot (last version)
    const lastVersion = await prisma.agreementVersion.findFirst({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
    })

    const revertedMilestones = lastVersion?.snapshotJson?.milestonesAgreed || job.agreement.milestonesAgreed

    const updated = await prisma.workAgreement.update({
      where: { jobId },
      data: {
        status: 'ACTIVE',
        milestonesAgreed: revertedMilestones,
        version: (job.agreement.version || 1) + 1,
        specialConditions: '[AMENDMENT_REJECTED] ' + rejectNote.trim(),
      },
    })
    await prisma.job.update({ where: { id: jobId }, data: { agreementStatus: 'ACTIVE' } })

    // Notify client
    const { notify } = require('../services/notificationService')
    await notify(job.clientId, {
      type:    'CHANGES_REQUESTED',
      title:   'Milestone amendment rejected',
      message: `Freelancer rejected the amendment for "${job.title}": ${rejectNote.trim().slice(0,100)}`,
      jobId:   job.id,
    })

    res.json({ message: 'Amendment rejected. Previous milestones restored.', agreement: updated })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// GET /agreements  list all agreements for the current user (Agreement Center)
const listAgreements = async (req, res) => {
  try {
    const userId = req.user.id
    const user   = await prisma.user.findUnique({ where: { id: userId } })
    const isAdmin = user?.role === 'ADMIN'

    const where = isAdmin ? {} : {
      job: {
        OR: [{ clientId: userId }, { freelancerId: userId }],
      },
    }

    const agreements = await prisma.workAgreement.findMany({
      where,
      include: {
        job: {
          select: {
            id: true, title: true, budget: true, status: true,
            agreementStatus: true,
            client:     { select: { id: true, name: true } },
            freelancer: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    res.json({ agreements })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

module.exports = { getAgreement, createAgreement, saveDraft, clientSign, freelancerSign, requestChanges, submitConfirm, releaseConfirm, getPhase2Status, generatePdf, getVersionHistory, milestoneAmendment, amendmentAccept, amendmentReject, listAgreements }
