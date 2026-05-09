const {
  createMilestones,
  getMilestones,
  fundMilestone,
  releaseMilestone,
} = require('../services/milestoneService');

// ─── POST /jobs/:id/milestones ────────────────────────────────────────────────
const createJobMilestones = async (req, res) => {
  try {
    const result = await createMilestones(req.params.id, req.user.id, req.body.milestones);
    res.status(201).json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Internal server error' });
  }
};

// ─── GET /jobs/:id/milestones ─────────────────────────────────────────────────
const getJobMilestones = async (req, res) => {
  try {
    const result = await getMilestones(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Internal server error' });
  }
};

// ─── POST /milestones/:id/fund ────────────────────────────────────────────────
const fundMilestoneCtrl = async (req, res) => {
  try {
    const { paymentId } = req.body;
    const result = await fundMilestone(req.params.id, req.user.id, paymentId);
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Internal server error' });
  }
};

// ─── POST /milestones/:id/release ─────────────────────────────────────────────
const releaseMilestoneCtrl = async (req, res) => {
  try {
    const result = await releaseMilestone(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Internal server error' });
  }
};

module.exports = {
  createJobMilestones,
  getJobMilestones,
  fundMilestoneCtrl,
  releaseMilestoneCtrl,
};
