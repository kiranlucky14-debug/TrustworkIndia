const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
const {
  createJob, getJobs, getJob, applyForJob,
  assignFreelancer, submitWork, approveWork, rejectWork,
} = require('../controllers/jobController');
const {
  createJobMilestones,
  getJobMilestones,
} = require('../controllers/milestoneController');

router.use(authenticate);

// ─── Job CRUD ────────────────────────────────────────────────────────────────
router.get('/',              getJobs);
router.post('/',             createJob);
router.get('/:id',           getJob);
router.post('/:id/apply',    applyForJob);
router.post('/:id/assign',   assignFreelancer);
router.post('/:id/submit',   submitWork);
router.post('/:id/approve',  approveWork);
router.post('/:id/reject',   rejectWork);

// ─── Milestone sub-routes under /jobs/:id ────────────────────────────────────
router.post('/:id/milestones', createJobMilestones);  // POST   /jobs/:id/milestones
router.get('/:id/milestones',  getJobMilestones);     // GET    /jobs/:id/milestones

module.exports = router;
