// MilestonePanel.jsx
// Full inline milestone system for JobDetailPage.
// Shows: overall progress, individual milestone cards with all details,
// submit/approve/reject/fund actions, and an edit modal for client.

import { useState, useEffect, useCallback } from 'react'
import { Link }   from 'react-router-dom'
import toast      from 'react-hot-toast'
import api        from '../services/api'
import { fmtCurrency, fmtDate, fmtRelative, errMsg } from '../utils/helpers'

const PLATFORM_FEE_RATE = 0.02

//  Status metadata 
const SM = {
  LOCKED:             { color:'#475569', bg:'rgba(71,85,105,.15)',   label:'Locked',              icon:'lock',   step:0 },
  UNLOCKED:           { color:'#14b8a6', bg:'rgba(20,184,166,.12)',  label:'Unlocked',            icon:'unlock', step:1 },
  FUNDED:             { color:'#fbbf24', bg:'rgba(251,191,36,.12)',  label:'In Progress',         icon:'work',   step:2 },
  SUBMITTED:          { color:'#818cf8', bg:'rgba(129,140,248,.12)', label:'Submitted',           icon:'check',  step:3 },
  UNDER_ADMIN_REVIEW: { color:'#fb923c', bg:'rgba(251,146,60,.12)',  label:'Awaiting TW Release', icon:'clock',  step:4 },
  CLIENT_APPROVED:    { color:'#34d399', bg:'rgba(52,211,153,.1)',   label:'Approved',            icon:'check',  step:4 },
  RELEASED:           { color:'#34d399', bg:'rgba(52,211,153,.15)', label:'Released',            icon:'done',   step:5 },
  REFUNDED:           { color:'#f43f5e', bg:'rgba(244,63,94,.12)',  label:'Refunded',            icon:'x',      step:0 },
  PENDING:            { color:'#94a3b8', bg:'rgba(148,163,184,.12)','label':'Pending',           icon:'lock',   step:0 },
}

const css = `
  @keyframes mp-spin { to { transform:rotate(360deg) } }
  @keyframes mp-in   { from { opacity:0;transform:translateY(5px) } to { opacity:1;transform:translateY(0) } }
  .mp-fade { animation:mp-in .22s ease both }
  .mp-card { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:12px; padding:16px; margin-bottom:10px; transition:border-color .2s }
  .mp-card.active { border-color:rgba(20,184,166,.25) }
  .mp-input { width:100%; padding:9px 12px; background:rgba(255,255,255,.05); border:1.5px solid rgba(255,255,255,.1); border-radius:8px; color:#f8fafc; font-size:13px; font-family:inherit; outline:none; transition:all .18s; box-sizing:border-box }
  .mp-input:focus { border-color:#14b8a6; box-shadow:0 0 0 3px rgba(20,184,166,.1) }
  .mp-input::placeholder { color:#475569 }
  .mp-label { display:block; font-size:10px; color:rgba(255,255,255,.35); text-transform:uppercase; letter-spacing:.07em; margin-bottom:4px }
  .mp-btn { padding:6px 13px; border-radius:7px; border:none; font-family:inherit; font-size:12px; font-weight:600; cursor:pointer; transition:all .18s; display:inline-flex; align-items:center; gap:5px }
  .mp-btn:disabled { opacity:.5; cursor:not-allowed }
  .mp-g2 { display:grid; grid-template-columns:1fr 1fr; gap:10px }
  .mp-overlay { position:fixed; inset:0; background:rgba(0,0,0,.8); backdrop-filter:blur(5px); z-index:600; display:flex; align-items:flex-start; justify-content:center; padding:20px 16px; overflow-y:auto }
  .mp-panel   { width:100%; max-width:620px; background:#0a1628; border:1px solid rgba(255,255,255,.1); border-radius:18px; padding:26px; color:#f8fafc; font-family:'DM Sans',system-ui,sans-serif }
  * { box-sizing:border-box }
`

function Spin({ s = 12 }) {
  return <svg style={{ animation:'mp-spin .7s linear infinite', flexShrink:0 }} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
}

function Badge({ status }) {
  const s = SM[status] || SM.LOCKED
  return <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100, background:s.bg, color:s.color, border:`1px solid ${s.color}30`, whiteSpace:'nowrap' }}>{s.label}</span>
}

function FeeRow({ amount }) {
  const fee = Number(amount) * PLATFORM_FEE_RATE
  const net = Number(amount) - fee
  return (
    <div style={{ padding:'8px 11px', borderRadius:8, background:'rgba(20,184,166,.06)', border:'1px solid rgba(20,184,166,.15)', fontSize:11 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
        <span style={{ color:'rgba(255,255,255,.45)' }}>Gross</span>
        <strong style={{ color:'#f8fafc' }}>{fmtCurrency(amount)}</strong>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
        <span style={{ color:'rgba(255,255,255,.45)' }}>TrustWork fee (2%)</span>
        <strong style={{ color:'#fb923c' }}>- {fmtCurrency(fee)}</strong>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', paddingTop:5, borderTop:'1px solid rgba(20,184,166,.2)', fontWeight:700, fontSize:12 }}>
        <span style={{ color:'#14b8a6' }}>You receive</span>
        <span style={{ color:'#34d399' }}>{fmtCurrency(net)}</span>
      </div>
    </div>
  )
}

//  Lock icon SVG 
function LockIcon({ locked }) {
  return locked
    ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
}

//  Escrow bar 
function EscrowBar({ milestone, escrows }) {
  const esc = escrows?.find(e => e.milestoneId === milestone.id || e.milestone?.id === milestone.id)
  if (!esc) return null
  const locked   = esc.status === 'LOCKED'   ? Number(esc.amount) : 0
  const released = esc.status === 'RELEASED' ? Number(esc.amount) : 0
  const total    = Number(esc.amount)
  return (
    <div style={{ marginTop:6 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'rgba(255,255,255,.35)', marginBottom:3 }}>
        <span>Escrow</span>
        <span style={{ color: esc.status === 'RELEASED' ? '#34d399' : esc.status === 'LOCKED' ? '#fbbf24' : '#94a3b8' }}>
          {esc.status}
        </span>
      </div>
      <div style={{ height:4, background:'rgba(255,255,255,.07)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${released ? 100 : locked ? 100 : 0}%`, background: released ? '#34d399' : '#fbbf24', borderRadius:2, transition:'width .5s ease' }}/>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'rgba(255,255,255,.3)', marginTop:3 }}>
        <span>{released ? 'Released' : locked ? 'Locked in escrow' : 'Not funded'}: {fmtCurrency(total)}</span>
        {esc.netAmount && <span>Net: {fmtCurrency(esc.netAmount)}</span>}
      </div>
    </div>
  )
}

//  Edit milestone modal 
function EditModal({ open, milestone, jobId, onClose, onSaved }) {
  const isNew = !milestone
  const [form, setForm] = useState({ title:'', description:'', deliverable:'', amount:'', dueDate:'' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(milestone
      ? { title:milestone.title||'', description:milestone.description||'', deliverable:milestone.deliverable||'', amount:milestone.amount||'', dueDate:milestone.dueDate?String(milestone.dueDate).slice(0,10):'' }
      : { title:'', description:'', deliverable:'', amount:'', dueDate:'' })
  }, [open, milestone?.id])

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const save = async () => {
    if (!form.title.trim())            { toast.error('Title required'); return }
    if (!form.amount || form.amount<=0) { toast.error('Valid amount required'); return }
    setSaving(true)
    try {
      if (isNew) {
        const res = await api.get(`/jobs/${jobId}/milestones`)
        const existing = (res.data.milestones || []).map(m => ({
          title:m.title, description:m.description, deliverable:m.deliverable,
          amount:m.amount, dueDate:m.dueDate?String(m.dueDate).slice(0,10):undefined,
        }))
        await api.post(`/jobs/${jobId}/milestones`, {
          milestones: [...existing, { title:form.title.trim(), description:form.description||undefined, deliverable:form.deliverable||undefined, amount:Number(form.amount), dueDate:form.dueDate||undefined }],
        })
        toast.success('Milestone added! Agreement revision sent to freelancer.')
      } else {
        await api.patch(`/milestones/${milestone.id}`, {
          title:form.title.trim(), description:form.description||undefined,
          deliverable:form.deliverable||undefined, amount:Number(form.amount),
          dueDate:form.dueDate||null,
        })
        toast.success('Milestone updated! Agreement revision sent to freelancer.')
      }
      onSaved(); onClose()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setSaving(false) }
  }

  if (!open) return null
  return (
    <div className="mp-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="mp-panel mp-fade">
        <style>{css}</style>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div style={{ fontSize:17, fontWeight:700 }}>{isNew ? 'Add Milestone' : 'Edit Milestone'}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,.4)', cursor:'pointer', display:'flex' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {!isNew && <div style={{ padding:'8px 12px', borderRadius:9, background:'rgba(251,191,36,.07)', border:'1px solid rgba(251,191,36,.2)', fontSize:12, color:'#fbbf24', marginBottom:16 }}>
          Editing this milestone will create a new agreement version and require freelancer re-acceptance before work continues.
        </div>}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div><label className="mp-label">Title *</label><input className="mp-input" value={form.title} onChange={set('title')} placeholder="e.g. UI Design Mockups" /></div>
          <div><label className="mp-label">Description</label><textarea className="mp-input" rows={2} value={form.description} onChange={set('description')} style={{ resize:'vertical' }} placeholder="What this milestone covers"/></div>
          <div><label className="mp-label">Deliverable</label><input className="mp-input" value={form.deliverable} onChange={set('deliverable')} placeholder="What gets handed over (e.g. Figma file + source)"/></div>
          <div className="mp-g2">
            <div><label className="mp-label">Amount (Rs.) *</label><input className="mp-input" type="number" min="1" value={form.amount} onChange={set('amount')} placeholder="5000"/></div>
            <div><label className="mp-label">Due Date</label><input className="mp-input" type="date" value={form.dueDate} onChange={set('dueDate')}/></div>
          </div>
          {Number(form.amount) > 0 && <FeeRow amount={Number(form.amount)} />}
        </div>
        <div style={{ display:'flex', gap:8, marginTop:20 }}>
          <button onClick={onClose} className="mp-btn" style={{ background:'transparent', border:'1.5px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.5)', padding:'9px 16px' }}>Cancel</button>
          <button onClick={save} disabled={saving} className="mp-btn" style={{ flex:1, justifyContent:'center', background:'#14b8a6', color:'#07111d', padding:'9px', fontSize:13 }}>
            {saving && <Spin />}{saving ? 'Saving...' : isNew ? 'Add Milestone' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

//  Submit work modal (freelancer) 
function SubmitModal({ open, milestone, onClose, onDone }) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    try {
      await api.post(`/milestones/${milestone.id}/submit`, { submissionNote: note })
      toast.success(`"${milestone.title}" submitted for client review!`)
      onDone(); onClose()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setSaving(false) }
  }

  if (!open) return null
  return (
    <div className="mp-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="mp-panel mp-fade">
        <style>{css}</style>
        <div style={{ fontSize:17, fontWeight:700, marginBottom:5 }}>Submit Work</div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,.45)', marginBottom:14 }}>{milestone?.title}</div>
        <div style={{ marginBottom:14 }}><FeeRow amount={Number(milestone?.amount||0)} /></div>
        <div style={{ padding:'10px 12px', borderRadius:9, background:'rgba(251,146,60,.07)', border:'1px solid rgba(251,146,60,.2)', fontSize:12, color:'rgba(255,255,255,.55)', lineHeight:1.65, marginBottom:14 }}>
          After client approves, payment enters <strong style={{ color:'#fb923c' }}>TrustWork Admin Review</strong> before crediting your account.
        </div>
        <div style={{ marginBottom:16 }}>
          <label className="mp-label" style={{ marginBottom:5 }}>Submission notes (optional)</label>
          <textarea className="mp-input" rows={3} value={note} onChange={e => setNote(e.target.value)} style={{ resize:'vertical' }} placeholder="Describe what you delivered  include any links, files, or important notes..."/>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onClose} className="mp-btn" style={{ background:'transparent', border:'1.5px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.5)', padding:'9px 16px' }}>Cancel</button>
          <button onClick={submit} disabled={saving} className="mp-btn" style={{ flex:1, justifyContent:'center', background:'#818cf8', color:'#07111d', padding:'9px', fontSize:13 }}>
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
    if (!reason.trim()) { toast.error('Reason required'); return }
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
    <div className="mp-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="mp-panel mp-fade">
        <style>{css}</style>
        <div style={{ fontSize:17, fontWeight:700, marginBottom:5 }}>Reject Submission</div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,.45)', marginBottom:14 }}>{milestone?.title}</div>
        <div style={{ padding:'10px 12px', borderRadius:9, background:'rgba(244,63,94,.07)', border:'1px solid rgba(244,63,94,.2)', fontSize:12, color:'rgba(255,255,255,.55)', marginBottom:14 }}>
          The freelancer will be notified and can resubmit after fixing the issues.
        </div>
        <div style={{ marginBottom:16 }}>
          <label className="mp-label" style={{ marginBottom:5 }}>Rejection reason *</label>
          <textarea className="mp-input" rows={3} value={reason} onChange={e => setReason(e.target.value)} style={{ resize:'vertical' }} placeholder="Be specific  what was missing or incorrect?"/>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onClose} className="mp-btn" style={{ background:'transparent', border:'1.5px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.5)', padding:'9px 16px' }}>Cancel</button>
          <button onClick={reject} disabled={saving} className="mp-btn" style={{ flex:1, justifyContent:'center', background:'#f43f5e', color:'#fff', padding:'9px', fontSize:13 }}>
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
      await new Promise(r => setTimeout(r, 900))
      await api.post(`/milestones/${milestone.id}/fund`)
      setStep('done'); toast.success('Milestone funded!'); onDone()
    } catch (e) { toast.error(errMsg(e)); setStep('confirm') }
    finally { setSaving(false) }
  }

  if (!open) return null
  return (
    <div className="mp-overlay" onClick={e => e.target===e.currentTarget && step!=='processing' && onClose()}>
      <div className="mp-panel mp-fade">
        <style>{css}</style>
        {step === 'confirm' && <>
          <div style={{ fontSize:17, fontWeight:700, marginBottom:14 }}>Fund Milestone</div>
          <div style={{ padding:'12px 14px', borderRadius:10, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', marginBottom:12 }}>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.45)', marginBottom:3 }}>{milestone?.title}</div>
            <div style={{ fontSize:22, fontWeight:800, color:'#fbbf24' }}>{fmtCurrency(milestone?.amount)}</div>
          </div>
          <FeeRow amount={Number(milestone?.amount||0)} />
          <div style={{ fontSize:12, color:'rgba(255,255,255,.4)', margin:'12px 0', lineHeight:1.65 }}>
            Amount locked in escrow. Freelancer receives payment only after you approve their submission and TrustWork admin processes the payout.
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={onClose} className="mp-btn" style={{ background:'transparent', border:'1.5px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.5)', padding:'9px 16px' }}>Cancel</button>
            <button onClick={fund} className="mp-btn" style={{ flex:1, justifyContent:'center', background:'#fbbf24', color:'#07111d', padding:'9px', fontSize:13 }}>Lock in Escrow</button>
          </div>
        </>}
        {step === 'processing' && <div style={{ textAlign:'center', padding:'32px 0' }}><Spin s={26}/><div style={{ marginTop:12, color:'rgba(255,255,255,.4)', fontSize:13 }}>Processing payment...</div></div>}
        {step === 'done' && <div style={{ textAlign:'center', padding:'24px 0' }}>
          <div style={{ width:50, height:50, borderRadius:'50%', background:'rgba(52,211,153,.15)', border:'2px solid rgba(52,211,153,.4)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div style={{ fontSize:15, fontWeight:700, marginBottom:5 }}>Escrow Locked!</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,.45)', marginBottom:16 }}>Freelancer can now start and submit work.</div>
          <button onClick={onClose} className="mp-btn" style={{ background:'#14b8a6', color:'#07111d', margin:'0 auto', padding:'9px 24px', fontSize:13 }}>Done</button>
        </div>}
      </div>
    </div>
  )
}

//  Overall progress bar 
function OverallProgress({ milestones }) {
  if (!milestones?.length) return null
  const total    = milestones.length
  const released = milestones.filter(m => m.status === 'RELEASED').length
  const active   = milestones.filter(m => ['FUNDED','SUBMITTED','UNDER_ADMIN_REVIEW','CLIENT_APPROVED'].includes(m.status)).length
  const pct      = Math.round((released / total) * 100)
  const totalAmt = milestones.reduce((s, m) => s + Number(m.amount), 0)
  const relAmt   = milestones.filter(m => m.status === 'RELEASED').reduce((s, m) => s + Number(m.amount), 0)

  return (
    <div style={{ padding:'14px 16px', background:'rgba(20,184,166,.05)', border:'1px solid rgba(20,184,166,.15)', borderRadius:11, marginBottom:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, flexWrap:'wrap', gap:8 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#f8fafc' }}>Overall Progress</div>
        <div style={{ display:'flex', gap:16, fontSize:12 }}>
          <span style={{ color:'rgba(255,255,255,.45)' }}>Released: <strong style={{ color:'#34d399' }}>{fmtCurrency(relAmt)}</strong></span>
          <span style={{ color:'rgba(255,255,255,.45)' }}>Total: <strong style={{ color:'#f8fafc' }}>{fmtCurrency(totalAmt)}</strong></span>
        </div>
      </div>
      <div style={{ height:8, background:'rgba(255,255,255,.07)', borderRadius:4, overflow:'hidden', marginBottom:8 }}>
        <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(to right,#14b8a6,#34d399)', borderRadius:4, transition:'width .6s ease' }}/>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
        <span style={{ color:'rgba(255,255,255,.45)' }}>
          {released}/{total} milestone{total!==1?'s':''} released
          {active > 0 && <span style={{ color:'#fbbf24', marginLeft:8 }}> {active} in progress</span>}
        </span>
        <span style={{ color: pct === 100 ? '#34d399' : '#14b8a6', fontWeight:700 }}>{pct}%</span>
      </div>
    </div>
  )
}

//  Individual milestone card 
function MilestoneCard({ m, idx, isClient, isFreelancer, isAdmin, escrows, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const [actioning, setActioning] = useState(false)
  const [showFund, setShowFund]   = useState(false)
  const [showSubmit, setShowSubmit] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [showEdit, setShowEdit]   = useState(false)

  const cfg = SM[m.status] || SM.LOCKED
  const isLocked  = m.isLocked
  const fee = Number(m.platformFee || Number(m.amount) * PLATFORM_FEE_RATE)
  const net = Number(m.netAmount   || Number(m.amount) - fee)

  const canFund       = isClient && m.status === 'UNLOCKED' && !isLocked
  const canSubmit     = isFreelancer && m.status === 'FUNDED' && !isLocked
  const canApprove    = isClient && m.status === 'SUBMITTED'
  const canReject     = isClient && m.status === 'SUBMITTED'
  const canEdit       = isClient && ['LOCKED','UNLOCKED','PENDING'].includes(m.status)
  const canUnlock     = isClient && m.isLocked && m.status === 'LOCKED'
  const canAdminLock  = isAdmin && !['RELEASED','REFUNDED'].includes(m.status)

  const approve = async () => {
    if (!window.confirm(`Approve "${m.title}" and send to TrustWork payout queue?`)) return
    setActioning(true)
    try {
      await api.post(`/milestones/${m.id}/approve`)
      toast.success('Approved! Payment queued for TrustWork review.')
      onRefresh()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setActioning(false) }
  }

  const unlock = async () => {
    if (!window.confirm(`Unlock "${m.title}"?`)) return
    setActioning(true)
    try {
      await api.post(`/milestones/${m.id}/unlock`, { reason: 'Client unlocked' })
      toast.success('Milestone unlocked!')
      onRefresh()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setActioning(false) }
  }

  const del = async () => {
    if (!window.confirm(`Delete "${m.title}"? This cannot be undone.`)) return
    setActioning(true)
    try {
      await api.delete(`/milestones/${m.id}`)
      toast.success('Milestone deleted.')
      onRefresh()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setActioning(false) }
  }

  const adminToggle = async () => {
    const endpoint = m.isLocked ? 'unlock' : 'lock'
    setActioning(true)
    try {
      await api.post(`/milestones/${m.id}/${endpoint}`, { reason: 'Admin override' })
      toast.success(`Milestone ${endpoint}ed`)
      onRefresh()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setActioning(false) }
  }

  return (
    <div className={`mp-card ${!isLocked && m.status !== 'RELEASED' && m.status !== 'REFUNDED' ? 'active' : ''}`}
      style={{ borderLeft:`3px solid ${isLocked ? '#374151' : cfg.color}`, opacity: isLocked ? .75 : 1, position:'relative' }}>

      {/* Header row */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
        {/* Step number / lock icon */}
        <div style={{ width:28, height:28, borderRadius:'50%', background:`${isLocked ? '#374151' : cfg.color}18`, border:`2px solid ${isLocked ? '#374151' : cfg.color}35`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color: isLocked ? '#475569' : cfg.color, fontSize:11, fontWeight:800 }}>
          {isLocked ? <LockIcon locked /> : m.status === 'RELEASED' ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> : idx + 1}
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          {/* Title + badge + amount */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:5 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color: isLocked ? 'rgba(255,255,255,.45)' : '#f8fafc', marginBottom:3 }}>{m.title}</div>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'center' }}>
                <Badge status={m.status} />
                {m.dueDate && <span style={{ fontSize:10, color:'rgba(255,255,255,.32)' }}>Due {fmtDate(m.dueDate)}</span>}
                {isLocked && idx > 0 && <span style={{ fontSize:10, color:'#475569' }}>Unlocks after milestone {idx} releases</span>}
              </div>
            </div>
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <div style={{ fontSize:16, fontWeight:800, color: isLocked ? '#4b5563' : cfg.color }}>{fmtCurrency(m.amount)}</div>
              {!isLocked && <div style={{ fontSize:10, color:'#34d399', marginTop:1 }}>Net {fmtCurrency(net)}</div>}
            </div>
          </div>

          {/* Description */}
          {m.description && !isLocked && <div style={{ fontSize:12, color:'rgba(255,255,255,.5)', marginBottom:6, lineHeight:1.55 }}>{m.description}</div>}

          {/* Deliverable */}
          {m.deliverable && !isLocked && (
            <div style={{ fontSize:11, color:'rgba(255,255,255,.45)', marginBottom:6, display:'flex', gap:5, alignItems:'flex-start' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0, marginTop:1 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span><strong style={{ color:'rgba(255,255,255,.55)' }}>Deliverable:</strong> {m.deliverable}</span>
            </div>
          )}

          {/* Escrow bar */}
          {!isLocked && <EscrowBar milestone={m} escrows={escrows} />}

          {/* Fee breakdown  always shown for freelancer */}
          {(isFreelancer || isAdmin) && !isLocked && (
            <div style={{ marginTop:8 }}>
              <button onClick={() => setExpanded(e => !e)} style={{ fontSize:11, color:'rgba(255,255,255,.4)', background:'none', border:'none', cursor:'pointer', padding:0, display:'flex', alignItems:'center', gap:4 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition:'transform .2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                {expanded ? 'Hide' : 'Show'} fee breakdown
              </button>
              {expanded && <div style={{ marginTop:8 }}><FeeRow amount={Number(m.amount)} /></div>}
            </div>
          )}

          {/* Submission note */}
          {m.submissionNote && (
            <div style={{ marginTop:7, padding:'7px 10px', borderRadius:7, background:'rgba(129,140,248,.06)', border:'1px solid rgba(129,140,248,.2)', fontSize:11, color:'rgba(255,255,255,.55)', fontStyle:'italic' }}>
              <strong style={{ color:'#818cf8', fontStyle:'normal' }}>Submitted:</strong> "{m.submissionNote}"
              {m.submittedAt && <span style={{ marginLeft:6, color:'rgba(255,255,255,.3)', fontStyle:'normal' }}>{fmtRelative(m.submittedAt)}</span>}
            </div>
          )}

          {/* Reject reason */}
          {m.rejectReason && (
            <div style={{ marginTop:7, padding:'7px 10px', borderRadius:7, background:'rgba(244,63,94,.06)', border:'1px solid rgba(244,63,94,.2)', fontSize:11, color:'rgba(255,255,255,.55)' }}>
              <strong style={{ color:'#f43f5e' }}>Rejected:</strong> {m.rejectReason}
            </div>
          )}

          {/* Under admin review notice */}
          {m.status === 'UNDER_ADMIN_REVIEW' && (
            <div style={{ marginTop:7, padding:'7px 10px', borderRadius:7, background:'rgba(251,146,60,.06)', border:'1px solid rgba(251,146,60,.2)', fontSize:11, color:'rgba(255,255,255,.55)', display:'flex', alignItems:'center', gap:6 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Awaiting TrustWork payout review &middot; Fee: {fmtCurrency(fee)} &middot; You'll receive: <strong style={{ color:'#34d399' }}>{fmtCurrency(net)}</strong>
            </div>
          )}

          {/* Released notice */}
          {m.status === 'RELEASED' && (
            <div style={{ marginTop:7, padding:'7px 10px', borderRadius:7, background:'rgba(52,211,153,.06)', border:'1px solid rgba(52,211,153,.2)', fontSize:11, color:'#34d399', display:'flex', alignItems:'center', gap:6 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              {fmtCurrency(net)} released to freelancer {m.releasedAt ? fmtRelative(m.releasedAt) : ''}
            </div>
          )}

          {/* Actions */}
          {!isLocked && (
            <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
              {canFund    && <button onClick={() => setShowFund(true)} className="mp-btn" style={{ background:'rgba(251,191,36,.12)', border:'1px solid rgba(251,191,36,.3)', color:'#fbbf24' }}>Fund Milestone</button>}
              {canSubmit  && <button onClick={() => setShowSubmit(true)} className="mp-btn" style={{ background:'rgba(129,140,248,.12)', border:'1px solid rgba(129,140,248,.3)', color:'#818cf8' }}>Submit Work</button>}
              {canApprove && <button onClick={approve} disabled={actioning} className="mp-btn" style={{ background:'rgba(52,211,153,.12)', border:'1px solid rgba(52,211,153,.3)', color:'#34d399' }}>{actioning && <Spin />}Approve &amp; Queue Payout</button>}
              {canReject  && <button onClick={() => setShowReject(true)} className="mp-btn" style={{ background:'rgba(244,63,94,.08)', border:'1px solid rgba(244,63,94,.25)', color:'#f43f5e' }}>Reject</button>}
              {canEdit    && <button onClick={() => setShowEdit(true)} className="mp-btn" style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.6)' }}>Edit</button>}
              {canEdit    && <button onClick={del} disabled={actioning} className="mp-btn" style={{ background:'rgba(244,63,94,.07)', border:'1px solid rgba(244,63,94,.2)', color:'#f43f5e' }}>{actioning && <Spin />}Delete</button>}
              {isAdmin && canAdminLock && <button onClick={adminToggle} disabled={actioning} className="mp-btn" style={{ background:'rgba(251,146,60,.08)', border:'1px solid rgba(251,146,60,.2)', color:'#fb923c' }}>{actioning && <Spin />}{m.isLocked?'Admin Unlock':'Admin Lock'}</button>}
            </div>
          )}
          {isLocked && (
            <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
              {canUnlock && <button onClick={unlock} disabled={actioning} className="mp-btn" style={{ background:'rgba(20,184,166,.1)', border:'1px solid rgba(20,184,166,.25)', color:'#14b8a6' }}>{actioning && <Spin />}Unlock Milestone</button>}
              {canEdit   && <button onClick={() => setShowEdit(true)} className="mp-btn" style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.6)' }}>Edit</button>}
              {canEdit   && <button onClick={del} disabled={actioning} className="mp-btn" style={{ background:'rgba(244,63,94,.07)', border:'1px solid rgba(244,63,94,.2)', color:'#f43f5e' }}>{actioning && <Spin />}Delete</button>}
              {isAdmin   && <button onClick={adminToggle} disabled={actioning} className="mp-btn" style={{ background:'rgba(251,146,60,.08)', border:'1px solid rgba(251,146,60,.2)', color:'#fb923c' }}>{actioning && <Spin />}Admin Unlock</button>}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <FundModal   open={showFund}   milestone={m} onClose={() => setShowFund(false)}   onDone={() => { setShowFund(false); onRefresh() }} />
      <SubmitModal open={showSubmit} milestone={m} onClose={() => setShowSubmit(false)} onDone={() => { setShowSubmit(false); onRefresh() }} />
      <RejectModal open={showReject} milestone={m} onClose={() => setShowReject(false)} onDone={() => { setShowReject(false); onRefresh() }} />
      <EditModal   open={showEdit}   milestone={m} jobId={m.jobId} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); onRefresh() }} />
    </div>
  )
}

//  Main MilestonePanel 
export default function MilestonePanel({ jobId, job, user }) {
  const [milestones, setMilestones] = useState(job?.milestones || [])
  const [summary,    setSummary]    = useState({})
  const [loading,    setLoading]    = useState(false)
  const [showAdd,    setShowAdd]    = useState(false)
  const [agreementReset, setAgreementReset] = useState(false)

  const isClient     = user?.id === job?.clientId
  const isFreelancer = user?.id === job?.freelancerId
  const isAdmin      = user?.role === 'ADMIN'

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/jobs/${jobId}/milestones`)
      setMilestones(data.milestones || [])
      setSummary(data.summary || {})
      // Check if agreement was reset (any revision happened)
      if (data.summary?.agreementReset) setAgreementReset(true)
    } catch {}
    finally { setLoading(false) }
  }, [jobId])

  useEffect(() => {
    // Refresh milestones from API to get latest status (getJob gives a snapshot)
    refresh()
  }, [refresh])

  if (!milestones.length && !isClient && !isAdmin) return null

  const pendingActions = milestones.filter(m =>
    (isClient && m.status === 'SUBMITTED') ||
    (isFreelancer && m.status === 'FUNDED' && !m.isLocked)
  ).length

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'#f8fafc', margin:0 }}>
            Milestones
            {milestones.length > 0 && <span style={{ marginLeft:6, fontSize:12, color:'rgba(255,255,255,.4)' }}>({milestones.length})</span>}
          </h3>
          {pendingActions > 0 && (
            <span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:100, background:'rgba(244,63,94,.15)', color:'#f43f5e', border:'1px solid rgba(244,63,94,.3)' }}>
              {pendingActions} action{pendingActions>1?'s':''} needed
            </span>
          )}
          {loading && <Spin s={13} />}
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {isClient && (
            <button onClick={() => setShowAdd(true)} className="mp-btn"
              style={{ background:'rgba(20,184,166,.12)', border:'1px solid rgba(20,184,166,.3)', color:'#14b8a6', fontSize:12 }}>
              + Add Milestone
            </button>
          )}
          <Link to={`/jobs/${jobId}/milestones`}
            style={{ padding:'6px 13px', borderRadius:7, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.6)', fontSize:12, fontWeight:600, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:5 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            Full View
          </Link>
        </div>
      </div>

      {/* Agreement reset warning */}
      {(job?.agreementStatus === 'DRAFT' || job?.agreementStatus === 'CHANGES_REQUESTED') && (
        <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(251,191,36,.07)', border:'1px solid rgba(251,191,36,.25)', marginBottom:12, display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <div style={{ fontSize:12, color:'#fbbf24' }}>
            <strong>Agreement needs re-signing</strong>  milestones were changed. Work is paused until both parties re-sign.
          </div>
          <Link to={`/jobs/${jobId}/agreement`}
            style={{ fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:7, background:'rgba(251,191,36,.15)', border:'1px solid rgba(251,191,36,.3)', color:'#fbbf24', textDecoration:'none' }}>
            Go to Agreement
          </Link>
        </div>
      )}

      {/* Overall progress */}
      {milestones.length > 0 && <OverallProgress milestones={milestones} />}

      {/* Milestone cards */}
      {milestones.length === 0 ? (
        <div style={{ padding:'28px 16px', textAlign:'center', background:'rgba(255,255,255,.03)', borderRadius:11, border:'1px solid rgba(255,255,255,.07)' }}>
          <div style={{ fontSize:13, color:'rgba(255,255,255,.38)', marginBottom: isClient ? 12 : 0 }}>
            {isClient ? 'No milestones yet. Add milestones to track project progress.' : 'No milestones have been set for this project yet.'}
          </div>
          {isClient && (
            <button onClick={() => setShowAdd(true)} className="mp-btn" style={{ background:'#14b8a6', color:'#07111d', margin:'0 auto', padding:'8px 20px', fontSize:13 }}>
              Create First Milestone
            </button>
          )}
        </div>
      ) : (
        <div className="mp-fade">
          {milestones.map((m, i) => (
            <MilestoneCard
              key={m.id}
              m={{ ...m, jobId }}
              idx={i + 1}
              isClient={isClient}
              isFreelancer={isFreelancer}
              isAdmin={isAdmin}
              escrows={job?.escrows}
              onRefresh={refresh}
            />
          ))}
        </div>
      )}

      {/* Add milestone modal */}
      <EditModal
        open={showAdd}
        milestone={null}
        jobId={jobId}
        onClose={() => setShowAdd(false)}
        onSaved={() => { setShowAdd(false); refresh() }}
      />
    </div>
  )
}
