// AdminDashboard.jsx - Phase 5: Full Admin Control Center
// Auto-polls stats every 30s. Tabs: Overview | Users | Jobs | Escrow | Disputes | Logs

import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { fmtCurrency, fmtDate, fmtRelative, errMsg } from '../utils/helpers'

//  Design tokens 
const O = '#fb923c'  // admin orange
const css = `
  @keyframes tw-in   { from { opacity:0;transform:translateY(6px) } to { opacity:1;transform:translateY(0) } }
  @keyframes tw-spin { to   { transform:rotate(360deg) } }
  .ad-fade { animation:tw-in .25s ease both }
  * { box-sizing:border-box }
  .ad-card { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:13px; padding:18px }
  .ad-input { width:100%; padding:9px 13px; background:rgba(255,255,255,.05); border:1.5px solid rgba(255,255,255,.1); border-radius:9px; color:#f8fafc; font-size:13px; font-family:inherit; outline:none; transition:border-color .18s }
  .ad-input:focus { border-color:${O}; box-shadow:0 0 0 3px rgba(251,146,60,.1) }
  .ad-input::placeholder { color:#475569 }
  .ad-sec { font-size:11px; font-weight:700; color:rgba(255,255,255,.32); text-transform:uppercase; letter-spacing:.08em; padding-bottom:8px; margin-bottom:14px; border-bottom:1px solid rgba(255,255,255,.07) }
  .ad-th { font-size:10px; font-weight:700; color:rgba(255,255,255,.32); text-transform:uppercase; letter-spacing:.07em; padding:8px 12px }
  .ad-td { font-size:12px; color:#e2e8f0; padding:10px 12px; border-top:1px solid rgba(255,255,255,.05) }
  .ad-tr:hover td { background:rgba(255,255,255,.03) }
  .ad-table { width:100%; border-collapse:collapse }
  .ad-btn { padding:5px 12px; border-radius:7px; border:none; cursor:pointer; font-family:inherit; font-size:12px; font-weight:600; transition:all .15s }
`

//  Helpers 
function Spin({ size = 14 }) {
  return <svg style={{ animation:'tw-spin .7s linear infinite', flexShrink:0 }} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
}

function StatusPill({ status }) {
  const map = {
    LOCKED:    ['#fbbf24','rgba(251,191,36,.12)'],
    RELEASED:  ['#34d399','rgba(52,211,153,.12)'],
    REFUNDED:  ['#60a5fa','rgba(96,165,250,.12)'],
    OPEN:      ['#f43f5e','rgba(244,63,94,.12)'],
    RESOLVED:  ['#34d399','rgba(52,211,153,.12)'],
    COMPLETED: ['#34d399','rgba(52,211,153,.12)'],
    ASSIGNED:  ['#fbbf24','rgba(251,191,36,.12)'],
    FUNDED:    ['#60a5fa','rgba(96,165,250,.12)'],
    SUBMITTED: ['#818cf8','rgba(129,140,248,.12)'],
    DISPUTED:  ['#f43f5e','rgba(244,63,94,.12)'],
    CREATED:   ['#94a3b8','rgba(148,163,184,.12)'],
    CLIENT:    ['#60a5fa','rgba(96,165,250,.12)'],
    FREELANCER:['#14b8a6','rgba(20,184,166,.12)'],
    ADMIN:     ['#fb923c','rgba(251,146,60,.12)'],
  }
  const [color, bg] = map[status] || ['#94a3b8','rgba(148,163,184,.12)']
  return <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100, background:bg, color, border:`1px solid ${color}30`, whiteSpace:'nowrap' }}>{status}</span>
}

function StatCard({ label, value, sub, color = O, icon }) {
  return (
    <div className="ad-card" style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
      <div style={{ width:40, height:40, borderRadius:11, background:`${color}15`, border:`1px solid ${color}25`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={icon}/>
        </svg>
      </div>
      <div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,.38)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:3 }}>{label}</div>
        <div style={{ fontSize:22, fontWeight:800, color, letterSpacing:'-.5px' }}>{value}</div>
        {sub && <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginTop:2 }}>{sub}</div>}
      </div>
    </div>
  )
}

//  Escrow action modal 
//  Milestone Release Panel (inside EscrowActionModal) 
function MilestoneReleaseRow({ ms, escrow, adminId, onReleased }) {
  const [note,   setNote]   = useState('')
  const [open,   setOpen]   = useState(false)
  const [saving, setSaving] = useState(false)

  const pq    = ms.payoutQueue
  const gross = Number(pq?.grossAmount || ms.amount || 0)
  const fee   = Number(pq?.platformFee || gross * 0.02)
  const net   = Number(pq?.netAmount   || gross - fee)
  const fmtRs = v => 'Rs.' + Number(v).toLocaleString('en-IN', { minimumFractionDigits:0 })
  const isPending = pq?.status === 'PENDING_REVIEW' || ms.status === 'PAYMENT_UNDER_REVIEW'

  const release = async () => {
    if (!note.trim()) { toast.error('Resolution note required'); return }
    setSaving(true)
    try {
      if (pq?.id) {
        // Use payout queue route if available
        await api.post('/milestones/payouts/' + pq.id + '/release', { adminNote: note })
      } else {
        // Fallback: use milestone approve endpoint
        await api.post('/milestones/' + ms.id + '/approve')
      }
      toast.success(fmtRs(net) + ' released to freelancer!')
      setOpen(false)
      onReleased()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setSaving(false) }
  }

  const SC = {
    PAYMENT_UNDER_REVIEW: { color:'#fb923c', label:'Awaiting Release' },
    RELEASED:             { color:'#34d399', label:'Released' },
    SUBMITTED:            { color:'#818cf8', label:'Submitted' },
    REWORK_REQUESTED:     { color:'#fb923c', label:'Rework' },
    REJECTED:             { color:'#f43f5e', label:'Rejected' },
    FUNDED:               { color:'#fbbf24', label:'Funded' },
    LOCKED:               { color:'#475569', label:'Locked' },
    UNLOCKED:             { color:'#14b8a6', label:'Unlocked' },
  }
  const sc = SC[ms.status] || { color:'#94a3b8', label: ms.status }

  return (
    <div style={{ padding:'12px 14px', borderRadius:10, background:'rgba(255,255,255,.04)', border:`1px solid ${isPending ? 'rgba(251,146,60,.25)' : 'rgba(255,255,255,.08)'}`, borderLeft:`3px solid ${isPending ? '#fb923c' : sc.color}`, marginBottom:8 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4 }}>
            <span style={{ fontSize:13, fontWeight:700, color:'#f8fafc' }}>#{ms.order} {ms.title}</span>
            <span style={{ fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:100, background: isPending ? 'rgba(251,146,60,.12)' : 'rgba(255,255,255,.07)', color: isPending ? '#fb923c' : sc.color, border:`1px solid ${isPending ? 'rgba(251,146,60,.3)' : 'rgba(255,255,255,.12)'}` }}>
              {sc.label}
            </span>
          </div>
          <div style={{ display:'flex', gap:12, fontSize:12 }}>
            <span style={{ color:'rgba(255,255,255,.45)' }}>Gross: <strong style={{ color:'#fbbf24' }}>{fmtRs(gross)}</strong></span>
            <span style={{ color:'rgba(255,255,255,.45)' }}>Fee: <strong style={{ color:'rgba(255,255,255,.6)' }}>{fmtRs(fee)}</strong></span>
            <span style={{ color:'rgba(255,255,255,.45)' }}>Net: <strong style={{ color:'#34d399' }}>{fmtRs(net)}</strong></span>
          </div>
          {ms.submissionNote && <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginTop:4, fontStyle:'italic' }}>"{ms.submissionNote}"</div>}
          {ms.clientApprovedAt && <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:3 }}>Client approved {fmtDate(ms.clientApprovedAt)}</div>}
          {pq?.reviewedAt && <div style={{ fontSize:10, color:'rgba(255,255,255,.3)' }}>Released {fmtDate(pq.reviewedAt)}</div>}
        </div>
        {isPending && !open && (
          <button onClick={() => setOpen(true)}
            style={{ padding:'8px 18px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#14b8a6,#0d9488)', color:'#07111d', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit', flexShrink:0, boxShadow:'0 3px 10px rgba(20,184,166,.25)' }}>
            Release Payment
          </button>
        )}
      </div>
      {open && (
        <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid rgba(255,255,255,.07)' }}>
          <div style={{ padding:'9px 12px', borderRadius:8, background:'rgba(20,184,166,.06)', border:'1px solid rgba(20,184,166,.15)', fontSize:12, marginBottom:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ color:'rgba(255,255,255,.45)' }}>Gross amount</span><strong style={{ color:'#fbbf24' }}>{fmtRs(gross)}</strong>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ color:'rgba(255,255,255,.45)' }}>Platform fee (2%)</span><strong style={{ color:'rgba(255,255,255,.6)' }}>- {fmtRs(fee)}</strong>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', paddingTop:5, borderTop:'1px solid rgba(20,184,166,.2)', fontWeight:700, fontSize:13 }}>
              <span style={{ color:'#14b8a6' }}>Freelancer receives</span><span style={{ color:'#34d399' }}>{fmtRs(net)}</span>
            </div>
          </div>
          <input className="ad-input" value={note} onChange={e => setNote(e.target.value)}
            placeholder="Resolution note (required)" style={{ marginBottom:8 }}/>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setOpen(false)} style={{ padding:'7px 14px', borderRadius:8, border:'1.5px solid rgba(255,255,255,.1)', background:'transparent', color:'rgba(255,255,255,.5)', cursor:'pointer', fontFamily:'inherit', fontSize:12 }}>Cancel</button>
            <button onClick={release} disabled={saving || !note.trim()} style={{ flex:1, padding:'7px', borderRadius:8, border:'none', background:'#34d399', color:'#07111d', fontWeight:700, fontSize:12, cursor: saving || !note.trim() ? 'not-allowed' : 'pointer', opacity: saving || !note.trim() ? .6 : 1, fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              {saving && <svg style={{ animation:'tw-spin .7s linear infinite' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>}
              {saving ? 'Releasing...' : 'Confirm Release'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function EscrowActionModal({ escrow, onClose, onDone }) {
  const [mode,       setMode]       = useState('milestones')  // milestones | release | refund | split
  const [amount,     setAmount]     = useState(escrow?.amount?.toString() || '')
  const [note,       setNote]       = useState('')
  const [saving,     setSaving]     = useState(false)
  const [milestones, setMilestones] = useState([])
  const [msLoading,  setMsLoading]  = useState(true)

  // Load milestone escrows for this job
  useEffect(() => {
    if (!escrow?.jobId) { setMsLoading(false); return }
    api.get('/admin/milestone-escrows?jobId=' + escrow.jobId)
      .then(r => {
        const all = r.data.byJob?.[0]?.escrows || r.data.escrows?.filter(e => e.jobId === escrow.jobId) || []
        setMilestones(all)
      })
      .catch(() => setMilestones([]))
      .finally(() => setMsLoading(false))
  }, [escrow?.jobId])

  const pendingMs = milestones.filter(e => e.milestone?.status === 'PAYMENT_UNDER_REVIEW' || e.milestone?.payoutQueue?.status === 'PENDING_REVIEW')
  const gross  = parseFloat(amount) || 0
  const fee    = Math.round(gross * 0.02 * 100) / 100
  const net    = Math.round((gross - fee) * 100) / 100
  const refund = Math.round(((escrow?.amount || 0) - gross) * 100) / 100

  const submit = async () => {
    if (!note.trim()) { toast.error('Add a resolution note'); return }
    setSaving(true)
    try {
      const body = { note }
      let url = '/admin/escrows/' + escrow.id + '/release'
      if (mode === 'refund') url = '/admin/escrows/' + escrow.id + '/refund'
      if (mode === 'split')  { url = '/admin/escrows/' + escrow.id + '/split'; body.freelancerAmount = gross }
      if (mode === 'release' && gross !== escrow.amount) body.partialAmount = gross
      const { data } = await api.post(url, body)
      toast.success(data.message)
      onDone()
      onClose()
    } catch (err) { toast.error(errMsg(err)) }
    finally { setSaving(false) }
  }

  const hasJobEscrow = escrow?.status === 'LOCKED'
  const fmtRs = v => 'Rs.' + Number(v).toLocaleString('en-IN', { minimumFractionDigits:0 })

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.8)', backdropFilter:'blur(5px)', zIndex:999, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'20px 16px', overflowY:'auto' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width:'100%', maxWidth:580, background:'#080f1f', border:'1px solid rgba(255,255,255,.1)', borderRadius:18, padding:28, fontFamily:"'DM Sans',system-ui,sans-serif", color:'#f8fafc' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:5 }}>Escrow Management</div>
            <div style={{ fontSize:18, fontWeight:700, marginBottom:3 }}>{escrow?.job?.title}</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.45)' }}>
              <span style={{ color:'rgba(255,255,255,.55)' }}>{escrow?.job?.client?.name}</span> &rarr;
              <span style={{ color:'#14b8a6', marginLeft:4 }}>{escrow?.job?.freelancer?.name}</span>
              <span style={{ marginLeft:12, fontWeight:700, color:'#fbbf24' }}>{fmtRs(escrow?.amount)}</span> total
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,.4)', cursor:'pointer', padding:4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Mode tabs */}
        <div style={{ display:'grid', gridTemplateColumns: hasJobEscrow ? '1fr 1fr 1fr 1fr' : '1fr', gap:6, marginBottom:20 }}>
          <button type="button" onClick={() => setMode('milestones')}
            style={{ padding:'8px', borderRadius:9, border:`1.5px solid ${mode==='milestones'?'#14b8a6':'rgba(255,255,255,.1)'}`, background:mode==='milestones'?'rgba(20,184,166,.12)':'transparent', color:mode==='milestones'?'#14b8a6':'rgba(255,255,255,.5)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all .18s', position:'relative' }}>
            Milestones
            {pendingMs.length > 0 && (
              <span style={{ position:'absolute', top:-6, right:-6, width:16, height:16, borderRadius:'50%', background:'#fb923c', border:'2px solid #080f1f', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800, color:'#fff' }}>
                {pendingMs.length}
              </span>
            )}
          </button>
          {hasJobEscrow && <>
            <button type="button" onClick={() => setMode('release')}
              style={{ padding:'8px', borderRadius:9, border:`1.5px solid ${mode==='release'?'#34d399':'rgba(255,255,255,.1)'}`, background:mode==='release'?'rgba(52,211,153,.1)':'transparent', color:mode==='release'?'#34d399':'rgba(255,255,255,.5)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all .18s' }}>
              Release
            </button>
            <button type="button" onClick={() => setMode('refund')}
              style={{ padding:'8px', borderRadius:9, border:`1.5px solid ${mode==='refund'?'#60a5fa':'rgba(255,255,255,.1)'}`, background:mode==='refund'?'rgba(96,165,250,.1)':'transparent', color:mode==='refund'?'#60a5fa':'rgba(255,255,255,.5)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all .18s' }}>
              Refund
            </button>
            <button type="button" onClick={() => setMode('split')}
              style={{ padding:'8px', borderRadius:9, border:`1.5px solid ${mode==='split'?'#fbbf24':'rgba(255,255,255,.1)'}`, background:mode==='split'?'rgba(251,191,36,.1)':'transparent', color:mode==='split'?'#fbbf24':'rgba(255,255,255,.5)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all .18s' }}>
              Split
            </button>
          </>}
        </div>

        {/* Milestones tab */}
        {mode === 'milestones' && (
          <div>
            {pendingMs.length > 0 && (
              <div style={{ padding:'9px 12px', borderRadius:9, background:'rgba(251,146,60,.07)', border:'1px solid rgba(251,146,60,.2)', fontSize:12, color:'#fb923c', fontWeight:600, marginBottom:12 }}>
                {pendingMs.length} milestone{pendingMs.length!==1?'s':''} awaiting payment release
              </div>
            )}
            {msLoading ? (
              <div style={{ textAlign:'center', padding:'20px 0', color:'rgba(255,255,255,.4)', fontSize:13 }}>Loading milestone payments...</div>
            ) : milestones.length === 0 ? (
              <div style={{ textAlign:'center', padding:'24px 0', color:'rgba(255,255,255,.4)', fontSize:13 }}>
                No milestone escrows found for this job.
              </div>
            ) : (
              milestones.map(e => (
                <MilestoneReleaseRow
                  key={e.id}
                  ms={e.milestone}
                  escrow={e}
                  onReleased={() => { onDone() }}
                />
              ))
            )}
          </div>
        )}

        {/* Release tab */}
        {mode === 'release' && hasJobEscrow && (
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:11, color:'rgba(255,255,255,.38)', textTransform:'uppercase', letterSpacing:'.07em', display:'block', marginBottom:5 }}>Release Amount (Rs.)</label>
            <input className="ad-input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={escrow?.amount} />
            {gross > 0 && (
              <div style={{ marginTop:8, padding:'10px 12px', borderRadius:9, background:'rgba(52,211,153,.06)', border:'1px solid rgba(52,211,153,.15)', fontSize:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ color:'rgba(255,255,255,.45)' }}>Gross</span><strong style={{ color:'#fbbf24' }}>{fmtRs(gross)}</strong>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ color:'rgba(255,255,255,.45)' }}>Platform fee (2%)</span><strong style={{ color:'rgba(255,255,255,.6)' }}>- {fmtRs(fee)}</strong>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', paddingTop:5, borderTop:'1px solid rgba(52,211,153,.2)', fontWeight:700, fontSize:13 }}>
                  <span style={{ color:'#14b8a6' }}>Freelancer receives</span><span style={{ color:'#34d399' }}>{fmtRs(net)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {mode === 'refund' && hasJobEscrow && (
          <div style={{ marginBottom:16, padding:'12px', borderRadius:10, background:'rgba(96,165,250,.06)', border:'1px solid rgba(96,165,250,.2)', fontSize:13, color:'rgba(255,255,255,.65)' }}>
            Full amount <strong style={{ color:'#60a5fa' }}>{fmtRs(escrow?.amount)}</strong> will be refunded to client.
          </div>
        )}

        {mode === 'split' && hasJobEscrow && (
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:11, color:'rgba(255,255,255,.38)', textTransform:'uppercase', letterSpacing:'.07em', display:'block', marginBottom:5 }}>Freelancer Amount (Rs.)</label>
            <input className="ad-input" type="number" value={amount} onChange={e => setAmount(e.target.value)} max={escrow?.amount} placeholder="Enter amount for freelancer" />
            <div style={{ marginTop:8, padding:'10px 12px', borderRadius:9, background:'rgba(255,255,255,.04)', fontSize:12 }}>
              <div style={{ display:'flex', gap:16 }}>
                <span style={{ color:'rgba(255,255,255,.45)' }}>Freelancer: <strong style={{ color:'#34d399' }}>{fmtRs(net)}</strong></span>
                <span style={{ color:'rgba(255,255,255,.45)' }}>Client refund: <strong style={{ color:'#60a5fa' }}>{fmtRs(refund)}</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* Note + CTA for non-milestones modes */}
        {mode !== 'milestones' && hasJobEscrow && (
          <>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, color:'rgba(255,255,255,.38)', textTransform:'uppercase', letterSpacing:'.07em', display:'block', marginBottom:5 }}>Resolution Note (required)</label>
              <textarea className="ad-input" rows={3} value={note} onChange={e => setNote(e.target.value)}
                placeholder="Explain the basis for this admin action..." style={{ resize:'vertical' }} />
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button type="button" onClick={onClose} style={{ flex:1, padding:'10px', background:'transparent', border:'1.5px solid rgba(255,255,255,.1)', borderRadius:9, color:'rgba(255,255,255,.5)', cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>Cancel</button>
              <button type="button" onClick={submit} disabled={saving}
                style={{ flex:2, padding:'10px', background:mode==='refund'?'#60a5fa':mode==='split'?'#fbbf24':'#34d399', border:'none', borderRadius:9, color:'#07111d', fontSize:13, fontWeight:700, cursor:saving?'not-allowed':'pointer', opacity:saving?.7:1, fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                {saving && <svg style={{ animation:'tw-spin .7s linear infinite' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>}
                {saving ? 'Processing...' : mode==='release' ? 'Release Payment' : mode==='refund' ? 'Refund Client' : 'Apply Split'}
              </button>
            </div>
          </>
        )}
        {mode === 'milestones' && (
          <div style={{ marginTop:12, display:'flex', justifyContent:'flex-end' }}>
            <button onClick={onClose} style={{ padding:'8px 20px', borderRadius:9, border:'1.5px solid rgba(255,255,255,.1)', background:'transparent', color:'rgba(255,255,255,.5)', cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>Close</button>
          </div>
        )}
      </div>
    </div>
  )
}

// Tabs
//  Tabs 
const TABS = [
  { id:'overview',     label:'Overview',     icon:'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z' },
  { id:'users',        label:'Users',        icon:'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 7a4 4 0 1 1 0 8 4 4 0 0 1 0-8z' },
  { id:'jobs',         label:'Jobs',         icon:'M21 13.255A23.931 23.931 0 0 1 12 15c-3.183 0-6.22-.62-9-1.745M16 6l2 2-2 2M8 6l-2 2 2 2' },
  { id:'escrow',       label:'Escrow',       icon:'M3 11V7a5 5 0 0 1 10 0v4M5 11h14l1 9H4z' },
  { id:'disputes',     label:'Disputes',     icon:'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
  { id:'transactions', label:'Transactions', icon:'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
  { id:'payouts',      label:'Payout Queue', icon:'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3z' },
  { id:'logs',         label:'Audit Log',    icon:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8' },
]

//  Main 

//  Release Modal 
const RM_CSS = `
  @keyframes rm-in { from { opacity:0;transform:translateY(8px) } to { opacity:1;transform:translateY(0) } }
  @keyframes rm-spin { to { transform:rotate(360deg) } }
  .rm-fade { animation:rm-in .22s ease both }
  .rm-overlay { position:fixed; inset:0; background:rgba(0,0,0,.8); backdrop-filter:blur(6px); z-index:800; display:flex; align-items:center; justify-content:center; padding:20px }
  .rm-panel { width:100%; max-width:520px; background:#0a1628; border:1px solid rgba(255,255,255,.1); border-radius:16px; padding:28px; font-family:'DM Sans',system-ui,sans-serif; color:#f8fafc }
  .rm-input { width:100%; padding:10px 13px; background:rgba(255,255,255,.06); border:1.5px solid rgba(255,255,255,.1); border-radius:9px; color:#f8fafc; font-size:14px; font-family:inherit; outline:none; transition:all .18s; box-sizing:border-box }
  .rm-input:focus { border-color:#14b8a6; box-shadow:0 0 0 3px rgba(20,184,166,.1) }
  .rm-tab { padding:8px 20px; border-radius:9px; border:1px solid rgba(255,255,255,.1); background:transparent; color:rgba(255,255,255,.5); font-family:inherit; font-size:13px; font-weight:600; cursor:pointer; transition:all .18s }
  .rm-tab.active { border-color:#14b8a6; background:rgba(20,184,166,.12); color:#14b8a6 }
  .rm-tab.danger { border-color:rgba(244,63,94,.3); background:rgba(244,63,94,.08); color:#f43f5e }
  * { box-sizing:border-box }
`

function ReleaseModal({ payout, onClose, onDone }) {
  const [action,  setAction]  = useState('release')
  const [amount,  setAmount]  = useState(String(Number(payout.grossAmount || 0)))
  const [note,    setNote]    = useState('')
  const [saving,  setSaving]  = useState(false)

  const gross = Number(amount) || 0
  const fee   = Math.round(gross * 0.02 * 100) / 100
  const net   = Math.round((gross - fee) * 100) / 100
  const fmtRs = v => 'Rs.' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0 })

  const submit = async () => {
    if (!note.trim()) { toast.error('Resolution note required'); return }
    if (action === 'release' && gross <= 0) { toast.error('Enter a valid amount'); return }
    setSaving(true)
    try {
      if (action === 'release') {
        await api.post('/milestones/payouts/' + payout.id + '/release', { adminNote: note })
        toast.success('Payment released! ' + fmtRs(net) + ' sent to freelancer.')
      } else {
        await api.post('/milestones/payouts/' + payout.id + '/reject', { rejectNote: note })
        toast.success('Payout rejected.')
      }
      onDone()
      onClose()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setSaving(false) }
  }

  return (
    <div className="rm-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="rm-panel rm-fade">
        <style>{RM_CSS}</style>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:5 }}>Escrow Action</div>
            <div style={{ fontSize:18, fontWeight:700 }}>{payout.milestone?.title}</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.45)', marginTop:3 }}>
              {payout.job?.title} &middot; <strong style={{ color:'#f8fafc' }}>{payout.freelancer?.name}</strong>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:20, fontWeight:800, color:'#fbbf24' }}>{fmtRs(payout.grossAmount)}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginTop:2 }}>Gross escrow</div>
          </div>
        </div>

        {/* Submission note */}
        {payout.milestone?.submissionNote && (
          <div style={{ padding:'9px 12px', borderRadius:8, background:'rgba(129,140,248,.07)', border:'1px solid rgba(129,140,248,.2)', fontSize:12, color:'rgba(255,255,255,.6)', fontStyle:'italic', marginBottom:16 }}>
            "{payout.milestone.submissionNote}"
          </div>
        )}

        {/* Action tabs */}
        <div style={{ display:'flex', gap:8, marginBottom:20 }}>
          <button className={'rm-tab' + (action==='release' ? ' active' : '')} onClick={() => setAction('release')}>Release</button>
          <button className={'rm-tab' + (action==='reject'  ? ' danger' : '')} onClick={() => setAction('reject')}>Reject</button>
        </div>

        {action === 'release' && (
          <>
            {/* Amount input */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:11, color:'rgba(255,255,255,.38)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:5 }}>Release Amount (Rs.)</label>
              <input className="rm-input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount to release"/>
            </div>

            {/* Fee breakdown */}
            {gross > 0 && (
              <div style={{ padding:'10px 14px', borderRadius:9, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', marginBottom:16, fontSize:13 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ color:'rgba(255,255,255,.5)' }}>Gross: <strong style={{ color:'#fbbf24' }}>{fmtRs(gross)}</strong></span>
                  <span style={{ color:'rgba(255,255,255,.5)' }}>Fee (2%): <strong style={{ color:'rgba(255,255,255,.65)' }}>{fmtRs(fee)}</strong></span>
                  <span>Freelancer gets: <strong style={{ color:'#34d399' }}>{fmtRs(net)}</strong></span>
                </div>
                <div style={{ height:4, background:'rgba(255,255,255,.07)', borderRadius:2, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:'98%', background:'linear-gradient(to right,#14b8a6,#34d399)', borderRadius:2 }}/>
                </div>
              </div>
            )}
          </>
        )}

        {action === 'reject' && (
          <div style={{ padding:'10px 12px', borderRadius:9, background:'rgba(244,63,94,.07)', border:'1px solid rgba(244,63,94,.2)', fontSize:12, color:'rgba(255,255,255,.55)', lineHeight:1.65, marginBottom:16 }}>
            Payout will be rejected. Escrow remains locked until dispute resolution or manual admin action.
          </div>
        )}

        {/* Resolution note */}
        <div style={{ marginBottom:20 }}>
          <label style={{ display:'block', fontSize:11, color:'rgba(255,255,255,.38)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:5 }}>Resolution Note (Required)</label>
          <textarea className="rm-input" rows={3} value={note} onChange={e => setNote(e.target.value)} style={{ resize:'vertical' }} placeholder="Explain the basis for this admin action..."/>
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ padding:'10px 20px', borderRadius:9, border:'1.5px solid rgba(255,255,255,.1)', background:'transparent', color:'rgba(255,255,255,.5)', cursor:'pointer', fontFamily:'inherit', fontSize:14 }}>Cancel</button>
          <button onClick={submit} disabled={saving || !note.trim()} style={{ flex:1, padding:'10px', borderRadius:9, border:'none', background: action==='release' ? '#14b8a6' : '#f43f5e', color: action==='release' ? '#07111d' : '#fff', fontWeight:700, cursor: saving ? 'wait' : 'pointer', fontFamily:'inherit', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity: saving || !note.trim() ? .6 : 1 }}>
            {saving && <svg style={{ animation:'rm-spin .7s linear infinite' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>}
            {saving ? 'Processing...' : action === 'release' ? 'Release Payment' : 'Reject Payout'}
          </button>
        </div>
        <style>{`@keyframes rm-spin { to { transform:rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}

//  Payout Queue Panel 
function PayoutQueuePanel({ payouts, payoutFilter, setPayoutFilter, setPayouts, onRefresh }) {
  const [releasing,  setReleasing]  = useState(null)
  const [allPayouts, setAllPayouts] = useState([])
  const [listLoading, setListLoading] = useState(false)

  // Load ALL statuses once for accurate stats tiles
  const loadAll = useCallback(async () => {
    try {
      const [pending, released, rejected] = await Promise.all([
        api.get('/milestones/payouts?status=PENDING_REVIEW'),
        api.get('/milestones/payouts?status=RELEASED'),
        api.get('/milestones/payouts?status=REJECTED'),
      ])
      const all = [
        ...(Array.isArray(pending.data)  ? pending.data  : []),
        ...(Array.isArray(released.data) ? released.data : []),
        ...(Array.isArray(rejected.data) ? rejected.data : []),
      ]
      setAllPayouts(all)
      // Also update the parent payouts for the current filter
      const current = all.filter(p => p.status === payoutFilter)
      setPayouts(current)
    } catch {}
  }, [payoutFilter, setPayouts])

  useEffect(() => { loadAll() }, [])

  const reload = (status) => {
    const s = status || payoutFilter
    setPayoutFilter(s)
    setListLoading(true)
    api.get('/milestones/payouts?status=' + s)
      .then(r => {
        const fresh = Array.isArray(r.data) ? r.data : []
        setPayouts(fresh)
        // Update allPayouts for that status
        setAllPayouts(prev => {
          const others = prev.filter(p => p.status !== s)
          return [...others, ...fresh]
        })
      })
      .catch(() => {})
      .finally(() => setListLoading(false))
  }

  // Stats always come from allPayouts (all statuses loaded)
  const statsSource = allPayouts.length > 0 ? allPayouts : payouts
  const filtered = payouts.filter(p => p.status === payoutFilter)
  const pendingCount = statsSource.filter(p => p.status === 'PENDING_REVIEW').length

  const FILTERS = [
    { id:'PENDING_REVIEW', label:'Pending Review', color:'#fb923c' },
    { id:'RELEASED',       label:'Released',       color:'#34d399' },
    { id:'REJECTED',       label:'Rejected',       color:'#f43f5e' },
  ]

  const fmtRs = v => 'Rs.' + Number(v||0).toLocaleString('en-IN', { minimumFractionDigits:0 })

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:700, color:'#f8fafc', margin:0, letterSpacing:'-.3px' }}>
            Manage Payments
            {pendingCount > 0 && (
              <span style={{ marginLeft:12, fontSize:13, fontWeight:700, padding:'2px 10px', borderRadius:100, background:'rgba(251,146,60,.15)', color:'#fb923c', border:'1px solid rgba(251,146,60,.3)' }}>
                {pendingCount} pending
              </span>
            )}
          </h2>
          <p style={{ fontSize:13, color:'rgba(255,255,255,.4)', margin:'4px 0 0' }}>Review milestone submissions and release freelancer payments</p>
        </div>
        <button onClick={() => reload(payoutFilter)} style={{ padding:'8px 14px', borderRadius:9, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.6)', fontSize:13, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh
        </button>
      </div>

      {/* Stats strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
        {FILTERS.map(f => {
          const cnt = statsSource.filter(p => p.status === f.id).length
          const amt = statsSource.filter(p => p.status === f.id).reduce((s,p) => s + Number(p.netAmount||0), 0)
          return (
            <div key={f.id} onClick={() => reload(f.id)}
              style={{ padding:'12px 14px', borderRadius:11, background: payoutFilter===f.id ? `${f.color}12` : 'rgba(255,255,255,.04)', border:`1px solid ${payoutFilter===f.id ? f.color+'40' : 'rgba(255,255,255,.08)'}`, cursor:'pointer', transition:'all .18s' }}>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>{f.label}</div>
              <div style={{ fontSize:22, fontWeight:800, color:f.color }}>{cnt}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginTop:2 }}>{fmtRs(amt)} net</div>
            </div>
          )
        })}
      </div>

      {/* Table */}
      {listLoading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[1,2,3].map(i => <div key={i} style={{ height:90, borderRadius:12, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.06)', animation:'pulse 1.5s ease-in-out infinite' }}/>)}
          <style>{'@keyframes pulse{0%,100%{opacity:.3}50%{opacity:.7}}'}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding:'48px 32px', textAlign:'center', background:'rgba(255,255,255,.03)', borderRadius:14, border:'1px solid rgba(255,255,255,.07)' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" strokeLinecap="round" style={{ display:'block', margin:'0 auto 12px' }}>
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          <div style={{ fontSize:14, color:'rgba(255,255,255,.4)' }}>No {payoutFilter.replace('_',' ').toLowerCase()} payouts</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.map(p => {
            const gross = Number(p.grossAmount || 0)
            const fee   = Number(p.platformFee || 0)
            const net   = Number(p.netAmount   || 0)
            const isPending = p.status === 'PENDING_REVIEW'

            return (
              <div key={p.id} style={{ background:'rgba(255,255,255,.04)', border:`1px solid ${isPending ? 'rgba(251,146,60,.2)' : 'rgba(255,255,255,.08)'}`, borderRadius:13, padding:'18px 20px', borderLeft:`3px solid ${isPending ? '#fb923c' : p.status==='RELEASED' ? '#34d399' : '#f43f5e'}` }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>

                  {/* Left: milestone info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:6 }}>
                      <span style={{ fontSize:15, fontWeight:700, color:'#f8fafc' }}>{p.milestone?.title}</span>
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:100,
                        background: isPending ? 'rgba(251,146,60,.12)' : p.status==='RELEASED' ? 'rgba(52,211,153,.12)' : 'rgba(244,63,94,.12)',
                        color: isPending ? '#fb923c' : p.status==='RELEASED' ? '#34d399' : '#f43f5e',
                        border: `1px solid ${isPending ? 'rgba(251,146,60,.3)' : p.status==='RELEASED' ? 'rgba(52,211,153,.3)' : 'rgba(244,63,94,.3)'}` }}>
                        {isPending ? 'Awaiting Release' : p.status}
                      </span>
                    </div>

                    <div style={{ fontSize:13, color:'rgba(255,255,255,.5)', marginBottom:8 }}>
                      {p.job?.title} &mdash; Freelancer: <strong style={{ color:'#e2e8f0' }}>{p.freelancer?.name}</strong>
                    </div>

                    {/* Fee breakdown */}
                    <div style={{ display:'flex', gap:20, flexWrap:'wrap', fontSize:13 }}>
                      <div style={{ padding:'6px 12px', borderRadius:8, background:'rgba(251,191,36,.08)', border:'1px solid rgba(251,191,36,.2)' }}>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,.35)', marginBottom:2 }}>GROSS</div>
                        <div style={{ fontWeight:700, color:'#fbbf24' }}>{fmtRs(gross)}</div>
                      </div>
                      <div style={{ padding:'6px 12px', borderRadius:8, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)' }}>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,.35)', marginBottom:2 }}>FEE (2%)</div>
                        <div style={{ fontWeight:700, color:'rgba(255,255,255,.65)' }}>{fmtRs(fee)}</div>
                      </div>
                      <div style={{ padding:'6px 12px', borderRadius:8, background:'rgba(52,211,153,.08)', border:'1px solid rgba(52,211,153,.2)' }}>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,.35)', marginBottom:2 }}>FREELANCER GETS</div>
                        <div style={{ fontWeight:700, color:'#34d399' }}>{fmtRs(net)}</div>
                      </div>
                    </div>

                    {/* Submission note */}
                    {p.milestone?.submissionNote && (
                      <div style={{ marginTop:10, padding:'7px 11px', borderRadius:8, background:'rgba(129,140,248,.06)', border:'1px solid rgba(129,140,248,.2)', fontSize:12, color:'rgba(255,255,255,.55)', fontStyle:'italic' }}>
                        "{p.milestone.submissionNote}"
                      </div>
                    )}

                    {/* Admin note (released/rejected) */}
                    {p.adminNote && (
                      <div style={{ marginTop:6, fontSize:12, color:'rgba(255,255,255,.4)' }}>
                        Admin note: {p.adminNote}
                      </div>
                    )}

                    {/* Dates */}
                    <div style={{ display:'flex', gap:14, marginTop:8, fontSize:11, color:'rgba(255,255,255,.3)' }}>
                      {p.milestone?.clientApprovedAt && <span>Client approved: {fmtDate(p.milestone.clientApprovedAt)}</span>}
                      {p.reviewedAt && <span>Admin actioned: {fmtDate(p.reviewedAt)}</span>}
                    </div>
                  </div>

                  {/* Right: action */}
                  {isPending && (
                    <button onClick={() => setReleasing(p)} style={{ padding:'10px 22px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#14b8a6,#0d9488)', color:'#07111d', fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:8, flexShrink:0, boxShadow:'0 4px 14px rgba(20,184,166,.25)', transition:'all .18s' }}
                      onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'}
                      onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      Release Payment
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Release Modal */}
      {releasing && (
        <ReleaseModal
          payout={releasing}
          onClose={() => setReleasing(null)}
          onDone={() => { setReleasing(null); loadAll(); onRefresh() }}
        />
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [tab,    setTab]    = useState('overview')
  const [stats,  setStats]  = useState(null)
  const [data,   setData]   = useState([])
  const [total,  setTotal]  = useState(0)
  const [page,   setPage]   = useState(1)
  const [loading,setLoading]= useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [escrowModal, setEscrowModal] = useState(null)
  const [payouts, setPayouts]  = useState([])
  const [payoutFilter, setPayoutFilter] = useState('PENDING_REVIEW')
  const [processingPayout, setProcessingPayout] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)
  const pollRef = useRef(null)

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== 'ADMIN') navigate('/dashboard')
  }, [user, navigate])

  // Fetch stats (polled every 30s)
  const fetchStats = useCallback(async () => {
    try {
      const { data: s } = await api.get('/admin/stats')
      setStats(s)
      setLastRefresh(new Date())
    } catch {}
  }, [])

  useEffect(() => {
    fetchStats()
    pollRef.current = setInterval(fetchStats, 30000)
    return () => clearInterval(pollRef.current)
  }, [fetchStats])

  // Fetch tab-specific data
  const fetchData = useCallback(async () => {
    if (tab === 'overview') return
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 25 })
      if (search) params.set('search', search)
      if (filter) params.set(tab === 'users' ? 'role' : tab === 'escrow' ? 'status' : tab === 'disputes' ? 'status' : 'type', filter)
      if (tab === 'payouts') {
        const { data: pRes } = await api.get('/milestones/payouts?status=' + payoutFilter)
        setPayouts(Array.isArray(pRes) ? pRes : [])
        setLoading(false)
        return
      }
      // Also load pending payout count when on escrow tab for the alert badge
      if (tab === 'escrow') {
        api.get('/milestones/payouts?status=PENDING_REVIEW')
          .then(r => setPayouts(Array.isArray(r.data) ? r.data : []))
          .catch(() => {})
      }
      const url = `/admin/${tab === 'escrow' ? 'escrows' : tab}?${params}`
      const { data: res } = await api.get(url)
      const key = tab === 'escrow' ? 'escrows' : tab === 'logs' ? 'logs' : tab
      setData(res[key] || [])
      setTotal(res.total || 0)
    } catch (err) { toast.error(errMsg(err)) }
    finally { setLoading(false) }
  }, [tab, page, search, filter])

  useEffect(() => { fetchData() }, [fetchData])

  // Login-as for role switching
  const loginAs = async (role) => {
    try {
      const { data: res } = await api.post('/auth/admin/login-as', { targetRole: role })
      localStorage.setItem('tw_token', res.token)
      localStorage.setItem('tw_user', JSON.stringify(res.user))
      login(res.token, res.user)
      toast.success('Switched to ' + res.user.name)
      window.location.href = role === 'ADMIN' ? '/admin/dashboard' : '/dashboard'
    } catch (err) { toast.error(errMsg(err)) }
  }

  // Suspend/unsuspend user
  const toggleSuspend = async (userId, suspended, name) => {
    const reason = suspended ? undefined : prompt(`Reason for suspending ${name}?`)
    if (!suspended && !reason) return
    try {
      const url = `/admin/users/${userId}/${suspended ? 'unsuspend' : 'suspend'}`
      await api.post(url, { reason })
      toast.success(suspended ? `${name} reinstated` : `${name} suspended`)
      fetchData()
    } catch (err) { toast.error(errMsg(err)) }
  }

  const LIMIT = 25
  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", color:'#f8fafc', minHeight:'100vh', background:'#07111d' }}>
      <style>{css}</style>

      {/* Top bar */}
      <div style={{ background:'rgba(255,255,255,.03)', borderBottom:'1px solid rgba(255,255,255,.08)', padding:'12px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, position:'sticky', top:0, zIndex:50, backdropFilter:'blur(14px)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:32, height:32, background:'linear-gradient(135deg,#fb923c,#ea580c)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#07111d" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'#f8fafc' }}>TrustWork Admin</div>
            {lastRefresh && <div style={{ fontSize:10, color:'rgba(255,255,255,.28)' }}>Last refresh: {lastRefresh.toLocaleTimeString()}</div>}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {/* Role switcher */}
          {[['CLIENT','#14b8a6'],['FREELANCER','#818cf8']].map(([r, c]) => (
            <button key={r} type="button" onClick={() => loginAs(r)}
              style={{ padding:'5px 12px', borderRadius:8, border:`1px solid ${c}40`, background:`${c}10`, color:c, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              Test as {r.charAt(0) + r.slice(1).toLowerCase()}
            </button>
          ))}
          <button type="button" onClick={fetchStats}
            style={{ padding:'6px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,.1)', background:'rgba(255,255,255,.05)', color:'rgba(255,255,255,.6)', fontSize:11, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:5 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
          <Link to="/dashboard" style={{ padding:'6px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,.1)', background:'rgba(255,255,255,.05)', color:'rgba(255,255,255,.5)', fontSize:11, textDecoration:'none' }}>
            Main Site
          </Link>
        </div>
      </div>

      <div style={{ display:'flex', minHeight:'calc(100vh - 57px)' }}>
        {/* Sidebar tabs */}
        <aside style={{ width:200, flexShrink:0, borderRight:'1px solid rgba(255,255,255,.07)', padding:'16px 8px', background:'rgba(255,255,255,.02)' }}>
          {TABS.map(t => (
            <button key={t.id} type="button" onClick={() => { setTab(t.id); setPage(1); setSearch(''); setFilter('') }}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:9, padding:'9px 12px', borderRadius:9, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, marginBottom:2, transition:'all .18s',
                background:tab===t.id?`${O}15`:'transparent',
                color:tab===t.id?O:'rgba(255,255,255,.45)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={t.icon}/>
              </svg>
              {t.label}
              {t.id==='payouts' && payouts.filter(p => p.status === 'PENDING_REVIEW').length > 0 && (
                <span className="ml-auto px-1.5 text-xs font-bold rounded-full bg-orange-500/20 text-orange-400">
                  {payouts.filter(p => p.status === 'PENDING_REVIEW').length}
                </span>
              )}
              {t.id==='disputes' && stats?.disputes?.open > 0 && (
                <span style={{ marginLeft:'auto', fontSize:10, fontWeight:700, minWidth:16, height:16, borderRadius:100, background:'rgba(244,63,94,.2)', color:'#f43f5e', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px' }}>{stats.disputes.open}</span>
              )}
            </button>
          ))}
        </aside>

        {/* Main content */}
        <main style={{ flex:1, padding:24, overflow:'auto' }}>

          {/*  OVERVIEW  */}
          {tab === 'overview' && (
            <div className="ad-fade">
              <div style={{ fontSize:18, fontWeight:800, color:'#f8fafc', marginBottom:20, letterSpacing:'-.3px' }}>Platform Overview</div>

              {!stats ? (
                <div style={{ color:'rgba(255,255,255,.4)', fontSize:14 }}>Loading stats...</div>
              ) : (
                <>
                  {/* Primary stats grid */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12, marginBottom:20 }}>
                    <StatCard label="Total Users"   value={stats.users.total}      color="#14b8a6" icon="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" />
                    <StatCard label="Total Jobs"    value={stats.jobs.total}       color="#818cf8" icon="M21 13.255A23.931 23.931 0 0 1 12 15c-3.183 0-6.22-.62-9-1.745M16 6l2 2-2 2M8 6l-2 2 2 2" />
                    <StatCard label="Active Jobs"   value={stats.jobs.active}      color="#fbbf24" icon="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <StatCard label="Open Disputes" value={stats.disputes.open}    color="#f43f5e" icon="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <StatCard label="Escrow Locked" value={fmtCurrency(stats.escrow.total)}  color={O} icon="M3 11V7a5 5 0 0 1 10 0v4M5 11h14l1 9H4z" />
                    <StatCard label="Platform Revenue" value={fmtCurrency(stats.revenue.platformFee)} color="#34d399" icon="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </div>

                  {/* Secondary breakdown */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
                    {/* Users */}
                    <div className="ad-card">
                      <div className="ad-sec">User Breakdown</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {[['Clients', stats.users.clients, '#60a5fa'], ['Freelancers', stats.users.freelancers, '#14b8a6']].map(([l, v, c]) => (
                          <div key={l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <span style={{ fontSize:13, color:'rgba(255,255,255,.6)' }}>{l}</span>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <div style={{ width:80, height:5, borderRadius:3, background:'rgba(255,255,255,.07)', overflow:'hidden' }}>
                                <div style={{ height:'100%', width:`${stats.users.total ? (v/stats.users.total)*100 : 0}%`, background:c, borderRadius:3 }}/>
                              </div>
                              <span style={{ fontSize:14, fontWeight:700, color:c, minWidth:30 }}>{v}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Revenue */}
                    <div className="ad-card">
                      <div className="ad-sec">Revenue Summary</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {[
                          ['Total Released', fmtCurrency(stats.revenue.totalReleased), '#f8fafc'],
                          ['Platform Fee (2%)', fmtCurrency(stats.revenue.platformFee), '#34d399'],
                          ['Freelancer Payouts', fmtCurrency(stats.revenue.totalReleased - stats.revenue.platformFee), '#14b8a6'],
                          ['Transactions', stats.revenue.txnCount + ' releases', '#818cf8'],
                        ].map(([l, v, c]) => (
                          <div key={l} style={{ display:'flex', justifyContent:'space-between' }}>
                            <span style={{ fontSize:12, color:'rgba(255,255,255,.45)' }}>{l}</span>
                            <span style={{ fontSize:13, fontWeight:600, color:c }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recent users + jobs */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                    <div className="ad-card">
                      <div className="ad-sec">Recent Users</div>
                      {stats.recentUsers.map(u => (
                        <div key={u.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
                          <div>
                            <div style={{ fontSize:13, fontWeight:500, color: u.suspended ? '#fb7185' : '#e2e8f0' }}>{u.name}{u.suspended && ' (suspended)'}</div>
                            <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginTop:1 }}>{fmtRelative(u.createdAt)}</div>
                          </div>
                          <StatusPill status={u.role} />
                        </div>
                      ))}
                    </div>
                    <div className="ad-card">
                      <div className="ad-sec">Recent Jobs</div>
                      {stats.recentJobs.map(j => (
                        <div key={j.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:500, color:'#e2e8f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:160 }}>{j.title}</div>
                            <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginTop:1 }}>{j.client?.name} &middot; {fmtCurrency(j.budget)}</div>
                          </div>
                          <StatusPill status={j.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/*  USERS  */}
          {tab === 'users' && (
            <div className="ad-fade">
              <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
                <input className="ad-input" placeholder="Search by name, email, phone..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ flex:1, minWidth:200 }} />
                <select className="ad-input" value={filter} onChange={e => { setFilter(e.target.value); setPage(1) }} style={{ width:'auto', paddingRight:32, cursor:'pointer' }}>
                  <option value="">All roles</option>
                  <option value="CLIENT">Client</option>
                  <option value="FREELANCER">Freelancer</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="ad-card" style={{ padding:0, overflow:'hidden' }}>
                <table className="ad-table">
                  <thead><tr>
                    {['Name','Role','Phone/Email','Jobs','Status','Joined','Actions'].map(h => <th key={h} className="ad-th" style={{ textAlign:'left' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {loading ? <tr><td colSpan={7} className="ad-td" style={{ textAlign:'center', color:'rgba(255,255,255,.35)' }}>Loading...</td></tr>
                    : data.map(u => (
                      <tr key={u.id} className="ad-tr">
                        <td className="ad-td">
                          <div style={{ fontWeight:600, color: u.suspended ? '#fb7185' : '#f8fafc' }}>{u.name}</div>
                          <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', fontFamily:'monospace' }}>{u.userId}</div>
                        </td>
                        <td className="ad-td"><StatusPill status={u.role} /></td>
                        <td className="ad-td">
                          <div style={{ color:'rgba(255,255,255,.7)' }}>{u.phone}</div>
                          {u.email && <div style={{ fontSize:11, color:'rgba(255,255,255,.35)' }}>{u.email}</div>}
                        </td>
                        <td className="ad-td" style={{ color:'rgba(255,255,255,.6)' }}>
                          {u._count?.clientJobs > 0 && <div>{u._count.clientJobs} posted</div>}
                          {u._count?.freelancerJobs > 0 && <div>{u._count.freelancerJobs} done</div>}
                        </td>
                        <td className="ad-td">
                          {u.suspended
                            ? <span style={{ fontSize:11, color:'#fb7185' }}>Suspended</span>
                            : <span style={{ fontSize:11, color:'#34d399' }}>Active</span>}
                        </td>
                        <td className="ad-td" style={{ color:'rgba(255,255,255,.4)', fontSize:11 }}>{fmtDate(u.createdAt)}</td>
                        <td className="ad-td">
                          {u.role !== 'ADMIN' && (
                            <button className="ad-btn" type="button"
                              onClick={() => toggleSuspend(u.id, u.suspended, u.name)}
                              style={{ background: u.suspended ? 'rgba(52,211,153,.12)' : 'rgba(244,63,94,.12)', color: u.suspended ? '#34d399' : '#f43f5e', border:`1px solid ${u.suspended ? 'rgba(52,211,153,.3)' : 'rgba(244,63,94,.3)'}` }}>
                              {u.suspended ? 'Reinstate' : 'Suspend'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/*  JOBS  */}
          {tab === 'jobs' && (
            <div className="ad-fade">
              <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
                <input className="ad-input" placeholder="Search job title..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ flex:1 }} />
                <select className="ad-input" value={filter} onChange={e => { setFilter(e.target.value); setPage(1) }} style={{ width:'auto', paddingRight:32, cursor:'pointer' }}>
                  <option value="">All statuses</option>
                  {['CREATED','ASSIGNED','FUNDED','IN_PROGRESS','SUBMITTED','COMPLETED','DISPUTED','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="ad-card" style={{ padding:0, overflow:'hidden' }}>
                <table className="ad-table">
                  <thead><tr>
                    {['Title','Client','Freelancer','Budget','Status','Agreement','Escrow'].map(h => <th key={h} className="ad-th" style={{ textAlign:'left' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {loading ? <tr><td colSpan={7} className="ad-td" style={{ textAlign:'center', color:'rgba(255,255,255,.35)' }}>Loading...</td></tr>
                    : data.map(j => (
                      <tr key={j.id} className="ad-tr">
                        <td className="ad-td">
                          <Link to={`/jobs/${j.id}`} style={{ color:'#f8fafc', textDecoration:'none', fontWeight:600 }}>{j.title.length > 28 ? j.title.slice(0,28)+'...' : j.title}</Link>
                        </td>
                        <td className="ad-td" style={{ color:'rgba(255,255,255,.6)' }}>{j.client?.name}</td>
                        <td className="ad-td" style={{ color:'rgba(255,255,255,.6)' }}>{j.freelancer?.name || '--'}</td>
                        <td className="ad-td" style={{ color:'#fbbf24', fontWeight:600 }}>{fmtCurrency(j.budget)}</td>
                        <td className="ad-td"><StatusPill status={j.status} /></td>
                        <td className="ad-td">{j.agreement ? <StatusPill status={j.agreement.status} /> : <span style={{ fontSize:11, color:'rgba(255,255,255,.25)' }}>None</span>}</td>
                        <td className="ad-td">
                          {j.escrows?.[0]
                            ? <span style={{ fontSize:12, color: j.escrows[0].status === 'LOCKED' ? '#fbbf24' : '#34d399' }}>{fmtCurrency(j.escrows[0].amount)}<br/><span style={{ fontSize:10, color:'rgba(255,255,255,.35)' }}>{j.escrows[0].status}</span></span>
                            : <span style={{ fontSize:11, color:'rgba(255,255,255,.25)' }}>--</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/*  ESCROW  */}
          {tab === 'escrow' && (
            <div className="ad-fade">
              {/* Pending payment alert */}
              {payouts.filter(p => p.status === 'PENDING_REVIEW').length > 0 && (
                <div style={{ padding:'12px 16px', borderRadius:11, background:'rgba(251,146,60,.07)', border:'1px solid rgba(251,146,60,.25)', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
                  <div style={{ fontSize:13, color:'#fb923c', fontWeight:600 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight:6, verticalAlign:'middle' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {payouts.filter(p => p.status === 'PENDING_REVIEW').length} milestone payment{payouts.filter(p => p.status === 'PENDING_REVIEW').length!==1?'s':''} awaiting release  click a job's Manage button to release per-milestone
                  </div>
                  <button type="button" onClick={() => { setTab('payouts'); setPayoutFilter('PENDING_REVIEW'); api.get('/milestones/payouts?status=PENDING_REVIEW').then(r => setPayouts(Array.isArray(r.data) ? r.data : [])).catch(() => {}) }}
                    style={{ fontSize:12, fontWeight:700, padding:'5px 14px', borderRadius:8, background:'rgba(251,146,60,.15)', border:'1px solid rgba(251,146,60,.3)', color:'#fb923c', cursor:'pointer', fontFamily:'inherit' }}>
                    View Payout Queue
                  </button>
                </div>
              )}
              <div style={{ display:'flex', gap:10, marginBottom:16 }}>
                <select className="ad-input" value={filter} onChange={e => { setFilter(e.target.value); setPage(1) }} style={{ width:'auto', paddingRight:32, cursor:'pointer' }}>
                  <option value="">All statuses</option>
                  <option value="LOCKED">Locked</option>
                  <option value="RELEASED">Released</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
              </div>
              <div className="ad-card" style={{ padding:0, overflow:'hidden' }}>
                <table className="ad-table">
                  <thead><tr>
                    {['Job','Client','Freelancer','Gross','Fee','Net','Status','Actions'].map(h => <th key={h} className="ad-th" style={{ textAlign:'left' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {loading ? <tr><td colSpan={8} className="ad-td" style={{ textAlign:'center', color:'rgba(255,255,255,.35)' }}>Loading...</td></tr>
                    : data.map(e => (
                      <tr key={e.id} className="ad-tr">
                        <td className="ad-td">
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <Link to={`/jobs/${e.jobId}`} style={{ color:'#f8fafc', textDecoration:'none', fontWeight:600 }}>{e.job?.title?.slice(0,24) || e.jobId.slice(0,8)}</Link>
                            {e.job?.milestones?.length > 0 && (
                              <span style={{ fontSize:10, fontWeight:800, padding:'1px 7px', borderRadius:100, background:'rgba(251,146,60,.15)', color:'#fb923c', border:'1px solid rgba(251,146,60,.3)', flexShrink:0 }}>
                                {e.job.milestones.length} payout{e.job.milestones.length!==1?'s':''}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="ad-td" style={{ color:'rgba(255,255,255,.6)', fontSize:12 }}>{e.job?.client?.name}</td>
                        <td className="ad-td" style={{ color:'rgba(255,255,255,.6)', fontSize:12 }}>{e.job?.freelancer?.name || '--'}</td>
                        <td className="ad-td" style={{ color:'#fbbf24', fontWeight:600 }}>{fmtCurrency(e.amount)}</td>
                        <td className="ad-td" style={{ color:'#34d399', fontSize:12 }}>{e.platformFee ? fmtCurrency(e.platformFee) : '--'}</td>
                        <td className="ad-td" style={{ color:'#14b8a6', fontWeight:600 }}>{e.netAmount ? fmtCurrency(e.netAmount) : '--'}</td>
                        <td className="ad-td"><StatusPill status={e.status} /></td>
                        <td className="ad-td">
                          {e.status === 'LOCKED' && (
                            <button className="ad-btn" type="button" onClick={() => setEscrowModal(e)}
                              style={{ background:`${O}15`, color:O, border:`1px solid ${O}35` }}>
                              Manage
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/*  DISPUTES  */}
          {tab === 'disputes' && (
            <div className="ad-fade">
              <div style={{ display:'flex', gap:10, marginBottom:16 }}>
                <select className="ad-input" value={filter} onChange={e => { setFilter(e.target.value); setPage(1) }} style={{ width:'auto', paddingRight:32, cursor:'pointer' }}>
                  <option value="">All disputes</option>
                  <option value="OPEN">Open</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {loading ? <div style={{ color:'rgba(255,255,255,.4)', fontSize:14 }}>Loading...</div>
                : data.map(d => (
                  <div key={d.id} className="ad-card" style={{ borderLeft:`3px solid ${d.status==='OPEN'?'#f43f5e':'#34d399'}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:5, flexWrap:'wrap' }}>
                          <Link to={`/jobs/${d.jobId}`} style={{ fontSize:15, fontWeight:700, color:'#f8fafc', textDecoration:'none' }}>{d.job?.title}</Link>
                          <StatusPill status={d.status} />
                        </div>
                        <div style={{ fontSize:13, color:'rgba(255,255,255,.6)', marginBottom:6 }}>{d.reason}</div>
                        <div style={{ display:'flex', gap:16, fontSize:12, color:'rgba(255,255,255,.38)', flexWrap:'wrap' }}>
                          <span>Raised by <strong style={{ color:'rgba(255,255,255,.6)' }}>{d.raisedBy?.name}</strong></span>
                          <span>Budget: <strong style={{ color:'#fbbf24' }}>{fmtCurrency(d.job?.budget)}</strong></span>
                          <span>Escrow: <strong style={{ color: d.job?.escrows?.[0]?.status==='LOCKED'?'#fbbf24':'#94a3b8' }}>{d.job?.escrows?.[0]?.status || 'None'}</strong></span>
                          {d.job?.agreement && <span>Agreement: <strong style={{ color: d.job.agreement.agreedAt?'#34d399':'#fbbf24' }}>{d.job.agreement.agreedAt?'Signed':'Unsigned'}</strong></span>}
                          <span>{fmtRelative(d.createdAt)}</span>
                        </div>
                        {d.resolution && <div style={{ marginTop:8, padding:'8px 12px', borderRadius:8, background:'rgba(52,211,153,.06)', border:'1px solid rgba(52,211,153,.15)', fontSize:12, color:'rgba(255,255,255,.65)' }}><strong style={{ color:'#34d399' }}>Resolution:</strong> {d.resolution}</div>}
                      </div>
                      {d.status === 'OPEN' && (
                        <Link to="/disputes" style={{ padding:'7px 14px', borderRadius:9, background:'rgba(244,63,94,.12)', border:'1px solid rgba(244,63,94,.3)', color:'#f43f5e', textDecoration:'none', fontSize:12, fontWeight:700, flexShrink:0 }}>
                          Resolve
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/*  TRANSACTIONS  */}
          {tab === 'transactions' && (
            <div className="ad-fade">
              <div style={{ display:'flex', gap:10, marginBottom:16 }}>
                <select className="ad-input" value={filter} onChange={e => { setFilter(e.target.value); setPage(1) }} style={{ width:'auto', paddingRight:32, cursor:'pointer' }}>
                  <option value="">All types</option>
                  <option value="DEPOSIT">Deposit</option>
                  <option value="RELEASE">Release</option>
                  <option value="REFUND">Refund</option>
                </select>
              </div>
              <div className="ad-card" style={{ padding:0, overflow:'hidden' }}>
                <table className="ad-table">
                  <thead><tr>
                    {['User','Type','Gross','Fee','Net','Status','Note','Date'].map(h => <th key={h} className="ad-th" style={{ textAlign:'left' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {loading ? <tr><td colSpan={8} className="ad-td" style={{ textAlign:'center', color:'rgba(255,255,255,.35)' }}>Loading...</td></tr>
                    : data.map(t => (
                      <tr key={t.id} className="ad-tr">
                        <td className="ad-td">
                          <div style={{ fontWeight:500, color:'#e2e8f0' }}>{t.user?.name}</div>
                          <StatusPill status={t.user?.role} />
                        </td>
                        <td className="ad-td"><StatusPill status={t.type} /></td>
                        <td className="ad-td" style={{ color:'#fbbf24', fontWeight:600 }}>{fmtCurrency(t.amount)}</td>
                        <td className="ad-td" style={{ color:'#34d399', fontSize:12 }}>{t.platformFee ? fmtCurrency(t.platformFee) : '--'}</td>
                        <td className="ad-td" style={{ color:'#14b8a6', fontWeight:600 }}>{t.netAmount ? fmtCurrency(t.netAmount) : '--'}</td>
                        <td className="ad-td"><StatusPill status={t.status} /></td>
                        <td className="ad-td" style={{ fontSize:11, color:'rgba(255,255,255,.4)', maxWidth:160 }}>{t.description?.slice(0,50) || '--'}</td>
                        <td className="ad-td" style={{ fontSize:11, color:'rgba(255,255,255,.35)', whiteSpace:'nowrap' }}>{fmtRelative(t.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/*  AUDIT LOG  */}

          {/* Payout Queue  per-milestone release management */}
          {tab === 'payouts' && (
            <PayoutQueuePanel
              payouts={payouts}
              payoutFilter={payoutFilter}
              setPayoutFilter={setPayoutFilter}
              setPayouts={setPayouts}
              onRefresh={() => { fetchData(); fetchStats() }}
            />
          )}

          {tab === 'logs' && (
            <div className="ad-fade">
              <div className="ad-card" style={{ padding:0, overflow:'hidden' }}>
                <table className="ad-table">
                  <thead><tr>
                    {['Admin','Action','Target','Note','When'].map(h => <th key={h} className="ad-th" style={{ textAlign:'left' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {loading ? <tr><td colSpan={5} className="ad-td" style={{ textAlign:'center', color:'rgba(255,255,255,.35)' }}>Loading...</td></tr>
                    : data.map(l => (
                      <tr key={l.id} className="ad-tr">
                        <td className="ad-td" style={{ fontWeight:500, color:'#e2e8f0' }}>{l.admin?.name}</td>
                        <td className="ad-td"><span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:6, background:`${O}15`, color:O }}>{l.action}</span></td>
                        <td className="ad-td" style={{ fontSize:11, color:'rgba(255,255,255,.45)' }}>{l.target} {l.targetId?.slice(0,8)}</td>
                        <td className="ad-td" style={{ fontSize:12, color:'rgba(255,255,255,.55)', maxWidth:200 }}>{l.note || '--'}</td>
                        <td className="ad-td" style={{ fontSize:11, color:'rgba(255,255,255,.35)', whiteSpace:'nowrap' }}>{fmtRelative(l.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {tab !== 'overview' && tab !== 'payouts' && totalPages > 1 && (
            <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:20 }}>
              <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                style={{ padding:'6px 14px', borderRadius:8, border:'1px solid rgba(255,255,255,.1)', background:'rgba(255,255,255,.05)', color:page<=1?'rgba(255,255,255,.2)':'rgba(255,255,255,.7)', cursor:page<=1?'not-allowed':'pointer', fontFamily:'inherit', fontSize:13 }}>
                Prev
              </button>
              <span style={{ padding:'6px 12px', fontSize:12, color:'rgba(255,255,255,.45)' }}>
                {page} / {totalPages} ({total} records)
              </span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                style={{ padding:'6px 14px', borderRadius:8, border:'1px solid rgba(255,255,255,.1)', background:'rgba(255,255,255,.05)', color:page>=totalPages?'rgba(255,255,255,.2)':'rgba(255,255,255,.7)', cursor:page>=totalPages?'not-allowed':'pointer', fontFamily:'inherit', fontSize:13 }}>
                Next
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Escrow action modal */}
      {escrowModal && (
        <EscrowActionModal
          escrow={escrowModal}
          onClose={() => setEscrowModal(null)}
          onDone={() => { fetchData(); fetchStats() }}
        />
      )}
    </div>
  )
}
