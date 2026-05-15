// chatController.js  Real-time chat per job
// REST endpoints for message CRUD + Socket.io emits

const { prisma } = require('../config/database')

//  GET /chat/:jobId 
const getMessages = async (req, res) => {
  try {
    const { jobId } = req.params
    const { before, limit = 50 } = req.query

    const job = await prisma.job.findUnique({ where: { id: jobId } })
    if (!job) return res.status(404).json({ error: 'Job not found' })

    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    const isParty  = job.clientId === req.user.id || job.freelancerId === req.user.id
    const isAdmin  = user?.role === 'ADMIN'
    if (!isParty && !isAdmin) return res.status(403).json({ error: 'Access denied' })

    const where = { jobId }
    if (before) where.createdAt = { lt: new Date(before) }

    const messages = await prisma.message.findMany({
      where,
      include: { sender: { select: { id: true, name: true, role: true, profilePhoto: true } } },
      orderBy: { createdAt: 'asc' },
      take:    parseInt(limit),
    })

    // Mark all unread messages as read for this user
    await prisma.message.updateMany({
      where: { jobId, readAt: null, senderId: { not: req.user.id } },
      data:  { readAt: new Date() },
    })

    const unreadCount = await prisma.message.count({
      where: { jobId, readAt: null, senderId: { not: req.user.id } },
    })

    res.json({ messages, unreadCount })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

//  POST /chat/:jobId 
const sendMessage = async (req, res) => {
  try {
    const { jobId }   = req.params
    const { content, type = 'TEXT', fileUrl, fileName, fileSize } = req.body

    if (!content?.trim() && !fileUrl) return res.status(400).json({ error: 'Message content required' })

    const job = await prisma.job.findUnique({ where: { id: jobId } })
    if (!job) return res.status(404).json({ error: 'Job not found' })

    const user    = await prisma.user.findUnique({ where: { id: req.user.id } })
    const isParty = job.clientId === req.user.id || job.freelancerId === req.user.id
    const isAdmin = user?.role === 'ADMIN'
    if (!isParty && !isAdmin) return res.status(403).json({ error: 'Access denied' })

    const message = await prisma.message.create({
      data: {
        jobId,
        senderId: req.user.id,
        content:  content?.trim() || fileName || 'File shared',
        type,
        fileUrl:  fileUrl  || null,
        fileName: fileName || null,
        fileSize: fileSize || null,
      },
      include: { sender: { select: { id: true, name: true, role: true } } },
    })

    // Emit via Socket.io if available
    const io = req.app.get('io')
    if (io) {
      io.to(`job:${jobId}`).emit('new_message', message)
    }

    // Notify the other party
    const otherId = job.clientId === req.user.id ? job.freelancerId : job.clientId
    if (otherId) {
      const { notify } = require('../services/notificationService')
      await notify(otherId, {
        type:    'SUBMITTED',
        title:   `New message from ${user?.name}`,
        message: type === 'TEXT' ? content.slice(0, 80) : `Shared a file: ${fileName}`,
        jobId,
      })
    }

    res.status(201).json({ message })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

//  PATCH /chat/:jobId/:messageId 
const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params
    const { content }   = req.body

    const msg = await prisma.message.findUnique({ where: { id: messageId } })
    if (!msg) return res.status(404).json({ error: 'Message not found' })
    if (msg.senderId !== req.user.id) return res.status(403).json({ error: 'Can only edit own messages' })
    if (msg.type !== 'TEXT') return res.status(400).json({ error: 'Can only edit text messages' })

    const updated = await prisma.message.update({
      where: { id: messageId },
      data:  { content: content.trim(), editedAt: new Date() },
      include: { sender: { select: { id: true, name: true, role: true } } },
    })

    const io = req.app.get('io')
    if (io) io.to(`job:${msg.jobId}`).emit('message_edited', updated)

    res.json({ message: updated })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

//  DELETE /chat/:jobId/:messageId 
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })

    const msg = await prisma.message.findUnique({ where: { id: messageId } })
    if (!msg) return res.status(404).json({ error: 'Message not found' })

    const canDelete = msg.senderId === req.user.id || user?.role === 'ADMIN'
    if (!canDelete) return res.status(403).json({ error: 'Cannot delete this message' })

    await prisma.message.update({
      where: { id: messageId },
      data:  { content: '[Message deleted]', type: 'SYSTEM', fileUrl: null },
    })

    const io = req.app.get('io')
    if (io) io.to(`job:${msg.jobId}`).emit('message_deleted', { id: messageId })

    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

//  GET /chat/:jobId/unread 
const getUnreadCount = async (req, res) => {
  try {
    const { jobId } = req.params
    const count = await prisma.message.count({
      where: { jobId, readAt: null, senderId: { not: req.user.id } },
    })
    res.json({ count })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

//  GET /chat/unread/all 
const getAllUnread = async (req, res) => {
  try {
    const jobs = await prisma.job.findMany({
      where: { OR: [{ clientId: req.user.id }, { freelancerId: req.user.id }] },
      select: { id: true },
    })
    const jobIds = jobs.map(j => j.id)

    const counts = await prisma.message.groupBy({
      by:     ['jobId'],
      where:  { jobId: { in: jobIds }, readAt: null, senderId: { not: req.user.id } },
      _count: { id: true },
    })

    const total = counts.reduce((s, c) => s + c._count.id, 0)
    const byJob = Object.fromEntries(counts.map(c => [c.jobId, c._count.id]))
    res.json({ total, byJob })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

module.exports = { getMessages, sendMessage, editMessage, deleteMessage, getUnreadCount, getAllUnread }
