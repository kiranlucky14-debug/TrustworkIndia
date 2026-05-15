// MilestonePanel.jsx
// Full per-milestone workflow: LOCKED -> UNLOCKED -> FUNDED -> IN_PROGRESS
//   -> SUBMITTED -> REWORK_REQUESTED -> PAYMENT_UNDER_REVIEW -> RELEASED | REJECTED
// Client: fund, approve, reject, request rework, unlock
// Freelancer: start work, submit with notes, resubmit after rework

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import { fmtCurrency, fmtDate, fmtRelative, errMsg } from '../utils/helpers'

const PLATFORM_FEE_RATE = 0.02

//  Status config 
const SC = {
  LOCKED:              { color:'#374151', bg:'rgba(55,65,81,.25)',    label:'Locked',               step:0 },
  UNLOCKED:            { color:'#14b8a6', bg:'rgba(20,184,166,.12)',  label:'Unlocked',             step:1 },
  PENDING:             { color:'#94a3b8', bg:'rgba(148,163,184,.12)', label:'Pending',              step:0 },
  FUNDED:              { color:'#fbbf24', bg:'rgba(251,191,36,.12)',  label:'Funded',               step:2 },
  IN_PROGRESS:         { color:'#60a5fa', bg:'rgba(96,165,250,.12)',  label:'In Progress',          step:3 },
  SUBMITTED:           { color:'#818cf8', bg:'rgba(129,140,248,.12)', label:'Submitted',            step:4 },
  REWORK_REQUESTED:    { color:'#fb923c', bg:'rgba(251,146,60,.12)',  label:'Rework Requested',     step:3 },
  CLIENT_APPROVED:     { color:'#34d399', bg:'rgba(52,211,153,.1)',   label:'Approved',             step:5 },
  PAYMENT_UNDER_REVIEW:{ color:'#fb923c', bg:'rgba(251,146,60,.12)',  label:'Payment Under Review', step:5 },
  UNDER_ADMIN_REVIEW:  { color:'#fb923c', bg:'rgba(251,146,60,.12)',  label:'Under Review',         step:5 },
  RELEASED:            { color:'#34d399', bg:'rgba(52,211,153,.15)',  label:'Released',             step:6 },
  REFUNDED:            { color:'#f43f5e', bg:'rgba(244,63,94,.12)',   label:'Refunded',             step:0 },
  REJECTED:            { color:'#f43f5e', bg:'rgba(244,63,94,.15)',   label:'Rejected',             step:0 },
}

// step labels for mini progress bar
const STEPS = ['Locked','Unlocked','Funded','In Progress','Submitted','Approved','Released']

const css = `
  @keyframes mp-in  { from { opacity:0;transform:translateY(5px) } to { opacity:1;transform:translateY(0) } }
  @keyframes mp-sp  { to { transform:rotate(360deg) } }
  @keyframes mp-pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }
  .mp-fade { animation:mp-in .22s ease both }
  .mp-card { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:12px; padding:16px; margin-bottom:10px; transition:all .2s }
  .mp-card.unlocked { border-color:rgba(20,184,166,.2) }
  .mp-card.active   { border-color:rgba(96,165,250,.25); background:rgba(96,165,250,.04) }
  .mp-card.needs-action { border-color:rgba(129,140,248,.3); background:rgba(129,140,248,.04) }
  .mp-card.rework   { border-color:rgba(251,146,60,.3); background:rgba(251,146,60,.04) }
  .mp-card.released { border-color:rgba(52,211,153,.2); background:rgba(52,211,153,.03) }
  .mp-card.rejected { border-color:rgba(244,63,94,.25); background:rgba(244,63,94,.04) }
  .mp-input { width:100%; padding:9px 12px; background:rgba(255,255,255,.06); border:1.5px solid rgba(255,255,255,.1); border-radius:8px; color:#f8fafc; font-size:13px; font-family:inherit; outline:none; transition:all .18s; resize:vertical; box-sizing:border-box }
  .mp-input:focus { border-color:#14b8a6; box-shadow:0 0 0 3px rgba(20,184,166,.1) }
  .mp-input::placeholder { color:#475569 }
  .mp-label { display:block; font-size:10px; color:rgba(255,255,255,.35); text-transform:uppercase; letter-spacing:.07em; margin-bottom:4px }
  .mp-btn  { padding:6px 13px; border-radius:7px; border:none; font-family:inherit; font-size:12px; font-weight:600; cursor:pointer; transition:all .18s; display:inline-flex; align-items:center; gap:5px }
  .mp-btn:disabled { opacity:.45; cursor:not-allowed }
  .mp-overlay { position:fixed; inset:0; background:rgba(0,0,0,.82); backdrop-filter:blur(6px); z-index:700; display:flex; align-items:flex-start; justify-content:center; padding:20px 16px; overflow-y:auto }
  .mp-panel   { width:100%; max-width:520px; background:#080f1f; border:1px solid rgba(255,255,255,.1); border-radius:16px; padding:24px; color:#f8fafc; font-family:'DM Sans',system-ui,sans-serif }
  .mp-g2 { display:grid; grid-template-columns:1fr 1fr; gap:10px }
  * { box-sizing:border-box }
`

function Spin({ s = 12 }) {
  return <svg style={{ animation:'mp-sp .7s linear infinite', flexShrink:0 }} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
}

function Badge({ status }) {
  const s = SC[status] || SC.LOCKED
  return <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100, background:s.bg, color:s.color, border:`1px solid ${s.color}35`, whiteSpace:'nowrap' }}>{s.label}</span>
}

function FeeRow({ amount, compact }) {
  const fee = Number(amount) * PLATFORM_FEE_RATE
  const net = Number(amount) - fee
  if (compact) return <span style={{ fontSize:11, color:'rgba(255,255,255,.4)' }}>Net <strong style={{ color:'#34d399' }}>{fmtCurrency(net)}</strong></span>
  return (
    <div style={{ padding:'9px 11px', borderRadius:8, background:'rgba(20,184,166,.06)', border:'1px solid rgba(20,184,166,.15)', fontSize:11 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
        <span style={{ color:'rgba(255,255,255,.45)' }}>Gross</span>
        <strong>{fmtCurrency(amount)}</strong>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
        <span style={{ color:'rgba(255,255,255,.45)' }}>Platform fee (2%)</span>
        <strong style={{ color:'#fb923c' }}>- {fmtCurrency(fee)}</strong>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', paddingTop:5, borderTop:'1px solid rgba(20,184,166,.2)', fontWeight:700, fontSize:12 }}>
        <span style={{ color:'#14b8a6' }}>You receive</span>
        <span style={{ color:'#34d399' }}>{fmtCurrency(net)}</span>
      </div>
    </div>
  )
}

function MilestoneStep({ status }) {
  const cfg = SC[status] || SC.LOCKED
  const step = cfg.step
  return (
    <div style={{ display:'flex', alignItems:'center', gap:0, marginTop:8, marginBottom:2 }}>
      {STEPS.map((l, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', flex: i < STEPS.length-1 ? 1 : 'none' }}>
          <div style={{ width:14, height:14, borderRadius:'50%', flexShrink:0, border:`2px solid ${i <= step ? cfg.color : 'rgba(255,255,255,.12)'}`, background: i < step ? cfg.color : i === step ? `${cfg.color}30` : 'transparent', transition:'all .3s' }}/>
          {i < STEPS.length - 1 && <div style={{ flex:1, height:2, background: i < step ? cfg.color : 'rgba(255,255,255,.08)', transition:'background .3s' }}/>}
        </div>
      ))}
    </div>
  )
}

//  Modals 
function BaseModal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="mp-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="mp-panel mp-fade">
        <style>{css}</style>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <div style={{ fontSize:16, fontWeight:700 }}>{title}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,.4)', cursor:'pointer', display:'flex' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function SubmitModal({ open, milestone, onClose, onDone }) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const isRework = milestone?.status === 'REWORK_REQUESTED'

  const submit = async () => {
    setSaving(true)
    try {
      await api.post(`/milestones/${milestone.id}/submit`, { submissionNote: note })
      toast.success(isRework ? 'Resubmitted for client review!' : 'Work submitted for client review!')
      onDone(); onClose()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setSaving(false) }
  }

  return (
    <BaseModal open={open} onClose={onClose} title={isRework ? 'Resubmit Work' : 'Submit Work'}>
      <div style={{ fontSize:13, color:'rgba(255,255,255,.45)', marginBottom:12 }}>{milestone?.title}</div>
      {isRework && milestone?.reworkNote && (
        <div style={{ padding:'10px 12px', borderRadius:9, background:'rgba(251,146,60,.08)', border:'1px solid rgba(251,146,60,.25)', fontSize:12, color:'rgba(255,255,255,.65)', marginBottom:12 }}>
          <strong style={{ color:'#fb923c' }}>Rework instructions:</strong><br/>{milestone.reworkNote}
        </div>
      )}
      <div style={{ marginBottom:12 }}><FeeRow amount={Number(milestone?.amount||0)} /></div>
      <div style={{ padding:'9px 11px', borderRadius:8, background:'rgba(251,146,60,.07)', border:'1px solid rgba(251,146,60,.2)', fontSize:12, color:'rgba(255,255,255,.55)', lineHeight:1.6, marginBottom:12 }}>
        After client approves, payment enters <strong style={{ color:'#fb923c' }}>TrustWork Admin Review</strong> before crediting your account.
      </div>
      <label className="mp-label" style={{ marginBottom:5 }}>Submission notes (optional)</label>
      <textarea className="mp-input" rows={3} value={note} onChange={e => setNote(e.target.value)} style={{ marginBottom:14 }} placeholder="Describe what you delivered  links, files, completion notes..."/>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={onClose} className="mp-btn" style={{ background:'transparent', border:'1.5px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.5)', padding:'9px 16px' }}>Cancel</button>
        <button onClick={submit} disabled={saving} className="mp-btn" style={{ flex:1, justifyContent:'center', background: isRework ? '#fb923c' : '#818cf8', color:'#07111d', padding:'9px', fontSize:13 }}>
          {saving && <Spin />}{saving ? 'Submitting...' : isRework ? 'Resubmit Updated Work' : 'Submit for Client Review'}
        </button>
      </div>
    </BaseModal>
  )
}

function ReworkModal({ open, milestone, onClose, onDone }) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const request = async () => {
    if (!note.trim()) { toast.error('Rework instructions required'); return }
    setSaving(true)
    try {
      await api.post(`/milestones/${milestone.id}/rework`, { reworkNote: note })
      toast.success('Rework requested  freelancer notified')
      onDone(); onClose()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setSaving(false) }
  }

  return (
    <BaseModal open={open} onClose={onClose} title="Request Rework">
      <div style={{ fontSize:13, color:'rgba(255,255,255,.45)', marginBottom:12 }}>{milestone?.title}</div>
      <div style={{ padding:'9px 11px', borderRadius:8, background:'rgba(251,146,60,.07)', border:'1px solid rgba(251,146,60,.2)', fontSize:12, color:'rgba(255,255,255,.55)', lineHeight:1.6, marginBottom:12 }}>
        Freelancer will be notified immediately and can resubmit the same milestone after making changes.
      </div>
      <label className="mp-label" style={{ marginBottom:5 }}>Rework instructions *</label>
      <textarea className="mp-input" rows={4} value={note} onChange={e => setNote(e.target.value)} style={{ marginBottom:14 }} placeholder="Be specific  what needs to be fixed, added, or changed? Include references or examples if possible..."/>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={onClose} className="mp-btn" style={{ background:'transparent', border:'1.5px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.5)', padding:'9px 16px' }}>Cancel</button>
        <button onClick={request} disabled={saving} className="mp-btn" style={{ flex:1, justifyContent:'center', background:'#fb923c', color:'#07111d', padding:'9px', fontSize:13 }}>
          {saving && <Spin />}{saving ? 'Requesting...' : 'Send Rework Request'}
        </button>
      </div>
    </BaseModal>
  )
}

function RejectModal({ open, milestone, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const reject = async () => {
    if (!reason.trim()) { toast.error('Rejection reason required'); return }
    setSaving(true)
    try {
      await api.post(`/milestones/${milestone.id}/reject`, { rejectReason: reason })
      toast.success('Milestone rejected  freelancer notified')
      onDone(); onClose()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setSaving(false) }
  }

  return (
    <BaseModal open={open} onClose={onClose} title="Reject Milestone">
      <div style={{ fontSize:13, color:'rgba(255,255,255,.45)', marginBottom:12 }}>{milestone?.title}</div>
      <div style={{ padding:'9px 11px', borderRadius:8, background:'rgba(244,63,94,.07)', border:'1px solid rgba(244,63,94,.2)', fontSize:12, color:'rgba(255,255,255,.55)', lineHeight:1.6, marginBottom:12 }}>
        Escrow remains locked pending admin/dispute resolution. Use this for irreversible failures. For fixable issues, use <strong>"Request Rework"</strong> instead.
      </div>
      <label className="mp-label" style={{ marginBottom:5 }}>Rejection reason *</label>
      <textarea className="mp-input" rows={3} value={reason} onChange={e => setReason(e.target.value)} style={{ marginBottom:14 }} placeholder="Be specific about what was not delivered or what was wrong..."/>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={onClose} className="mp-btn" style={{ background:'transparent', border:'1.5px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.5)', padding:'9px 16px' }}>Cancel</button>
        <button onClick={reject} disabled={saving} className="mp-btn" style={{ flex:1, justifyContent:'center', background:'#f43f5e', color:'#fff', padding:'9px', fontSize:13 }}>
          {saving && <Spin />}{saving ? 'Rejecting...' : 'Reject Milestone'}
        </button>
      </div>
    </BaseModal>
  )
}

function FundModal({ open, milestone, onClose, onDone }) {
  const [step, setStep] = useState('confirm')
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (open) setStep('confirm') }, [open])

  const fund = async () => {
    setStep('processing'); setSaving(true)
    try {
      // Check Razorpay config
      const cfgRes = await api.get('/payments/config')
      const { mock, keyId } = cfgRes.data

      if (mock) {
        // Mock mode: direct fund
        await new Promise(r => setTimeout(r, 900))
        await api.post(`/milestones/${milestone.id}/fund`)
        setStep('done'); toast.success('Milestone funded!'); onDone()
      } else {
        // Real Razorpay checkout
        const orderRes = await api.post('/payments/create-order', { milestoneId: milestone.id })
        const { orderId, amount, currency } = orderRes.data

        const rzp = new window.Razorpay({
          key:         keyId,
          order_id:    orderId,
          amount,
          currency,
          name:        'TrustWork',
          description: milestone.title,
          theme:       { color: '#14b8a6' },
          handler: async (response) => {
            try {
              await api.post('/payments/verify', {
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                milestoneId:         milestone.id,
              })
              setStep('done'); toast.success('Payment successful! Escrow locked.'); onDone()
            } catch (e) { toast.error('Payment verification failed'); setStep('confirm') }
          },
          modal: { ondismiss: () => setStep('confirm') },
        })
        rzp.open()
      }
    } catch (e) { toast.error(errMsg(e)); setStep('confirm') }
    finally { setSaving(false) }
  }

  return (
    <BaseModal open={open} onClose={() => step !== 'processing' && onClose()} title="Fund Milestone">
      {step === 'confirm' && <>
        <div style={{ padding:'12px 14px', borderRadius:10, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', marginBottom:12 }}>
          <div style={{ fontSize:13, color:'rgba(255,255,255,.45)', marginBottom:3 }}>{milestone?.title}</div>
          <div style={{ fontSize:22, fontWeight:800, color:'#fbbf24' }}>{fmtCurrency(milestone?.amount)}</div>
        </div>
        <FeeRow amount={Number(milestone?.amount||0)} />
        <div style={{ fontSize:12, color:'rgba(255,255,255,.4)', margin:'12px 0', lineHeight:1.65 }}>
          This amount is locked in escrow. Freelancer receives payment only after you approve their submission and TrustWork admin processes the payout.
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onClose} className="mp-btn" style={{ background:'transparent', border:'1.5px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.5)', padding:'9px 16px' }}>Cancel</button>
          <button onClick={fund} className="mp-btn" style={{ flex:1, justifyContent:'center', background:'#fbbf24', color:'#07111d', padding:'9px', fontSize:13 }}>Lock in Escrow</button>
        </div>
      </>}
      {step === 'processing' && <div style={{ textAlign:'center', padding:'28px 0' }}><Spin s={24}/><div style={{ marginTop:10, color:'rgba(255,255,255,.4)', fontSize:13 }}>Processing...</div></div>}
      {step === 'done' && <div style={{ textAlign:'center', padding:'20px 0' }}>
        <div style={{ width:48, height:48, borderRadius:'50%', background:'rgba(52,211,153,.15)', border:'2px solid rgba(52,211,153,.4)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>Escrow Locked!</div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginBottom:14 }}>Freelancer can now start work.</div>
        <button onClick={onClose} className="mp-btn" style={{ background:'#14b8a6', color:'#07111d', margin:'0 auto', padding:'8px 22px' }}>Done</button>
      </div>}
    </BaseModal>
  )
}

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
    if (!form.title.trim()) { toast.error('Title required'); return }
    if (!form.amount || Number(form.amount) <= 0) { toast.error('Valid amount required'); return }
    setSaving(true)
    try {
      if (isNew) {
        const res = await api.get(`/jobs/${jobId}/milestones`)
        const existing = (res.data.milestones||[]).map(m => ({
          title:m.title, description:m.description, deliverable:m.deliverable,
          amount:m.amount, dueDate:m.dueDate?String(m.dueDate).slice(0,10):undefined,
        }))
        await api.post(`/jobs/${jobId}/milestones`, {
          milestones: [...existing, { title:form.title.trim(), description:form.description||undefined, deliverable:form.deliverable||undefined, amount:Number(form.amount), dueDate:form.dueDate||undefined }],
        })
        toast.success('Milestone added!')
      } else {
        await api.patch(`/milestones/${milestone.id}`, {
          title:form.title.trim(), description:form.description||undefined,
          deliverable:form.deliverable||undefined, amount:Number(form.amount), dueDate:form.dueDate||null,
        })
        toast.success('Milestone updated!')
      }
      onSaved(); onClose()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setSaving(false) }
  }

  return (
    <BaseModal open={open} onClose={onClose} title={isNew ? 'Add Milestone' : 'Edit Milestone'}>
      <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
        <div><label className="mp-label">Title *</label><input className="mp-input" value={form.title} onChange={set('title')} placeholder="e.g. Landing page design"/></div>
        <div><label className="mp-label">Description</label><textarea className="mp-input" rows={2} value={form.description} onChange={set('description')} style={{ resize:'vertical' }} placeholder="What this milestone covers"/></div>
        <div><label className="mp-label">Deliverable</label><input className="mp-input" value={form.deliverable} onChange={set('deliverable')} placeholder="What gets handed over (e.g. Figma file + source)"/></div>
        <div className="mp-g2">
          <div><label className="mp-label">Amount (Rs.) *</label><input className="mp-input" type="number" min="1" value={form.amount} onChange={set('amount')} placeholder="5000"/></div>
          <div><label className="mp-label">Due Date</label><input className="mp-input" type="date" value={form.dueDate} onChange={set('dueDate')}/></div>
        </div>
        {Number(form.amount) > 0 && <FeeRow amount={Number(form.amount)}/>}
      </div>
      <div style={{ display:'flex', gap:8, marginTop:16 }}>
        <button onClick={onClose} className="mp-btn" style={{ background:'transparent', border:'1.5px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.5)', padding:'9px 16px' }}>Cancel</button>
        <button onClick={save} disabled={saving} className="mp-btn" style={{ flex:1, justifyContent:'center', background:'#14b8a6', color:'#07111d', padding:'9px', fontSize:13 }}>
          {saving && <Spin />}{saving ? 'Saving...' : isNew ? 'Add Milestone' : 'Save Changes'}
        </button>
      </div>
    </BaseModal>
  )
}

//  Overall progress bar 
function OverallProgress({ milestones }) {
  if (!milestones?.length) return null
  const total     = milestones.length
  const released  = milestones.filter(m => m.status === 'RELEASED').length
  const active    = milestones.filter(m => ['FUNDED','IN_PROGRESS','SUBMITTED','REWORK_REQUESTED'].includes(m.status)).length
  const pending   = milestones.filter(m => ['PAYMENT_UNDER_REVIEW','UNDER_ADMIN_REVIEW'].includes(m.status)).length
  const pct       = Math.round((released / total) * 100)
  const totalAmt  = milestones.reduce((s, m) => s + Number(m.amount), 0)
  const relAmt    = milestones.filter(m => m.status === 'RELEASED').reduce((s, m) => s + Number(m.amount), 0)
  const inProgAmt = milestones.filter(m => ['FUNDED','IN_PROGRESS','SUBMITTED','REWORK_REQUESTED','PAYMENT_UNDER_REVIEW'].includes(m.status)).reduce((s,m) => s + Number(m.amount), 0)

  return (
    <div style={{ padding:'14px 16px', background:'rgba(20,184,166,.05)', border:'1px solid rgba(20,184,166,.15)', borderRadius:11, marginBottom:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, flexWrap:'wrap', gap:8 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#f8fafc' }}>Overall Progress</div>
        <div style={{ display:'flex', gap:14, fontSize:12, flexWrap:'wrap' }}>
          <span style={{ color:'rgba(255,255,255,.45)' }}>Released: <strong style={{ color:'#34d399' }}>{fmtCurrency(relAmt)}</strong></span>
          <span style={{ color:'rgba(255,255,255,.45)' }}>Total: <strong style={{ color:'#f8fafc' }}>{fmtCurrency(totalAmt)}</strong></span>
        </div>
      </div>
      {/* Segmented bar */}
      <div style={{ height:8, background:'rgba(255,255,255,.07)', borderRadius:4, overflow:'hidden', marginBottom:8, display:'flex' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:'#34d399', transition:'width .6s ease' }}/>
        <div style={{ height:'100%', width:`${Math.round((inProgAmt/totalAmt)*100)}%`, background:'rgba(251,191,36,.5)', transition:'width .6s ease' }}/>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11 }}>
        <span style={{ color:'rgba(255,255,255,.45)' }}>
          {released}/{total} released
          {active > 0 && <span style={{ color:'#60a5fa', marginLeft:8 }}>{active} in progress</span>}
          {pending > 0 && <span style={{ color:'#fb923c', marginLeft:8 }}>{pending} in review</span>}
        </span>
        <span style={{ color: pct === 100 ? '#34d399' : '#14b8a6', fontWeight:700 }}>{pct}%</span>
      </div>
    </div>
  )
}

//  Milestone card 
function MilestoneCard({ m, idx, isClient, isFreelancer, isAdmin, onRefresh }) {
  const [actioning, setActioning]   = useState(null)
  const [showFund,   setShowFund]   = useState(false)
  const [showSubmit, setShowSubmit] = useState(false)
  const [showRework, setShowRework] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [showEdit,   setShowEdit]   = useState(false)
  const [expanded,   setExpanded]   = useState(false)

  const cfg    = SC[m.status] || SC.LOCKED
  const locked = m.isLocked
  const fee    = Number(m.platformFee || Number(m.amount) * PLATFORM_FEE_RATE)
  const net    = Number(m.netAmount   || Number(m.amount) - fee)

  // Permission flags
  const canFund    = isClient   && m.status === 'UNLOCKED'     && !locked
  const canStart   = isFreelancer && m.status === 'FUNDED'     && !locked
  const canSubmit  = isFreelancer && ['FUNDED','IN_PROGRESS','REWORK_REQUESTED'].includes(m.status) && !locked
  const canApprove = isClient   && m.status === 'SUBMITTED'
  const canRework  = isClient   && m.status === 'SUBMITTED'
  const canReject  = isClient   && m.status === 'SUBMITTED'
  const canEdit    = isClient   && ['LOCKED','UNLOCKED','PENDING'].includes(m.status)
  const canDelete  = isClient   && ['LOCKED','UNLOCKED','PENDING'].includes(m.status)
  const canUnlock  = isClient   && m.isLocked && m.status === 'LOCKED'
  const canAdminLock = isAdmin  && !['RELEASED','REFUNDED','REJECTED'].includes(m.status)

  const doAction = async (endpoint, body = {}) => {
    setActioning(endpoint)
    try {
      await api.post(`/milestones/${m.id}/${endpoint}`, body)
      onRefresh()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setActioning(null) }
  }

  const del = async () => {
    if (!window.confirm(`Delete "${m.title}"?`)) return
    setActioning('delete')
    try { await api.delete(`/milestones/${m.id}`); toast.success('Deleted'); onRefresh() }
    catch (e) { toast.error(errMsg(e)) }
    finally { setActioning(null) }
  }

  // Card class based on status
  const cardClass = locked ? 'mp-card'
    : m.status === 'IN_PROGRESS' ? 'mp-card active'
    : m.status === 'SUBMITTED'   ? 'mp-card needs-action'
    : m.status === 'REWORK_REQUESTED' ? 'mp-card rework'
    : m.status === 'RELEASED'    ? 'mp-card released'
    : m.status === 'REJECTED'    ? 'mp-card rejected'
    : m.status === 'UNLOCKED'    ? 'mp-card unlocked'
    : 'mp-card'

  return (
    <div className={cardClass} style={{ borderLeft:`3px solid ${locked ? '#374151' : cfg.color}` }}>
      <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>

        {/* Step indicator */}
        <div style={{ width:28, height:28, borderRadius:'50%', background:`${locked ? '#374151' : cfg.color}18`, border:`2px solid ${locked ? '#374151' : cfg.color}35`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color: locked ? '#4b5563' : cfg.color, fontSize:11, fontWeight:800 }}>
          {locked
            ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            : m.status === 'RELEASED'
            ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            : idx
          }
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          {/* Title + badge + amount */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, flexWrap:'wrap', marginBottom:5 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color: locked ? 'rgba(255,255,255,.42)' : '#f8fafc', marginBottom:4 }}>{m.title}</div>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'center' }}>
                <Badge status={m.status} />
                {m.dueDate && <span style={{ fontSize:10, color:'rgba(255,255,255,.3)' }}>Due {fmtDate(m.dueDate)}</span>}
                {m.reworkCount > 0 && <span style={{ fontSize:10, color:'#fb923c' }}>{m.reworkCount}x rework</span>}
                {locked && idx > 1 && <span style={{ fontSize:10, color:'#4b5563' }}>Unlocks after #{idx-1} releases</span>}
              </div>
            </div>
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <div style={{ fontSize:16, fontWeight:800, color: locked ? '#4b5563' : cfg.color }}>{fmtCurrency(m.amount)}</div>
              {!locked && <FeeRow amount={Number(m.amount)} compact />}
            </div>
          </div>

          {/* Milestone step bar */}
          {!locked && <MilestoneStep status={m.status} />}

          {/* Description / deliverable */}
          {!locked && m.description && <div style={{ fontSize:12, color:'rgba(255,255,255,.5)', lineHeight:1.55, marginTop:8 }}>{m.description}</div>}
          {!locked && m.deliverable && (
            <div style={{ fontSize:11, color:'rgba(255,255,255,.45)', marginTop:5, display:'flex', gap:5 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0, marginTop:1 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span><strong style={{ color:'rgba(255,255,255,.55)' }}>Deliverable:</strong> {m.deliverable}</span>
            </div>
          )}

          {/* Rework instructions */}
          {m.status === 'REWORK_REQUESTED' && m.reworkNote && (
            <div style={{ marginTop:8, padding:'8px 11px', borderRadius:8, background:'rgba(251,146,60,.08)', border:'1px solid rgba(251,146,60,.25)', fontSize:12, color:'rgba(255,255,255,.65)' }}>
              <strong style={{ color:'#fb923c' }}>Rework instructions:</strong><br/>
              <span style={{ lineHeight:1.6 }}>{m.reworkNote}</span>
              {m.reworkRequestedAt && <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:4 }}>{fmtRelative(m.reworkRequestedAt)}</div>}
            </div>
          )}

          {/* Submission record */}
          {m.submissionNote && (
            <div style={{ marginTop:7, padding:'7px 10px', borderRadius:7, background:'rgba(129,140,248,.06)', border:'1px solid rgba(129,140,248,.2)', fontSize:11, color:'rgba(255,255,255,.6)', fontStyle:'italic' }}>
              <strong style={{ color:'#818cf8', fontStyle:'normal' }}>Submitted:</strong> "{m.submissionNote}"
              {m.submittedAt && <span style={{ marginLeft:6, color:'rgba(255,255,255,.3)', fontStyle:'normal' }}>{fmtRelative(m.submittedAt)}</span>}
            </div>
          )}

          {/* Reject reason */}
          {m.status === 'REJECTED' && m.rejectReason && (
            <div style={{ marginTop:7, padding:'8px 11px', borderRadius:8, background:'rgba(244,63,94,.07)', border:'1px solid rgba(244,63,94,.25)', fontSize:12, color:'rgba(255,255,255,.65)' }}>
              <strong style={{ color:'#f43f5e' }}>Rejected:</strong> {m.rejectReason}
              {m.rejectedAt && <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:3 }}>{fmtRelative(m.rejectedAt)}</div>}
            </div>
          )}

          {/* Fee breakdown (freelancer) */}
          {(isFreelancer || isAdmin) && !locked && !['LOCKED','UNLOCKED'].includes(m.status) && (
            <div style={{ marginTop:7 }}>
              <button onClick={() => setExpanded(v => !v)} style={{ fontSize:10, color:'rgba(255,255,255,.35)', background:'none', border:'none', cursor:'pointer', padding:0, display:'flex', alignItems:'center', gap:3 }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition:'transform .2s' }}><polyline points="6 9 12 15 18 9"/></svg>
                {expanded ? 'Hide' : 'Show'} payment breakdown
              </button>
              {expanded && <div style={{ marginTop:7 }}><FeeRow amount={Number(m.amount)}/></div>}
            </div>
          )}

          {/* Payment under review */}
          {['PAYMENT_UNDER_REVIEW','UNDER_ADMIN_REVIEW'].includes(m.status) && (
            <div style={{ marginTop:7, padding:'7px 10px', borderRadius:7, background:'rgba(251,146,60,.06)', border:'1px solid rgba(251,146,60,.2)', fontSize:11, color:'rgba(255,255,255,.6)', display:'flex', alignItems:'center', gap:6 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Payment under TrustWork review &middot; Net payout: <strong style={{ color:'#34d399' }}>{fmtCurrency(net)}</strong>
            </div>
          )}

          {/* Released */}
          {m.status === 'RELEASED' && (
            <div style={{ marginTop:7, padding:'7px 10px', borderRadius:7, background:'rgba(52,211,153,.06)', border:'1px solid rgba(52,211,153,.2)', fontSize:11, color:'#34d399', display:'flex', alignItems:'center', gap:6 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              {fmtCurrency(net)} released{m.releasedAt ? ' ' + fmtRelative(m.releasedAt) : ''}
            </div>
          )}

          {/* Actions */}
          <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
            {canFund    && <button onClick={() => setShowFund(true)}   className="mp-btn" style={{ background:'rgba(251,191,36,.12)', border:'1px solid rgba(251,191,36,.3)',   color:'#fbbf24' }}>Fund Milestone</button>}
            {canStart   && <button onClick={() => doAction('start')} disabled={!!actioning} className="mp-btn" style={{ background:'rgba(96,165,250,.12)', border:'1px solid rgba(96,165,250,.3)', color:'#60a5fa' }}>{actioning==='start'&&<Spin/>}Start Work</button>}
            {canSubmit  && <button onClick={() => setShowSubmit(true)} className="mp-btn" style={{ background:'rgba(129,140,248,.12)', border:'1px solid rgba(129,140,248,.3)', color:'#818cf8' }}>
              {m.status === 'REWORK_REQUESTED' ? 'Resubmit Work' : 'Submit Work'}
            </button>}
            {canApprove && <button onClick={() => doAction('approve')} disabled={!!actioning} className="mp-btn" style={{ background:'rgba(52,211,153,.12)', border:'1px solid rgba(52,211,153,.3)', color:'#34d399' }}>{actioning==='approve'&&<Spin/>}Approve</button>}
            {canRework  && <button onClick={() => setShowRework(true)} className="mp-btn" style={{ background:'rgba(251,146,60,.1)', border:'1px solid rgba(251,146,60,.28)', color:'#fb923c' }}>Request Rework</button>}
            {canReject  && <button onClick={() => setShowReject(true)} className="mp-btn" style={{ background:'rgba(244,63,94,.08)', border:'1px solid rgba(244,63,94,.25)', color:'#f43f5e' }}>Reject</button>}
            {canUnlock  && <button onClick={() => doAction('unlock')} disabled={!!actioning} className="mp-btn" style={{ background:'rgba(20,184,166,.1)', border:'1px solid rgba(20,184,166,.25)', color:'#14b8a6' }}>{actioning==='unlock'&&<Spin/>}Unlock</button>}
            {canEdit    && <button onClick={() => setShowEdit(true)}  className="mp-btn" style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.6)' }}>Edit</button>}
            {canDelete  && <button onClick={del} disabled={!!actioning} className="mp-btn" style={{ background:'rgba(244,63,94,.07)', border:'1px solid rgba(244,63,94,.2)', color:'#f43f5e' }}>{actioning==='delete'&&<Spin/>}Delete</button>}
            {isAdmin && canAdminLock && <button onClick={() => doAction(m.isLocked ? 'unlock' : 'lock')} disabled={!!actioning} className="mp-btn" style={{ background:'rgba(251,146,60,.08)', border:'1px solid rgba(251,146,60,.2)', color:'#fb923c' }}>{actioning&&<Spin/>}{m.isLocked?'Admin Unlock':'Admin Lock'}</button>}
          </div>
        </div>
      </div>

      {/* Inline modals */}
      <FundModal   open={showFund}   milestone={m} onClose={() => setShowFund(false)}   onDone={() => { setShowFund(false); onRefresh() }} />
      <SubmitModal open={showSubmit} milestone={m} onClose={() => setShowSubmit(false)} onDone={() => { setShowSubmit(false); onRefresh() }} />
      <ReworkModal open={showRework} milestone={m} onClose={() => setShowRework(false)} onDone={() => { setShowRework(false); onRefresh() }} />
      <RejectModal open={showReject} milestone={m} onClose={() => setShowReject(false)} onDone={() => { setShowReject(false); onRefresh() }} />
      <EditModal   open={showEdit}   milestone={m} jobId={m.jobId} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); onRefresh() }} />
    </div>
  )
}

//  Main MilestonePanel 
export default function MilestonePanel({ jobId, job, user }) {
  const [milestones, setMilestones] = useState(job?.milestones || [])
  const [loading,    setLoading]    = useState(false)
  const [showAdd,    setShowAdd]    = useState(false)

  const isClient     = user?.id === job?.clientId
  const isFreelancer = user?.id === job?.freelancerId
  const isAdmin      = user?.role === 'ADMIN'

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/jobs/${jobId}/milestones`)
      setMilestones(data.milestones || [])
    } catch {}
    finally { setLoading(false) }
  }, [jobId])

  useEffect(() => { refresh() }, [refresh])

  if (!milestones.length && !isClient && !isAdmin) return null

  // Alert counts
  const needsClientAction  = milestones.filter(m => isClient     && m.status === 'SUBMITTED').length
  const needsFreelancerAction = milestones.filter(m => isFreelancer && ['FUNDED','IN_PROGRESS','REWORK_REQUESTED'].includes(m.status) && !m.isLocked).length

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, flexWrap:'wrap', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'#f8fafc', margin:0 }}>
            Milestones{milestones.length > 0 && <span style={{ marginLeft:5, fontSize:12, color:'rgba(255,255,255,.38)' }}>({milestones.length})</span>}
          </h3>
          {(needsClientAction > 0 || needsFreelancerAction > 0) && (
            <span style={{ fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:100, background:'rgba(244,63,94,.15)', color:'#f43f5e', border:'1px solid rgba(244,63,94,.3)' }}>
              {needsClientAction || needsFreelancerAction} action needed
            </span>
          )}
          {loading && <Spin s={12}/>}
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {isClient && (
            <button onClick={() => setShowAdd(true)} className="mp-btn" style={{ background:'rgba(20,184,166,.12)', border:'1px solid rgba(20,184,166,.3)', color:'#14b8a6', fontSize:12 }}>
              + Add
            </button>
          )}
          <Link to={`/jobs/${jobId}/milestones`} style={{ padding:'6px 13px', borderRadius:7, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.6)', fontSize:12, fontWeight:600, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:5 }}>
            Full View
          </Link>
        </div>
      </div>

      {/* Agreement reset banner */}
      {['DRAFT','CHANGES_REQUESTED','AMENDMENT_PENDING'].includes(job?.agreementStatus) && (
        <div style={{ padding:'10px 13px', borderRadius:10, background:'rgba(251,191,36,.07)', border:'1px solid rgba(251,191,36,.25)', marginBottom:12, display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <div style={{ fontSize:12, color:'#fbbf24' }}>
            <strong>Agreement {job.agreementStatus === 'AMENDMENT_PENDING' ? 'amendment pending' : 'needs re-signing'}</strong>
          </div>
          <Link to={`/jobs/${jobId}/agreement`} style={{ fontSize:11, fontWeight:700, padding:'4px 12px', borderRadius:7, background:'rgba(251,191,36,.15)', border:'1px solid rgba(251,191,36,.3)', color:'#fbbf24', textDecoration:'none' }}>
            Review
          </Link>
        </div>
      )}

      {/* Alert banners */}
      {isClient && needsClientAction > 0 && (
        <div style={{ padding:'9px 13px', borderRadius:9, background:'rgba(129,140,248,.08)', border:'1px solid rgba(129,140,248,.25)', marginBottom:12, fontSize:12, color:'#818cf8' }}>
          <strong>{needsClientAction} milestone{needsClientAction>1?'s':''}</strong> submitted and awaiting your review.
        </div>
      )}
      {isFreelancer && needsFreelancerAction > 0 && (
        <div style={{ padding:'9px 13px', borderRadius:9, background:'rgba(96,165,250,.08)', border:'1px solid rgba(96,165,250,.25)', marginBottom:12, fontSize:12, color:'#60a5fa' }}>
          <strong>{needsFreelancerAction} milestone{needsFreelancerAction>1?'s':''}</strong> ready  start or submit work.
        </div>
      )}

      {/* Overall progress */}
      {milestones.length > 0 && <OverallProgress milestones={milestones}/>}

      {/* Cards */}
      {milestones.length === 0 ? (
        <div style={{ padding:'28px 16px', textAlign:'center', background:'rgba(255,255,255,.03)', borderRadius:10, border:'1px solid rgba(255,255,255,.07)' }}>
          <div style={{ fontSize:13, color:'rgba(255,255,255,.38)', marginBottom: isClient ? 12 : 0 }}>
            {isClient ? 'No milestones yet. Add milestones to structure the project.' : 'No milestones set yet.'}
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
              onRefresh={refresh}
            />
          ))}
        </div>
      )}

      <EditModal open={showAdd} milestone={null} jobId={jobId} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); refresh() }} />
    </div>
  )
}
