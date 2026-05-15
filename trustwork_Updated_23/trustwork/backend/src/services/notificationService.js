// notificationService.js - in-app notification helpers
const { prisma } = require('../config/database')

async function notify(userId, { type, title, message, jobId }) {
  if (!userId) return
  try {
    await prisma.notification.create({
      data: { userId, type, title, message, jobId: jobId || null },
    })
  } catch (err) {
    console.error('Notification error:', err.message)
  }
}

const N = {
  async assigned(freelancerId, job) {
    await notify(freelancerId, { type: 'ASSIGNED', jobId: job.id,
      title: 'You have been assigned to a job',
      message: `"${job.title}" - The client selected you. Review and sign the Work Agreement to proceed.`,
    })
  },
  async agreementPending(freelancerId, job) {
    await notify(freelancerId, { type: 'AGREEMENT_PENDING', jobId: job.id,
      title: 'Work Agreement awaiting your signature',
      message: `The client has signed the agreement for "${job.title}". Review and sign to unlock escrow funding.`,
    })
  },
  async agreementSigned(clientId, job) {
    await notify(clientId, { type: 'AGREEMENT_SIGNED', jobId: job.id,
      title: 'Freelancer signed the agreement',
      message: `The freelancer accepted the Work Agreement for "${job.title}". You can now fund the escrow.`,
    })
  },
  async changesRequested(clientId, job, note) {
    await notify(clientId, { type: 'CHANGES_REQUESTED', jobId: job.id,
      title: 'Freelancer requested agreement changes',
      message: `Changes requested on "${job.title}": ${note?.slice(0, 120) || 'See agreement for details.'}`,
    })
  },
  // Milestone-specific
  async milestoneUnlocked(freelancerId, job, milestoneTitle) {
    await notify(freelancerId, { type: 'FUNDED', jobId: job.id,
      title: `Milestone unlocked: ${milestoneTitle}`,
      message: `"${milestoneTitle}" is now unlocked for "${job.title}". Fund the milestone to let the freelancer start work.`,
    })
  },
  async milestoneFunded(freelancerId, job, milestoneTitle) {
    await notify(freelancerId, { type: 'FUNDED', jobId: job.id,
      title: `Milestone funded: ${milestoneTitle}`,
      message: `Escrow funded for "${milestoneTitle}" on "${job.title}". You can now start work.`,
    })
  },
  async milestoneStarted(clientId, job, milestoneTitle) {
    await notify(clientId, { type: 'SUBMITTED', jobId: job.id,
      title: `Freelancer started: ${milestoneTitle}`,
      message: `Freelancer has started work on "${milestoneTitle}" for "${job.title}".`,
    })
  },
  async milestoneSubmitted(clientId, job, milestoneTitle) {
    await notify(clientId, { type: 'SUBMITTED', jobId: job.id,
      title: `Work submitted: ${milestoneTitle}`,
      message: `Freelancer submitted work for "${milestoneTitle}" on "${job.title}". Review and approve to release payment.`,
    })
  },
  async milestoneApproved(freelancerId, job, milestoneTitle, net) {
    await notify(freelancerId, { type: 'APPROVED', jobId: job.id,
      title: `Milestone approved: ${milestoneTitle}`,
      message: `Client approved "${milestoneTitle}" on "${job.title}". Payment of Rs.${net} is under TrustWork review.`,
    })
  },
  async milestoneRejected(freelancerId, job, milestoneTitle, reason) {
    await notify(freelancerId, { type: 'REJECTED', jobId: job.id,
      title: `Milestone rejected: ${milestoneTitle}`,
      message: `Client rejected "${milestoneTitle}" on "${job.title}". Reason: ${reason?.slice(0, 120) || 'No reason provided.'}`,
    })
  },
  async reworkRequested(freelancerId, job, milestoneTitle, note) {
    await notify(freelancerId, { type: 'CHANGES_REQUESTED', jobId: job.id,
      title: `Rework requested: ${milestoneTitle}`,
      message: `Client requested rework on "${milestoneTitle}" for "${job.title}": ${note?.slice(0, 120) || ''}`,
    })
  },
  async paymentUnderReview(freelancerId, job, milestoneTitle) {
    await notify(freelancerId, { type: 'APPROVED', jobId: job.id,
      title: `Payment under review: ${milestoneTitle}`,
      message: `Payment for "${milestoneTitle}" on "${job.title}" is being reviewed by TrustWork. You'll be notified when released.`,
    })
  },
  async payoutReleased(freelancerId, job, milestoneTitle, net) {
    await notify(freelancerId, { type: 'APPROVED', jobId: job.id,
      title: `Payment released: ${milestoneTitle}`,
      message: `Rs.${net} has been released for "${milestoneTitle}" on "${job.title}". Check your transactions.`,
    })
  },
  async milestoneEdited(freelancerId, job, milestoneTitle) {
    await notify(freelancerId, { type: 'AGREEMENT_PENDING', jobId: job.id,
      title: `Milestone updated: ${milestoneTitle}`,
      message: `Client updated details for "${milestoneTitle}" on "${job.title}".`,
    })
  },
  async agreementUpdated(freelancerId, job, reason) {
    await notify(freelancerId, { type: 'AGREEMENT_PENDING', jobId: job.id,
      title: 'Agreement updated',
      message: `The work agreement for "${job.title}" has been updated: ${reason?.slice(0, 100) || 'Review in Agreements section.'}`,
    })
  },
  // Legacy helpers (kept for compatibility)
  async funded(freelancerId, job) {
    await this.milestoneFunded(freelancerId, job, 'Milestone')
  },
  async submitted(clientId, job) {
    await this.milestoneSubmitted(clientId, job, 'Milestone')
  },
  async approved(freelancerId, job) {
    await this.milestoneApproved(freelancerId, job, 'Milestone', '')
  },
  async rejected(freelancerId, job, reason) {
    await this.milestoneRejected(freelancerId, job, 'Milestone', reason)
  },
}

module.exports = { notify, N }
