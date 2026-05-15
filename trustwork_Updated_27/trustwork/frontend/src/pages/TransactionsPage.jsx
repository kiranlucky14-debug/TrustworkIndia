// TransactionsPage.jsx  freelancer wallet + earnings + payout history
import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { fmtCurrency, fmtDate, fmtRelative } from '../utils/helpers'

const TYPE_CFG = {
  DEPOSIT: { label:'Deposit',  sign:'-', color:'#fbbf24', bg:'rgba(251,191,36,.12)',  border:'rgba(251,191,36,.2)',  icon:'down'  },
  RELEASE: { label:'Received', sign:'+', color:'#34d399', bg:'rgba(52,211,153,.12)',  border:'rgba(52,211,153,.2)', icon:'up'    },
  REFUND:  { label:'Refund',   sign:'+', color:'#60a5fa', bg:'rgba(96,165,250,.12)',  border:'rgba(96,165,250,.2)', icon:'refund'},
}

function TxIcon({ type }) {
  const cfg = TYPE_CFG[type] || TYPE_CFG.DEPOSIT
  return (
    <div style={{ width:40, height:40, borderRadius:'50%', background:cfg.bg, border:`1px solid ${cfg.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      {type === 'RELEASE' && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2.2" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
      )}
      {type === 'DEPOSIT' && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
      )}
      {type === 'REFUND' && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2.2" strokeLinecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
      )}
    </div>
  )
}

export default function TransactionsPage() {
  const { user }   = useAuth()
  const [txns,     setTxns]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')

  const isFreelancer = user?.role === 'FREELANCER'

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/payments/transactions')
      setTxns(Array.isArray(data) ? data : [])
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  // Earnings summary
  const released    = txns.filter(t => t.type === 'RELEASE')
  const deposits    = txns.filter(t => t.type === 'DEPOSIT')
  const refunds     = txns.filter(t => t.type === 'REFUND')

  const totalEarned = released.reduce((s, t) => s + Number(t.netAmount || t.amount), 0)
  const totalFees   = released.reduce((s, t) => s + Number(t.platformFee || 0), 0)
  const totalGross  = released.reduce((s, t) => s + Number(t.amount), 0)
  const totalPaid   = deposits.reduce((s, t) => s + Number(t.amount), 0)
  const totalRefund = refunds.reduce((s, t) => s + Number(t.amount), 0)

  const filtered = filter === 'all' ? txns
    : txns.filter(t => t.type === filter.toUpperCase())

  if (loading) return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", color:'#f8fafc' }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ height:72, borderRadius:12, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.06)', marginBottom:8, animation:'pulse 1.5s ease-in-out infinite' }}/>
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:.7}}`}</style>
    </div>
  )

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", color:'#f8fafc' }}>

      {/* Page header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4, letterSpacing:'-.3px' }}>
            {isFreelancer ? 'Earnings & Payouts' : 'Transactions'}
          </h1>
          <p style={{ fontSize:13, color:'rgba(255,255,255,.45)' }}>
            {isFreelancer ? 'Your milestone payments, platform fees, and payout history' : 'All escrow deposits, releases, and refunds'}
          </p>
        </div>
        <button onClick={fetch} style={{ padding:'8px 14px', borderRadius:9, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.6)', fontSize:13, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh
        </button>
      </div>

      {/* Earnings summary (freelancer) or overview (client/admin) */}
      {isFreelancer ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:10, marginBottom:24 }}>
          {[
            { label:'Total Earned (Net)', value:totalEarned,  color:'#34d399', icon:'up',    note:`${released.length} milestone${released.length!==1?'s':''} paid` },
            { label:'Gross Earnings',     value:totalGross,   color:'#fbbf24', icon:'gross', note:'Before platform fee' },
            { label:'Platform Fees Paid', value:totalFees,    color:'#fb923c', icon:'fee',   note:'2% of each milestone' },
            { label:'Refunds Received',   value:totalRefund,  color:'#60a5fa', icon:'ref',   note:`${refunds.length} refund${refunds.length!==1?'s':''}` },
          ].map(({ label, value, color, note }) => (
            <div key={label} style={{ padding:'14px 16px', borderRadius:12, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)' }}>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.38)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>{label}</div>
              <div style={{ fontSize:22, fontWeight:800, color, marginBottom:3 }}>{fmtCurrency(value)}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.3)' }}>{note}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:10, marginBottom:24 }}>
          {[
            { label:'Total Deposited', value:totalPaid,   color:'#fbbf24', note:`${deposits.length} deposits` },
            { label:'Total Released',  value:totalEarned, color:'#34d399', note:`${released.length} releases` },
            { label:'Total Refunded',  value:totalRefund, color:'#60a5fa', note:`${refunds.length} refunds`   },
          ].map(({ label, value, color, note }) => (
            <div key={label} style={{ padding:'14px 16px', borderRadius:12, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)' }}>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.38)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>{label}</div>
              <div style={{ fontSize:22, fontWeight:800, color, marginBottom:3 }}>{fmtCurrency(value)}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.3)' }}>{note}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      {txns.length > 0 && (
        <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', padding:3, borderRadius:11, marginBottom:20, width:'fit-content' }}>
          {['all', isFreelancer ? 'release' : 'deposit', isFreelancer ? 'deposit' : 'release', 'refund'].map((f) => {
            const label = f === 'all' ? 'All' : f === 'release' ? (isFreelancer ? 'Payouts' : 'Released') : f === 'deposit' ? (isFreelancer ? 'Escrow Paid' : 'Deposits') : 'Refunds'
            const cnt = f === 'all' ? txns.length : txns.filter(t => t.type === f.toUpperCase()).length
            return (
              <button key={f} type="button" onClick={() => setFilter(f)}
                style={{ padding:'6px 14px', borderRadius:9, border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:13, fontWeight:600, transition:'all .18s', display:'flex', alignItems:'center', gap:5, background: filter===f ? '#14b8a6' : 'transparent', color: filter===f ? '#07111d' : 'rgba(255,255,255,.45)' }}>
                {label}
                {cnt > 0 && <span style={{ fontSize:10, minWidth:16, height:16, borderRadius:100, display:'flex', alignItems:'center', justifyContent:'center', background: filter===f ? 'rgba(0,0,0,.2)' : 'rgba(255,255,255,.1)', color: filter===f ? '#07111d' : 'rgba(255,255,255,.5)', padding:'0 4px' }}>{cnt}</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* Transaction list */}
      {txns.length === 0 ? (
        <div style={{ padding:'48px 32px', textAlign:'center', background:'rgba(255,255,255,.03)', borderRadius:14, border:'1px solid rgba(255,255,255,.07)' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" strokeLinecap="round" style={{ display:'block', margin:'0 auto 12px' }}>
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          <div style={{ fontSize:14, color:'rgba(255,255,255,.4)' }}>No transactions yet</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding:'32px', textAlign:'center', fontSize:14, color:'rgba(255,255,255,.4)' }}>No {filter} transactions</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map(t => {
            const cfg       = TYPE_CFG[t.type] || TYPE_CFG.DEPOSIT
            const net       = Number(t.netAmount || t.amount)
            const fee       = Number(t.platformFee || 0)
            const gross     = Number(t.amount)
            const isRelease = t.type === 'RELEASE'
            const isDeposit = t.type === 'DEPOSIT'

            return (
              <div key={t.id} style={{ display:'flex', gap:14, alignItems:'flex-start', padding:'14px 18px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:12, borderLeft:`3px solid ${cfg.color}` }}>
                <TxIcon type={t.type} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:'#f8fafc', marginBottom:2 }}>
                        {t.description || (isRelease ? 'Milestone Payout' : isDeposit ? 'Escrow Deposit' : 'Refund')}
                      </div>
                      <div style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>
                        {fmtDate(t.createdAt)} &middot; {fmtRelative(t.createdAt)}
                        {t.reference && <span style={{ marginLeft:8, fontSize:10, fontFamily:'monospace', color:'rgba(255,255,255,.25)' }}>{t.reference.slice(0,20)}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:17, fontWeight:800, color:cfg.color }}>
                        {cfg.sign}{fmtCurrency(gross)}
                      </div>
                      {isRelease && fee > 0 && (
                        <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginTop:2 }}>
                          Net: <strong style={{ color:'#34d399' }}>{fmtCurrency(net)}</strong>
                          <span style={{ marginLeft:6, color:'rgba(255,255,255,.3)' }}>Fee: {fmtCurrency(fee)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status badge */}
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100, background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}` }}>
                      {cfg.label}
                    </span>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100,
                      background: t.status === 'SUCCESS' ? 'rgba(52,211,153,.1)' : 'rgba(244,63,94,.1)',
                      color: t.status === 'SUCCESS' ? '#34d399' : '#f43f5e',
                      border: `1px solid ${t.status === 'SUCCESS' ? 'rgba(52,211,153,.25)' : 'rgba(244,63,94,.25)'}` }}>
                      {t.status}
                    </span>
                    {isRelease && fee > 0 && (
                      <span style={{ fontSize:10, color:'rgba(255,255,255,.35)' }}>Platform fee deducted: {fmtCurrency(fee)}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
