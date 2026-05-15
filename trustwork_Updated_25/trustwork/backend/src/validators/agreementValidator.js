// agreementValidator.js - validates all four agreement sections

function validateSectionA(body) {
  const errors = {}
  if (!body.scope?.trim() || body.scope.trim().length < 30)
    errors.scope = 'Scope must be at least 30 characters'
  if (!Array.isArray(body.deliverables) || body.deliverables.length === 0)
    errors.deliverables = 'Add at least one deliverable'
  if (!body.startDate) errors.startDate = 'Start date is required'
  if (!body.endDate)   errors.endDate   = 'End date is required'
  if (body.startDate && body.endDate && new Date(body.startDate) >= new Date(body.endDate))
    errors.endDate = 'End date must be after start date'
  if (!body.revisionRounds && body.revisionRounds !== 0)
    errors.revisionRounds = 'Specify number of revision rounds (0 or more)'
  if (!body.paymentTerms?.trim())
    errors.paymentTerms = 'Payment terms are required'
  return { valid: Object.keys(errors).length === 0, errors }
}

function validateSectionB(body) {
  const errors = {}
  if (!Array.isArray(body.milestonesAgreed) || body.milestonesAgreed.length === 0)
    errors.milestonesAgreed = 'Add at least one milestone'

  let total = 0
  body.milestonesAgreed?.forEach((m, i) => {
    if (!m.title?.trim())       errors[`milestone_${i}_title`]       = `Milestone ${i+1}: title required`
    if (!m.deliverable?.trim()) errors[`milestone_${i}_deliverable`]  = `Milestone ${i+1}: deliverable required`
    if (!m.dueDate)             errors[`milestone_${i}_dueDate`]      = `Milestone ${i+1}: due date required`
    if (!m.amount || m.amount <= 0) errors[`milestone_${i}_amount`]   = `Milestone ${i+1}: valid amount required`
    total += parseFloat(m.amount || 0)
  })
  return { valid: Object.keys(errors).length === 0, errors, total }
}

const CLIENT_CHECKLIST_KEYS = [
  'deliverablesClear', 'budgetFinalised', 'deadlineRealistic',
  'exclusionsClear', 'revisionsAgreed', 'contactAvailable',
  'feedbackTimely', 'escrowAgreed',
]

const FREELANCER_CHECKLIST_KEYS = [
  'scopeUnderstood', 'toolsAvailable', 'timelineAchievable',
  'ambiguitiesCleared', 'milestoneAgreed', 'revisionPolicyUnderstood',
  'qualityAchievable', 'escrowAgreed',
]

function validateClientChecklist(checklist) {
  const errors = {}
  CLIENT_CHECKLIST_KEYS.forEach(k => {
    if (checklist[k] !== true) errors[k] = 'You must confirm this item'
  })
  return { valid: Object.keys(errors).length === 0, errors }
}

function validateFreelancerChecklist(checklist) {
  const errors = {}
  FREELANCER_CHECKLIST_KEYS.forEach(k => {
    if (checklist[k] !== true) errors[k] = 'You must confirm this item'
  })
  return { valid: Object.keys(errors).length === 0, errors }
}

module.exports = {
  validateSectionA,
  validateSectionB,
  validateClientChecklist,
  validateFreelancerChecklist,
  CLIENT_CHECKLIST_KEYS,
  FREELANCER_CHECKLIST_KEYS,
}
