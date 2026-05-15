const router = require('express').Router()
const { authenticate } = require('../middlewares/auth')
const {
  getMessages, sendMessage, editMessage,
  deleteMessage, getUnreadCount, getAllUnread,
} = require('../controllers/chatController')

router.use(authenticate)

router.get('/unread/all',          getAllUnread)
router.get('/:jobId',              getMessages)
router.post('/:jobId',             sendMessage)
router.patch('/:jobId/:messageId', editMessage)
router.delete('/:jobId/:messageId',deleteMessage)
router.get('/:jobId/unread',       getUnreadCount)

module.exports = router
