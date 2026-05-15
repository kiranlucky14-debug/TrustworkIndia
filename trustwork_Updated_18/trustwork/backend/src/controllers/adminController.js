// adminController.js - Phase 5: Full Admin System
// All endpoints require role === ADMIN (enforced in routes via requireAdmin middleware)

const { prisma } = require('../config/database')

const PLATFORM_FEE_RATE = 0.02  // 2% platform fee on release

//  Helper: log admin action 
async function logAction(adminId, action, { target, targetId, before, after, note, ip } = {}) {
  try {
    await prisma.adminLog.create({
      data: { adminId, action, target, targetId, before, after, note, ip: ip || null },
    })
  } catch (err) {
    console.error('AdminLog error:', err.message)
  }
}

//  GET /admin/stats 
// Returns real-time platform stats for the admin dashboard
const getStats = async (req, res) => {
  try {
    const [
      totalUsers, clients, freelancers,
      totalJobs, activeJobs, completedJobs, disputedJobs,
      openDisputes, resolvedDisputes,
      escrowStats, txnStats,
      recentUsers, recentJobs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'CLIENT' } }),
      prisma.user.count({ where: { role: 'FREELANCER' } }),
      prisma.job.count(),
      prisma.job.count({ where: { status: { notIn: ['COMPLETED','CANCELLED','DISPUTED'] } } }),
      prisma.job.count({ where: { status: 'COMPLETED' } }),
      prisma.job.count({ where: { status: 'DISPUTED' } }),
      prisma.dispute.count({ where: { status: 'OPEN' } }),
      prisma.dispute.count({ where: { status: 'RESOLVED' } }),
      prisma.escrow.aggregate({
        _sum:   { amount: true, platformFee: true, netAmount: true },
        _count: { id: true },
      }),
      prisma.transaction.aggregate({
        where:  { type: 'RELEASE', status: 'SUCCESS' },
        _sum:   { amount: true, platformFee: true },
        _count: { id: true },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' }, take: 5,
        select: { id: true, name: true, role: true, createdAt: true, suspended: true },
      }),
      prisma.job.findMany({
        orderBy: { createdAt: 'desc' }, take: 5,
        select: { id: true, title: true, status: true, budget: true, createdAt: true,
          client: { select: { name: true } } },
      }),
    ])

    res.json({
      users:     { total: totalUsers, clients, freelancers },
      jobs:      { total: totalJobs, active: activeJobs, completed: completedJobs, disputed: disputedJobs },
      disputes:  { open: openDisputes, resolved: resolvedDisputes },
      escrow: {
        total:       escrowStats._sum.amount     || 0,
        platformFee: escrowStats._sum.platformFee || 0,
        netPayout:   escrowStats._sum.netAmount   || 0,
        count:       escrowStats._count.id,
      },
      revenue: {
        totalReleased: txnStats._sum.amount     || 0,
        platformFee:   txnStats._sum.platformFee || 0,
        txnCount:      txnStats._count.id,
      },
      recentUsers,
      recentJobs,
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

//  GET /admin/users 
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search, suspended } = req.query
    const where = {}
    if (role) where.role = role
    if (suspended === 'true') where.suspended = true
    if (search) where.OR = [
      { name:  { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { userId:{ contains: search, mode: 'insensitive' } },
    ]

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        select: {
          id: true, name: true, email: true, phone: true, role: true,
          userId: true, suspended: true, suspendReason: true, suspendedAt: true,
          profileCompleted: true, isVerified: true, createdAt: true, lastLoginAt: true,
          rating: true, ratingCount: true,
          _count: { select: { clientJobs: true, freelancerJobs: true } },
        },
      }),
      prisma.user.count({ where }),
    ])

    res.json({ users, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

//  POST /admin/users/:id/suspend 
const suspendUser = async (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, role: true, suspended: true } })
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (user.role === 'ADMIN') return res.status(400).json({ error: 'Cannot suspend another admin' })

    const updated = await prisma.user.update({
      where: { id },
      data: { suspended: true, suspendReason: reason || 'Suspended by admin', suspendedAt: new Date() },
    })
    await logAction(req.user.id, 'SUSPEND_USER', { target: 'User', targetId: id, before: { suspended: false }, after: { suspended: true }, note: reason })
    res.json({ message: `${user.name} suspended`, user: updated })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

//  POST /admin/users/:id/unsuspend 
const unsuspendUser = async (req, res) => {
  try {
    const { id } = req.params
    const updated = await prisma.user.update({
      where: { id },
      data: { suspended: false, suspendReason: null, suspendedAt: null },
    })
    await logAction(req.user.id, 'UNSUSPEND_USER', { target: 'User', targetId: id })
    res.json({ message: 'User reinstated', user: updated })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

//  GET /admin/jobs 
const getJobs = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query
    const where = {}
    if (status) where.status = status
    if (search) where.title = { contains: search, mode: 'insensitive' }

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where, orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          client:     { select: { id: true, name: true, email: true } },
          freelancer: { select: { id: true, name: true, email: true } },
          escrows:    { where: { milestoneId: null }, orderBy: { createdAt: 'asc' }, take: 1 },
          agreement:  { select: { status: true, agreedAt: true, pdfGeneratedAt: true } },
          _count:     { select: { applicants: true } },
        },
      }),
      prisma.job.count({ where }),
    ])

    res.json({ jobs, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

//  GET /admin/escrows 
const getEscrows = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query
    const where = { milestoneId: null }  // main job escrows only
    if (status) where.status = status

    const [escrows, total] = await Promise.all([
      prisma.escrow.findMany({
        where, orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          job: {
            select: {
              id: true, title: true, status: true, budget: true,
              client:     { select: { id: true, name: true } },
              freelancer: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.escrow.count({ where }),
    ])

    res.json({ escrows, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

//  POST /admin/escrows/:escrowId/release 
// Admin forced release with optional partial amount and platform fee
const adminReleaseEscrow = async (req, res) => {
  try {
    const { escrowId } = req.params
    const { note, partialAmount } = req.body

    const escrow = await prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { job: { select: { id: true, title: true, freelancerId: true, clientId: true, status: true } } },
    })
    if (!escrow) return res.status(404).json({ error: 'Escrow not found' })
    if (escrow.status !== 'LOCKED') return res.status(400).json({ error: 'Escrow is not locked' })

    const gross = partialAmount ? Math.min(parseFloat(partialAmount), escrow.amount) : escrow.amount
    const fee   = Math.round(gross * PLATFORM_FEE_RATE * 100) / 100
    const net   = Math.round((gross - fee) * 100) / 100

    const ops = [
      prisma.escrow.update({
        where: { id: escrowId },
        data: { status: 'RELEASED', platformFee: fee, netAmount: net },
      }),
      prisma.job.update({
        where: { id: escrow.jobId },
        data: { status: 'COMPLETED' },
      }),
      prisma.transaction.create({
        data: {
          userId: escrow.job.freelancerId,
          amount: gross, platformFee: fee, netAmount: net,
          type: 'RELEASE', status: 'SUCCESS',
          reference: escrow.paymentId,
          description: `Admin release${note ? ': ' + note : ''} | Fee: Rs.${fee} | Net: Rs.${net}`,
        },
      }),
    ]

    await prisma.$transaction(ops)
    await logAction(req.user.id, 'RELEASE_ESCROW', {
      target: 'Escrow', targetId: escrowId,
      before: { status: 'LOCKED', amount: escrow.amount },
      after:  { status: 'RELEASED', gross, fee, net },
      note,
    })

    res.json({ message: `Escrow released. Gross: Rs.${gross} | Fee: Rs.${fee} | Freelancer receives: Rs.${net}`, gross, fee, net })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

//  POST /admin/escrows/:escrowId/refund 
const adminRefundEscrow = async (req, res) => {
  try {
    const { escrowId } = req.params
    const { note } = req.body

    const escrow = await prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { job: { select: { id: true, title: true, clientId: true, freelancerId: true } } },
    })
    if (!escrow) return res.status(404).json({ error: 'Escrow not found' })
    if (escrow.status !== 'LOCKED') return res.status(400).json({ error: 'Escrow is not locked' })

    await prisma.$transaction([
      prisma.escrow.update({ where: { id: escrowId }, data: { status: 'REFUNDED' } }),
      prisma.job.update({ where: { id: escrow.jobId }, data: { status: 'CANCELLED' } }),
      prisma.transaction.create({
        data: {
          userId: escrow.job.clientId,
          amount: escrow.amount, type: 'REFUND', status: 'SUCCESS',
          reference: escrow.paymentId,
          description: `Admin refund${note ? ': ' + note : ''}`,
        },
      }),
    ])
    await logAction(req.user.id, 'REFUND_ESCROW', {
      target: 'Escrow', targetId: escrowId,
      before: { status: 'LOCKED' }, after: { status: 'REFUNDED' }, note,
    })

    res.json({ message: `Escrow of Rs.${escrow.amount} refunded to client`, amount: escrow.amount })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

//  POST /admin/escrows/:escrowId/split 
// Split settlement: partial to freelancer, rest to client
const adminSplitEscrow = async (req, res) => {
  try {
    const { escrowId } = req.params
    const { freelancerAmount, note } = req.body

    const escrow = await prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { job: { select: { id: true, title: true, clientId: true, freelancerId: true } } },
    })
    if (!escrow) return res.status(404).json({ error: 'Escrow not found' })
    if (escrow.status !== 'LOCKED') return res.status(400).json({ error: 'Escrow is not locked' })

    const flGross = Math.min(parseFloat(freelancerAmount || 0), escrow.amount)
    const flFee   = Math.round(flGross * PLATFORM_FEE_RATE * 100) / 100
    const flNet   = Math.round((flGross - flFee) * 100) / 100
    const clientRefund = Math.round((escrow.amount - flGross) * 100) / 100

    await prisma.$transaction([
      prisma.escrow.update({ where: { id: escrowId }, data: { status: 'RELEASED', platformFee: flFee, netAmount: flNet } }),
      prisma.job.update({ where: { id: escrow.jobId }, data: { status: 'COMPLETED' } }),
      prisma.transaction.create({
        data: {
          userId: escrow.job.freelancerId, amount: flGross,
          platformFee: flFee, netAmount: flNet,
          type: 'RELEASE', status: 'SUCCESS', reference: escrow.paymentId,
          description: `Admin split settlement${note ? ': ' + note : ''}`,
        },
      }),
      ...(clientRefund > 0 ? [prisma.transaction.create({
        data: {
          userId: escrow.job.clientId, amount: clientRefund,
          type: 'REFUND', status: 'SUCCESS', reference: escrow.paymentId,
          description: `Admin split refund${note ? ': ' + note : ''}`,
        },
      })] : []),
    ])

    await logAction(req.user.id, 'SPLIT_ESCROW', {
      target: 'Escrow', targetId: escrowId,
      before: { status: 'LOCKED', amount: escrow.amount },
      after:  { freelancerGross: flGross, freelancerFee: flFee, freelancerNet: flNet, clientRefund },
      note,
    })

    res.json({ message: 'Split settlement applied', freelancerGross: flGross, freelancerFee: flFee, freelancerNet: flNet, clientRefund })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

//  GET /admin/disputes 
const getDisputes = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query
    const where = status ? { status } : {}

    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where, orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          job: {
            select: {
              id: true, title: true, budget: true, status: true,
              client:     { select: { id: true, name: true } },
              freelancer: { select: { id: true, name: true } },
              agreement: {
                select: {
                  status: true, agreedAt: true,
                  clientChecklist: true, freelancerChecklist: true,
                  deliverables: true, scope: true,
                  freelancerSubmitConfirmedAt: true, submissionNote: true,
                },
              },
              escrows: { where: { milestoneId: null }, select: { id: true, amount: true, status: true } },
            },
          },
          raisedBy: { select: { id: true, name: true, role: true } },
        },
      }),
      prisma.dispute.count({ where }),
    ])

    res.json({ disputes, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

//  GET /admin/transactions 
const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query
    const where = type ? { type } : {}

    const [transactions, total, summary] = await Promise.all([
      prisma.transaction.findMany({
        where, orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: { user: { select: { id: true, name: true, role: true } } },
      }),
      prisma.transaction.count({ where }),
      prisma.transaction.groupBy({
        by: ['type'],
        _sum: { amount: true, platformFee: true },
        _count: { id: true },
      }),
    ])

    res.json({ transactions, total, page: parseInt(page), summary })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

//  GET /admin/logs 
const getLogs = async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query
    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: { admin: { select: { id: true, name: true } } },
      }),
      prisma.adminLog.count(),
    ])
    res.json({ logs, total, page: parseInt(page) })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

module.exports = {
  getStats,
  getUsers, suspendUser, unsuspendUser,
  getJobs,
  getEscrows, adminReleaseEscrow, adminRefundEscrow, adminSplitEscrow,
  getDisputes,
  getTransactions,
  getLogs,
}
