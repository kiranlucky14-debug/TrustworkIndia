const svc = require('../services/milestoneService')

const ok  = (res, data, status = 200) => res.status(status).json(data)
const err = (res, e) => res.status(e.status || 500).json({ error: e.message || 'Server error' })

// Job-scoped
const createJobMilestones  = async (req, res) => {
  try { ok(res, await svc.createMilestones(req.params.id, req.user.id, req.body.milestones), 201) }
  catch (e) { err(res, e) }
}
const getJobMilestones     = async (req, res) => {
  try { ok(res, await svc.getMilestones(req.params.id, req.user.id)) }
  catch (e) { err(res, e) }
}
const withdrawJobCtrl      = async (req, res) => {
  try { ok(res, await svc.withdrawJob(req.params.id, req.user.id, req.body.reason)) }
  catch (e) { err(res, e) }
}

// Milestone-scoped
const editMilestoneCtrl    = async (req, res) => {
  try { ok(res, await svc.editMilestone(req.params.id, req.user.id, req.body)) }
  catch (e) { err(res, e) }
}
const deleteMilestoneCtrl  = async (req, res) => {
  try { ok(res, await svc.deleteMilestone(req.params.id, req.user.id)) }
  catch (e) { err(res, e) }
}
const startWorkCtrl        = async (req, res) => {
  try { ok(res, await svc.startWork(req.params.id, req.user.id)) }
  catch (e) { err(res, e) }
}
const requestReworkCtrl    = async (req, res) => {
  try { ok(res, await svc.requestRework(req.params.id, req.user.id, req.body.reworkNote)) }
  catch (e) { err(res, e) }
}
const fundMilestoneCtrl    = async (req, res) => {
  try { ok(res, await svc.fundMilestone(req.params.id, req.user.id, req.body.paymentId)) }
  catch (e) { err(res, e) }
}
const submitMilestoneCtrl  = async (req, res) => {
  try { ok(res, await svc.submitMilestone(req.params.id, req.user.id, req.body.submissionNote)) }
  catch (e) { err(res, e) }
}
const clientApproveCtrl    = async (req, res) => {
  try { ok(res, await svc.clientApproveMilestone(req.params.id, req.user.id)) }
  catch (e) { err(res, e) }
}
const clientRejectCtrl     = async (req, res) => {
  try { ok(res, await svc.clientRejectMilestone(req.params.id, req.user.id, req.body.rejectReason)) }
  catch (e) { err(res, e) }
}
const refundMilestoneCtrl  = async (req, res) => {
  try { ok(res, await svc.refundMilestone(req.params.id, req.user.id)) }
  catch (e) { err(res, e) }
}

// Admin lock/unlock
const adminUnlockCtrl      = async (req, res) => {
  try { ok(res, await svc.adminUnlockMilestone(req.params.id, req.user.id)) }
  catch (e) { err(res, e) }
}
const adminLockCtrl        = async (req, res) => {
  try { ok(res, await svc.adminLockMilestone(req.params.id, req.user.id, req.body.reason)) }
  catch (e) { err(res, e) }
}

// Payout queue
const getPayoutQueueCtrl       = async (req, res) => {
  try { ok(res, await svc.getPayoutQueue({ status: req.query.status, freelancerId: req.query.freelancerId })) }
  catch (e) { err(res, e) }
}
const adminReleasePayoutCtrl   = async (req, res) => {
  try { ok(res, await svc.adminReleasePayout(req.params.id, req.user.id, req.body.adminNote)) }
  catch (e) { err(res, e) }
}
const adminRejectPayoutCtrl    = async (req, res) => {
  try { ok(res, await svc.adminRejectPayout(req.params.id, req.user.id, req.body.rejectNote)) }
  catch (e) { err(res, e) }
}

module.exports = {
  createJobMilestones, getJobMilestones, withdrawJobCtrl,
  editMilestoneCtrl, deleteMilestoneCtrl,
  fundMilestoneCtrl, startWorkCtrl, submitMilestoneCtrl,
  clientApproveCtrl, clientRejectCtrl, requestReworkCtrl, refundMilestoneCtrl,
  adminUnlockCtrl, adminLockCtrl,
  getPayoutQueueCtrl, adminReleasePayoutCtrl, adminRejectPayoutCtrl,
}
