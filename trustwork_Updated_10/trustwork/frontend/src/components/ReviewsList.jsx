import { useState, useEffect } from 'react'
import api from '../services/api'
import { fmtRelative } from '../utils/helpers'
import { PageLoader } from './UI'
import { StarDisplay, ScoreBar } from './StarInput'

export default function ReviewsList({ userId }) {
  const [data, setData]     = useState(null)
  const [page, setPage]     = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    api.get('/reviews/user/' + userId + '?page=' + page + '&limit=5')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId, page])

  if (loading) return <PageLoader />
  if (!data || data.total === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-3xl mb-2">&#11088;</div>
        <p className="text-ink-500 text-sm">No reviews yet</p>
      </div>
    )
  }

  const { reviews, total, breakdown } = data
  const totalPages = Math.ceil(total / 5)

  return (
    <div>
      {/* Score breakdown */}
      <div className="card p-5 mb-4">
        <div className="flex items-center gap-6 mb-4">
          <div className="text-center">
            <div className="text-4xl font-display font-bold text-amber-400">
              {breakdown.overall ? breakdown.overall.toFixed(1) : '0.0'}
            </div>
            <StarDisplay value={breakdown.overall} showNumber={false} size="md" />
            <div className="text-xs text-ink-500 mt-1">{total} review{total !== 1 ? 's' : ''}</div>
          </div>
          <div className="flex-1 space-y-2.5">
            <ScoreBar label="Quality of Work"  value={breakdown.quality} />
            <ScoreBar label="Communication"    value={breakdown.communication} />
            <ScoreBar label="Timeliness"       value={breakdown.timeliness} />
          </div>
        </div>
      </div>

      {/* Individual reviews */}
      <div className="space-y-3">
        {reviews.map(r => (
          <div key={r.id} className="card p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-sm font-semibold flex-shrink-0">
                  {r.from?.name?.[0] || '?'}
                </div>
                <div>
                  <div className="text-sm font-medium text-ink-200">{r.from?.name || 'Anonymous'}</div>
                  <div className="text-xs text-ink-500">re: {r.job?.title}</div>
                </div>
              </div>
              <div className="text-right">
                <StarDisplay value={r.overall} size="sm" />
                <div className="text-xs text-ink-600 mt-0.5">{fmtRelative(r.createdAt)}</div>
              </div>
            </div>

            {/* Score breakdown chips */}
            <div className="flex gap-2 flex-wrap mb-2">
              {[
                { label: 'Quality',       val: r.quality },
                { label: 'Communication', val: r.communication },
                { label: 'Timeliness',    val: r.timeliness },
              ].map(({ label, val }) => (
                <span key={label} className="text-xs px-2 py-0.5 rounded-full bg-ink-800 border border-ink-700 text-ink-400">
                  {label}: <span className="text-amber-400 font-medium">{val}/5</span>
                </span>
              ))}
            </div>

            {r.comment && (
              <p className="text-sm text-ink-400 leading-relaxed mt-1 italic">
                "{r.comment}"
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button className="btn-secondary btn btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
          <span className="px-3 py-1.5 text-xs text-ink-400">Page {page} of {totalPages}</span>
          <button className="btn-secondary btn btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
    </div>
  )
}
