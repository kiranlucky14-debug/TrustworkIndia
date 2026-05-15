// payoutAutomationService.js
// PLACEHOLDER for future automated payout release bot.
//
// Architecture:
// - Run as a nightly cron job (e.g. via node-cron or external scheduler)
// - Checks all PENDING_REVIEW payouts older than N hours
// - Performs fraud/risk checks before auto-release
// - Auto-releases safe payouts at midnight
//
// HOW TO ACTIVATE (future):
// 1. npm install node-cron
// 2. Uncomment the schedule block below in app.js:
//    const { startPayoutBot } = require('./src/services/payoutAutomationService')
//    startPayoutBot()
//
// FRAUD CHECKS TO IMPLEMENT:
// - Freelancer account < 30 days old
// - First payout on account
// - Payout > 3x avg payout for this freelancer
// - IP geolocation mismatch from registration
// - Rapid succession payouts (> 3 in 24h)
// - Job created and completed within < 1 hour
//
// PARTIAL AUTO-RELEASE POLICY (suggested):
// - Payouts < Rs 2,000  AND  freelancer trust score > 80 -> auto-release
// - All others -> require admin manual review

const { prisma } = require('../config/database')
const PLATFORM_FEE_RATE = 0.02

// Risk score: 0 = safe, 100 = high risk
async function assessPayoutRisk(payout) {
  const risks = []

  // Check 1: Freelancer account age
  const freelancer = await prisma.user.findUnique({ where: { id: payout.freelancerId } })
  const ageMs = Date.now() - new Date(freelancer.createdAt).getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  if (ageDays < 30) risks.push({ code: 'NEW_ACCOUNT', score: 40, message: 'Account less than 30 days old' })

  // Check 2: Large payout relative to history
  const avgResult = await prisma.transaction.aggregate({
    where: { userId: payout.freelancerId, type: 'RELEASE', status: 'SUCCESS' },
    _avg:  { amount: true },
    _count: { id: true },
  })
  const avgPayout = avgResult._avg.amount || 0
  const count     = avgResult._count.id   || 0
  if (count === 0) risks.push({ code: 'FIRST_PAYOUT', score: 20, message: 'First payout on account' })
  if (avgPayout > 0 && Number(payout.grossAmount) > avgPayout * 3)
    risks.push({ code: 'LARGE_PAYOUT', score: 30, message: 'Payout 3x above average' })

  // Check 3: Low trust score
  if ((freelancer.trustScore || 0) < 40)
    risks.push({ code: 'LOW_TRUST', score: 25, message: 'Trust score below 40' })

  const totalRiskScore = risks.reduce((s, r) => s + r.score, 0)
  return {
    riskScore: Math.min(100, totalRiskScore),
    risks,
    safe: totalRiskScore < 50,
    freelancer,
  }
}

// Main bot function - call this from a cron job
async function runPayoutBot() {
  console.log('[PayoutBot] Starting payout review run at', new Date().toISOString())

  // Find payouts pending review for > 24 hours
  const cutoff  = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const pending = await prisma.payoutQueue.findMany({
    where: {
      status:    'PENDING_REVIEW',
      createdAt: { lt: cutoff },
    },
    include: {
      milestone: true,
      job: { select: { id: true, title: true, status: true } },
    },
  })

  console.log(`[PayoutBot] Found ${pending.length} payouts pending > 24h`)

  let approved = 0, flagged = 0, skipped = 0

  for (const payout of pending) {
    try {
      const { riskScore, risks, safe, freelancer } = await assessPayoutRisk(payout)

      if (!safe) {
        // Flag for manual admin review
        await prisma.adminLog.create({ data: {
          adminId: 'SYSTEM',
          action:  'PAYOUT_FLAGGED_BY_BOT',
          target:  'PayoutQueue',
          targetId: payout.id,
          note: `Risk score: ${riskScore}. Reasons: ${risks.map(r => r.code).join(', ')}`,
          after: { riskScore, risks },
        }})
        flagged++
        console.log(`[PayoutBot] FLAGGED payout ${payout.id} (risk: ${riskScore})`)
        continue
      }

      // Small, safe payout - auto-approve
      if (Number(payout.grossAmount) <= 2000 && safe) {
        const net = Number(payout.netAmount)
        const fee = Number(payout.platformFee)

        await prisma.$transaction([
          prisma.payoutQueue.update({ where: { id: payout.id }, data: {
            status: 'RELEASED', reviewedById: 'SYSTEM', reviewedAt: new Date(),
            adminNote: `Auto-released by bot. Risk score: ${riskScore}`,
          }}),
          prisma.milestone.update({ where: { id: payout.milestoneId }, data: {
            status: 'RELEASED', payoutStatus: 'RELEASED',
            payoutApprovedAt: new Date(), payoutApprovedBy: 'SYSTEM',
          }}),
          ...(payout.milestone.escrowId ? [
            prisma.escrow.update({ where: { milestoneId: payout.milestoneId }, data: {
              status: 'RELEASED', platformFee: fee, netAmount: net,
            }}),
          ] : []),
          prisma.transaction.create({ data: {
            userId: payout.freelancerId, amount: net,
            type: 'RELEASE', status: 'SUCCESS',
            reference: 'bot_' + payout.id, milestoneId: payout.milestoneId,
            description: 'Auto-payout: ' + payout.milestone.title,
            platformFee: fee, netAmount: net,
          }}),
        ])
        approved++
        console.log(`[PayoutBot] AUTO-APPROVED payout ${payout.id} (net: ${net})`)
      } else {
        skipped++
      }
    } catch (botErr) {
      console.error(`[PayoutBot] Error processing payout ${payout.id}:`, botErr.message)
    }
  }

  const result = { approved, flagged, skipped, total: pending.length, runAt: new Date() }
  console.log('[PayoutBot] Run complete:', result)

  // Log bot run to admin logs
  await prisma.adminLog.create({
    data: {
      adminId:  'SYSTEM',
      action:   'PAYOUT_BOT_RUN',
      target:   'PayoutQueue',
      targetId: null,
      note:     `Bot run: ${approved} approved, ${flagged} flagged, ${skipped} skipped`,
      after:    result,
    },
  }).catch(() => {})

  return result
}

// Schedule string for node-cron (midnight IST = 18:30 UTC)
const CRON_SCHEDULE = '30 18 * * *'

// Call this from app.js to activate the bot
function startPayoutBot() {
  // Uncomment when node-cron is installed:
  // const cron = require('node-cron')
  // cron.schedule(CRON_SCHEDULE, runPayoutBot, { timezone: 'Asia/Kolkata' })
  // console.log('[PayoutBot] Scheduled at', CRON_SCHEDULE, '(midnight IST)')
  console.log('[PayoutBot] Automation placeholder ready. Uncomment cron to activate.')
}

module.exports = { runPayoutBot, assessPayoutRisk, startPayoutBot, CRON_SCHEDULE }
