export const fmtCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)

export const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export const fmtRelative = (d) => {
  const diff = Date.now() - new Date(d)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return fmtDate(d)
}

export const daysUntil = (d) => {
  const diff = new Date(d) - Date.now()
  const days = Math.ceil(diff / 86400000)
  if (days < 0) return 'Overdue'
  if (days === 0) return 'Due today'
  return `${days}d left`
}

export const JOB_STATUS_LABELS = {
  CREATED: 'Open',
  ASSIGNED: 'Assigned',
  FUNDED: 'Funded',
  IN_PROGRESS: 'In Progress',
  SUBMITTED: 'Under Review',
  APPROVED: 'Approved',
  COMPLETED: 'Completed',
  DISPUTED: 'Disputed',
  CANCELLED: 'Cancelled',
}

export const JOB_STATUS_CLASS = {
  CREATED: 'badge-created',
  ASSIGNED: 'badge-assigned',
  FUNDED: 'badge-funded',
  IN_PROGRESS: 'badge-progress',
  SUBMITTED: 'badge-submitted',
  APPROVED: 'badge-approved',
  COMPLETED: 'badge-completed',
  DISPUTED: 'badge-disputed',
  CANCELLED: 'badge-cancelled',
}

export const ESCROW_STATUS_CLASS = {
  LOCKED: 'escrow-locked',
  RELEASED: 'escrow-released',
  REFUNDED: 'escrow-refunded',
}

export const errMsg = (err) =>
  err?.response?.data?.error || err?.message || 'Something went wrong'
