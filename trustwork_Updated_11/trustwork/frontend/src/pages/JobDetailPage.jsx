import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { fmtCurrency, fmtDate, daysUntil, errMsg } from '../utils/helpers'
import { StatusBadge, EscrowBadge, PageLoader, Modal, ConfirmModal, Spinner } from '../components/UI'
import { StarDisplay } from '../components/StarInput'
import { SkillTagList } from '../components/SkillTag'
import ReviewModal from '../components/ReviewModal'
import FreelancerCard       from '../components/FreelancerCard'
import SubmitConfirmModal   from './agreement/SubmitConfirmModal'
import ReleaseConfirmModal  from './agreement/ReleaseConfirmModal'

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
              {i < idx ? '' : i + 1}
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
              <div className="text-2xl mb-1"></div>
              <div className="text-sm font-medium text-ink-200 group-hover:text-brand-300">UPI</div>
              <div className="text-xs text-ink-500">Google Pay, PhonePe</div>
            </button>
            <button onClick={simulatePay} className="p-4 rounded-xl border border-ink-700 bg-ink-800 hover:border-brand-500 hover:bg-brand-500/5 transition-all text-center group">
              <div className="text-2xl mb-1"></div>
              <div className="text-sm font-medium text-ink-200 group-hover:text-brand-300">Card</div>
              <div className="text-xs text-ink-500">Debit / Credit</div>
            </button>
          </div>
          <p className="text-xs text-ink-600 text-center">Demo mode  no real payment</p>
        </div>
      )}

      {step === 'processing' && (
        <div className="py-8 text-center space-y-4">
          <Spinner size="lg" />
          <div className="text-ink-300">Processing payment</div>
          <div className="text-xs text-ink-500">Connecting to payment gateway</div>
        </div>
      )}

      {step === 'done' && (
        <div className="py-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-2xl mx-auto"></div>
          <div className="text-white font-semibold">Payment Successful!</div>
          <div className="text-ink-400 text-sm">{fmtCurrency(job?.budget)} locked in escrow</div>
          <button onClick={onClose} className="btn-primary btn mx-auto">Continue</button>
        </div>
      )}
    </Modal>
  )
}

// Assign modal -- shows rich FreelancerCard for each applicant
function AssignModal({ open, onClose, job, onAssigned }) {
  const [applicants,  setApplicants]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [assigning,   setAssigning]   = useState(null)
  const [preview,     setPreview]     = useState(null)  // full-preview applicant
  const [filter,      setFilter]      = useState('all') // all | shortlisted

  const fetchApplicants = () => {
    if (!open) return
    setLoading(true)
    api.get(`/jobs/${job.id}`)
      .then(r => setApplicants(r.data.applicants || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchApplicants() }, [open, job.id])

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

  const handleShortlist = async (applicationId, shortlisted) => {
    await api.patch(`/jobs/applications/${applicationId}/shortlist`, { shortlisted })
  }

  // Normalise UserSkill join objects -> plain skill arrays so FreelancerCard works
  const normalise = (apps) => apps.map(a => ({
    ...a,
    user: a.user ? {
      ...a.user,
      skills: (a.user.skills || []).map(us => us.skill || us),
    } : null,
  }))

  const shown = filter === 'shortlisted'
    ? normalise(applicants.filter(a => a.shortlisted))
    : normalise(applicants)

  return (
    <>
      <Modal open={open && !preview} onClose={onClose} title={`Applications (${applicants.length})`} wide>
        {/* Filter tabs */}
        {applicants.length > 0 && (
          <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,.04)', padding:3, borderRadius:10, marginBottom:16, width:'fit-content' }}>
            {[['all','All'], ['shortlisted','Shortlisted']].map(([v, l]) => (
              <button key={v} onClick={() => setFilter(v)}
                style={{ padding:'5px 14px', borderRadius:8, border:'none', background:filter===v?'#14b8a6':'transparent', color:filter===v?'#07111d':'rgba(255,255,255,.45)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                {l}{v==='shortlisted' ? ` (${applicants.filter(a=>a.shortlisted).length})` : ` (${applicants.length})`}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8"><Spinner size="lg" /></div>
        ) : shown.length === 0 ? (
          <div className="py-8 text-center text-ink-400">
            {filter === 'shortlisted' ? 'No shortlisted applicants yet' : 'No applications yet'}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {shown.map(a => (
              <div key={a.id} onClick={() => setPreview(a)} style={{ cursor:'pointer' }}>
                <FreelancerCard
                  application={a}
                  onShortlist={handleShortlist}
                  onAssign={assign}
                  assigning={assigning === (a.user?.id)}
                  compact
                />
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Full-profile preview modal */}
      {preview && (
        <Modal open={!!preview} onClose={() => setPreview(null)} title="Freelancer Profile" wide>
          <FreelancerCard
            application={preview}
            onShortlist={async (id, val) => {
              await handleShortlist(id, val)
              setApplicants(prev => prev.map(a => a.id === id ? { ...a, shortlisted: val } : a))
            }}
            onAssign={assign}
            assigning={assigning === (preview.user?.id)}
          />
        </Modal>
      )}
    </>
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
  const [showReview,        setShowReview]        = useState(false)
  const [reviewTarget,      setReviewTarget]      = useState(null)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [showReleaseConfirm,setShowReleaseConfirm]= useState(false)
  const [agreement,         setAgreement]         = useState(null)

  const fetchJob = async () => {
    try {
      const { data } = await api.get(`/jobs/${id}`)
      setJob(data)
      // Fetch agreement for Phase 2 modals (silent - no error if not found)
      try {
        const agRes = await api.get(`/agreements/${id}`)
        setAgreement(agRes.data.agreement)
      } catch {}
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
      // Trigger review modal after approval
      if (endpoint === 'approve') {
        const updatedJob = await api.get(`/jobs/${id}`)
        if (updatedJob.data.status === 'COMPLETED' && updatedJob.data.freelancerId) {
          setReviewTarget({ id: updatedJob.data.freelancerId, name: updatedJob.data.freelancer?.name })
          setShowReview(true)
        }
      }
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
      <button onClick={() => navigate(-1)} className="btn-ghost btn btn-sm mb-6"> Back</button>

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
              <span> Posted {new Date(job.createdAt).toLocaleDateString('en-IN')}</span>
              <span> {daysUntil(job.deadline)}</span>
              <span> Due {fmtDate(job.deadline)}</span>
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
                  <span></span> You've applied to this job
                </div>
              ) : showApply ? (
                <div className="space-y-3">
                  <label className="label">Your pitch (optional)</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={applyMsg}
                    onChange={e => setApplyMsg(e.target.value)}
                    placeholder="Briefly explain why you're a great fit"
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

          {/* Agreement status banner (shown when ASSIGNED) */}
          {(isClient || isFreelancer) && job.status === 'ASSIGNED' && (
            <div style={{ borderRadius:12, padding:16, marginBottom:0,
              background: job.agreementStatus === 'ACTIVE'
                ? 'rgba(52,211,153,.06)' : job.agreementStatus === 'CLIENT_SIGNED'
                ? 'rgba(251,191,36,.06)' : 'rgba(20,184,166,.06)',
              border: `1px solid ${
                job.agreementStatus === 'ACTIVE'
                  ? 'rgba(52,211,153,.25)' : job.agreementStatus === 'CLIENT_SIGNED'
                  ? 'rgba(251,191,36,.25)' : 'rgba(20,184,166,.2)'
              }`,
              fontFamily: 'inherit'
            }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={
                    job.agreementStatus === 'ACTIVE' ? '#34d399' :
                    job.agreementStatus === 'CLIENT_SIGNED' ? '#fbbf24' : '#14b8a6'
                  } strokeWidth="2" strokeLinecap="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  <div>
                    <div style={{ fontSize:14, fontWeight:600, color:
                      job.agreementStatus === 'ACTIVE' ? '#34d399' :
                      job.agreementStatus === 'CLIENT_SIGNED' ? '#fbbf24' : '#14b8a6'
                    }}>
                      {!job.agreementStatus && 'Work Agreement Required'}
                      {job.agreementStatus === 'DRAFT' && 'Agreement in Draft'}
                      {job.agreementStatus === 'CLIENT_SIGNED' && (
                        isClient ? 'Awaiting Freelancer Signature' : 'Review & Sign Agreement'
                      )}
                      {job.agreementStatus === 'CHANGES_REQUESTED' && (
                        isClient ? 'Freelancer Requested Changes' : 'Changes Sent to Client'
                      )}
                      {job.agreementStatus === 'ACTIVE' && 'Agreement Signed by Both Parties'}
                    </div>
                    <div style={{ fontSize:12, color:'rgba(255,255,255,.45)', marginTop:2 }}>
                      {!job.agreementStatus && 'Both parties must sign before escrow can be funded.'}
                      {job.agreementStatus === 'DRAFT' && (isClient ? 'Complete and sign the agreement.' : 'Waiting for client to complete.')}
                      {job.agreementStatus === 'CLIENT_SIGNED' && (isClient ? 'Freelancer is reviewing.' : 'Your signature is needed to unlock escrow.')}
                      {job.agreementStatus === 'CHANGES_REQUESTED' && (isClient ? 'Update the agreement.' : 'Client is updating the agreement.')}
                      {job.agreementStatus === 'ACTIVE' && 'Escrow funding is now unlocked.'}
                    </div>
                  </div>
                </div>
                {(isClient || (isFreelancer && job.agreementStatus === 'CLIENT_SIGNED')) && (
                  <a href={`/jobs/${job.id}/agreement`}
                    style={{ padding:'7px 16px', borderRadius:8,
                      background: job.agreementStatus === 'ACTIVE' ? 'rgba(52,211,153,.15)' : '#14b8a6',
                      border: job.agreementStatus === 'ACTIVE' ? '1px solid rgba(52,211,153,.3)' : 'none',
                      color: job.agreementStatus === 'ACTIVE' ? '#34d399' : '#07111d',
                      fontSize:12, fontWeight:700, textDecoration:'none',
                      display:'inline-flex', alignItems:'center', gap:6, flexShrink:0
                    }}>
                    {job.agreementStatus === 'ACTIVE' ? 'View Agreement' : 
                     isFreelancer ? 'Review & Sign' : 
                     !job.agreementStatus ? 'Create Agreement' : 'Continue Agreement'}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Applicant quick preview for client */}
          {isClient && job.status === 'CREATED' && job.applicants?.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-white text-sm uppercase tracking-wide">
                  Applications ({job.applicants.length})
                </h3>
                <button onClick={() => setShowAssign(true)}
                  className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                  View all &rarr;
                </button>
              </div>
              <div className="space-y-3">
                {job.applicants.slice(0, 3).map(a => {
                  const fl = a.user
                  const skillsNorm = (fl?.skills || []).map(us => us.skill || us)
                  return (
                    <button key={a.id}
                      onClick={() => setShowAssign(true)}
                      className="w-full text-left flex items-center gap-3 p-3 rounded-xl bg-ink-800/60 hover:bg-ink-800 border border-ink-700/50 hover:border-brand-500/30 transition-all">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0"
                        style={{ background:'rgba(20,184,166,.15)', color:'#14b8a6', border:'1px solid rgba(20,184,166,.25)' }}>
                        {fl?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-ink-100 text-sm">{fl?.name || 'Applicant'}</div>
                        {fl?.title && <div className="text-xs text-ink-500 truncate">{fl.title}</div>}
                        {skillsNorm.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {skillsNorm.slice(0, 3).map(s => (
                              <span key={s?.id || s?.name || s} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                                {s?.name || s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {fl?.rating > 0 && <div className="text-xs text-amber-400">{fl.rating.toFixed(1)} &#9733;</div>}
                        {fl?.experienceLevel && <div className="text-[10px] text-ink-600 mt-0.5">{fl.experienceLevel.split(' ')[0]}</div>}
                      </div>
                    </button>
                  )
                })}
                {job.applicants.length > 3 && (
                  <button onClick={() => setShowAssign(true)} className="w-full text-center text-xs text-ink-500 hover:text-brand-400 py-2 transition-colors">
                    +{job.applicants.length - 3} more applicant{job.applicants.length - 3 !== 1 ? 's' : ''} - Click to view all
                  </button>
                )}
              </div>
            </div>
          )}

          {isClient && job.status === 'CREATED' && !job.applicants?.length && (
            <div className="card p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-ink-800 flex items-center justify-center mx-auto mb-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              </div>
              <p className="text-sm text-ink-500">No applications yet. Share this job to attract freelancers.</p>
            </div>
          )}

          {/* Client actions */}
          {isClient && (
            <div className="card p-5 space-y-3">
              <h3 className="font-display font-semibold text-white text-sm uppercase tracking-wide">Actions</h3>
              <div className="flex flex-wrap gap-3">
                {job.status === 'CREATED' && (
                  <button className="btn-primary btn" onClick={() => setShowAssign(true)}
                    style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    View Applicants {job._count?.applicants > 0 ? `(${job._count.applicants})` : ''}
                  </button>
                )}
                {job.status === 'ASSIGNED' && !job.escrows?.length && job.agreementStatus === 'ACTIVE' && (
                  <button className="btn-primary btn" onClick={() => setShowPay(true)}>
                    Fund Escrow
                  </button>
                )}
                {job.status === 'ASSIGNED' && !job.escrows?.length && job.agreementStatus !== 'ACTIVE' && (
                  <div className="text-xs text-ink-500 flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Fund Escrow unlocks after both parties sign the agreement
                  </div>
                )}
                {job.status === 'FUNDED' && isFreelancer && (
                  <button className="btn-primary btn" onClick={() => agreement ? setShowSubmitConfirm(true) : setConfirm({ action: 'submit', label: 'Mark as Submitted', msg: 'Submit your work for client review?' })}>
                     Submit Work
                  </button>
                )}
                {job.status === 'SUBMITTED' && (
                  <>
                    <button
                      className="btn bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                      onClick={() => agreement ? setShowReleaseConfirm(true) : setConfirm({ action: 'approve', label: 'Approve & Release', msg: 'Approve work and release payment to freelancer?' })}
                    >
                       Approve & Release
                    </button>
                    <button
                      className="btn-danger btn"
                      onClick={() => setConfirm({ action: 'reject', label: 'Reject Work', msg: 'Reject work and open a dispute?', danger: true })}
                    >
                       Reject Work
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
                 Submit Work for Review
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
                <StarDisplay value={job.client?.rating} count={job.client?.ratingCount} size='sm' />
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
                  <StarDisplay value={job.freelancer?.rating} count={job.freelancer?.ratingCount} size='sm' />
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
              <h3 className="text-xs font-medium text-rose-400 uppercase tracking-wide mb-3"> Dispute</h3>
              <p className="text-sm text-ink-300">{job.dispute.reason}</p>
              <div className="mt-2 text-xs text-rose-400/70">Status: {job.dispute.status}</div>
              {job.dispute.resolution && (
                <div className="mt-2 p-2 rounded-lg bg-ink-800 text-xs text-ink-300">
                  Resolution: {job.dispute.resolution}
                </div>
              )}
            </div>
          )}

          {/* Required skills */}
          {job.skills && job.skills.length > 0 && (
            <div className="card p-5">
              <h3 className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-3">Required Skills</h3>
              <SkillTagList skills={job.skills.map(s => s.skill || s)} />
            </div>
          )}

          {/* Milestones */}
          {(isClient || isFreelancer) && job.freelancerId && (
            <Link
              to={`/jobs/${job.id}/milestones`}
              className="btn-secondary btn w-full text-center"
            >
               View Milestones
            </Link>
          )}

          {/* Raise dispute */}
          {(isClient || isFreelancer) && ['IN_PROGRESS', 'SUBMITTED', 'FUNDED'].includes(job.status) && !job.dispute && (
            <button
              className="btn-danger btn w-full"
              onClick={() => setConfirm({ action: 'dispute', label: 'Raise Dispute', msg: 'Open a dispute for admin review?', danger: true })}
            >
               Raise Dispute
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
      {/* Phase 2: Submit confirmation (freelancer) */}
      <SubmitConfirmModal
        open={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        jobId={id}
        job={job}
        agreement={agreement}
        onSubmitted={() => { setShowSubmitConfirm(false); fetchJob() }}
      />

      {/* Phase 2: Release confirmation (client) */}
      <ReleaseConfirmModal
        open={showReleaseConfirm}
        onClose={() => setShowReleaseConfirm(false)}
        jobId={id}
        job={job}
        agreement={agreement}
        onReleased={() => {
          setShowReleaseConfirm(false)
          fetchJob()
          // Trigger review modal after successful release
          if (job?.freelancerId) {
            setReviewTarget({ id: job.freelancerId, name: job.freelancer?.name })
            setShowReview(true)
          }
        }}
      />

      <ReviewModal
        open={showReview}
        onClose={() => setShowReview(false)}
        job={job}
        revieweeName={reviewTarget?.name}
        onReviewed={fetchJob}
      />

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
