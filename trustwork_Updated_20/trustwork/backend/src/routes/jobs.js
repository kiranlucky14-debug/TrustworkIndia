const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
const {
  createJob, getJobs, getJob, applyForJob,
  assignFreelancer, shortlistApplicant,
  submitWork, approveWork, rejectWork,
} = require('../controllers/jobController');
const {
  createJobMilestones,
  getJobMilestones,
  withdrawJobCtrl,
} = require('../controllers/milestoneController');

router.use(authenticate);

// Job CRUD
router.get('/',              getJobs);
router.post('/',             createJob);
router.get('/:id',           getJob);
router.post('/:id/apply',    applyForJob);
router.post('/:id/assign',   assignFreelancer);
router.post('/:id/submit',   submitWork);
router.post('/:id/approve',  approveWork);
router.post('/:id/reject',   rejectWork);

// Shortlist a specific application
router.patch('/applications/:applicationId/shortlist', shortlistApplicant);

// Milestone sub-routes
router.post('/:id/milestones', createJobMilestones);
router.get('/:id/milestones',  getJobMilestones);
router.post('/:id/withdraw',   withdrawJobCtrl);  // client withdraws job

module.exports = router;
