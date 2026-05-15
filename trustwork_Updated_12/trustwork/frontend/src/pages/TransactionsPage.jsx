import { useState, useEffect } from 'react'
import api from '../services/api'
import { fmtCurrency, fmtDate } from '../utils/helpers'
import { PageLoader } from '../components/UI'

const TYPE_CONFIG = {
  DEPOSIT: { label: 'Deposit',  sign: '-', color: 'text-amber-400',   bg: 'bg-amber-500/15',  border: 'border-amber-500/20'  },
  RELEASE: { label: 'Release',  sign: '+', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/20' },
  REFUND:  { label: 'Refund',   sign: '+', color: 'text-rose-400',    bg: 'bg-rose-500/15',    border: 'border-rose-500/20'   },
}

function TxIcon({ type }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.DEPOSIT
  const paths = {
    DEPOSIT: <path d="M12 5v14M5 12l7 7 7-7"/>,
    RELEASE: <path d="M12 19V5M5 12l7-7 7 7"/>,
    REFUND:  <><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></>,
  }
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg} border ${cfg.border}`}>
      <svg className={`w-4 h-4 ${cfg.color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {paths[type] || paths.DEPOSIT}
      </svg>
    </div>
  )
}

export default function TransactionsPage() {
  const [txns, setTxns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/payments/transactions')
      .then(r => setTxns(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalIn  = txns.filter(t => t.type !== 'DEPOSIT').reduce((s, t) => s + t.amount, 0)
  const totalOut = txns.filter(t => t.type === 'DEPOSIT').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Transactions</h1>
        <p className="page-subtitle">Your payment history</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="stat-card">
          <div className="text-ink-500 text-sm">Total Received</div>
          <div className="text-2xl font-display font-bold text-emerald-400">{fmtCurrency(totalIn)}</div>
        </div>
        <div className="stat-card">
          <div className="text-ink-500 text-sm">Total Deposited</div>
          <div className="text-2xl font-display font-bold text-amber-400">{fmtCurrency(totalOut)}</div>
        </div>
      </div>

      {loading ? <PageLoader /> : txns.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-ink-800 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-ink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          </div>
          <p className="text-ink-400 text-sm">No transactions yet</p>
        </div>
      ) : (
        <div className="card divide-y divide-ink-800">
          {txns.map(t => {
            const cfg = TYPE_CONFIG[t.type] || TYPE_CONFIG.DEPOSIT
            return (
              <div key={t.id} className="flex items-center gap-4 p-4">
                <TxIcon type={t.type} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-ink-100">{cfg.label}</div>
                  {t.reference && (
                    <div className="text-xs text-ink-500 font-mono truncate">{t.reference}</div>
                  )}
                  {t.milestoneId && (
                    <div className="text-xs text-ink-600">Milestone payment</div>
                  )}
                  <div className="text-xs text-ink-600">{fmtDate(t.createdAt)}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`font-display font-bold ${cfg.color}`}>
                    {cfg.sign}{fmtCurrency(t.amount)}
                  </div>
                  <span className={`text-xs ${
                    t.status === 'SUCCESS' ? 'text-emerald-500' :
                    t.status === 'PENDING' ? 'text-amber-500' : 'text-rose-500'
                  }`}>{t.status}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
