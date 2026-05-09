const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
const { createReview, getUserReviews, getJobReviews, getMyJobReview } = require('../controllers/reviewController');

router.use(authenticate);

router.post('/',                      createReview);    // POST /reviews
router.get('/user/:userId',           getUserReviews);  // GET  /reviews/user/:userId
router.get('/job/:jobId',             getJobReviews);   // GET  /reviews/job/:jobId
router.get('/job/:jobId/mine',        getMyJobReview);  // GET  /reviews/job/:jobId/mine

module.exports = router;
