const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
const {
  createJob, getJobs, getJob, applyForJob,
  assignFreelancer, submitWork, approveWork, rejectWork,
  getJobMeta,
} = require('../controllers/jobController');
const {
  createJobMilestones,
  getJobMilestones,
} = require('../controllers/milestoneController');

router.use(authenticate);

router.get('/meta',          getJobMeta);         // GET  /jobs/meta
router.get('/',              getJobs);
router.post('/',             createJob);
router.get('/:id',           getJob);
router.post('/:id/apply',    applyForJob);
router.post('/:id/assign',   assignFreelancer);
router.post('/:id/submit',   submitWork);
router.post('/:id/approve',  approveWork);
router.post('/:id/reject',   rejectWork);
router.post('/:id/milestones', createJobMilestones);
router.get('/:id/milestones',  getJobMilestones);

module.exports = router;