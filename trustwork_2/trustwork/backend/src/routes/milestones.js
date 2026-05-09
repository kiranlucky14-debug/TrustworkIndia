const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
const {
  fundMilestoneCtrl,
  releaseMilestoneCtrl,
} = require('../controllers/milestoneController');

// All milestone standalone routes require auth
router.use(authenticate);

// POST /milestones/:id/fund    — client funds a single milestone
router.post('/:id/fund', fundMilestoneCtrl);

// POST /milestones/:id/release — client releases payment for a milestone
router.post('/:id/release', releaseMilestoneCtrl);

module.exports = router;
