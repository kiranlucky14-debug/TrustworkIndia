const { prisma } = require('../config/database')

// GET /notifications  -- paginated, newest first
const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query
    const where = { userId: req.user.id }
    if (unreadOnly === 'true') where.read = false

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user.id, read: false } }),
    ])

    res.json({ notifications, total, unreadCount, page: parseInt(page) })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// GET /notifications/count  -- unread count only (for bell badge polling)
const getUnreadCount = async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user.id, read: false },
    })
    res.json({ count })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// PATCH /notifications/:id/read
const markRead = async (req, res) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    })
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

// PATCH /notifications/read-all
const markAllRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true },
    })
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
}

module.exports = { getNotifications, getUnreadCount, markRead, markAllRead }
