// notificationService.js - create in-app notifications
const { prisma } = require('../config/database')

async function notify(userId, { type, title, message, jobId }) {
  if (!userId) return
  try {
    await prisma.notification.create({
      data: { userId, type, title, message, jobId: jobId || null },
    })
  } catch (err) {
    // Notifications are non-critical - never throw
    console.error('Notification error:', err.message)
  }
}

// Helpers for each event
const N = {
  async assigned(freelancerId, job) {
    await notify(freelancerId, {
      type: 'ASSIGNED',
      title: 'You have been assigned to a job',
      message: `"${job.title}" - The client selected you. Review and sign the Work Agreement to proceed.`,
      jobId: job.id,
    })
  },
  async agreementPending(freelancerId, job) {
    await notify(freelancerId, {
      type: 'AGREEMENT_PENDING',
      title: 'Work Agreement awaiting your signature',
      message: `The client has signed the agreement for "${job.title}". Review and sign to unlock escrow funding.`,
      jobId: job.id,
    })
  },
  async agreementSigned(clientId, job) {
    await notify(clientId, {
      type: 'AGREEMENT_SIGNED',
      title: 'Freelancer signed the agreement',
      message: `The freelancer accepted the Work Agreement for "${job.title}". You can now fund the escrow.`,
      jobId: job.id,
    })
  },
  async changesRequested(clientId, job, note) {
    await notify(clientId, {
      type: 'CHANGES_REQUESTED',
      title: 'Freelancer requested agreement changes',
      message: `Changes requested on "${job.title}": ${note?.slice(0, 120) || 'See agreement for details.'}`,
      jobId: job.id,
    })
  },
  async funded(freelancerId, job) {
    await notify(freelancerId, {
      type: 'FUNDED',
      title: 'Escrow funded - work can begin',
      message: `Escrow for "${job.title}" has been funded. You can now start work.`,
      jobId: job.id,
    })
  },
  async submitted(clientId, job) {
    await notify(clientId, {
      type: 'SUBMITTED',
      title: 'Freelancer submitted work',
      message: `Work for "${job.title}" has been submitted. Review and approve to release payment.`,
      jobId: job.id,
    })
  },
  async approved(freelancerId, job) {
    await notify(freelancerId, {
      type: 'APPROVED',
      title: 'Work approved - payment released',
      message: `Your work on "${job.title}" was approved and payment has been released.`,
      jobId: job.id,
    })
  },
  async rejected(freelancerId, job, reason) {
    await notify(freelancerId, {
      type: 'REJECTED',
      title: 'Work submission disputed',
      message: `Client raised a dispute on "${job.title}". ${reason ? 'Reason: ' + reason.slice(0, 100) : ''}`,
      jobId: job.id,
    })
  },
}

module.exports = { notify, N }
