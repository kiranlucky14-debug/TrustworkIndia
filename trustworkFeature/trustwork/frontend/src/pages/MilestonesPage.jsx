import { useState, useEffect, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { fmtCurrency, fmtDate, errMsg } from '../utils/helpers'
import { PageLoader, EmptyState, Spinner, Modal, ConfirmModal } from '../components/UI'

// ─── Status pill ─────────────────────────────────────────────────────────────
const MS_STYLE = {
  PENDING:  { cls: 'bg-ink-700/60 text-ink-400',           label: 'Pending' },
  FUNDED:   { cls: 'bg-amber-500/15 text-amber-400',        label: 'Funded' },
  RELEASED: { cls: 'bg-emerald-500/15 text-emerald-400',    label: 'Released' },
  REFUNDED: { cls: 'bg-rose-500/15 text-rose-400',          label: 'Refunded' },
}

function MsBadge({ status }) {
  const s = MS_STYLE[status] || MS_STYLE.PENDING
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color = 'bg-brand-500' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="w-full h-1.5 bg-ink-800 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ─── Create / Edit milestones modal ──────────────────────────────────────────
function CreateMilestonesModal({ open, onClose, job, onSaved }) {
  const [rows, setRows] = useState([{ title: '', amount: '', order: 1 }])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) setRows([{ title: '', amount: '', order: 1 }])
  }, [open])

  const addRow = () => setRows(r => [...r, { title: '', amount: '', order: r.length + 1 }])
  const removeRow = (i) => setRows(r => r.filter((_, idx) => idx !== i).map((m, idx) => ({ ...m, order: idx + 1 })))
  const setField = (i, field, val) => setRows(r => r.map((m, idx) => idx === i ? { ...m, [field]: val } : m))

  const total = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)

  const save = async () => {
    for (const [i, r] of rows.entries()) {
      if (!r.title.trim()) return toast.error(`Milestone ${i + 1}: title required`)
      if (!r.amount || parseFloat(r.amount) <= 0) return toast.error(`Milestone ${i + 1}: valid amount required`)
    }
    setLoading(true)
    try {
      await api.post(`/jobs/${job.id}/milestones`, {
        milestones: rows.map(r => ({ title: r.title.trim(), amount: parseFloat(r.amount), order: r.order })),
      })
      toast.success('Milestones saved!')
      onSaved()
      onClose()
    } catch (err) { toast.error(errMsg(err)) }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Set Milestones">
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {rows.map((r, i) => (
          <div key={i} className="p-3 rounded-lg bg-ink-800 border border-ink-700 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-ink-500 w-4">{i + 1}.</span>
              <input
                className="input flex-1 text-sm py-2"
                placeholder={`Milestone title (e.g. UI Design)`}
                value={r.title}
                onChange={e => setField(i, 'title', e.target.value)}
              />
              {rows.length > 1 && (
                <button onClick={() => removeRow(i)} className="text-rose-400 hover:text-rose-300 text-lg leading-none px-1">×</button>
              )}
            </div>
            <div className="flex items-center gap-2 pl-6">
              <span className="text-ink-500 text-sm font-mono">₹</span>
              <input
                className="input text-sm py-2 w-32"
                type="number"
                min="1"
                placeholder="Amount"
                value={r.amount}
                onChange={e => setField(i, 'amount', e.target.value)}
              />
              <span className="text-xs text-ink-500">
                {r.amount && parseFloat(r.amount) > 0
                  ? `${((parseFloat(r.amount) / (total || 1)) * 100).toFixed(0)}% of total`
                  : ''}
              </span>
            </div>
          </div>
        ))}
      </div>

      <button onClick={addRow} className="mt-3 w-full py-2 rounded-lg border border-dashed border-ink-700 text-ink-400 hover:border-brand-500 hover:text-brand-400 text-sm transition-colors">
        + Add milestone
      </button>

      {total > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-brand-500/10 border border-brand-500/20 flex justify-between items-center">
          <span className="text-sm text-ink-300">Total budget</span>
          <span className="font-display font-bold text-brand-400 text-lg">{fmtCurrency(total)}</span>
        </div>
      )}

      <div className="flex gap-3 mt-4">
        <button className="btn-secondary btn" onClick={onClose}>Cancel</button>
        <button className="btn-primary btn flex-1" onClick={save} disabled={loading}>
          {loading ? <Spinner /> : null} Save Milestones
        </button>
      </div>
    </Modal>
  )
}

// ─── Fund milestone modal ─────────────────────────────────────────────────────
function FundModal({ open, onClose, milestone, onFunded }) {
  const [step, setStep] = useState('method')
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (open) setStep('method') }, [open])

  const fund = async () => {
    setStep('processing')
    setLoading(true)
    try {
      await new Promise(r => setTimeout(r, 1500))
      await api.post(`/milestones/${milestone.id}/fund`, {})
      setStep('done')
      toast.success(`${fmtCurrency(milestone.amount)} locked in escrow!`)
      onFunded()
    } catch (err) {
      toast.error(errMsg(err))
      setStep('method')
    } finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Fund: ${milestone?.title}`}>
      {step === 'method' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-ink-800 flex justify-between items-center">
            <span className="text-ink-300 text-sm">Amount to lock</span>
            <span className="font-display font-bold text-xl text-amber-400">{fmtCurrency(milestone?.amount)}</span>
          </div>
          <p className="text-sm text-ink-400 leading-relaxed">
            This amount will be locked in escrow. The freelancer receives it only when you approve this milestone.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[['📱', 'UPI', 'Google Pay, PhonePe'], ['💳', 'Card', 'Debit / Credit']].map(([icon, label, sub]) => (
              <button key={label} onClick={fund}
                className="p-4 rounded-xl border border-ink-700 bg-ink-800 hover:border-amber-500 hover:bg-amber-500/5 transition-all text-center group">
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-sm font-medium text-ink-200 group-hover:text-amber-300">{label}</div>
                <div className="text-xs text-ink-500">{sub}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-600 text-center">Demo mode — no real payment</p>
        </div>
      )}

      {step === 'processing' && (
        <div className="py-10 text-center space-y-4">
          <Spinner size="lg" />
          <div className="text-ink-300">Processing payment…</div>
        </div>
      )}

      {step === 'done' && (
        <div className="py-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-2xl mx-auto">✓</div>
          <div className="text-white font-semibold">Payment Successful!</div>
          <div className="text-ink-400 text-sm">{fmtCurrency(milestone?.amount)} locked in escrow</div>
          <button onClick={onClose} className="btn-primary btn mx-auto">Done</button>
        </div>
      )}
    </Modal>
  )
}

// ─── Main Milestones page ─────────────────────────────────────────────────────
export default function MilestonesPage() {
  const { jobId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [job, setJob] = useState(null)
  const [milestones, setMilestones] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [fundTarget, setFundTarget] = useState(null)
  const [releaseConfirm, setReleaseConfirm] = useState(null)
  const [releaseLoading, setReleaseLoading] = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      const [jobRes, msRes] = await Promise.all([
        api.get(`/jobs/${jobId}`),
        api.get(`/jobs/${jobId}/milestones`),
      ])
      setJob(jobRes.data)
      setMilestones(msRes.data.milestones || [])
      setSummary(msRes.data.summary || null)
    } catch (err) {
      toast.error(errMsg(err))
      navigate('/my-jobs')
    } finally { setLoading(false) }
  }, [jobId, navigate])

  useEffect(() => { fetchAll() }, [fetchAll])

  const releaseMilestone = async () => {
    if (!releaseConfirm) return
    setReleaseLoading(true)
    try {
      const { data } = await api.post(`/milestones/${releaseConfirm.id}/release`)
      toast.success(data.message)
      if (data.jobCompleted) toast.success('🎉 All milestones released — job completed!')
      await fetchAll()
    } catch (err) { toast.error(errMsg(err)) }
    finally { setReleaseLoading(false); setReleaseConfirm(null) }
  }

  if (loading) return <PageLoader />
  if (!job) return null

  const isClient     = user?.id === job.clientId
  const isFreelancer = user?.id === job.freelancerId
  const canCreate    = isClient && ['CREATED', 'ASSIGNED'].includes(job.status)
  const hasMilestones = milestones.length > 0

  return (
    <div className="animate-fade-in">
      <button onClick={() => navigate(`/jobs/${jobId}`)} className="btn-ghost btn btn-sm mb-6">← Back to Job</button>

      {/* Header */}
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Milestones</h1>
          <p className="page-subtitle truncate max-w-xl">{job.title}</p>
        </div>
        {canCreate && (
          <button className="btn-primary btn" onClick={() => setShowCreate(true)}>
            ✚ {hasMilestones ? 'Edit Milestones' : 'Set Milestones'}
          </button>
        )}
      </div>

      {/* Summary stats */}
      {summary && hasMilestones && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Budget',  val: summary.total,    color: 'text-white' },
            { label: 'Locked',        val: summary.funded,   color: 'text-amber-400' },
            { label: 'Released',      val: summary.released, color: 'text-emerald-400' },
            { label: 'Pending',       val: summary.pending,  color: 'text-ink-400' },
          ].map(({ label, val, color }) => (
            <div key={label} className="card p-4">
              <div className="text-xs text-ink-500 mb-1">{label}</div>
              <div className={`text-xl font-display font-bold ${color}`}>{fmtCurrency(val)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Overall progress */}
      {summary && hasMilestones && summary.total > 0 && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-ink-300">Overall Progress</span>
            <span className="text-sm text-ink-400">
              {fmtCurrency(summary.released)} of {fmtCurrency(summary.total)} released
            </span>
          </div>
          <div className="w-full h-2 bg-ink-800 rounded-full overflow-hidden flex gap-0.5">
            {/* Released */}
            <div
              className="h-full bg-emerald-500 rounded-l-full transition-all duration-500"
              style={{ width: `${(summary.released / summary.total) * 100}%` }}
            />
            {/* Funded/locked */}
            <div
              className="h-full bg-amber-500 transition-all duration-500"
              style={{ width: `${(summary.funded / summary.total) * 100}%` }}
            />
          </div>
          <div className="flex gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-xs text-ink-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Released
            </span>
            <span className="flex items-center gap-1.5 text-xs text-ink-500">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Locked
            </span>
            <span className="flex items-center gap-1.5 text-xs text-ink-500">
              <span className="w-2 h-2 rounded-full bg-ink-700 inline-block" /> Pending
            </span>
          </div>
        </div>
      )}

      {/* Milestones list */}
      {!hasMilestones ? (
        <EmptyState
          icon="🏁"
          title="No milestones yet"
          desc={isClient
            ? "Break this job into milestones to pay the freelancer in stages."
            : "The client hasn't set any milestones for this job yet."}
          action={canCreate && (
            <button className="btn-primary btn" onClick={() => setShowCreate(true)}>
              ✚ Set Milestones
            </button>
          )}
        />
      ) : (
        <div className="space-y-4">
          {milestones.map((ms, idx) => {
            const canFund    = isClient && ms.status === 'PENDING' && ['ASSIGNED', 'IN_PROGRESS', 'FUNDED'].includes(job.status)
            const canRelease = isClient && ms.status === 'FUNDED'

            return (
              <div key={ms.id} className={`card p-5 transition-all ${
                ms.status === 'RELEASED' ? 'border-emerald-500/20' :
                ms.status === 'FUNDED'   ? 'border-amber-500/20'   : ''
              }`}>
                <div className="flex items-start gap-4">
                  {/* Order circle */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 border-2 ${
                    ms.status === 'RELEASED' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' :
                    ms.status === 'FUNDED'   ? 'bg-amber-500/20 border-amber-500 text-amber-400' :
                    'bg-ink-800 border-ink-700 text-ink-400'
                  }`}>
                    {ms.status === 'RELEASED' ? '✓' : ms.order}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-medium text-ink-100">{ms.title}</h3>
                      <MsBadge status={ms.status} />
                    </div>

                    <div className="flex items-center gap-4 text-sm text-ink-400 mb-3">
                      <span className="font-display font-bold text-base text-ink-100">{fmtCurrency(ms.amount)}</span>
                      {summary?.total > 0 && (
                        <span className="text-xs text-ink-600">
                          {((ms.amount / summary.total) * 100).toFixed(0)}% of total
                        </span>
                      )}
                    </div>

                    <ProgressBar
                      value={ms.status === 'RELEASED' ? ms.amount : ms.status === 'FUNDED' ? ms.amount * 0.5 : 0}
                      max={ms.amount}
                      color={ms.status === 'RELEASED' ? 'bg-emerald-500' : 'bg-amber-500'}
                    />

                    {/* Escrow info */}
                    {ms.escrow && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-ink-500">
                        <span>Escrow:</span>
                        <span className="font-mono">{ms.escrow.paymentId}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {canFund && (
                      <button
                        className="btn btn-sm bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20"
                        onClick={() => setFundTarget(ms)}
                      >
                        🔒 Fund
                      </button>
                    )}
                    {canRelease && (
                      <button
                        className="btn btn-sm bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                        onClick={() => setReleaseConfirm(ms)}
                      >
                        ✅ Release
                      </button>
                    )}
                    {ms.status === 'RELEASED' && (
                      <span className="text-xs text-emerald-400 font-medium">Paid ✓</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Freelancer view info */}
      {isFreelancer && hasMilestones && (
        <div className="mt-6 card p-4 border-brand-500/20 bg-brand-500/5">
          <p className="text-sm text-ink-300 leading-relaxed">
            <span className="text-brand-400 font-medium">How payments work: </span>
            Each milestone is funded separately by the client before work begins. Once you complete a milestone's work,
            the client releases the payment directly to your wallet.
          </p>
        </div>
      )}

      {/* Modals */}
      <CreateMilestonesModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        job={job}
        onSaved={fetchAll}
      />

      {fundTarget && (
        <FundModal
          open={!!fundTarget}
          onClose={() => setFundTarget(null)}
          milestone={fundTarget}
          onFunded={fetchAll}
        />
      )}

      <ConfirmModal
        open={!!releaseConfirm}
        onClose={() => setReleaseConfirm(null)}
        onConfirm={releaseMilestone}
        title="Release Payment"
        message={`Release ${fmtCurrency(releaseConfirm?.amount)} to the freelancer for "${releaseConfirm?.title}"? This cannot be undone.`}
        confirmLabel="Release Payment"
        loading={releaseLoading}
      />
    </div>
  )
}
