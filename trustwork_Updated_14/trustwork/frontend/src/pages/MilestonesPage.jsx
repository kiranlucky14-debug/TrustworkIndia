// MilestonesPage.jsx
// Full milestone lifecycle: PENDING -> FUNDED -> SUBMITTED -> PENDING_REVIEW -> RELEASED
// Client: create/edit/delete/fund/approve  |  Freelancer: submit  |  Admin: payout queue

import { useState, useEffect, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { fmtCurrency, fmtDate, fmtRelative, errMsg } from '../utils/helpers'

const PLATFORM_FEE = 0.02

//  Status config 
const MS_CFG = {
  PENDING:        { color: '#94a3b8', bg: 'rgba(148,163,184,.12)', label: 'Pending',        step: 1 },
  FUNDED:         { color: '#fbbf24', bg: 'rgba(251,191,36,.12)',  label: 'Funded',          step: 2 },
  SUBMITTED:      { color: '#818cf8', bg: 'rgba(129,140,248,.12)', label: 'Submitted',       step: 3 },
  PENDING_REVIEW: { color: '#fb923c', bg: 'rgba(251,146,60,.12)',  label: 'Payout Review',   step: 4 },
  APPROVED:       { color: '#34d399', bg: 'rgba(52,211,153,.12)',  label: 'Approved',        step: 4 },
  RELEASED:       { color: '#34d399', bg: 'rgba(52,211,153,.15)',  label: 'Released',        step: 5 },
  REFUNDED:       { color: '#f43f5e', bg: 'rgba(244,63,94,.12)',   label: 'Refunded',        step: 0 },
}

function Badge({ status, small }) {
  const cfg = MS_CFG[status] || MS_CFG.PENDING
  return (
    <span style={{ fontSize: small ? 10 : 11, fontWeight: 600, padding: small ? '1px 7px' : '3px 10px', borderRadius: 100, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  )
}

//  Inline spinner 
function Spin({ size = 14 }) {
  return (
    <svg style={{ animation: 'spin .7s linear infinite', flexShrink: 0 }} width={size} height={size}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  )
}

const css = `
  @keyframes spin { to { transform:rotate(360deg) } }
  @keyframes tw-in { from { opacity:0;transform:translateY(6px) } to { opacity:1;transform:translateY(0) } }
  .ms-fade { animation: tw-in .25s ease both }
  * { box-sizing: border-box }
  .ms-input {
    width:100%; padding:9px 12px;
    background:rgba(255,255,255,.05);
    border:1.5px solid rgba(255,255,255,.1);
    border-radius:8px; color:#f8fafc; font-size:13px;
    font-family:inherit; outline:none; transition:all .18s;
  }
  .ms-input:focus { border-color:#14b8a6; box-shadow:0 0 0 3px rgba(20,184,166,.1) }
  .ms-input::placeholder { color:#475569 }
  .ms-input.err { border-color:#f43f5e }
  .ms-label { font-size:11px; color:rgba(255,255,255,.38); text-transform:uppercase; letter-spacing:.07em; margin-bottom:4px; display:block }
  .ms-card { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:12px; padding:18px; margin-bottom:12px; transition:border-color .2s }
  .ms-card:hover { border-color:rgba(255,255,255,.14) }
  .ms-btn { padding:8px 16px; border-radius:8px; border:none; font-family:inherit; font-size:13px; font-weight:600; cursor:pointer; transition:all .18s; display:inline-flex; align-items:center; gap:6px }
  .ms-overlay { position:fixed; inset:0; background:rgba(0,0,0,.75); backdrop-filter:blur(4px); z-index:500; display:flex; align-items:flex-start; justify-content:center; padding:24px 16px; overflow-y:auto }
  .ms-panel { width:100%; max-width:540px; background:#0e1c2f; border:1px solid rgba(255,255,255,.1); border-radius:16px; padding:24px; font-family:'DM Sans',system-ui,sans-serif; color:#f8fafc }
  .ms-g2 { display:grid; grid-template-columns:1fr 1fr; gap:12px }
  @media(max-width:560px) { .ms-g2 { grid-template-columns:1fr } }
`

//  Edit / Create modal 
function EditModal({ open, onClose, milestone, jobId, onSaved }) {
  const isNew = !milestone
  const [form, setForm] = useState({ title:'', description:'', deliverable:'', amount:'', dueDate:'' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(milestone
        ? { title: milestone.title, description: milestone.description||'', deliverable: milestone.deliverable||'', amount: milestone.amount, dueDate: milestone.dueDate ? String(milestone.dueDate).slice(0,10) : '' }
        : { title:'', description:'', deliverable:'', amount:'', dueDate:'' }
      )
    }
  }, [open, milestone])

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const save = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return }
    if (!form.amount || Number(form.amount) <= 0) { toast.error('Valid amount required'); return }
    setSaving(true)
    try {
      if (isNew) {
        const all = await api.get(`/jobs/${jobId}/milestones`)
        const next = (all.data.milestones?.length || 0) + 1
        await api.post(`/jobs/${jobId}/milestones`, {
          milestones: [...(all.data.milestones || []).map(m => ({
            title: m.title, description: m.description, deliverable: m.deliverable,
            amount: m.amount, dueDate: m.dueDate ? String(m.dueDate).slice(0,10) : undefined, order: m.order,
          })), { title: form.title.trim(), description: form.description||undefined, deliverable: form.deliverable||undefined, amount: Number(form.amount), dueDate: form.dueDate||undefined, order: next }],
        })
      } else {
        await api.patch(`/milestones/${milestone.id}`, {
          title: form.title.trim(), description: form.description||undefined,
          deliverable: form.deliverable||undefined, amount: Number(form.amount),
          dueDate: form.dueDate||null,
        })
      }
      toast.success(isNew ? 'Milestone added!' : 'Milestone updated!')
      onSaved(); onClose()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setSaving(false) }
  }

  if (!open) return null
  return (
    <div className="ms-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ms-panel">
        <style>{css}</style>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontSize:17, fontWeight:700 }}>{isNew ? 'Add Milestone' : 'Edit Milestone'}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,.4)', cursor:'pointer', display:'flex' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div><label className="ms-label">Title *</label><input className="ms-input" value={form.title} onChange={set('title')} placeholder="e.g. UI Design mockups" /></div>
          <div><label className="ms-label">Description</label><textarea className="ms-input" rows={2} value={form.description} onChange={set('description')} style={{ resize:'vertical' }} placeholder="What this milestone covers" /></div>
          <div><label className="ms-label">Deliverable</label><input className="ms-input" value={form.deliverable} onChange={set('deliverable')} placeholder="What gets handed over (e.g. Figma file)" /></div>
          <div className="ms-g2">
            <div><label className="ms-label">Amount (Rs.) *</label><input className="ms-input" type="number" min="1" value={form.amount} onChange={set('amount')} placeholder="5000" /></div>
            <div><label className="ms-label">Due Date</label><input className="ms-input" type="date" value={form.dueDate} onChange={set('dueDate')} /></div>
          </div>
          {form.amount > 0 && (
            <div style={{ padding:'10px 12px', borderRadius:8, background:'rgba(20,184,166,.07)', border:'1px solid rgba(20,184,166,.2)', fontSize:12, color:'rgba(255,255,255,.55)' }}>
              Platform fee ({(PLATFORM_FEE*100).toFixed(0)}%): <strong style={{ color:'#f8fafc' }}>{fmtCurrency(Number(form.amount) * PLATFORM_FEE)}</strong>
              {' '} &middot; Freelancer receives: <strong style={{ color:'#34d399' }}>{fmtCurrency(Number(form.amount) * (1 - PLATFORM_FEE))}</strong>
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:10, marginTop:20 }}>
          <button onClick={onClose} className="ms-btn" style={{ background:'transparent', border:'1.5px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.5)' }}>Cancel</button>
          <button onClick={save} disabled={saving} className="ms-btn" style={{ flex:1, justifyContent:'center', background:'#14b8a6', color:'#07111d' }}>
            {saving && <Spin />}{saving ? 'Saving...' : isNew ? 'Add Milestone' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

//  Submit Work modal (freelancer) 
function SubmitModal({ open, onClose, milestone, onSubmitted }) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    try {
      await api.post(`/milestones/${milestone.id}/submit`, { submissionNote: note })
      toast.success(`"${milestone.title}" submitted for review!`)
      onSubmitted(); onClose()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setSaving(false) }
  }

  if (!open) return null
  return (
    <div className="ms-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ms-panel">
        <div style={{ fontSize:17, fontWeight:700, marginBottom:6 }}>Submit Milestone Work</div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,.5)', marginBottom:18 }}>{milestone?.title} &middot; {fmtCurrency(milestone?.amount)}</div>
        <div style={{ marginBottom:16, padding:'12px 14px', borderRadius:10, background:'rgba(20,184,166,.06)', border:'1px solid rgba(20,184,166,.2)', fontSize:13, color:'rgba(255,255,255,.6)' }}>
          Once submitted, the client will review. Upon approval, your payment enters the TrustWork payout queue (2% fee deducted on release).
        </div>
        <label className="ms-label" style={{ marginBottom:6 }}>Submission Note (optional)</label>
        <textarea className="ms-input" rows={4} value={note} onChange={e => setNote(e.target.value)}
          style={{ marginBottom:16, resize:'vertical' }} placeholder="Describe what you've completed, any notes for the client..." />
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} className="ms-btn" style={{ background:'transparent', border:'1.5px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.5)' }}>Cancel</button>
          <button onClick={submit} disabled={saving} className="ms-btn" style={{ flex:1, justifyContent:'center', background:'#818cf8', color:'#07111d' }}>
            {saving && <Spin />}{saving ? 'Submitting...' : 'Submit for Client Review'}
          </button>
        </div>
      </div>
    </div>
  )
}

//  Fund modal 
function FundModal({ open, onClose, milestone, onFunded }) {
  const [step,    setStep]    = useState('confirm')
  const [saving,  setSaving]  = useState(false)
  const net = milestone ? milestone.amount * (1 - PLATFORM_FEE) : 0
  const fee = milestone ? milestone.amount * PLATFORM_FEE : 0

  useEffect(() => { if (open) setStep('confirm') }, [open])

  const fund = async () => {
    setStep('processing'); setSaving(true)
    try {
      await new Promise(r => setTimeout(r, 1200))
      await api.post(`/milestones/${milestone.id}/fund`, {})
      setStep('done')
      toast.success(`${fmtCurrency(milestone.amount)} locked in escrow!`)
      onFunded()
    } catch (e) { toast.error(errMsg(e)); setStep('confirm') }
    finally { setSaving(false) }
  }

  if (!open) return null
  return (
    <div className="ms-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ms-panel">
        <div style={{ fontSize:17, fontWeight:700, marginBottom:16 }}>Fund Milestone</div>
        {step === 'confirm' && (
          <>
            <div style={{ padding:'14px', borderRadius:10, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', marginBottom:16 }}>
              <div style={{ fontSize:13, color:'rgba(255,255,255,.5)', marginBottom:4 }}>{milestone?.title}</div>
              <div style={{ fontSize:22, fontWeight:800, color:'#fbbf24' }}>{fmtCurrency(milestone?.amount)}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.38)', marginTop:4 }}>
                Platform fee ({(PLATFORM_FEE*100).toFixed(0)}%): {fmtCurrency(fee)} &middot; Freelancer receives: {fmtCurrency(net)}
              </div>
            </div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.5)', marginBottom:16, lineHeight:1.65 }}>
              This amount will be locked in escrow. The freelancer receives it only after you approve the submission and TrustWork admin processes the payout.
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={onClose} className="ms-btn" style={{ background:'transparent', border:'1.5px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.5)' }}>Cancel</button>
              <button onClick={fund} className="ms-btn" style={{ flex:1, justifyContent:'center', background:'#fbbf24', color:'#07111d' }}>
                Lock in Escrow
              </button>
            </div>
          </>
        )}
        {step === 'processing' && (
          <div style={{ textAlign:'center', padding:'32px 0' }}>
            <Spin size={28} /><div style={{ marginTop:12, color:'rgba(255,255,255,.5)', fontSize:13 }}>Processing payment...</div>
          </div>
        )}
        {step === 'done' && (
          <div style={{ textAlign:'center', padding:'24px 0' }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(52,211,153,.15)', border:'2px solid rgba(52,211,153,.4)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>Escrow Locked!</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.45)', marginBottom:18 }}>{fmtCurrency(milestone?.amount)} secured for "{milestone?.title}"</div>
            <button onClick={onClose} className="ms-btn" style={{ background:'#14b8a6', color:'#07111d', margin:'0 auto' }}>Done</button>
          </div>
        )}
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

  if (loading) return <div style={{ fontSize:13, color:'rgba(255,255,255,.35)', padding:'12px 0' }}>Loading history...</div>
  if (versions.length === 0) return <div style={{ fontSize:13, color:'rgba(255,255,255,.35)', padding:'12px 0' }}>No version history yet.</div>

  return (
    <div>
      {versions.map((v, i) => (
        <div key={v.id} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(20,184,166,.12)', border:'1px solid rgba(20,184,166,.25)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:11, fontWeight:700, color:'#14b8a6' }}>v{v.version}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#e2e8f0' }}>{v.changeReason || 'Agreement updated'}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginTop:2 }}>
              By {v.changedByUser?.name || 'Unknown'} &middot; {fmtRelative(v.createdAt)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

//  Main page 
export default function MilestonesPage() {
  const { jobId }     = useParams()
  const { user }      = useAuth()

  const [job,       setJob]       = useState(null)
  const [milestones,setMilestones]= useState([])
  const [summary,   setSummary]   = useState({})
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [tab,       setTab]       = useState('milestones')

  const [editTarget,  setEditTarget]  = useState(null)  // null = new, obj = edit
  const [showEdit,    setShowEdit]    = useState(false)
  const [fundTarget,  setFundTarget]  = useState(null)
  const [submitTarget,setSubmitTarget]= useState(null)
  const [deleting,    setDeleting]    = useState(null)
  const [approving,   setApproving]   = useState(null)

  const isClient     = user?.id === job?.clientId
  const isFreelancer = user?.id === job?.freelancerId
  const isAdmin      = user?.role === 'ADMIN'

  const fetch = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [jobRes, msRes] = await Promise.all([
        api.get(`/jobs/${jobId}`),
        api.get(`/jobs/${jobId}/milestones`),
      ])
      setJob(jobRes.data)
      setMilestones(msRes.data.milestones || [])
      setSummary(msRes.data.summary || {})
    } catch (e) { setError(errMsg(e)) }
    finally { setLoading(false) }
  }, [jobId])

  useEffect(() => { fetch() }, [fetch])

  const deleteMilestone = async (m) => {
    if (!window.confirm(`Delete "${m.title}"?`)) return
    setDeleting(m.id)
    try { await api.delete(`/milestones/${m.id}`); toast.success('Deleted'); fetch() }
    catch (e) { toast.error(errMsg(e)) }
    finally { setDeleting(null) }
  }

  const approveMilestone = async (m) => {
    if (!window.confirm(`Approve "${m.title}" and send to payout queue? (${(PLATFORM_FEE*100).toFixed(0)}% fee applies)`)) return
    setApproving(m.id)
    try {
      const { data } = await api.post(`/milestones/${m.id}/approve`)
      toast.success(data.message)
      fetch()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setApproving(null) }
  }

  const pendingPayoutCount = milestones.filter(m => m.status === 'PENDING_REVIEW').length

  if (loading) return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", color:'#f8fafc' }}>
      <style>{css}</style>
      {[1,2,3].map(i => <div key={i} className="ms-card" style={{ height:90, animation:'pulse 1.5s ease-in-out infinite', opacity:.5 }}/>)}
      <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }`}</style>
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
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <Link to={`/jobs/${jobId}`} style={{ fontSize:12, color:'#14b8a6', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              Back to Job
            </Link>
          </div>
          <h1 style={{ fontSize:20, fontWeight:800, marginBottom:4, letterSpacing:'-.3px' }}>{job?.title}</h1>
          <div style={{ fontSize:13, color:'rgba(255,255,255,.45)' }}>
            {milestones.length} milestone{milestones.length !== 1 ? 's' : ''} &middot; Total: <strong style={{ color:'#14b8a6' }}>{fmtCurrency(summary.total)}</strong>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={fetch} className="ms-btn" style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.6)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
          {isClient && (
            <button onClick={() => { setEditTarget(null); setShowEdit(true) }} className="ms-btn"
              style={{ background:'#14b8a6', color:'#07111d' }}>
              + Add Milestone
            </button>
          )}
        </div>
      </div>

      {/* Agreement reset warning */}
      {job?.agreementStatus && ['DRAFT','CHANGES_REQUESTED'].includes(job.agreementStatus) && (
        <div style={{ padding:'12px 16px', borderRadius:12, background:'rgba(251,146,60,.07)', border:'1px solid rgba(251,146,60,.25)', marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
          <div style={{ fontSize:13, color:'#fb923c' }}>
            <strong>Agreement needs re-signing</strong>  milestones were modified. Both parties must re-sign.
          </div>
          <Link to={`/jobs/${jobId}/agreement`}
            style={{ fontSize:12, fontWeight:700, padding:'5px 14px', borderRadius:8, background:'rgba(251,146,60,.15)', border:'1px solid rgba(251,146,60,.3)', color:'#fb923c', textDecoration:'none' }}>
            Go to Agreement
          </Link>
        </div>
      )}

      {/* Summary bar */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(100px, 1fr))', gap:8, marginBottom:20 }}>
        {[
          ['Pending',     summary.pending,     '#94a3b8'],
          ['Funded',      summary.funded,      '#fbbf24'],
          ['Submitted',   summary.submitted,   '#818cf8'],
          ['In Review',   summary.pendingReview,'#fb923c'],
          ['Released',    summary.released,    '#34d399'],
        ].map(([l, v, color]) => (
          <div key={l} style={{ padding:'10px 12px', borderRadius:10, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', textAlign:'center' }}>
            <div style={{ fontSize:15, fontWeight:700, color }}>{fmtCurrency(v || 0)}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.38)', textTransform:'uppercase', letterSpacing:'.06em', marginTop:2 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', padding:3, borderRadius:11, width:'fit-content', marginBottom:20 }}>
        {[['milestones','Milestones'], ['history','Agreement History']].map(([id, l]) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            style={{ padding:'6px 16px', borderRadius:9, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, transition:'all .18s', display:'flex', alignItems:'center', gap:6, background: tab===id ? '#14b8a6' : 'transparent', color: tab===id ? '#07111d' : 'rgba(255,255,255,.45)' }}>
            {l}
            {id === 'milestones' && pendingPayoutCount > 0 && (
              <span style={{ fontSize:10, minWidth:16, height:16, borderRadius:100, background: tab===id ? 'rgba(0,0,0,.2)' : 'rgba(251,146,60,.25)', color: tab===id ? '#07111d' : '#fb923c', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px', fontWeight:700 }}>
                {pendingPayoutCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Milestones tab */}
      {tab === 'milestones' && (
        <div className="ms-fade">
          {milestones.length === 0 ? (
            <div style={{ padding:'40px 24px', textAlign:'center', background:'rgba(255,255,255,.03)', borderRadius:14, border:'1px solid rgba(255,255,255,.07)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" strokeLinecap="round" style={{ display:'block', margin:'0 auto 12px' }}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 0 0-4h11"/></svg>
              <div style={{ fontSize:14, color:'rgba(255,255,255,.4)', marginBottom:14 }}>No milestones yet</div>
              {isClient && (
                <button onClick={() => { setEditTarget(null); setShowEdit(true) }} className="ms-btn" style={{ background:'#14b8a6', color:'#07111d', margin:'0 auto' }}>
                  Create First Milestone
                </button>
              )}
            </div>
          ) : (
            milestones.map((m, idx) => {
              const cfg      = MS_CFG[m.status] || MS_CFG.PENDING
              const fee      = Number(m.amount) * PLATFORM_FEE
              const net      = Number(m.amount) - fee
              const isPending = m.status === 'PENDING'
              const isFunded  = m.status === 'FUNDED'
              const isSubmitted = m.status === 'SUBMITTED'
              const isMine   = isFreelancer

              return (
                <div key={m.id} className="ms-card"
                  style={{ borderLeft:`3px solid ${cfg.color}` }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>

                    {/* Step number */}
                    <div style={{ width:32, height:32, borderRadius:'50%', background:`${cfg.color}18`, border:`2px solid ${cfg.color}40`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:13, fontWeight:800, color:cfg.color }}>
                      {idx+1}
                    </div>

                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, flexWrap:'wrap', marginBottom:6 }}>
                        <div>
                          <div style={{ fontSize:15, fontWeight:700, color:'#f8fafc', marginBottom:3 }}>{m.title}</div>
                          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                            <Badge status={m.status} />
                            {m.dueDate && <span style={{ fontSize:11, color:'rgba(255,255,255,.38)' }}>Due: {fmtDate(m.dueDate)}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <div style={{ fontSize:18, fontWeight:800, color:cfg.color }}>{fmtCurrency(m.amount)}</div>
                          <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginTop:2 }}>
                            Net: <span style={{ color:'#34d399' }}>{fmtCurrency(net)}</span>
                          </div>
                        </div>
                      </div>

                      {m.description && <div style={{ fontSize:13, color:'rgba(255,255,255,.55)', marginBottom:6, lineHeight:1.55 }}>{m.description}</div>}
                      {m.deliverable && (
                        <div style={{ fontSize:12, color:'rgba(255,255,255,.45)', marginBottom:6, display:'flex', gap:6 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0, marginTop:1 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          {m.deliverable}
                        </div>
                      )}

                      {/* Submission note */}
                      {m.submissionNote && (
                        <div style={{ margin:'8px 0', padding:'8px 12px', borderRadius:8, background:'rgba(129,140,248,.06)', border:'1px solid rgba(129,140,248,.2)', fontSize:12, color:'rgba(255,255,255,.6)', fontStyle:'italic' }}>
                          <strong style={{ color:'#818cf8' }}>Submission:</strong> "{m.submissionNote}"
                          {m.submittedAt && <span style={{ marginLeft:8, color:'rgba(255,255,255,.3)' }}>{fmtRelative(m.submittedAt)}</span>}
                        </div>
                      )}

                      {/* Payout queue info */}
                      {m.status === 'PENDING_REVIEW' && m.payoutQueue && (
                        <div style={{ margin:'8px 0', padding:'8px 12px', borderRadius:8, background:'rgba(251,146,60,.06)', border:'1px solid rgba(251,146,60,.2)', fontSize:12, color:'rgba(255,255,255,.6)' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" style={{ marginRight:6, verticalAlign:'middle' }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          Payout in admin review queue &middot; Fee: {fmtCurrency(fee)} &middot; Freelancer receives: <strong style={{ color:'#34d399' }}>{fmtCurrency(net)}</strong>
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display:'flex', gap:7, marginTop:10, flexWrap:'wrap' }}>
                        {/* Client actions */}
                        {isClient && isPending && (
                          <>
                            <button onClick={() => { setEditTarget(m); setShowEdit(true) }} className="ms-btn"
                              style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.65)', fontSize:12 }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              Edit
                            </button>
                            <button onClick={() => deleteMilestone(m)} disabled={deleting === m.id} className="ms-btn"
                              style={{ background:'rgba(244,63,94,.08)', border:'1px solid rgba(244,63,94,.2)', color:'#f43f5e', fontSize:12 }}>
                              {deleting === m.id ? <Spin size={12} /> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>}
                              Delete
                            </button>
                            <button onClick={() => setFundTarget(m)} className="ms-btn"
                              style={{ background:'rgba(251,191,36,.12)', border:'1px solid rgba(251,191,36,.3)', color:'#fbbf24', fontSize:12 }}>
                              Fund Milestone
                            </button>
                          </>
                        )}
                        {isClient && isSubmitted && (
                          <button onClick={() => approveMilestone(m)} disabled={approving === m.id} className="ms-btn"
                            style={{ background:'rgba(52,211,153,.12)', border:'1px solid rgba(52,211,153,.3)', color:'#34d399' }}>
                            {approving === m.id ? <Spin /> : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                            Approve & Queue Payout
                          </button>
                        )}
                        {/* Freelancer actions */}
                        {isFreelancer && isFunded && (
                          <button onClick={() => setSubmitTarget(m)} className="ms-btn"
                            style={{ background:'rgba(129,140,248,.15)', border:'1px solid rgba(129,140,248,.3)', color:'#818cf8' }}>
                            Submit Work
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div className="ms-fade ms-card">
          <div style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,.32)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:14 }}>Agreement Version History</div>
          <VersionHistory jobId={jobId} />
        </div>
      )}

      {/* Modals */}
      <EditModal open={showEdit} onClose={() => setShowEdit(false)} milestone={editTarget} jobId={jobId} onSaved={fetch} />
      <FundModal open={!!fundTarget} onClose={() => setFundTarget(null)} milestone={fundTarget} onFunded={() => { setFundTarget(null); fetch() }} />
      <SubmitModal open={!!submitTarget} onClose={() => setSubmitTarget(null)} milestone={submitTarget} onSubmitted={() => { setSubmitTarget(null); fetch() }} />
    </div>
  )
}
