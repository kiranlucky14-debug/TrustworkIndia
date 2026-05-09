import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { fmtCurrency, fmtDate, daysUntil, errMsg } from '../utils/helpers'
import { StatusBadge, EscrowBadge, PageLoader, StarRating, Modal, ConfirmModal, Spinner } from '../components/UI'

// Timeline steps
const STEPS = ['CREATED','ASSIGNED','FUNDED','IN_PROGRESS','SUBMITTED','COMPLETED']
const STEP_LABELS = { CREATED:'Posted', ASSIGNED:'Assigned', FUNDED:'Funded', IN_PROGRESS:'In Progress', SUBMITTED:'Submitted', COMPLETED:'Completed' }

function Timeline({ status }) {
  const idx = STEPS.indexOf(status)
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
              i < idx ? 'bg-brand-500 border-brand-500 text-ink-950'
              : i === idx ? 'bg-brand-500/20 border-brand-500 text-brand-400'
              : 'bg-transparent border-ink-700 text-ink-600'
            }`}>
              {i < idx ? '✓' : i + 1}
            </div>
            <div className={`text-[10px] mt-1 text-center w-16 ${i <= idx ? 'text-ink-400' : 'text-ink-700'}`}>
              {STEP_LABELS[s]}
            </div>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mb-4 ${i < idx ? 'bg-brand-500' : 'bg-ink-800'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// Payment modal (simulated Razorpay)
function PayModal({ open, onClose, job, onPaid }) {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('method') // method | processing | done

  const simulatePay = async () => {
    setStep('processing')
    setLoading(true)
    try {
      // Create order
      const { data: orderData } = await api.post('/payments/create-order', { jobId: job.id })
      const orderId = orderData.order.id

      // Simulate 2s payment processing
      await new Promise(r => setTimeout(r, 2000))

      // Verify (mock)
      const mockPaymentId = `pay_mock_${Date.now()}`
      await api.post('/payments/verify', {
        razorpay_order_id: orderId,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: 'mock_sig',
        jobId: job.id,
      })

      // Fund escrow
      await api.post('/escrow/fund', { jobId: job.id, paymentId: mockPaymentId, orderId })
      setStep('done')
      toast.success('Escrow funded!')
      onPaid()
    } catch (err) {
      toast.error(errMsg(err))
      setStep('method')
    } finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Fund Escrow">
      {step === 'method' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-ink-800 flex justify-between items-center">
            <span className="text-ink-300">Amount to lock in escrow</span>
            <span className="font-display font-bold text-xl text-brand-400">{fmtCurrency(job?.budget)}</span>
          </div>
          <p className="text-sm text-ink-400">
            Funds are locked until you approve the freelancer's work. You can raise a dispute if needed.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={simulatePay} className="p-4 rounded-xl border border-ink-700 bg-ink-800 hover:border-brand-500 hover:bg-brand-500/5 transition-all text-center group">
              <div className="text-2xl mb-1">📱</div>
              <div className="text-sm font-medium text-ink-200 group-hover:text-brand-300">UPI</div>
              <div className="text-xs text-ink-500">Google Pay, PhonePe</div>
            </button>
            <button onClick={simulatePay} className="p-4 rounded-xl border border-ink-700 bg-ink-800 hover:border-brand-500 hover:bg-brand-500/5 transition-all text-center group">
              <div className="text-2xl mb-1">💳</div>
              <div className="text-sm font-medium text-ink-200 group-hover:text-brand-300">Card</div>
              <div className="text-xs text-ink-500">Debit / Credit</div>
            </button>
          </div>
          <p className="text-xs text-ink-600 text-center">Demo mode — no real payment</p>
        </div>
      )}

      {step === 'processing' && (
        <div className="py-8 text-center space-y-4">
          <Spinner size="lg" />
          <div className="text-ink-300">Processing payment…</div>
          <div className="text-xs text-ink-500">Connecting to payment gateway</div>
        </div>
      )}

      {step === 'done' && (
        <div className="py-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-2xl mx-auto">✓</div>
          <div className="text-white font-semibold">Payment Successful!</div>
          <div className="text-ink-400 text-sm">{fmtCurrency(job?.budget)} locked in escrow</div>
          <button onClick={onClose} className="btn-primary btn mx-auto">Continue</button>
        </div>
      )}
    </Modal>
  )
}

// Assign modal
function AssignModal({ open, onClose, job, onAssigned }) {
  const [applicants, setApplicants] = useState([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(null)

  useEffect(() => {
    if (!open) return
    api.get(`/jobs/${job.id}`)
      .then(r => setApplicants(r.data.applicants || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, job.id])

  const assign = async (freelancerId) => {
    setAssigning(freelancerId)
    try {
      await api.post(`/jobs/${job.id}/assign`, { freelancerId })
      toast.success('Freelancer assigned!')
      onAssigned()
      onClose()
    } catch (err) { toast.error(errMsg(err)) }
    finally { setAssigning(null) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Select Freelancer">
      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : applicants.length === 0 ? (
        <div className="py-8 text-center text-ink-400">No applications yet</div>
      ) : (
        <div className="space-y-3">
          {applicants.map(a => (
            <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-ink-800">
              <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-semibold">
                {a.userId?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-ink-100">{a.userId}</div>
                {a.message && <div className="text-xs text-ink-500 mt-0.5 line-clamp-1">{a.message}</div>}
              </div>
              <button
                className="btn-primary btn btn-sm"
                onClick={() => assign(a.userId)}
                disabled={assigning === a.userId}
              >
                {assigning === a.userId ? <Spinner /> : 'Assign'}
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

export default function JobDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [applyMsg, setApplyMsg] = useState('')
  const [showApply, setShowApply] = useState(false)
  const [showPay, setShowPay] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchJob = async () => {
    try {
      const { data } = await api.get(`/jobs/${id}`)
      setJob(data)
    } catch { navigate('/jobs') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchJob() }, [id])

  const doAction = async (endpoint, successMsg, extra = {}) => {
    setActionLoading(true)
    try {
      await api.post(`/jobs/${id}/${endpoint}`, extra)
      toast.success(successMsg)
      await fetchJob()
    } catch (err) { toast.error(errMsg(err)) }
    finally { setActionLoading(false); setConfirm(null) }
  }

  const applyForJob = async () => {
    setApplying(true)
    try {
      await api.post(`/jobs/${id}/apply`, { message: applyMsg })
      toast.success('Application submitted!')
      setShowApply(false)
      await fetchJob()
    } catch (err) { toast.error(errMsg(err)) }
    finally { setApplying(false) }
  }

  if (loading) return <PageLoader />
  if (!job) return null

  const isClient = user?.id === job.clientId
  const isFreelancer = user?.id === job.freelancerId

  return (
    <div className="animate-fade-in">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="btn-ghost btn btn-sm mb-6">← Back</button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">
          {/* Header */}
          <div className="card p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-1">
                <h1 className="font-display font-bold text-2xl text-white mb-2">{job.title}</h1>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={job.status} />
                  {job.escrows?.length > 0 && <EscrowBadge status={job.escrows?.[0]?.status} />}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-2xl font-display font-bold text-brand-400">{fmtCurrency(job.budget)}</div>
                <div className="text-xs text-ink-500 mt-0.5">Budget</div>
              </div>
            </div>
            <p className="text-ink-300 leading-relaxed whitespace-pre-wrap">{job.description}</p>
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-ink-800 text-sm text-ink-500">
              <span>📅 Posted {new Date(job.createdAt).toLocaleDateString('en-IN')}</span>
              <span>⏰ {daysUntil(job.deadline)}</span>
              <span>📆 Due {fmtDate(job.deadline)}</span>
            </div>
          </div>

          {/* Timeline */}
          {!['DISPUTED', 'CANCELLED'].includes(job.status) && (
            <div className="card p-6">
              <h3 className="font-display font-semibold text-white mb-5">Job Progress</h3>
              <Timeline status={job.status} />
            </div>
          )}

          {/* Apply box */}
          {user?.role === 'FREELANCER' && job.status === 'CREATED' && !isFreelancer && (
            <div className="card p-5">
              {job.hasApplied ? (
                <div className="flex items-center gap-2 text-emerald-400">
                  <span>✓</span> You've applied to this job
                </div>
              ) : showApply ? (
                <div className="space-y-3">
                  <label className="label">Your pitch (optional)</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={applyMsg}
                    onChange={e => setApplyMsg(e.target.value)}
                    placeholder="Briefly explain why you're a great fit…"
                  />
                  <div className="flex gap-3">
                    <button className="btn-secondary btn" onClick={() => setShowApply(false)}>Cancel</button>
                    <button className="btn-primary btn flex-1" onClick={applyForJob} disabled={applying}>
                      {applying ? <Spinner /> : null} Submit Application
                    </button>
                  </div>
                </div>
              ) : (
                <button className="btn-primary btn w-full" onClick={() => setShowApply(true)}>
                  Apply for this Job
                </button>
              )}
            </div>
          )}

          {/* Client actions */}
          {isClient && (
            <div className="card p-5 space-y-3">
              <h3 className="font-display font-semibold text-white text-sm uppercase tracking-wide">Actions</h3>
              <div className="flex flex-wrap gap-3">
                {job.status === 'CREATED' && (
                  <button className="btn-primary btn" onClick={() => setShowAssign(true)}>
                    👤 Assign Freelancer
                  </button>
                )}
                {job.status === 'ASSIGNED' && !job.escrows?.length && (
                  <button className="btn-primary btn" onClick={() => setShowPay(true)}>
                    🔒 Fund Escrow
                  </button>
                )}
                {job.status === 'FUNDED' && isFreelancer && (
                  <button className="btn-primary btn" onClick={() => setConfirm({ action: 'submit', label: 'Mark as Submitted', msg: 'Submit your work for client review?' })}>
                    📤 Submit Work
                  </button>
                )}
                {job.status === 'SUBMITTED' && (
                  <>
                    <button
                      className="btn bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                      onClick={() => setConfirm({ action: 'approve', label: 'Approve & Release', msg: 'Approve work and release payment to freelancer?' })}
                    >
                      ✅ Approve & Release
                    </button>
                    <button
                      className="btn-danger btn"
                      onClick={() => setConfirm({ action: 'reject', label: 'Reject Work', msg: 'Reject work and open a dispute?', danger: true })}
                    >
                      ❌ Reject Work
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Freelancer actions */}
          {isFreelancer && ['FUNDED', 'IN_PROGRESS'].includes(job.status) && (
            <div className="card p-5">
              <button
                className="btn-primary btn w-full"
                onClick={() => setConfirm({ action: 'submit', label: 'Submit Work', msg: 'Submit your work for client review?' })}
              >
                📤 Submit Work for Review
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Client */}
          <div className="card p-5">
            <h3 className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-3">Client</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-ink-700 flex items-center justify-center text-sm font-semibold text-ink-300">
                {job.client?.name?.[0]}
              </div>
              <div>
                <div className="font-medium text-ink-100">{job.client?.name}</div>
                <StarRating rating={job.client?.rating} count={job.client?.ratingCount} />
              </div>
            </div>
          </div>

          {/* Freelancer */}
          {job.freelancer && (
            <div className="card p-5">
              <h3 className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-3">Assigned Freelancer</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-sm font-semibold text-brand-400">
                  {job.freelancer?.name?.[0]}
                </div>
                <div>
                  <div className="font-medium text-ink-100">{job.freelancer?.name}</div>
                  <StarRating rating={job.freelancer?.rating} count={job.freelancer?.ratingCount} />
                </div>
              </div>
            </div>
          )}

          {/* Escrow */}
          {job.escrows?.length > 0 && (
            <div className="card p-5">
              <h3 className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-3">Escrow</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-400">Total locked</span>
                  <span className="font-mono text-ink-100">{fmtCurrency(job.escrows.reduce((s,e)=>s+e.amount,0))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-400">Escrows</span>
                  <span className="text-ink-300">{job.escrows.length} record{job.escrows.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          )}

          {/* Dispute */}
          {job.dispute && (
            <div className="card p-5 border-rose-500/20 bg-rose-500/5">
              <h3 className="text-xs font-medium text-rose-400 uppercase tracking-wide mb-3">⚖️ Dispute</h3>
              <p className="text-sm text-ink-300">{job.dispute.reason}</p>
              <div className="mt-2 text-xs text-rose-400/70">Status: {job.dispute.status}</div>
              {job.dispute.resolution && (
                <div className="mt-2 p-2 rounded-lg bg-ink-800 text-xs text-ink-300">
                  Resolution: {job.dispute.resolution}
                </div>
              )}
            </div>
          )}

          {/* Milestones */}
          {(isClient || isFreelancer) && job.freelancerId && (
            <Link
              to={`/jobs/${job.id}/milestones`}
              className="btn-secondary btn w-full text-center"
            >
              🏁 View Milestones
            </Link>
          )}

          {/* Raise dispute */}
          {(isClient || isFreelancer) && ['IN_PROGRESS', 'SUBMITTED', 'FUNDED'].includes(job.status) && !job.dispute && (
            <button
              className="btn-danger btn w-full"
              onClick={() => setConfirm({ action: 'dispute', label: 'Raise Dispute', msg: 'Open a dispute for admin review?', danger: true })}
            >
              ⚖️ Raise Dispute
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
      <PayModal open={showPay} onClose={() => setShowPay(false)} job={job} onPaid={fetchJob} />
      <AssignModal open={showAssign} onClose={() => setShowAssign(false)} job={job} onAssigned={fetchJob} />
      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.label}
        message={confirm?.msg}
        confirmLabel={confirm?.label}
        danger={confirm?.danger}
        loading={actionLoading}
        onConfirm={() => {
          if (confirm.action === 'dispute') {
            api.post('/disputes', { jobId: id, reason: 'Work quality or delivery issue' })
              .then(() => { toast.success('Dispute raised'); fetchJob() })
              .catch(err => toast.error(errMsg(err)))
              .finally(() => setConfirm(null))
          } else {
            doAction(confirm.action, confirm.label + ' successful')
          }
        }}
      />
    </div>
  )
}
