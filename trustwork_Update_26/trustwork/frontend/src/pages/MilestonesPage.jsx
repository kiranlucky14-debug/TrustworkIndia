// MilestonesPage.jsx - Full milestone workflow rewrite
// LOCKED -> UNLOCKED -> FUNDED -> SUBMITTED -> UNDER_ADMIN_REVIEW -> RELEASED

import { useState, useEffect, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { fmtCurrency, fmtDate, fmtRelative, errMsg } from '../utils/helpers'

const PLATFORM_FEE_RATE = 0.02

//  Status config 
const SC = {
  LOCKED:             { color: '#475569', bg: 'rgba(71,85,105,.15)',    label: 'Locked',              step: 0 },
  UNLOCKED:           { color: '#14b8a6', bg: 'rgba(20,184,166,.12)',   label: 'Unlocked',            step: 1 },
  PENDING:            { color: '#94a3b8', bg: 'rgba(148,163,184,.12)',  label: 'Pending',             step: 1 },
  FUNDED:             { color: '#fbbf24', bg: 'rgba(251,191,36,.12)',   label: 'Funded',              step: 2 },
  SUBMITTED:          { color: '#818cf8', bg: 'rgba(129,140,248,.12)',  label: 'Submitted',           step: 3 },
  CLIENT_APPROVED:    { color: '#34d399', bg: 'rgba(52,211,153,.1)',    label: 'Client Approved',     step: 4 },
  UNDER_ADMIN_REVIEW: { color: '#fb923c', bg: 'rgba(251,146,60,.12)',   label: 'TrustWork Review',    step: 4 },
  PENDING_REVIEW:     { color: '#fb923c', bg: 'rgba(251,146,60,.12)',   label: 'Payout Review',       step: 4 },
  RELEASED:           { color: '#34d399', bg: 'rgba(52,211,153,.15)',   label: 'Released',            step: 5 },
  REFUNDED:           { color: '#f43f5e', bg: 'rgba(244,63,94,.12)',    label: 'Refunded',            step: 0 },
}

const css = `
  @keyframes spin  { to { transform:rotate(360deg) } }
  @keyframes tw-in { from { opacity:0;transform:translateY(6px) } to { opacity:1;transform:translateY(0) } }
  .mw-fade { animation:tw-in .25s ease both }
  * { box-sizing:border-box }
  .mw-card  { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:13px; padding:18px; margin-bottom:10px; transition:all .2s }
  .mw-input { width:100%; padding:9px 12px; background:rgba(255,255,255,.05); border:1.5px solid rgba(255,255,255,.1); border-radius:8px; color:#f8fafc; font-size:13px; font-family:inherit; outline:none; transition:all .18s }
  .mw-input:focus { border-color:#14b8a6; box-shadow:0 0 0 3px rgba(20,184,166,.1) }
  .mw-input::placeholder { color:#475569 }
  .mw-label { display:block; font-size:10px; color:rgba(255,255,255,.35); text-transform:uppercase; letter-spacing:.07em; margin-bottom:4px }
  .mw-section { font-size:11px; font-weight:700; color:rgba(255,255,255,.3); text-transform:uppercase; letter-spacing:.08em; padding-bottom:8px; margin-bottom:14px; border-bottom:1px solid rgba(255,255,255,.07) }
  .mw-btn { padding:7px 14px; border-radius:8px; border:none; font-family:inherit; font-size:12px; font-weight:600; cursor:pointer; transition:all .18s; display:inline-flex; align-items:center; gap:5px }
  .mw-btn:disabled { opacity:.5; cursor:not-allowed }
  .mw-g2 { display:grid; grid-template-columns:1fr 1fr; gap:10px }
  @media(max-width:540px) { .mw-g2 { grid-template-columns:1fr } }
  .mw-overlay { position:fixed; inset:0; background:rgba(0,0,0,.75); backdrop-filter:blur(4px); z-index:500; display:flex; align-items:flex-start; justify-content:center; padding:24px 16px; overflow-y:auto }
  .mw-panel   { width:100%; max-width:500px; background:#0e1c2f; border:1px solid rgba(255,255,255,.1); border-radius:16px; padding:24px; font-family:'DM Sans',system-ui,sans-serif; color:#f8fafc }
  .fee-box    { padding:10px 12px; border-radius:9px; background:rgba(20,184,166,.07); border:1px solid rgba(20,184,166,.18); font-size:12px }
  .locked-overlay { position:absolute; inset:0; border-radius:13px; background:rgba(7,17,29,.65); backdrop-filter:blur(1px); display:flex; align-items:center; justify-content:center; z-index:2 }
`

function Spin({ s = 13 }) {
  return <svg style={{ animation:'spin .7s linear infinite', flexShrink:0 }} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
}

function Badge({ status }) {
  const cfg = SC[status] || SC.LOCKED
  return <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.color}30`, whiteSpace:'nowrap' }}>{cfg.label}</span>
}

function FeeBreakdown({ amount, compact }) {
  const fee = amount * PLATFORM_FEE_RATE
  const net = amount - fee
  if (compact) return (
    <span style={{ fontSize:11, color:'rgba(255,255,255,.45)' }}>
      Net: <strong style={{ color:'#34d399' }}>{fmtCurrency(net)}</strong>
    </span>
  )
  return (
    <div className="fee-box">
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ color:'rgba(255,255,255,.5)' }}>Gross amount</span>
        <strong style={{ color:'#f8fafc' }}>{fmtCurrency(amount)}</strong>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ color:'rgba(255,255,255,.5)' }}>TrustWork fee (2%)</span>
        <strong style={{ color:'#fb923c' }}>- {fmtCurrency(fee)}</strong>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', paddingTop:6, borderTop:'1px solid rgba(20,184,166,.2)' }}>
        <span style={{ color:'#14b8a6', fontWeight:700 }}>You receive</span>
        <strong style={{ color:'#34d399', fontSize:14 }}>{fmtCurrency(net)}</strong>
      </div>
    </div>
  )
}

//  Edit/Create modal 
function EditModal({ open, milestone, jobId, onClose, onSaved }) {
  const isNew = !milestone
  const [form, setForm] = useState({ title:'', description:'', deliverable:'', amount:'', dueDate:'' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm(milestone
      ? { title:milestone.title||'', description:milestone.description||'', deliverable:milestone.deliverable||'', amount:milestone.amount||'', dueDate:milestone.dueDate?String(milestone.dueDate).slice(0,10):'' }
      : { title:'', description:'', deliverable:'', amount:'', dueDate:'' }
    )
  }, [open, milestone?.id])

  const set = f => e => setForm(p => ({ ...p, [f]: typeof e === 'string' ? e : e.target.value }))

  const save = async () => {
    if (!form.title.trim())               { toast.error('Title required'); return }
    if (!form.amount || Number(form.amount) <= 0) { toast.error('Valid amount required'); return }
    setSaving(true)
    try {
      if (isNew) {
        const res = await api.get(`/jobs/${jobId}/milestones`)
        const existing = (res.data.milestones || []).map(m => ({
          title: m.title, description: m.description, deliverable: m.deliverable,
          amount: m.amount, dueDate: m.dueDate ? String(m.dueDate).slice(0,10) : undefined,
        }))
        await api.post(`/jobs/${jobId}/milestones`, {
          milestones: [...existing, { title:form.title.trim(), description:form.description||undefined, deliverable:form.deliverable||undefined, amount:Number(form.amount), dueDate:form.dueDate||undefined }],
        })
        toast.success('Milestone added!')
      } else {
        await api.patch(`/milestones/${milestone.id}`, { title:form.title.trim(), description:form.description||undefined, deliverable:form.deliverable||undefined, amount:Number(form.amount), dueDate:form.dueDate||null })
        toast.success('Milestone updated!')
      }
      onSaved(); onClose()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setSaving(false) }
  }

  if (!open) return null
  return (
    <div className="mw-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mw-panel">
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:18 }}>
          <div style={{ fontSize:16, fontWeight:700 }}>{isNew ? 'Add Milestone' : 'Edit Milestone'}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,.4)', cursor:'pointer', display:'flex' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
          <div><label className="mw-label">Title *</label><input className="mw-input" value={form.title} onChange={set('title')} placeholder="e.g. Design Mockups" /></div>
          <div><label className="mw-label">Description</label><textarea className="mw-input" rows={2} value={form.description} onChange={set('description')} style={{ resize:'vertical' }} placeholder="What this milestone covers" /></div>
          <div><label className="mw-label">Deliverable</label><input className="mw-input" value={form.deliverable} onChange={set('deliverable')} placeholder="What gets handed over (e.g. Figma file + exports)" /></div>
          <div className="mw-g2">
            <div><label className="mw-label">Amount (Rs.) *</label><input className="mw-input" type="number" min="1" value={form.amount} onChange={set('amount')} placeholder="5000" /></div>
            <div><label className="mw-label">Due Date</label><input className="mw-input" type="date" value={form.dueDate} onChange={set('dueDate')} /></div>
          </div>
          {Number(form.amount) > 0 && <FeeBreakdown amount={Number(form.amount)} />}
        </div>
        <div style={{ display:'flex', gap:8, marginTop:18 }}>
          <button onClick={onClose} className="mw-btn" style={{ background:'transparent', border:'1.5px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.5)', padding:'9px 16px' }}>Cancel</button>
          <button onClick={save} disabled={saving} className="mw-btn" style={{ flex:1, justifyContent:'center', background:'#14b8a6', color:'#07111d', padding:'9px 16px', fontSize:13 }}>
            {saving && <Spin />}{saving ? 'Saving...' : isNew ? 'Add Milestone' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

//  Submit modal (freelancer) 
function SubmitModal({ open, milestone, onClose, onDone }) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    try {
      await api.post(`/milestones/${milestone.id}/submit`, { submissionNote: note })
      toast.success(`"${milestone.title}" submitted!`)
      onDone(); onClose()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setSaving(false) }
  }

  if (!open) return null
  return (
    <div className="mw-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mw-panel">
        <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>Submit Milestone Work</div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,.45)', marginBottom:14 }}>{milestone?.title}</div>
        <div style={{ marginBottom:14 }}><FeeBreakdown amount={Number(milestone?.amount || 0)} /></div>
        <div style={{ marginBottom:14, padding:'10px 12px', borderRadius:9, background:'rgba(251,146,60,.07)', border:'1px solid rgba(251,146,60,.2)', fontSize:12, color:'rgba(255,255,255,.55)', lineHeight:1.6 }}>
          After client approves, payment enters <strong style={{ color:'#fb923c' }}>TrustWork Admin Review</strong> before crediting your account. You will receive <strong style={{ color:'#34d399' }}>{fmtCurrency(Number(milestone?.amount || 0) * (1-PLATFORM_FEE_RATE))}</strong> after the 2% platform fee.
        </div>
        <div style={{ marginBottom:14 }}>
          <label className="mw-label" style={{ marginBottom:5 }}>Submission note (optional)</label>
          <textarea className="mw-input" rows={3} value={note} onChange={e => setNote(e.target.value)} style={{ resize:'vertical' }} placeholder="Describe what you delivered, include any links or files..." />
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onClose} className="mw-btn" style={{ background:'transparent', border:'1.5px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.5)', padding:'9px 16px' }}>Cancel</button>
          <button onClick={submit} disabled={saving} className="mw-btn" style={{ flex:1, justifyContent:'center', background:'#818cf8', color:'#07111d', padding:'9px 16px', fontSize:13 }}>
            {saving && <Spin />}{saving ? 'Submitting...' : 'Submit for Client Review'}
          </button>
        </div>
      </div>
    </div>
  )
}

//  Reject modal (client) 
function RejectModal({ open, milestone, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const reject = async () => {
    if (!reason.trim()) { toast.error('Rejection reason required'); return }
    setSaving(true)
    try {
      await api.post(`/milestones/${milestone.id}/reject`, { rejectReason: reason })
      toast.success('Submission rejected  freelancer notified')
      onDone(); onClose()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setSaving(false) }
  }

  if (!open) return null
  return (
    <div className="mw-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mw-panel">
        <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>Reject Submission</div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,.45)', marginBottom:14 }}>{milestone?.title}</div>
        <div style={{ marginBottom:14, padding:'10px 12px', borderRadius:9, background:'rgba(244,63,94,.07)', border:'1px solid rgba(244,63,94,.2)', fontSize:12, color:'rgba(255,255,255,.55)' }}>
          The freelancer will be notified and can resubmit. Provide specific feedback so they know what to fix.
        </div>
        <div style={{ marginBottom:14 }}>
          <label className="mw-label" style={{ marginBottom:5 }}>Rejection reason *</label>
          <textarea className="mw-input" rows={3} value={reason} onChange={e => setReason(e.target.value)} style={{ resize:'vertical' }} placeholder="Be specific: what was missing or incorrect?" />
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onClose} className="mw-btn" style={{ background:'transparent', border:'1.5px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.5)', padding:'9px 16px' }}>Cancel</button>
          <button onClick={reject} disabled={saving} className="mw-btn" style={{ flex:1, justifyContent:'center', background:'#f43f5e', color:'#fff', padding:'9px 16px', fontSize:13 }}>
            {saving && <Spin />}{saving ? 'Rejecting...' : 'Reject Submission'}
          </button>
        </div>
      </div>
    </div>
  )
}

//  Fund modal (client) 
function FundModal({ open, milestone, onClose, onDone }) {
  const [step, setStep] = useState('confirm')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setStep('confirm') }, [open])

  const fund = async () => {
    setStep('processing'); setSaving(true)
    try {
      await new Promise(r => setTimeout(r, 1000))
      await api.post(`/milestones/${milestone.id}/fund`)
      setStep('done')
      toast.success(`Escrow locked for "${milestone.title}"!`)
      onDone()
    } catch (e) { toast.error(errMsg(e)); setStep('confirm') }
    finally { setSaving(false) }
  }

  if (!open) return null
  return (
    <div className="mw-overlay" onClick={e => e.target === e.currentTarget && step !== 'processing' && onClose()}>
      <div className="mw-panel">
        {step === 'confirm' && (
          <>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:14 }}>Fund Milestone</div>
            <div style={{ marginBottom:12, padding:'12px 14px', borderRadius:10, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)' }}>
              <div style={{ fontSize:13, color:'rgba(255,255,255,.5)', marginBottom:3 }}>{milestone?.title}</div>
              <div style={{ fontSize:22, fontWeight:800, color:'#fbbf24' }}>{fmtCurrency(milestone?.amount)}</div>
            </div>
            <FeeBreakdown amount={Number(milestone?.amount || 0)} />
            <div style={{ fontSize:12, color:'rgba(255,255,255,.45)', margin:'12px 0', lineHeight:1.6 }}>
              This amount is locked in TrustWork escrow. The freelancer receives their payment only after you approve their submission and TrustWork admin processes the payout.
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={onClose} className="mw-btn" style={{ background:'transparent', border:'1.5px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.5)', padding:'9px 16px' }}>Cancel</button>
              <button onClick={fund} className="mw-btn" style={{ flex:1, justifyContent:'center', background:'#fbbf24', color:'#07111d', padding:'9px 16px', fontSize:13 }}>
                Lock in Escrow
              </button>
            </div>
          </>
        )}
        {step === 'processing' && (
          <div style={{ textAlign:'center', padding:'32px 0' }}>
            <Spin s={28} /><div style={{ marginTop:12, color:'rgba(255,255,255,.45)', fontSize:13 }}>Processing payment...</div>
          </div>
        )}
        {step === 'done' && (
          <div style={{ textAlign:'center', padding:'24px 0' }}>
            <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(52,211,153,.15)', border:'2px solid rgba(52,211,153,.4)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:5 }}>Escrow Locked!</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.45)', marginBottom:16 }}>{milestone?.title}  freelancer can now submit work.</div>
            <button onClick={onClose} className="mw-btn" style={{ background:'#14b8a6', color:'#07111d', margin:'0 auto', padding:'9px 20px' }}>Done</button>
          </div>
        )}
      </div>
    </div>
  )
}

//  Withdraw modal (client) 
function WithdrawModal({ open, job, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const withdraw = async () => {
    if (!reason.trim()) { toast.error('Reason required'); return }
    if (!window.confirm('Are you sure? This cannot be undone. A 2% penalty may apply.')) return
    setSaving(true)
    try {
      const { data } = await api.post(`/jobs/${job.id}/withdraw`, { reason })
      toast.success(data.message)
      onDone(); onClose()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setSaving(false) }
  }

  if (!open) return null
  return (
    <div className="mw-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mw-panel">
        <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>Withdraw Job</div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,.45)', marginBottom:16 }}>{job?.title}</div>
        <div style={{ marginBottom:16, padding:'12px 14px', borderRadius:10, background:'rgba(244,63,94,.07)', border:'1px solid rgba(244,63,94,.2)', fontSize:13, color:'rgba(255,255,255,.6)', lineHeight:1.65 }}>
          <strong style={{ color:'#fb7185' }}>Withdrawal Policy:</strong><br/>
          If within 24 hours of agreement signing: <strong style={{ color:'#f8fafc' }}>2% of first milestone charged as platform fee</strong>, remaining escrow refunded.<br/>
          After 24 hours: standard dispute process applies.
        </div>
        <div style={{ marginBottom:16 }}>
          <label className="mw-label" style={{ marginBottom:5 }}>Reason for withdrawal *</label>
          <textarea className="mw-input" rows={3} value={reason} onChange={e => setReason(e.target.value)} style={{ resize:'vertical' }} placeholder="Explain why you are withdrawing..." />
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onClose} className="mw-btn" style={{ background:'transparent', border:'1.5px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.5)', padding:'9px 16px' }}>Cancel</button>
          <button onClick={withdraw} disabled={saving} className="mw-btn" style={{ flex:1, justifyContent:'center', background:'#f43f5e', color:'#fff', padding:'9px 16px', fontSize:13 }}>
            {saving && <Spin />}{saving ? 'Withdrawing...' : 'Withdraw Job'}
          </button>
        </div>
      </div>
    </div>
  )
}

//  Agreement version history 
function VersionHistory({ jobId }) {
  const [versions, setVersions] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    api.get(`/agreements/${jobId}/versions`)
      .then(r => setVersions(r.data.versions || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [jobId])

  if (loading) return <div style={{ fontSize:13, color:'rgba(255,255,255,.35)', padding:'12px 0' }}>Loading...</div>
  if (!versions.length) return <div style={{ fontSize:13, color:'rgba(255,255,255,.35)', padding:'12px 0' }}>No version history yet.</div>

  return (
    <div>
      {versions.map(v => (
        <div key={v.id} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
          <div style={{ width:26, height:26, borderRadius:'50%', background:'rgba(20,184,166,.12)', border:'1px solid rgba(20,184,166,.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:10, fontWeight:800, color:'#14b8a6' }}>v{v.version}</div>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:'#e2e8f0' }}>{v.changeReason || 'Agreement updated'}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginTop:2 }}>By {v.changedByUser?.name || 'Unknown'} &middot; {fmtRelative(v.createdAt)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

//  Main page 
export default function MilestonesPage() {
  const { jobId }    = useParams()
  const { user }     = useAuth()
  const [job,        setJob]        = useState(null)
  const [milestones, setMilestones] = useState([])
  const [summary,    setSummary]    = useState({})
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [tab,        setTab]        = useState('milestones')

  const [editTarget,   setEditTarget]   = useState(null)
  const [showEdit,     setShowEdit]     = useState(false)
  const [fundTarget,   setFundTarget]   = useState(null)
  const [submitTarget, setSubmitTarget] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [approving,    setApproving]    = useState(null)
  const [deleting,     setDeleting]     = useState(null)
  const [adminAction,  setAdminAction]  = useState(null)

  const isClient     = user?.id === job?.clientId
  const isFreelancer = user?.id === job?.freelancerId
  const isAdmin      = user?.role === 'ADMIN'

  const fetch = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [jobR, msR] = await Promise.all([
        api.get(`/jobs/${jobId}`),
        api.get(`/jobs/${jobId}/milestones`),
      ])
      setJob(jobR.data)
      setMilestones(msR.data.milestones || [])
      setSummary(msR.data.summary || {})
    } catch (e) { setError(errMsg(e)) }
    finally { setLoading(false) }
  }, [jobId])

  useEffect(() => { fetch() }, [fetch])

  const approveMilestone = async (m) => {
    if (!window.confirm(`Approve "${m.title}" and send to TrustWork payout queue?`)) return
    setApproving(m.id)
    try {
      const { data } = await api.post(`/milestones/${m.id}/approve`)
      toast.success(data.message)
      fetch()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setApproving(null) }
  }

  const deleteMilestone = async (m) => {
    if (!window.confirm(`Delete "${m.title}"?`)) return
    setDeleting(m.id)
    try { await api.delete(`/milestones/${m.id}`); toast.success('Deleted'); fetch() }
    catch (e) { toast.error(errMsg(e)) }
    finally { setDeleting(null) }
  }

  const adminToggleLock = async (m) => {
    setAdminAction(m.id)
    try {
      const endpoint = m.isLocked ? `/milestones/${m.id}/unlock` : `/milestones/${m.id}/lock`
      const { data } = await api.post(endpoint, { reason: 'Admin override' })
      toast.success(data.message)
      fetch()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setAdminAction(null) }
  }

  const pendingReviewCount = milestones.filter(m => m.status === 'UNDER_ADMIN_REVIEW').length
  const submittedCount     = milestones.filter(m => m.status === 'SUBMITTED').length
  const canWithdraw = isClient && ['ASSIGNED','FUNDED','IN_PROGRESS'].includes(job?.status) && job?.agreementStatus === 'ACTIVE'

  if (loading) return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", color:'#f8fafc' }}>
      <style>{css}</style>
      {[1,2,3].map(i => <div key={i} className="mw-card" style={{ height:90, opacity:.4, animation:'pulse 1.5s infinite' }}/>)}
      <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:.7}}`}</style>
    </div>
  )

  if (error) return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", color:'#f8fafc', textAlign:'center', padding:'3rem' }}>
      <div style={{ color:'#fb7185', marginBottom:12 }}>{error}</div>
      <button onClick={fetch} style={{ padding:'8px 20px', background:'#14b8a6', border:'none', borderRadius:8, color:'#07111d', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Retry</button>
    </div>
  )

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", color:'#f8fafc', maxWidth:720 }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18, flexWrap:'wrap', gap:10 }}>
        <div>
          <Link to={`/jobs/${jobId}`} style={{ fontSize:12, color:'#14b8a6', textDecoration:'none', display:'flex', alignItems:'center', gap:4, marginBottom:6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back to Job
          </Link>
          <h1 style={{ fontSize:20, fontWeight:800, marginBottom:3, letterSpacing:'-.3px' }}>{job?.title}</h1>
          <div style={{ fontSize:13, color:'rgba(255,255,255,.45)' }}>
            {summary.count || 0} milestones &middot; Total: <strong style={{ color:'#14b8a6' }}>{fmtCurrency(summary.total)}</strong>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button onClick={fetch} className="mw-btn" style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.6)', padding:'8px 14px', fontSize:13 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
          {isClient && (
            <button onClick={() => { setEditTarget(null); setShowEdit(true) }} className="mw-btn"
              style={{ background:'#14b8a6', color:'#07111d', padding:'8px 14px', fontSize:13 }}>
              + Add Milestone
            </button>
          )}
          {canWithdraw && (
            <button onClick={() => setShowWithdraw(true)} className="mw-btn"
              style={{ background:'rgba(244,63,94,.1)', border:'1px solid rgba(244,63,94,.3)', color:'#f43f5e', padding:'8px 14px', fontSize:13 }}>
              Withdraw Job
            </button>
          )}
        </div>
      </div>

      {/* Agreement reset banner */}
      {job?.agreementStatus && ['DRAFT','CHANGES_REQUESTED'].includes(job.agreementStatus) && (
        <div style={{ padding:'12px 16px', borderRadius:11, background:'rgba(251,146,60,.07)', border:'1px solid rgba(251,146,60,.25)', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <div style={{ fontSize:13, color:'#fb923c' }}>
            <strong>Agreement needs re-signing</strong>  milestones were changed. Both parties must re-sign before work continues.
          </div>
          <Link to={`/jobs/${jobId}/agreement`}
            style={{ fontSize:12, fontWeight:700, padding:'5px 14px', borderRadius:8, background:'rgba(251,146,60,.15)', border:'1px solid rgba(251,146,60,.3)', color:'#fb923c', textDecoration:'none' }}>
            Go to Agreement
          </Link>
        </div>
      )}

      {/* Summary bar */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(90px,1fr))', gap:7, marginBottom:18 }}>
        {[
          ['Locked',    summary.locked,       '#475569'],
          ['Unlocked',  summary.unlocked,     '#14b8a6'],
          ['Submitted', summary.submitted,    '#818cf8'],
          ['In Review', summary.underReview,  '#fb923c'],
          ['Released',  summary.released,     '#34d399'],
        ].map(([l, v, color]) => (
          <div key={l} style={{ padding:'9px 10px', borderRadius:9, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', textAlign:'center' }}>
            <div style={{ fontSize:13, fontWeight:700, color }}>{fmtCurrency(v || 0)}</div>
            <div style={{ fontSize:9, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.06em', marginTop:2 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {isClient && submittedCount > 0 && (
        <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(129,140,248,.07)', border:'1px solid rgba(129,140,248,.25)', marginBottom:12, fontSize:13, color:'#818cf8' }}>
          <strong>{submittedCount} milestone{submittedCount>1?'s':''}</strong> awaiting your review and approval.
        </div>
      )}
      {isFreelancer && pendingReviewCount > 0 && (
        <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(251,146,60,.07)', border:'1px solid rgba(251,146,60,.25)', marginBottom:12, fontSize:13, color:'#fb923c' }}>
          <strong>{pendingReviewCount} payment{pendingReviewCount>1?'s':''}</strong> in TrustWork admin review. You will be notified when released.
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', padding:3, borderRadius:11, width:'fit-content', marginBottom:18 }}>
        {[['milestones','Milestones'],['history','Agreement History']].map(([id, l]) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            style={{ padding:'6px 16px', borderRadius:9, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, transition:'all .18s',
              background: tab===id ? '#14b8a6' : 'transparent',
              color: tab===id ? '#07111d' : 'rgba(255,255,255,.45)' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Milestones tab */}
      {tab === 'milestones' && (
        <div className="mw-fade">
          {milestones.length === 0 ? (
            <div style={{ padding:'40px 24px', textAlign:'center', background:'rgba(255,255,255,.03)', borderRadius:14, border:'1px solid rgba(255,255,255,.07)' }}>
              <div style={{ fontSize:14, color:'rgba(255,255,255,.4)', marginBottom:14 }}>No milestones yet</div>
              {isClient && (
                <button onClick={() => { setEditTarget(null); setShowEdit(true) }} className="mw-btn" style={{ background:'#14b8a6', color:'#07111d', margin:'0 auto', padding:'9px 20px', fontSize:13 }}>
                  Create First Milestone
                </button>
              )}
            </div>
          ) : milestones.map((m, idx) => {
            const cfg         = SC[m.status] || SC.LOCKED
            const isLocked    = m.isLocked
            const fee         = m.feeBreakdown?.platformFee ?? Number(m.amount) * PLATFORM_FEE_RATE
            const net         = m.feeBreakdown?.netPayout   ?? Number(m.amount) * (1 - PLATFORM_FEE_RATE)
            const canEdit     = isClient && ['LOCKED','UNLOCKED','PENDING'].includes(m.status)
            const canDelete   = isClient && ['LOCKED','UNLOCKED','PENDING'].includes(m.status)
            const canFund     = isClient && m.status === 'UNLOCKED' && !isLocked
            const canClientUnlock = isClient && m.isLocked && m.status === 'LOCKED'
            const canSubmit   = isFreelancer && m.status === 'FUNDED' && !m.isLocked
            const canApprove  = isClient && m.status === 'SUBMITTED'
            const canReject   = isClient && m.status === 'SUBMITTED'

            return (
              <div key={m.id} style={{ position:'relative' }}>
                <div className="mw-card" style={{ borderLeft:`3px solid ${isLocked ? '#475569' : cfg.color}`, opacity: isLocked ? .75 : 1 }}>
                  <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>

                    {/* Step number */}
                    <div style={{ width:30, height:30, borderRadius:'50%', background:`${isLocked ? '#475569' : cfg.color}18`, border:`2px solid ${isLocked ? '#475569' : cfg.color}35`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:12, fontWeight:800, color: isLocked ? '#475569' : cfg.color }}>
                      {isLocked ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> : idx+1}
                    </div>

                    <div style={{ flex:1, minWidth:0 }}>
                      {/* Title row */}
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                        <div>
                          <div style={{ fontSize:14, fontWeight:700, color: isLocked ? 'rgba(255,255,255,.5)' : '#f8fafc', marginBottom:4 }}>{m.title}</div>
                          <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
                            <Badge status={m.status} />
                            {m.dueDate && <span style={{ fontSize:10, color:'rgba(255,255,255,.35)' }}>Due: {fmtDate(m.dueDate)}</span>}
                            {isLocked && idx > 0 && <span style={{ fontSize:10, color:'#475569' }}>Unlocks after milestone {idx} is released</span>}
                          </div>
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <div style={{ fontSize:17, fontWeight:800, color: isLocked ? '#64748b' : cfg.color }}>{fmtCurrency(m.amount)}</div>
                          <FeeBreakdown amount={Number(m.amount)} compact />
                        </div>
                      </div>

                      {/* Details */}
                      {m.description && <div style={{ fontSize:12, color:'rgba(255,255,255,.5)', marginBottom:5, lineHeight:1.55 }}>{m.description}</div>}
                      {m.deliverable && (
                        <div style={{ fontSize:12, color:'rgba(255,255,255,.45)', marginBottom:5, display:'flex', gap:5 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0, marginTop:1 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          Deliverable: {m.deliverable}
                        </div>
                      )}

                      {/* Fee breakdown (freelancer sees this) */}
                      {(isFreelancer || isAdmin) && !isLocked && m.status !== 'LOCKED' && (
                        <div style={{ marginBottom:8 }}>
                          <FeeBreakdown amount={Number(m.amount)} />
                        </div>
                      )}

                      {/* Submission note */}
                      {m.submissionNote && (
                        <div style={{ margin:'6px 0', padding:'7px 11px', borderRadius:7, background:'rgba(129,140,248,.06)', border:'1px solid rgba(129,140,248,.2)', fontSize:11, color:'rgba(255,255,255,.55)', fontStyle:'italic' }}>
                          <strong style={{ color:'#818cf8' }}>Submitted:</strong> "{m.submissionNote}"
                          {m.submittedAt && <span style={{ marginLeft:6, color:'rgba(255,255,255,.3)' }}>{fmtRelative(m.submittedAt)}</span>}
                        </div>
                      )}
                      {m.rejectReason && (
                        <div style={{ margin:'6px 0', padding:'7px 11px', borderRadius:7, background:'rgba(244,63,94,.06)', border:'1px solid rgba(244,63,94,.2)', fontSize:11, color:'rgba(255,255,255,.55)' }}>
                          <strong style={{ color:'#f43f5e' }}>Rejected:</strong> {m.rejectReason}
                        </div>
                      )}

                      {/* UNDER_ADMIN_REVIEW info */}
                      {m.status === 'UNDER_ADMIN_REVIEW' && (
                        <div style={{ margin:'6px 0', padding:'7px 11px', borderRadius:7, background:'rgba(251,146,60,.06)', border:'1px solid rgba(251,146,60,.2)', fontSize:11, color:'rgba(255,255,255,.55)' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" style={{ marginRight:5, verticalAlign:'middle' }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          Payment in TrustWork admin review &middot; Fee: {fmtCurrency(fee)} &middot; You receive: <strong style={{ color:'#34d399' }}>{fmtCurrency(net)}</strong>
                        </div>
                      )}

                      {/* Actions */}
                      {!isLocked && (
                        <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
                          {canEdit && (
                            <button onClick={() => { setEditTarget(m); setShowEdit(true) }} className="mw-btn"
                              style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.6)' }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => deleteMilestone(m)} disabled={deleting === m.id} className="mw-btn"
                              style={{ background:'rgba(244,63,94,.08)', border:'1px solid rgba(244,63,94,.2)', color:'#f43f5e' }}>
                              {deleting === m.id ? <Spin /> : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>}
                              Delete
                            </button>
                          )}
                          {canClientUnlock && (
                            <button onClick={async () => {
                              if (!window.confirm(`Unlock "${m.title}" so it can be funded?`)) return
                              try {
                                await api.post(`/milestones/${m.id}/unlock`, { reason: 'Client manually unlocked' })
                                toast.success('Milestone unlocked!')
                                fetch()
                              } catch (e) { toast.error(errMsg(e)) }
                            }} className="mw-btn"
                              style={{ background:'rgba(20,184,166,.1)', border:'1px solid rgba(20,184,166,.25)', color:'#14b8a6' }}>
                              Unlock Milestone
                            </button>
                          )}
                          {canFund && (
                            <button onClick={() => setFundTarget(m)} className="mw-btn"
                              style={{ background:'rgba(251,191,36,.12)', border:'1px solid rgba(251,191,36,.3)', color:'#fbbf24' }}>
                              Fund Milestone
                            </button>
                          )}
                          {canSubmit && (
                            <button onClick={() => setSubmitTarget(m)} className="mw-btn"
                              style={{ background:'rgba(129,140,248,.12)', border:'1px solid rgba(129,140,248,.3)', color:'#818cf8' }}>
                              Submit Work
                            </button>
                          )}
                          {canApprove && (
                            <button onClick={() => approveMilestone(m)} disabled={approving === m.id} className="mw-btn"
                              style={{ background:'rgba(52,211,153,.12)', border:'1px solid rgba(52,211,153,.3)', color:'#34d399' }}>
                              {approving === m.id ? <Spin /> : null}
                              Approve & Queue Payout
                            </button>
                          )}
                          {canReject && (
                            <button onClick={() => setRejectTarget(m)} className="mw-btn"
                              style={{ background:'rgba(244,63,94,.08)', border:'1px solid rgba(244,63,94,.25)', color:'#f43f5e' }}>
                              Reject
                            </button>
                          )}
                          {isAdmin && (
                            <button onClick={() => adminToggleLock(m)} disabled={adminAction === m.id} className="mw-btn"
                              style={{ background:'rgba(251,146,60,.1)', border:'1px solid rgba(251,146,60,.25)', color:'#fb923c' }}>
                              {adminAction === m.id ? <Spin /> : null}
                              {m.isLocked ? 'Admin Unlock' : 'Admin Lock'}
                            </button>
                          )}
                        </div>
                      )}
                      {isLocked && isAdmin && (
                        <div style={{ marginTop:8 }}>
                          <button onClick={() => adminToggleLock(m)} disabled={adminAction === m.id} className="mw-btn"
                            style={{ background:'rgba(251,146,60,.1)', border:'1px solid rgba(251,146,60,.25)', color:'#fb923c' }}>
                            {adminAction === m.id ? <Spin /> : null}
                            Admin Unlock Override
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Agreement History tab */}
      {tab === 'history' && (
        <div className="mw-fade mw-card">
          <div className="mw-section">Agreement Version History</div>
          <VersionHistory jobId={jobId} />
        </div>
      )}

      {/* Modals */}
      <EditModal    open={showEdit}      milestone={editTarget}   jobId={jobId}  onClose={() => setShowEdit(false)}      onSaved={fetch} />
      <FundModal    open={!!fundTarget}  milestone={fundTarget}                  onClose={() => setFundTarget(null)}     onDone={() => { setFundTarget(null); fetch() }} />
      <SubmitModal  open={!!submitTarget} milestone={submitTarget}               onClose={() => setSubmitTarget(null)}   onDone={() => { setSubmitTarget(null); fetch() }} />
      <RejectModal  open={!!rejectTarget} milestone={rejectTarget}               onClose={() => setRejectTarget(null)}   onDone={() => { setRejectTarget(null); fetch() }} />
      <WithdrawModal open={showWithdraw}  job={job}                              onClose={() => setShowWithdraw(false)}  onDone={() => { setShowWithdraw(false); fetch() }} />
    </div>
  )
}
