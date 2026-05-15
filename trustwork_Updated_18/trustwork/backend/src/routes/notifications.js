const router = require('express').Router()
const { authenticate } = require('../middlewares/auth')
const { getNotifications, getUnreadCount, markRead, markAllRead } = require('../controllers/notificationController')

router.use(authenticate)
router.get('/',           getNotifications)  // GET  /notifications
router.get('/count',      getUnreadCount)    // GET  /notifications/count
router.patch('/read-all', markAllRead)       // PATCH /notifications/read-all
router.patch('/:id/read', markRead)          // PATCH /notifications/:id/read

module.exports = router
