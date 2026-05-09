import { JOB_STATUS_LABELS, JOB_STATUS_CLASS, ESCROW_STATUS_CLASS } from '../utils/helpers'

export function StatusBadge({ status }) {
  return (
    <span className={JOB_STATUS_CLASS[status] || 'badge bg-ink-700 text-ink-400'}>
      {JOB_STATUS_LABELS[status] || status}
    </span>
  )
}

export function EscrowBadge({ status }) {
  return (
    <span className={ESCROW_STATUS_CLASS[status] || 'badge bg-ink-700 text-ink-400'}>
      {status}
    </span>
  )
}

export function Spinner({ size = 'sm' }) {
  const s = size === 'lg' ? 'w-8 h-8' : size === 'md' ? 'w-6 h-6' : 'w-4 h-4'
  return (
    <svg className={`${s} animate-spin text-brand-400`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <Spinner size="lg" />
    </div>
  )
}

export function EmptyState({ icon, title, desc, action }) {
  return (
    <div className="card p-12 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="font-display font-semibold text-xl text-white mb-2">{title}</h3>
      <p className="text-ink-400 mb-6 max-w-sm mx-auto">{desc}</p>
      {action}
    </div>
  )
}

export function StarRating({ rating, count }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-amber-400">&#9733;</span>
      <span className="text-sm font-medium text-ink-200">{rating?.toFixed(1) || '--'}</span>
      {count !== undefined && <span className="text-xs text-ink-500">({count})</span>}
    </div>
  )
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-lg animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-ink-800">
          <h3 className="font-display font-semibold text-lg text-white">{title}</h3>
          <button onClick={onClose} className="btn-ghost btn-sm rounded-lg"></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false, loading = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-ink-300 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button className="btn-secondary btn" onClick={onClose}>Cancel</button>
        <button
          className={danger ? 'btn-danger btn' : 'btn-primary btn'}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? <Spinner /> : null}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
