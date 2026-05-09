import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { PageLoader, EmptyState } from '../components/UI'
import JobCard from '../components/JobCard'
import { fmtCurrency } from '../utils/helpers'

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'CREATED' },
  { label: 'Assigned', value: 'ASSIGNED' },
  { label: 'Funded', value: 'FUNDED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Under Review', value: 'SUBMITTED' },
]

export default function JobListPage() {
  const [jobs, setJobs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/jobs', { params: { search, status, page, limit: 9 } })
      setJobs(data.jobs)
      setTotal(data.total)
    } catch {}
    finally { setLoading(false) }
  }, [search, status, page])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Browse Jobs</h1>
        <p className="page-subtitle">Find work that matches your skills</p>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <input
          className="input flex-1"
          placeholder="Search jobs…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => { setStatus(f.value); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                status === f.value
                  ? 'bg-brand-500 text-ink-950'
                  : 'bg-ink-800 text-ink-400 hover:bg-ink-700 hover:text-ink-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {!loading && (
        <div className="text-sm text-ink-500 mb-4">
          {total} job{total !== 1 ? 's' : ''} found
        </div>
      )}

      {/* Grid */}
      {loading ? <PageLoader /> : jobs.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No jobs found"
          desc="Try adjusting your search or filters"
          action={<button onClick={() => { setSearch(''); setStatus('') }} className="btn-secondary btn">Clear filters</button>}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map(job => <JobCard key={job.id} job={job} />)}
          </div>

          {/* Pagination */}
          {total > 9 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                className="btn-secondary btn btn-sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >← Prev</button>
              <span className="px-4 py-1.5 text-sm text-ink-400">Page {page} of {Math.ceil(total / 9)}</span>
              <button
                className="btn-secondary btn btn-sm"
                disabled={page >= Math.ceil(total / 9)}
                onClick={() => setPage(p => p + 1)}
              >Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
