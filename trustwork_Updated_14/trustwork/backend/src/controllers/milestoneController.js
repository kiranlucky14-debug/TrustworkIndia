const {
  createMilestones, editMilestone, deleteMilestone,
  getMilestones, fundMilestone,
  submitMilestone, approveMilestone,
  adminApprovePayout, adminRejectPayout, getPayoutQueue,
  refundMilestone,
} = require('../services/milestoneService')

const ok  = (res, data, status = 200) => res.status(status).json(data)
const err = (res, e) => res.status(e.status || 500).json({ error: e.message || 'Server error' })

// Job-scoped
const createJobMilestones   = async (req, res) => {
  try { ok(res, await createMilestones(req.params.id, req.user.id, req.body.milestones), 201) }
  catch (e) { err(res, e) }
}
const getJobMilestones      = async (req, res) => {
  try { ok(res, await getMilestones(req.params.id, req.user.id)) }
  catch (e) { err(res, e) }
}

// Milestone-scoped
const editMilestoneCtrl     = async (req, res) => {
  try { ok(res, await editMilestone(req.params.id, req.user.id, req.body)) }
  catch (e) { err(res, e) }
}
const deleteMilestoneCtrl   = async (req, res) => {
  try { ok(res, await deleteMilestone(req.params.id, req.user.id)) }
  catch (e) { err(res, e) }
}
const fundMilestoneCtrl     = async (req, res) => {
  try { ok(res, await fundMilestone(req.params.id, req.user.id, req.body.paymentId)) }
  catch (e) { err(res, e) }
}
const submitMilestoneCtrl   = async (req, res) => {
  try { ok(res, await submitMilestone(req.params.id, req.user.id, req.body.submissionNote)) }
  catch (e) { err(res, e) }
}
const approveMilestoneCtrl  = async (req, res) => {
  try { ok(res, await approveMilestone(req.params.id, req.user.id)) }
  catch (e) { err(res, e) }
}
const refundMilestoneCtrl   = async (req, res) => {
  try { ok(res, await refundMilestone(req.params.id, req.user.id)) }
  catch (e) { err(res, e) }
}

// Admin payout queue
const getPayoutQueueCtrl    = async (req, res) => {
  try { ok(res, await getPayoutQueue({ status: req.query.status, freelancerId: req.query.freelancerId })) }
  catch (e) { err(res, e) }
}
const adminApprovePayoutCtrl = async (req, res) => {
  try { ok(res, await adminApprovePayout(req.params.id, req.user.id, req.body.adminNote)) }
  catch (e) { err(res, e) }
}
const adminRejectPayoutCtrl  = async (req, res) => {
  try { ok(res, await adminRejectPayout(req.params.id, req.user.id, req.body.rejectNote)) }
  catch (e) { err(res, e) }
}

module.exports = {
  createJobMilestones, getJobMilestones,
  editMilestoneCtrl, deleteMilestoneCtrl,
  fundMilestoneCtrl, submitMilestoneCtrl, approveMilestoneCtrl, refundMilestoneCtrl,
  getPayoutQueueCtrl, adminApprovePayoutCtrl, adminRejectPayoutCtrl,
}
