const router = require('express').Router()
const { authenticate } = require('../middlewares/auth')
const { getMatchedJobs, getMatchedFreelancers, getDashboardMatch } = require('../controllers/matchController')

router.use(authenticate)
router.get('/jobs',              getMatchedJobs)
router.get('/freelancers/:jobId',getMatchedFreelancers)
router.get('/dashboard',         getDashboardMatch)

module.exports = router
