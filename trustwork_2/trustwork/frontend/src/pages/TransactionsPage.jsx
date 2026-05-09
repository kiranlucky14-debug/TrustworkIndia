import { useState, useEffect } from 'react'
import api from '../services/api'
import { fmtCurrency, fmtDate } from '../utils/helpers'
import { PageLoader, EmptyState } from '../components/UI'

const TYPE_ICON = { DEPOSIT: '⬇️', RELEASE: '⬆️', REFUND: '↩️' }
const TYPE_COLOR = { DEPOSIT: 'text-amber-400', RELEASE: 'text-emerald-400', REFUND: 'text-rose-400' }
const TYPE_SIGN = { DEPOSIT: '-', RELEASE: '+', REFUND: '+' }

export default function TransactionsPage() {
  const [txns, setTxns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/payments/transactions')
      .then(r => setTxns(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalIn = txns.filter(t => t.type !== 'DEPOSIT').reduce((s, t) => s + t.amount, 0)
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
        <EmptyState icon="₹" title="No transactions" desc="Your payment history will appear here" />
      ) : (
        <div className="card divide-y divide-ink-800">
          {txns.map(t => (
            <div key={t.id} className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-full bg-ink-800 flex items-center justify-center text-lg flex-shrink-0">
                {TYPE_ICON[t.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-ink-100">{t.type}</div>
                {t.reference && (
                  <div className="text-xs text-ink-500 font-mono truncate">{t.reference}</div>
                )}
                <div className="text-xs text-ink-600">{fmtDate(t.createdAt)}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className={`font-display font-bold ${TYPE_COLOR[t.type]}`}>
                  {TYPE_SIGN[t.type]}{fmtCurrency(t.amount)}
                </div>
                <span className={`text-xs ${t.status === 'SUCCESS' ? 'text-emerald-500' : t.status === 'PENDING' ? 'text-amber-500' : 'text-rose-500'}`}>
                  {t.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
