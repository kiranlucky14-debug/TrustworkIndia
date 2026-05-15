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
function EscrowActionModal({ escrow, onClose, onDone }) {
  const [mode,   setMode]   = useState('release')  // release | refund | split
  const [amount, setAmount] = useState(escrow?.job?.budget?.toString() || '')
  const [note,   setNote]   = useState('')
  const [saving, setSaving] = useState(false)

  const gross = parseFloat(amount) || 0
  const fee   = Math.round(gross * 0.02 * 100) / 100
  const net   = Math.round((gross - fee) * 100) / 100
  const refund = Math.round(((escrow?.amount || 0) - gross) * 100) / 100

  const submit = async () => {
    if (!note.trim()) { toast.error('Add a resolution note'); return }
    setSaving(true)
    try {
      const body = { note }
      let url = `/admin/escrows/${escrow.id}/release`
      if (mode === 'refund') url = `/admin/escrows/${escrow.id}/refund`
      if (mode === 'split') { url = `/admin/escrows/${escrow.id}/split`; body.freelancerAmount = gross }
      if (mode === 'release' && gross !== escrow.amount) body.partialAmount = gross
      const { data } = await api.post(url, body)
      toast.success(data.message)
      onDone()
      onClose()
    } catch (err) { toast.error(errMsg(err)) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', backdropFilter:'blur(4px)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width:'100%', maxWidth:500, background:'#0e1c2f', border:'1px solid rgba(255,255,255,.1)', borderRadius:18, padding:28, fontFamily:"'DM Sans',system-ui,sans-serif", color:'#f8fafc' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:3 }}>Escrow Action</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.45)' }}>{escrow?.job?.title} &middot; <strong style={{ color:O }}>{fmtCurrency(escrow?.amount)}</strong></div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'rgba(255,255,255,.4)', cursor:'pointer', fontSize:20 }}>x</button>
        </div>

        {/* Mode selector */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:20 }}>
          {[['release','Release','#34d399'],['refund','Refund','#60a5fa'],['split','Split','#fbbf24']].map(([m, l, c]) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              style={{ padding:'10px', borderRadius:9, border:`1.5px solid ${mode===m ? c : 'rgba(255,255,255,.1)'}`, background:mode===m ? `${c}12` : 'transparent', color:mode===m ? c : 'rgba(255,255,255,.5)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all .18s' }}>
              {l}
            </button>
          ))}
        </div>

        {mode === 'release' && (
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:11, color:'rgba(255,255,255,.38)', textTransform:'uppercase', letterSpacing:'.07em', display:'block', marginBottom:5 }}>Release Amount (Rs.)</label>
            <input className="ad-input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={escrow?.amount} />
            <div style={{ marginTop:8, padding:'8px 12px', borderRadius:8, background:'rgba(255,255,255,.04)', fontSize:12, color:'rgba(255,255,255,.55)' }}>
              Gross: {fmtCurrency(gross)} &nbsp;|&nbsp; Fee (2%): {fmtCurrency(fee)} &nbsp;|&nbsp;
              <span style={{ color:'#34d399', fontWeight:700 }}>Freelancer gets: {fmtCurrency(net)}</span>
            </div>
          </div>
        )}

        {mode === 'refund' && (
          <div style={{ marginBottom:16, padding:'12px', borderRadius:10, background:'rgba(96,165,250,.06)', border:'1px solid rgba(96,165,250,.2)', fontSize:13, color:'rgba(255,255,255,.65)' }}>
            Full amount <strong style={{ color:'#60a5fa' }}>{fmtCurrency(escrow?.amount)}</strong> will be refunded to client.
          </div>
        )}

        {mode === 'split' && (
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:11, color:'rgba(255,255,255,.38)', textTransform:'uppercase', letterSpacing:'.07em', display:'block', marginBottom:5 }}>Freelancer Amount (Rs.)</label>
            <input className="ad-input" type="number" value={amount} onChange={e => setAmount(e.target.value)} max={escrow?.amount} placeholder="Enter amount for freelancer" />
            <div style={{ marginTop:8, padding:'8px 12px', borderRadius:8, background:'rgba(255,255,255,.04)', fontSize:12, color:'rgba(255,255,255,.55)' }}>
              Freelancer: {fmtCurrency(gross)} - fee = <span style={{ color:'#34d399', fontWeight:700 }}>{fmtCurrency(net)}</span>
              &nbsp;|&nbsp; Client refund: <span style={{ color:'#60a5fa', fontWeight:700 }}>{fmtCurrency(refund)}</span>
            </div>
          </div>
        )}

        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:11, color:'rgba(255,255,255,.38)', textTransform:'uppercase', letterSpacing:'.07em', display:'block', marginBottom:5 }}>Resolution Note (required)</label>
          <textarea className="ad-input" rows={3} value={note} onChange={e => setNote(e.target.value)}
            placeholder="Explain the basis for this admin action..." style={{ resize:'vertical' }} />
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button type="button" onClick={onClose} style={{ flex:1, padding:'10px', background:'transparent', border:'1.5px solid rgba(255,255,255,.1)', borderRadius:9, color:'rgba(255,255,255,.5)', cursor:'pointer', fontFamily:'inherit', fontSize:13 }}>Cancel</button>
          <button type="button" onClick={submit} disabled={saving}
            style={{ flex:2, padding:'10px', background:mode==='refund'?'#60a5fa':mode==='split'?'#fbbf24':'#34d399', border:'none', borderRadius:9, color:'#07111d', fontSize:13, fontWeight:700, cursor:saving?'not-allowed':'pointer', opacity:saving?.7:1, fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
            {saving && <Spin/>}
            {saving ? 'Processing...' : mode==='release' ? 'Release Payment' : mode==='refund' ? 'Refund Client' : 'Apply Split'}
          </button>
        </div>
      </div>
    </div>
  )
}

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
                          <Link to={`/jobs/${e.jobId}`} style={{ color:'#f8fafc', textDecoration:'none', fontWeight:600 }}>{e.job?.title?.slice(0,24) || e.jobId.slice(0,8)}</Link>
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

          {/* Payout Queue */}
          {tab === 'payouts' && (
            <div>
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <h2 className="font-display font-semibold text-xl text-white">
                  Payout Review Queue
                  {payouts.filter(p => p.status === 'PENDING_REVIEW').length > 0 && (
                    <span className="ml-3 text-sm font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                      {payouts.filter(p => p.status === 'PENDING_REVIEW').length} pending
                    </span>
                  )}
                </h2>
                <div className="flex gap-2 flex-wrap">
                  {['PENDING_REVIEW','RELEASED','REJECTED'].map(s => (
                    <button key={s} type="button"
                      onClick={() => { setPayoutFilter(s); api.get('/milestones/payouts?status=' + s).then(r => setPayouts(Array.isArray(r.data) ? r.data : [])).catch(() => {}) }}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors"
                      style={{ background: payoutFilter === s ? 'rgba(20,184,166,.15)' : 'rgba(255,255,255,.05)', color: payoutFilter === s ? '#14b8a6' : 'rgba(255,255,255,.45)', borderColor: payoutFilter === s ? 'rgba(20,184,166,.3)' : 'rgba(255,255,255,.1)' }}>
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              {payouts.filter(p => p.status === payoutFilter).length === 0 ? (
                <div className="text-center py-12 text-ink-400">No {payoutFilter.replace('_', ' ').toLowerCase()} payouts</div>
              ) : (
                <div className="space-y-3">
                  {payouts.filter(p => p.status === payoutFilter).map(p => {
                    const gross = Number(p.grossAmount || 0)
                    const fee   = Number(p.platformFee || 0)
                    const net   = Number(p.netAmount   || 0)
                    const fmt   = v => 'Rs.' + v.toLocaleString('en-IN', { minimumFractionDigits: 0 })
                    return (
                      <div key={p.id} className="card p-5">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="font-semibold text-white text-sm">{p.milestone?.title}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: p.status === 'RELEASED' ? 'rgba(52,211,153,.15)' : p.status === 'REJECTED' ? 'rgba(244,63,94,.12)' : 'rgba(251,146,60,.12)', color: p.status === 'RELEASED' ? '#34d399' : p.status === 'REJECTED' ? '#f43f5e' : '#fb923c' }}>{p.status.replace('_',' ')}</span>
                            </div>
                            <div className="text-xs text-ink-400 mb-2">{p.job?.title} &mdash; <strong className="text-ink-300">{p.freelancer?.name}</strong></div>
                            <div className="flex gap-4 flex-wrap text-xs mb-1">
                              <span className="text-ink-500">Gross: <strong className="text-amber-400">{fmt(gross)}</strong></span>
                              <span className="text-ink-500">Fee (2%): <strong className="text-ink-300">{fmt(fee)}</strong></span>
                              <span className="text-ink-500">Freelancer gets: <strong className="text-emerald-400">{fmt(net)}</strong></span>
                            </div>
                            {p.milestone?.submissionNote && <div className="mt-2 text-xs text-ink-400 italic px-2 py-1 rounded bg-ink-800/50 border border-ink-700/40">"{p.milestone.submissionNote}"</div>}
                          </div>
                          {p.status === 'PENDING_REVIEW' && (
                            <div className="flex gap-2 flex-shrink-0">
                              <button type="button" disabled={processingPayout === p.id}
                                onClick={async () => { const note = window.prompt('Approval note (optional):'); if (note === null) return; setProcessingPayout(p.id); try { await api.post('/milestones/payouts/' + p.id + '/approve', { adminNote: note }); toast.success('Payout approved! ' + fmt(net) + ' released.'); fetchData() } catch (e) { toast.error(errMsg(e)) } finally { setProcessingPayout(null) } }}
                                className="text-xs px-3 py-2 rounded-lg font-bold border" style={{ background:'rgba(52,211,153,.1)', color:'#34d399', borderColor:'rgba(52,211,153,.3)', cursor: processingPayout === p.id ? 'wait' : 'pointer' }}>
                                {processingPayout === p.id ? '...' : 'Approve'}
                              </button>
                              <button type="button" disabled={processingPayout === p.id}
                                onClick={async () => { const note = window.prompt('Rejection reason:'); if (!note?.trim()) { toast.error('Reason required'); return } setProcessingPayout(p.id); try { await api.post('/milestones/payouts/' + p.id + '/reject', { rejectNote: note }); toast.success('Rejected'); fetchData() } catch (e) { toast.error(errMsg(e)) } finally { setProcessingPayout(null) } }}
                                className="text-xs px-3 py-2 rounded-lg font-bold border" style={{ background:'rgba(244,63,94,.08)', color:'#f43f5e', borderColor:'rgba(244,63,94,.22)', cursor: processingPayout === p.id ? 'wait' : 'pointer' }}>
                                {processingPayout === p.id ? '...' : 'Reject'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
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
          {tab !== 'overview' && totalPages > 1 && (
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
