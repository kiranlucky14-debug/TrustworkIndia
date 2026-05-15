// DisputesPage.jsx  Dispute v2 with evidence submission
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { fmtDate, fmtRelative, errMsg } from '../utils/helpers'

const css = `
  @keyframes dp-in { from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)} }
  .dp-fade { animation:dp-in .22s ease both }
  * { box-sizing:border-box }
  .dp-input { width:100%; padding:9px 12px; background:rgba(255,255,255,.06); border:1.5px solid rgba(255,255,255,.1); border-radius:9px; color:#f8fafc; font-size:13px; font-family:inherit; outline:none; resize:vertical; transition:all .18s }
  .dp-input:focus { border-color:#14b8a6; box-shadow:0 0 0 3px rgba(20,184,166,.1) }
  .dp-btn { padding:8px 16px; border-radius:9px; border:none; font-family:inherit; font-size:13px; font-weight:600; cursor:pointer; transition:all .18s; display:inline-flex; align-items:center; gap:6px }
  .dp-overlay { position:fixed; inset:0; background:rgba(0,0,0,.82); backdrop-filter:blur(6px); z-index:700; display:flex; align-items:flex-start; justify-content:center; padding:20px 16px; overflow-y:auto }
  .dp-panel  { width:100%; max-width:640px; background:#080f1f; border:1px solid rgba(255,255,255,.1); border-radius:18px; padding:26px; color:#f8fafc; font-family:'DM Sans',system-ui,sans-serif }
`

function StatusBadge({ status }) {
  const map = {
    OPEN:     { color:'#fb923c', bg:'rgba(251,146,60,.12)',  label:'Open' },
    RESOLVED: { color:'#34d399', bg:'rgba(52,211,153,.12)',  label:'Resolved' },
    ESCALATED:{ color:'#f43f5e', bg:'rgba(244,63,94,.12)',   label:'Escalated' },
  }
  const c = map[status] || map.OPEN
  return <span style={{ fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:100, background:c.bg, color:c.color, border:`1px solid ${c.color}35` }}>{c.label}</span>
}

function EvidencePanel({ dispute, user, onRefresh }) {
  const [type,    setType]    = useState('NOTE')
  const [content, setContent] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [note,    setNote]    = useState('')
  const [resolve, setResolve] = useState(false)
  const [outcome, setOutcome] = useState('RELEASE')
  const [resolution, setResolution] = useState('')
  const [splitPct, setSplitPct] = useState(50)
  const [resolving, setResolving] = useState(false)

  const isAdmin    = user?.role === 'ADMIN'
  const isClient   = user?.id === dispute.job?.clientId
  const isFree     = user?.id === dispute.job?.freelancerId

  const submitEv = async () => {
    if (!content.trim()) { toast.error('Evidence content required'); return }
    setSaving(true)
    try {
      await api.post(`/disputes/${dispute.id}/evidence`, { type, content, fileName: type !== 'NOTE' ? content.slice(0,40) : undefined })
      toast.success('Evidence submitted')
      setContent(''); onRefresh()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setSaving(false) }
  }

  const submitNote = async (side) => {
    setSaving(true)
    try {
      await api.post(`/disputes/${dispute.id}/note`, { note, side })
      toast.success('Note saved'); onRefresh()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setSaving(false) }
  }

  const doResolve = async () => {
    if (!resolution.trim()) { toast.error('Resolution note required'); return }
    setResolving(true)
    try {
      await api.post(`/disputes/${dispute.id}/resolve`, { outcome, resolution, splitPercent: outcome === 'SPLIT' ? splitPct : undefined })
      toast.success('Dispute resolved!'); onRefresh()
    } catch (e) { toast.error(errMsg(e)) }
    finally { setResolving(false) }
  }

  const EVIDENCE_TYPES = ['NOTE', 'LINK', 'SCREENSHOT', 'FILE']

  return (
    <div>
      {/* Evidence list */}
      {dispute.evidence?.length > 0 && (
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:10 }}>Evidence Timeline</div>
          {dispute.evidence.map(ev => (
            <div key={ev.id} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background: ev.role==='CLIENT' ? 'rgba(96,165,250,.15)' : 'rgba(20,184,166,.15)', border:`1px solid ${ev.role==='CLIENT'?'rgba(96,165,250,.3)':'rgba(20,184,166,.3)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:ev.role==='CLIENT'?'#60a5fa':'#14b8a6', flexShrink:0 }}>
                {ev.uploader?.name?.[0]}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:3 }}>
                  <span style={{ fontSize:12, fontWeight:600, color:'#e2e8f0' }}>{ev.uploader?.name}</span>
                  <span style={{ fontSize:10, padding:'1px 6px', borderRadius:100, background:'rgba(255,255,255,.06)', color:'rgba(255,255,255,.45)' }}>{ev.type}</span>
                  <span style={{ fontSize:10, color:'rgba(255,255,255,.3)' }}>{fmtRelative(ev.createdAt)}</span>
                </div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,.65)', lineHeight:1.6 }}>
                  {ev.type === 'LINK' ? (
                    <a href={ev.content} target="_blank" rel="noopener noreferrer" style={{ color:'#14b8a6' }}>{ev.content}</a>
                  ) : ev.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submit evidence */}
      {dispute.status === 'OPEN' && (isClient || isFree) && (
        <div style={{ padding:'14px', borderRadius:11, background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.08)', marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:10 }}>Submit Evidence</div>
          <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap' }}>
            {EVIDENCE_TYPES.map(t => (
              <button key={t} type="button" onClick={() => setType(t)} className="dp-btn"
                style={{ padding:'5px 12px', fontSize:11, background: type===t?'rgba(20,184,166,.15)':'rgba(255,255,255,.05)', border:`1px solid ${type===t?'rgba(20,184,166,.4)':'rgba(255,255,255,.1)'}`, color:type===t?'#14b8a6':'rgba(255,255,255,.5)' }}>
                {t}
              </button>
            ))}
          </div>
          <textarea className="dp-input" rows={3} value={content} onChange={e => setContent(e.target.value)}
            placeholder={type==='NOTE'?'Describe your side of the case...':type==='LINK'?'Paste URL...':'Describe the evidence...'}
            style={{ marginBottom:10 }}/>
          <button onClick={submitEv} disabled={saving} className="dp-btn" style={{ background:'#14b8a6', color:'#07111d', padding:'8px 18px' }}>
            {saving ? 'Submitting...' : 'Submit Evidence'}
          </button>
        </div>
      )}

      {/* Admin resolve */}
      {isAdmin && dispute.status === 'OPEN' && (
        <div style={{ padding:'14px', borderRadius:11, background:'rgba(251,146,60,.05)', border:'1px solid rgba(251,146,60,.2)', marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#fb923c', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:12 }}>Admin  Resolve Dispute</div>
          <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
            {['RELEASE','REFUND','SPLIT'].map(o => (
              <button key={o} type="button" onClick={() => setOutcome(o)} className="dp-btn"
                style={{ padding:'7px 16px', background: outcome===o?'rgba(20,184,166,.15)':'rgba(255,255,255,.05)', border:`1px solid ${outcome===o?'rgba(20,184,166,.4)':'rgba(255,255,255,.1)'}`, color:outcome===o?'#14b8a6':'rgba(255,255,255,.5)', fontSize:12 }}>
                {o}
              </button>
            ))}
          </div>
          {outcome === 'SPLIT' && (
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:'rgba(255,255,255,.38)', display:'block', marginBottom:5 }}>Freelancer gets {splitPct}%  Client gets {100-splitPct}%</label>
              <input type="range" min={10} max={90} value={splitPct} onChange={e => setSplitPct(Number(e.target.value))} style={{ width:'100%', accentColor:'#14b8a6' }}/>
            </div>
          )}
          <textarea className="dp-input" rows={2} value={resolution} onChange={e => setResolution(e.target.value)}
            placeholder="Resolution note (required)..." style={{ marginBottom:10 }}/>
          <button onClick={doResolve} disabled={resolving} className="dp-btn" style={{ background:'#34d399', color:'#07111d', padding:'9px 22px' }}>
            {resolving ? 'Resolving...' : 'Confirm Resolution'}
          </button>
        </div>
      )}
    </div>
  )
}

function DisputeDetailModal({ dispute, open, onClose, user, onRefresh }) {
  if (!open || !dispute) return null
  const job = dispute.job

  return (
    <div className="dp-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="dp-panel dp-fade">
        <style>{css}</style>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
          <div>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:5 }}>
              <StatusBadge status={dispute.status} />
              <span style={{ fontSize:11, color:'rgba(255,255,255,.35)' }}>{fmtDate(dispute.createdAt)}</span>
            </div>
            <h2 style={{ fontSize:18, fontWeight:700, margin:0 }}>{job?.title}</h2>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.45)', marginTop:3 }}>
              {job?.client?.name}  {job?.freelancer?.name}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,.4)', cursor:'pointer', display:'flex' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ padding:'11px 14px', borderRadius:10, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', marginBottom:16 }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginBottom:4 }}>Dispute Reason</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,.7)', lineHeight:1.65 }}>{dispute.reason}</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginTop:5 }}>Raised by {dispute.raisedBy?.name}</div>
        </div>

        {dispute.status === 'RESOLVED' && (
          <div style={{ padding:'11px 14px', borderRadius:10, background:'rgba(52,211,153,.06)', border:'1px solid rgba(52,211,153,.2)', marginBottom:16 }}>
            <div style={{ fontSize:11, color:'#34d399', fontWeight:700, marginBottom:4 }}>Resolved  {dispute.outcome}</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.65)' }}>{dispute.resolution}</div>
          </div>
        )}

        <EvidencePanel dispute={dispute} user={user} onRefresh={() => { onRefresh(); onClose() }} />

        <div style={{ marginTop:14, display:'flex', gap:8 }}>
          <Link to={`/jobs/${job?.id}`} onClick={onClose}
            style={{ padding:'8px 16px', borderRadius:9, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.65)', fontSize:13, textDecoration:'none' }}>
            View Job
          </Link>
          <Link to={`/chat/${job?.id}`} onClick={onClose}
            style={{ padding:'8px 16px', borderRadius:9, background:'rgba(20,184,166,.1)', border:'1px solid rgba(20,184,166,.25)', color:'#14b8a6', fontSize:13, textDecoration:'none', fontWeight:600 }}>
            Open Chat
          </Link>
          <button onClick={onClose} style={{ marginLeft:'auto', padding:'8px 16px', borderRadius:9, border:'1.5px solid rgba(255,255,255,.1)', background:'transparent', color:'rgba(255,255,255,.5)', cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DisputesPage() {
  const { user }     = useAuth()
  const [disputes,   setDisputes]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [selected,   setSelected]   = useState(null)
  const [filter,     setFilter]     = useState('all')

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/disputes')
      setDisputes(Array.isArray(data) ? data : [])
    } catch (e) { toast.error(errMsg(e)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const filtered = filter === 'all' ? disputes
    : disputes.filter(d => d.status === filter.toUpperCase())

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", color:'#f8fafc' }}>
      <style>{css}</style>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4, letterSpacing:'-.3px' }}>Disputes</h1>
          <p style={{ fontSize:13, color:'rgba(255,255,255,.45)', margin:0 }}>Manage disputes and submit evidence for resolution</p>
        </div>
        <button onClick={fetch} style={{ padding:'8px 14px', borderRadius:9, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.6)', fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      {disputes.length > 0 && (
        <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', padding:3, borderRadius:11, marginBottom:18, width:'fit-content' }}>
          {[['all','All',disputes.length],['open','Open',disputes.filter(d=>d.status==='OPEN').length],['resolved','Resolved',disputes.filter(d=>d.status==='RESOLVED').length]].map(([id,l,cnt]) => (
            <button key={id} type="button" onClick={() => setFilter(id)}
              style={{ padding:'6px 14px', borderRadius:9, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:5, background:filter===id?'#14b8a6':'transparent', color:filter===id?'#07111d':'rgba(255,255,255,.45)', transition:'all .18s' }}>
              {l}
              {cnt>0 && <span style={{ fontSize:10, minWidth:16, height:16, borderRadius:100, display:'flex', alignItems:'center', justifyContent:'center', background:filter===id?'rgba(0,0,0,.2)':'rgba(255,255,255,.1)', color:filter===id?'#07111d':'rgba(255,255,255,.5)', padding:'0 4px' }}>{cnt}</span>}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[1,2,3].map(i => <div key={i} style={{ height:80, borderRadius:12, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.06)', animation:'dp-pulse 1.5s ease-in-out infinite' }}/>)}
          <style>{`@keyframes dp-pulse{0%,100%{opacity:.3}50%{opacity:.7}}`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding:'48px 32px', textAlign:'center', background:'rgba(255,255,255,.03)', borderRadius:14, border:'1px solid rgba(255,255,255,.07)' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" strokeLinecap="round" style={{ display:'block', margin:'0 auto 12px' }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <div style={{ fontSize:14, color:'rgba(255,255,255,.4)' }}>No {filter === 'all' ? '' : filter} disputes</div>
        </div>
      ) : (
        <div className="dp-fade" style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.map(d => {
            const evidenceCount = d.evidence?.length || 0
            return (
              <div key={d.id} onClick={() => setSelected(d)}
                style={{ padding:'16px 18px', background:'rgba(255,255,255,.04)', border:`1px solid ${d.status==='OPEN'?'rgba(251,146,60,.2)':'rgba(255,255,255,.08)'}`, borderRadius:13, cursor:'pointer', borderLeft:`3px solid ${d.status==='OPEN'?'#fb923c':'#34d399'}`, transition:'border-color .2s' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6, flexWrap:'wrap' }}>
                      <span style={{ fontSize:14, fontWeight:700, color:'#f8fafc' }}>{d.job?.title}</span>
                      <StatusBadge status={d.status} />
                      {evidenceCount > 0 && <span style={{ fontSize:11, color:'rgba(255,255,255,.45)' }}>{evidenceCount} evidence item{evidenceCount!==1?'s':''}</span>}
                    </div>
                    <div style={{ fontSize:12, color:'rgba(255,255,255,.5)', marginBottom:5 }}>
                      {d.job?.client?.name}  {d.job?.freelancer?.name}
                      <span style={{ marginLeft:10 }}>{fmtRelative(d.createdAt)}</span>
                    </div>
                    <div style={{ fontSize:13, color:'rgba(255,255,255,.65)', lineHeight:1.5 }}>{d.reason?.slice(0,120)}{d.reason?.length>120?'...':''}</div>
                  </div>
                  <div style={{ fontSize:12, fontWeight:600, color:'#14b8a6', display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                    View 
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <DisputeDetailModal dispute={selected} open={!!selected} onClose={() => setSelected(null)} user={user} onRefresh={fetch} />
    </div>
  )
}
