const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
const {
  getSkills, getCategories,
  setMySkills, getUserSkills,
  setJobSkills, getJobSkills,
} = require('../controllers/skillController');

// Public read endpoints (still need auth token for API consistency)
router.use(authenticate);

router.get('/',            getSkills);       // GET  /skills?q=react&category=Frontend
router.get('/categories',  getCategories);   // GET  /skills/categories

// User skills
router.put('/me',          setMySkills);     // PUT  /skills/me         { skillIds: [] }
router.get('/user/:id',    getUserSkills);   // GET  /skills/user/:id

// Job skills
router.put('/job/:id',     setJobSkills);    // PUT  /skills/job/:jobId  { skillIds: [] }
router.get('/job/:id',     getJobSkills);    // GET  /skills/job/:jobId

module.exports = router;
