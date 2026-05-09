import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { fmtRelative, errMsg } from '../utils/helpers'
import { PageLoader, EmptyState, Modal, Spinner } from '../components/UI'

function ResolveModal({ open, onClose, dispute, onResolved }) {
  const [outcome, setOutcome] = useState('RELEASE')
  const [resolution, setResolution] = useState('')
  const [loading, setLoading] = useState(false)

  const resolve = async () => {
    if (!resolution.trim()) return toast.error('Enter resolution notes')
    setLoading(true)
    try {
      await api.post(`/disputes/${dispute.id}/resolve`, { outcome, resolution })
      toast.success('Dispute resolved')
      onResolved()
      onClose()
    } catch (err) { toast.error(errMsg(err)) }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Resolve Dispute">
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-ink-800">
          <div className="text-sm font-medium text-ink-200 mb-1">{dispute?.job?.title}</div>
          <div className="text-xs text-ink-400">{dispute?.reason}</div>
        </div>
        <div>
          <label className="label">Outcome</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { v: 'RELEASE', label: '💸 Release to Freelancer', color: 'emerald' },
              { v: 'REFUND', label: '↩️ Refund to Client', color: 'rose' },
            ].map(o => (
              <button
                key={o.v}
                onClick={() => setOutcome(o.v)}
                className={`p-3 rounded-lg border text-sm font-medium transition-all text-left ${
                  outcome === o.v
                    ? o.v === 'RELEASE' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-rose-500 bg-rose-500/10 text-rose-300'
                    : 'border-ink-700 bg-ink-800 text-ink-400'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Resolution Notes</label>
          <textarea
            className="input"
            rows={3}
            value={resolution}
            onChange={e => setResolution(e.target.value)}
            placeholder="Explain the resolution decision…"
          />
        </div>
        <div className="flex justify-end gap-3">
          <button className="btn-secondary btn" onClick={onClose}>Cancel</button>
          <button className="btn-primary btn" onClick={resolve} disabled={loading}>
            {loading ? <Spinner /> : null} Resolve
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function DisputesPage() {
  const { user } = useAuth()
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState(null)

  const fetch = async () => {
    try {
      const { data } = await api.get('/disputes')
      setDisputes(data)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Disputes</h1>
        <p className="page-subtitle">{user?.role === 'ADMIN' ? 'Manage all disputes' : 'Your disputes'}</p>
      </div>

      {loading ? <PageLoader /> : disputes.length === 0 ? (
        <EmptyState icon="⚖️" title="No disputes" desc="All clear! No disputes to review." />
      ) : (
        <div className="space-y-3">
          {disputes.map(d => (
            <div key={d.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Link to={`/jobs/${d.jobId}`} className="font-medium text-ink-100 hover:text-brand-300 transition-colors">
                      {d.job?.title}
                    </Link>
                    <span className={`badge ${d.status === 'OPEN' ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                      {d.status}
                    </span>
                  </div>
                  <p className="text-sm text-ink-400">{d.reason}</p>
                  {d.resolution && (
                    <div className="mt-2 p-2 rounded bg-ink-800 text-xs text-ink-300">
                      Resolution: {d.resolution}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-ink-600">
                    <span>Raised by {d.raisedBy?.name}</span>
                    <span>{fmtRelative(d.createdAt)}</span>
                  </div>
                </div>
                {user?.role === 'ADMIN' && d.status === 'OPEN' && (
                  <button
                    className="btn-primary btn btn-sm flex-shrink-0"
                    onClick={() => setResolving(d)}
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ResolveModal
        open={!!resolving}
        onClose={() => setResolving(null)}
        dispute={resolving}
        onResolved={fetch}
      />
    </div>
  )
}
