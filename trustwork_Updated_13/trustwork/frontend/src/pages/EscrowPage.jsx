import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { fmtCurrency, fmtDate } from '../utils/helpers'
import { EscrowBadge, PageLoader } from '../components/UI'

export default function EscrowPage() {
  const [jobs, setJobs]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/jobs?limit=50')
      .then(r => setJobs(r.data.jobs.filter(j => j.escrows?.length > 0)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const locked   = jobs.filter(j => j.escrows?.some(e => e.status === 'LOCKED'))
  const released = jobs.filter(j => j.escrows?.some(e => e.status === 'RELEASED'))
  const refunded = jobs.filter(j => j.escrows?.some(e => e.status === 'REFUNDED'))

  const sum = (arr, status) =>
    arr.reduce((s, j) => s + (j.escrows?.filter(e => e.status === status).reduce((a, e) => a + e.amount, 0) || 0), 0)

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Escrow</h1>
        <p className="page-subtitle">Track your locked and released funds</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="stat-card">
          <div className="text-ink-500 text-sm">Locked</div>
          <div className="text-2xl font-display font-bold text-amber-400">{fmtCurrency(sum(locked, 'LOCKED'))}</div>
          <div className="text-xs text-ink-600">{locked.length} jobs</div>
        </div>
        <div className="stat-card">
          <div className="text-ink-500 text-sm">Released</div>
          <div className="text-2xl font-display font-bold text-emerald-400">{fmtCurrency(sum(released, 'RELEASED'))}</div>
          <div className="text-xs text-ink-600">{released.length} jobs</div>
        </div>
        <div className="stat-card">
          <div className="text-ink-500 text-sm">Refunded</div>
          <div className="text-2xl font-display font-bold text-rose-400">{fmtCurrency(sum(refunded, 'REFUNDED'))}</div>
          <div className="text-xs text-ink-600">{refunded.length} jobs</div>
        </div>
      </div>

      {loading ? <PageLoader /> : jobs.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-ink-800 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-ink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <p className="text-ink-400 text-sm">No escrow transactions yet</p>
          <p className="text-ink-600 text-xs mt-1">Fund a job to see escrow details here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <Link key={job.id} to={`/jobs/${job.id}`} className="card-hover flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-ink-100 truncate">{job.title}</div>
                <div className="text-xs text-ink-500 mt-0.5">
                  {job.escrows?.[0]?.paymentId && (
                    <span className="font-mono mr-2">{job.escrows[0].paymentId}</span>
                  )}
                  {fmtDate(job.createdAt)}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="font-display font-bold text-lg text-ink-100">
                  {fmtCurrency(job.escrows?.reduce((s, e) => s + e.amount, 0))}
                </div>
                <EscrowBadge status={job.escrows?.[0]?.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
