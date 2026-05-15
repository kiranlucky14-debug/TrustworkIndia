// AgreementsCenter.jsx  
// Agreement Center - lists all agreements for the user with version history,
// PDF download, amendment history, and amendment accept/reject for freelancers.

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { fmtDate, fmtCurrency, fmtRelative, errMsg } from '../utils/helpers'

const STATUS_CFG = {
  DRAFT:              { color:'#94a3b8', bg:'rgba(148,163,184,.12)', label:'Draft'              },
  CLIENT_SIGNED:      { color:'#fbbf24', bg:'rgba(251,191,36,.12)',  label:'Awaiting Freelancer' },
  CHANGES_REQUESTED:  { color:'#fb923c', bg:'rgba(251,146,60,.12)',  label:'Changes Requested'  },
  AMENDMENT_PENDING:  { color:'#818cf8', bg:'rgba(129,140,248,.12)', label:'Amendment Pending'  },
  ACTIVE:             { color:'#34d399', bg:'rgba(52,211,153,.12)',  label:'Active'             },
  COMPLETED:          { color:'#14b8a6', bg:'rgba(20,184,166,.12)',  label:'Completed'          },
}

const css = `
  @keyframes ac-in { from { opacity:0;transform:translateY(6px) } to { opacity:1;transform:translateY(0) } }
  @keyframes ac-spin { to { transform:rotate(360deg) } }
  .ac-fade { animation: ac-in .25s ease both }
  * { box-sizing:border-box }
  .ac-card { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:13px; padding:18px; margin-bottom:12px; transition:border-color .2s }
  .ac-card:hover { border-color:rgba(255,255,255,.14) }
  .ac-sec { font-size:11px; font-weight:700; color:rgba(255,255,255,.3); text-transform:uppercase; letter-spacing:.08em; padding-bottom:7px; margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,.07) }
  .ac-kv { margin-bottom:8px }
  .ac-label { font-size:10px; color:rgba(255,255,255,.35); text-transform:uppercase; letter-spacing:.07em; margin-bottom:3px }
  .ac-val   { font-size:13px; color:#e2e8f0; line-height:1.5 }
  .ac-btn   { padding:7px 14px; border-radius:8px; border:none; font-family:inherit; font-size:12px; font-weight:600; cursor:pointer; transition:all .18s; display:inline-flex; align-items:center; gap:6px }
  .ac-btn:disabled { opacity:.5; cursor:not-allowed }
  .ac-input { width:100%; padding:9px 12px; background:rgba(255,255,255,.05); border:1.5px solid rgba(255,255,255,.1); border-radius:8px; color:#f8fafc; font-size:13px; font-family:inherit; outline:none; transition:all .18s; resize:vertical }
  .ac-input:focus { border-color:#14b8a6; box-shadow:0 0 0 3px rgba(20,184,166,.1) }
  .ac-overlay { position:fixed; inset:0; background:rgba(0,0,0,.78); backdrop-filter:blur(5px); z-index:600; display:flex; align-items:flex-start; justify-content:center; padding:20px 16px; overflow-y:auto }
  .ac-panel   { width:100%; max-width:680px; background:#0a1628; border:1px solid rgba(255,255,255,.1); border-radius:18px; padding:26px; color:#f8fafc; font-family:'DM Sans',system-ui,sans-serif }
`

function Spin({ s=13 }) {
  return <svg style={{ animation:'ac-spin .7s linear infinite', flexShrink:0 }} width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.DRAFT
  return <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.color}30` }}>{cfg.label}</span>
}

//  Version history panel 
function VersionPanel({ jobId, agreementId }) {
  const [versions, setVersions] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    api.get(`/agreements/${jobId}/versions`)
      .then(r => setVersions(r.data.versions || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [jobId])

  if (loading) return <div style={{ fontSize:13, color:'rgba(255,255,255,.35)', padding:'8px 0' }}>Loading history...</div>
  if (!versions.length) return <div style={{ fontSize:13, color:'rgba(255,255,255,.35)', padding:'8px 0' }}>No version history yet.</div>

  return (
    <div>
      {versions.map((v, i) => (
        <div key={v.id} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
          <div style={{ width:26, height:26, borderRadius:'50%', background: v.changeReason?.startsWith('Milestone amendment') ? 'rgba(129,140,248,.15)' : 'rgba(20,184,166,.12)', border:`1px solid ${v.changeReason?.startsWith('Milestone amendment') ? 'rgba(129,140,248,.3)' : 'rgba(20,184,166,.25)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:10, fontWeight:800, color: v.changeReason?.startsWith('Milestone amendment') ? '#818cf8' : '#14b8a6' }}>v{v.version}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#e2e8f0' }}>{v.changeReason || 'Agreement updated'}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginTop:2 }}>
              By {v.changedByUser?.name || 'Unknown'} ({v.changedByUser?.role})
              &middot; {fmtRelative(v.createdAt)}
            </div>
            {v.snapshotJson?.milestonesAgreed?.length > 0 && (
              <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginTop:3 }}>
                {v.snapshotJson.milestonesAgreed.length} milestone{v.snapshotJson.milestonesAgreed.length!==1?'s':''} &middot; Total: {fmtCurrency(v.snapshotJson.milestonesAgreed.reduce((s,m)=>s+Number(m.amount||0),0))}
              </div>
            )}
          </div>
          {i === 0 && <span style={{ fontSize:10, padding:'2px 7px', borderRadius:100, background:'rgba(20,184,166,.12)', color:'#14b8a6', height:'fit-content' }}>Latest</span>}
        </div>
      ))}
    </div>
  )
}

//  Amendment review modal (freelancer) 
function AmendmentModal({ open, agreement, jobId, onClose, onDone }) {
  const [rejectNote, setRejectNote] = useState('')
  const [action, setAction] = useState(null)  // 'accept' | 'reject'
  const [saving, setSaving] = useState(false)

  const milestones = Array.isArray(agreement?.milestonesAgreed) ? agreement.milestonesAgreed : []
  const total      = milestones.reduce((s,m) => s + Number(m.amount||0), 0)
  const amendNote  = agreement?.specialConditions?.replace('[AMENDMENT] ','') || ''

  const handle = async (type) => {
    if (type === 'reject' && !rejectNote.trim()) { toast.error('Please provide rejection reason'); return }
    setSaving(true)
    try {
      const endpoint = type === 'accept' ? 'amendment-accept' : 'amendment-reject'
      const body     = type === 'reject' ? { rejectNote } : {}
      await api.post(`/agreements/${jobId}/${endpoint}`, body)
      toast.success(type === 'accept' ? 'Amendment accepted!' : 'Amendment rejected  previous milestones restored.')
      onDone(); onClose()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setSaving(false) }
  }

  if (!open) return null
  return (
    <div className="ac-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="ac-panel ac-fade">
        <style>{css}</style>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <div style={{ fontSize:11, color:'#818cf8', fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:4 }}>Milestone Amendment</div>
            <div style={{ fontSize:18, fontWeight:700 }}>Review Updated Milestones</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,.4)', cursor:'pointer', display:'flex' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {amendNote && (
          <div style={{ padding:'10px 13px', borderRadius:9, background:'rgba(129,140,248,.07)', border:'1px solid rgba(129,140,248,.2)', fontSize:13, color:'rgba(255,255,255,.65)', marginBottom:14 }}>
            <strong style={{ color:'#818cf8' }}>Amendment reason:</strong> {amendNote}
          </div>
        )}

        <div style={{ marginBottom:16 }}>
          <div className="ac-sec">Updated Milestone Plan</div>
          {milestones.map((m, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,.05)', fontSize:13 }}>
              <div>
                <div style={{ fontWeight:600, color:'#e2e8f0' }}>{i+1}. {m.title||'Untitled'}</div>
                {m.deliverable && <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginTop:2 }}>{m.deliverable}</div>}
                {m.dueDate && <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginTop:2 }}>Due: {m.dueDate}</div>}
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontWeight:700, color:'#14b8a6' }}>{fmtCurrency(m.amount)}</div>
                <div style={{ fontSize:10, color:'#34d399', marginTop:2 }}>Net: {fmtCurrency(Number(m.amount||0) * 0.98)}</div>
              </div>
            </div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', paddingTop:8, fontWeight:700, fontSize:14 }}>
            <span style={{ color:'rgba(255,255,255,.5)' }}>Total</span>
            <span style={{ color:'#14b8a6' }}>{fmtCurrency(total)}</span>
          </div>
        </div>

        {action === 'reject' && (
          <div style={{ marginBottom:14 }}>
            <label style={{ display:'block', fontSize:11, color:'rgba(255,255,255,.38)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:5 }}>Rejection reason *</label>
            <textarea className="ac-input" rows={3} value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Explain why you're rejecting this amendment..."/>
          </div>
        )}

        <div style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginBottom:16, lineHeight:1.6 }}>
          Accepting keeps the agreement ACTIVE with updated milestones. Rejecting restores the previous milestone plan and notifies the client.
        </div>

        <div style={{ display:'flex', gap:8 }}>
          {action === 'reject' ? (
            <>
              <button onClick={() => setAction(null)} className="ac-btn" style={{ background:'transparent', border:'1.5px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.5)' }}>Back</button>
              <button onClick={() => handle('reject')} disabled={saving} className="ac-btn" style={{ flex:1, justifyContent:'center', background:'#f43f5e', color:'#fff' }}>
                {saving && <Spin />}{saving ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setAction('reject')} className="ac-btn" style={{ background:'rgba(244,63,94,.1)', border:'1px solid rgba(244,63,94,.25)', color:'#f43f5e' }}>Reject Amendment</button>
              <button onClick={() => handle('accept')} disabled={saving} className="ac-btn" style={{ flex:1, justifyContent:'center', background:'#34d399', color:'#07111d' }}>
                {saving && <Spin />}{saving ? 'Accepting...' : 'Accept Amendment'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

//  Agreement detail modal 
function AgreementDetailModal({ open, agreement, onClose, onRefresh, user }) {
  const [downloading, setDownloading] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [showAmendment, setShowAmendment] = useState(false)

  if (!open || !agreement) return null

  const ag       = agreement
  const job      = ag.job
  const isFreelancer = user?.id === job?.freelancer?.id
  const isPending    = ag.status === 'AMENDMENT_PENDING'

  const download = async () => {
    setDownloading(true)
    try {
      const token = localStorage.getItem('tw_token')
      const url = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/agreements/' + job.id + '/pdf'
      const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } })
      if (!res.ok) throw new Error('Failed')
      const html  = await res.text()
      const blob  = new Blob([html], { type:'text/html' })
      const bUrl  = URL.createObjectURL(blob)
      window.open(bUrl, '_blank')
    } catch { toast.error('Could not download agreement') }
    finally { setDownloading(false) }
  }

  const milestones = Array.isArray(ag.milestonesAgreed) ? ag.milestonesAgreed : []
  const statusCfg  = STATUS_CFG[ag.status] || STATUS_CFG.DRAFT

  return (
    <div className="ac-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="ac-panel ac-fade" style={{ maxWidth:720 }}>
        <style>{css}</style>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:700, marginBottom:4 }}>{job?.title}</div>
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <StatusBadge status={ag.status} />
              <span style={{ fontSize:11, color:'rgba(255,255,255,.35)' }}>v{ag.version||1}</span>
              {ag.agreedAt && <span style={{ fontSize:11, color:'rgba(255,255,255,.35)' }}>Active since {fmtDate(ag.agreedAt)}</span>}
            </div>
          </div>
          <div style={{ display:'flex', gap:7, flexShrink:0 }}>
            <button onClick={download} disabled={downloading} className="ac-btn" style={{ background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.12)', color:'rgba(255,255,255,.7)' }}>
              {downloading ? <Spin /> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
              Download PDF
            </button>
            <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,.4)', cursor:'pointer', display:'flex' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        {/* Amendment pending banner */}
        {isPending && isFreelancer && (
          <div style={{ padding:'12px 14px', borderRadius:10, background:'rgba(129,140,248,.08)', border:'1px solid rgba(129,140,248,.3)', marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#818cf8', marginBottom:5 }}>Milestone Amendment Pending Your Review</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.55)', marginBottom:10 }}>The client has updated the milestone plan. Review and accept or reject the changes.</div>
            <button onClick={() => setShowAmendment(true)} className="ac-btn" style={{ background:'#818cf8', color:'#07111d' }}>Review Amendment</button>
          </div>
        )}

        {/* Parties */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
          <div style={{ padding:'10px 13px', borderRadius:9, background:'rgba(96,165,250,.06)', border:'1px solid rgba(96,165,250,.15)' }}>
            <div style={{ fontSize:10, color:'#60a5fa', fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:4 }}>Client</div>
            <div style={{ fontSize:14, fontWeight:600 }}>{job?.client?.name}</div>
          </div>
          <div style={{ padding:'10px 13px', borderRadius:9, background:'rgba(20,184,166,.06)', border:'1px solid rgba(20,184,166,.15)' }}>
            <div style={{ fontSize:10, color:'#14b8a6', fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:4 }}>Freelancer</div>
            <div style={{ fontSize:14, fontWeight:600 }}>{job?.freelancer?.name || 'Not assigned'}</div>
          </div>
        </div>

        {/* Scope */}
        {ag.scope && (
          <div style={{ marginBottom:14 }}>
            <div className="ac-sec">Scope of Work</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.65)', lineHeight:1.7, background:'rgba(255,255,255,.03)', padding:'10px 12px', borderRadius:8 }}>{ag.scope}</div>
          </div>
        )}

        {/* Milestones */}
        {milestones.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <div className="ac-sec">Milestone Plan ({milestones.length})</div>
            {milestones.map((m, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,.05)', fontSize:13 }}>
                <div>
                  <div style={{ fontWeight:600, color:'#e2e8f0' }}>{i+1}. {m.title||'Untitled'}</div>
                  {m.deliverable && <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginTop:2 }}>{m.deliverable}</div>}
                  {m.dueDate && <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginTop:2 }}>Due: {m.dueDate}</div>}
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontWeight:700, color:'#14b8a6' }}>{fmtCurrency(m.amount)}</div>
                  <div style={{ fontSize:10, color:'#34d399', marginTop:2 }}>Net {fmtCurrency(Number(m.amount||0)*0.98)}</div>
                </div>
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between', paddingTop:8, fontWeight:700 }}>
              <span style={{ color:'rgba(255,255,255,.5)', fontSize:13 }}>Total</span>
              <span style={{ color:'#14b8a6' }}>{fmtCurrency(milestones.reduce((s,m)=>s+Number(m.amount||0),0))}</span>
            </div>
          </div>
        )}

        {/* Signatures */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
          <div style={{ padding:'10px 13px', borderRadius:9, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)' }}>
            <div className="ac-label">Client Signed</div>
            <div style={{ fontSize:13, fontWeight:600, color: ag.clientSignedAt ? '#34d399' : '#f43f5e' }}>
              {ag.clientSignedAt ? fmtDate(ag.clientSignedAt) : 'Not signed'}
            </div>
          </div>
          <div style={{ padding:'10px 13px', borderRadius:9, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)' }}>
            <div className="ac-label">Freelancer Signed</div>
            <div style={{ fontSize:13, fontWeight:600, color: ag.freelancerSignedAt ? '#34d399' : '#f43f5e' }}>
              {ag.freelancerSignedAt ? fmtDate(ag.freelancerSignedAt) : 'Not signed'}
            </div>
          </div>
        </div>

        {/* Version history toggle */}
        <button onClick={() => setShowVersions(v => !v)}
          style={{ width:'100%', padding:'10px', borderRadius:9, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', color:'rgba(255,255,255,.55)', fontSize:12, fontWeight:600, fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: showVersions ? 0 : 0, transition:'all .18s' }}>
          <span>Version &amp; Amendment History</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: showVersions ? 'rotate(180deg)' : 'none', transition:'transform .2s' }}><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        {showVersions && (
          <div style={{ padding:'12px 14px', background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:'0 0 9px 9px', borderTop:'none' }}>
            <VersionPanel jobId={job?.id} agreementId={ag.id} />
          </div>
        )}

        {/* Amendment modal */}
        <AmendmentModal open={showAmendment} agreement={ag} jobId={job?.id} onClose={() => setShowAmendment(false)} onDone={() => { setShowAmendment(false); onRefresh(); onClose() }} />
      </div>
    </div>
  )
}

//  Main Agreement Center 
export default function AgreementsCenter() {
  const { user }     = useAuth()
  const [agreements, setAgreements] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [selected,   setSelected]   = useState(null)
  const [filter,     setFilter]     = useState('all')

  const fetch = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get('/agreements')
      setAgreements(data.agreements || [])
    } catch (e) { setError(errMsg(e)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const pendingAmendments = agreements.filter(a => a.status === 'AMENDMENT_PENDING').length

  const filtered = filter === 'all'    ? agreements
    : filter === 'active'  ? agreements.filter(a => a.status === 'ACTIVE')
    : filter === 'pending' ? agreements.filter(a => ['CLIENT_SIGNED','AMENDMENT_PENDING'].includes(a.status))
    : agreements.filter(a => a.status === 'COMPLETED')

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", color:'#f8fafc' }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4, letterSpacing:'-.3px' }}>Agreements</h1>
          <p style={{ fontSize:13, color:'rgba(255,255,255,.45)' }}>
            All work agreements, milestone amendments, and version history
            {pendingAmendments > 0 && (
              <span style={{ marginLeft:10, fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:100, background:'rgba(129,140,248,.15)', color:'#818cf8', border:'1px solid rgba(129,140,248,.3)' }}>
                {pendingAmendments} amendment{pendingAmendments>1?'s':''} pending
              </span>
            )}
          </p>
        </div>
        <button onClick={fetch} style={{ padding:'8px 14px', borderRadius:9, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.6)', fontSize:13, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      {agreements.length > 0 && (
        <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', padding:4, borderRadius:12, marginBottom:20, width:'fit-content' }}>
          {[['all','All',agreements.length], ['active','Active',agreements.filter(a=>a.status==='ACTIVE').length], ['pending','Pending',agreements.filter(a=>['CLIENT_SIGNED','AMENDMENT_PENDING'].includes(a.status)).length], ['completed','Completed',agreements.filter(a=>a.status==='COMPLETED').length]].map(([id,l,cnt]) => (
            <button key={id} type="button" onClick={() => setFilter(id)}
              style={{ padding:'6px 14px', borderRadius:9, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, transition:'all .18s', display:'flex', alignItems:'center', gap:5,
                background: filter===id ? '#14b8a6' : 'transparent',
                color: filter===id ? '#07111d' : 'rgba(255,255,255,.45)' }}>
              {l}
              {cnt > 0 && <span style={{ fontSize:10, minWidth:16, height:16, borderRadius:100, display:'flex', alignItems:'center', justifyContent:'center', background: filter===id ? 'rgba(0,0,0,.2)' : 'rgba(255,255,255,.1)', color: filter===id ? '#07111d' : 'rgba(255,255,255,.5)', padding:'0 4px' }}>{cnt}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[1,2,3].map(i => <div key={i} style={{ height:90, borderRadius:12, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.06)', animation:'pulse 1.5s ease-in-out infinite', opacity:.5 }}/>)}
          <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:.7}}`}</style>
        </div>
      ) : error ? (
        <div style={{ padding:'24px', textAlign:'center', background:'rgba(244,63,94,.06)', borderRadius:12, border:'1px solid rgba(244,63,94,.2)' }}>
          <div style={{ fontSize:14, color:'#fb7185', marginBottom:12 }}>{error}</div>
          <button onClick={fetch} style={{ padding:'8px 20px', borderRadius:9, background:'#14b8a6', border:'none', color:'#07111d', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding:'48px 32px', textAlign:'center', background:'rgba(255,255,255,.03)', borderRadius:14, border:'1px solid rgba(255,255,255,.07)' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" strokeLinecap="round" style={{ display:'block', margin:'0 auto 12px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <div style={{ fontSize:14, color:'rgba(255,255,255,.4)' }}>No agreements {filter !== 'all' ? `with status "${filter}"` : 'yet'}</div>
        </div>
      ) : (
        <div className="ac-fade">
          {filtered.map(ag => {
            const cfg    = STATUS_CFG[ag.status] || STATUS_CFG.DRAFT
            const isPendingAmendment = ag.status === 'AMENDMENT_PENDING'
            const milestones = Array.isArray(ag.milestonesAgreed) ? ag.milestonesAgreed : []
            const total  = milestones.reduce((s,m) => s + Number(m.amount||0), 0)
            const isFreelancer = user?.id === ag.job?.freelancer?.id

            return (
              <div key={ag.id} className="ac-card"
                style={{ borderLeft:`3px solid ${isPendingAmendment ? '#818cf8' : cfg.color}`,
                  borderColor: isPendingAmendment ? 'rgba(129,140,248,.25)' : 'rgba(255,255,255,.08)',
                  cursor:'pointer' }}
                onClick={() => setSelected(ag)}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:5 }}>
                      <div style={{ fontSize:15, fontWeight:700, color:'#f8fafc' }}>{ag.job?.title}</div>
                      <StatusBadge status={ag.status} />
                      <span style={{ fontSize:11, color:'rgba(255,255,255,.35)' }}>v{ag.version||1}</span>
                    </div>
                    <div style={{ display:'flex', gap:16, fontSize:12, color:'rgba(255,255,255,.4)', flexWrap:'wrap' }}>
                      <span>Client: <strong style={{ color:'rgba(255,255,255,.65)' }}>{ag.job?.client?.name}</strong></span>
                      <span>Freelancer: <strong style={{ color:'rgba(255,255,255,.65)' }}>{ag.job?.freelancer?.name || 'TBD'}</strong></span>
                      <span>Budget: <strong style={{ color:'#14b8a6' }}>{fmtCurrency(ag.job?.budget)}</strong></span>
                      {milestones.length > 0 && <span>{milestones.length} milestone{milestones.length!==1?'s':''}</span>}
                    </div>
                    {isPendingAmendment && isFreelancer && (
                      <div style={{ marginTop:8, fontSize:12, color:'#818cf8', display:'flex', alignItems:'center', gap:5 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        Click to review and accept or reject the milestone amendment
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    {ag.agreedAt ? (
                      <div style={{ fontSize:11, color:'rgba(255,255,255,.35)' }}>Active since {fmtDate(ag.agreedAt)}</div>
                    ) : ag.clientSignedAt ? (
                      <div style={{ fontSize:11, color:'rgba(255,255,255,.35)' }}>Client signed {fmtDate(ag.clientSignedAt)}</div>
                    ) : null}
                    <div style={{ marginTop:6, display:'flex', gap:8, justifyContent:'flex-end' }}>
                      <Link to={`/jobs/${ag.job?.id}/agreement`} onClick={e => e.stopPropagation()}
                        style={{ fontSize:11, padding:'3px 10px', borderRadius:7, background:'rgba(20,184,166,.1)', border:'1px solid rgba(20,184,166,.25)', color:'#14b8a6', textDecoration:'none' }}>
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <AgreementDetailModal
          open={!!selected}
          agreement={selected}
          onClose={() => setSelected(null)}
          onRefresh={() => { fetch(); setSelected(null) }}
          user={user}
        />
      )}
    </div>
  )
}
