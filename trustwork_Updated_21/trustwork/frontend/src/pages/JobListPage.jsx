import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { PageLoader, EmptyState } from '../components/UI'
import JobCard from '../components/JobCard'
import { SkillTagList } from '../components/SkillTag'

const STATUS_FILTERS = [
  { label: 'All',         value: '' },
  { label: 'Open',        value: 'CREATED' },
  { label: 'Assigned',    value: 'ASSIGNED' },
  { label: 'Funded',      value: 'FUNDED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Under Review', value: 'SUBMITTED' },
]

export default function JobListPage() {
  const [jobs, setJobs]           = useState([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [status, setStatus]       = useState('')
  const [allSkills, setAllSkills]  = useState([])
  const [categories, setCategories] = useState([])
  const [selectedSkills, setSelected] = useState([])  // [{id, name, category}]
  const [activeCat, setActiveCat] = useState('All')

  // Load skills catalogue once
  useEffect(() => {
    api.get('/skills').then(r => setAllSkills(r.data)).catch(() => {})
    api.get('/skills/categories').then(r => setCategories(r.data)).catch(() => {})
  }, [])

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const params = { search, status, page, limit: 9 }
      if (selectedSkills.length > 0)
        params.skills = selectedSkills.map(s => s.name).join(',')
      const { data } = await api.get('/jobs', { params })
      setJobs(data.jobs)
      setTotal(data.total)
    } catch {} finally { setLoading(false) }
  }, [search, status, page, selectedSkills])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const toggleSkill = (skill) => {
    setPage(1)
    if (selectedSkills.some(s => s.id === skill.id)) {
      setSelected(selectedSkills.filter(s => s.id !== skill.id))
    } else {
      setSelected([...selectedSkills, skill])
    }
  }

  const clearAll = () => {
    setSearch(''); setStatus(''); setSelected([]); setPage(1)
  }

  const hasFilters = search || status || selectedSkills.length > 0

  // Skills shown in panel = filtered by active category
  const panelSkills = allSkills.filter(s =>
    activeCat === 'All' || s.category === activeCat
  )

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Browse Jobs</h1>
        <p className="page-subtitle">Find work that matches your skills</p>
      </div>

      <div className="flex gap-6">

        {/* Left: Skill filter sidebar */}
        <div className="w-56 flex-shrink-0 hidden lg:block">
          <div className="card p-4 sticky top-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-ink-400 uppercase tracking-wide">Filter by Skill</span>
              {selectedSkills.length > 0 && (
                <button onClick={() => { setSelected([]); setPage(1) }} className="text-xs text-rose-400 hover:text-rose-300">
                  Clear
                </button>
              )}
            </div>

            {/* Category tabs */}
            <div className="flex flex-wrap gap-1 mb-3">
              {['All', ...categories].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCat(cat)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    activeCat === cat
                      ? 'bg-brand-500 text-ink-950 font-medium'
                      : 'bg-ink-800 text-ink-400 hover:text-ink-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Skill list */}
            <div className="space-y-0.5 max-h-80 overflow-y-auto">
              {panelSkills.map(s => {
                const sel = selectedSkills.some(x => x.id === s.id)
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleSkill(s)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center gap-2 ${
                      sel
                        ? 'bg-brand-500/15 text-brand-300'
                        : 'text-ink-400 hover:bg-ink-800 hover:text-ink-200'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-sm border flex-shrink-0 flex items-center justify-center text-[9px] ${
                      sel ? 'bg-brand-500 border-brand-500 text-ink-950' : 'border-ink-600'
                    }`}>
                      {sel ? 'v' : ''}
                    </span>
                    {s.name}
                  </button>
                )
              })}
            </div>

            {/* Selected skills chips */}
            {selectedSkills.length > 0 && (
              <div className="mt-3 pt-3 border-t border-ink-800">
                <div className="text-xs text-ink-500 mb-2">Active filters:</div>
                <SkillTagList skills={selectedSkills} onRemove={(id) => {
                  setSelected(selectedSkills.filter(s => s.id !== id)); setPage(1)
                }} />
              </div>
            )}
          </div>
        </div>

        {/* Right: Jobs */}
        <div className="flex-1 min-w-0">
          {/* Search + status bar */}
          <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-3">
            <input
              className="input flex-1"
              placeholder="Search jobs..."
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

          {/* Mobile skill filter chips */}
          {selectedSkills.length > 0 && (
            <div className="lg:hidden mb-4 flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-ink-500">Skills:</span>
              <SkillTagList skills={selectedSkills} onRemove={(id) => {
                setSelected(selectedSkills.filter(s => s.id !== id)); setPage(1)
              }} />
            </div>
          )}

          {/* Results count + clear */}
          {!loading && (
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-ink-500">
                {total} job{total !== 1 ? 's' : ''} found
                {selectedSkills.length > 0 && (
                  <span className="ml-2 text-brand-400">
                    matching {selectedSkills.map(s => s.name).join(', ')}
                  </span>
                )}
              </div>
              {hasFilters && (
                <button onClick={clearAll} className="text-xs text-ink-500 hover:text-ink-300 transition-colors">
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {loading ? <PageLoader /> : jobs.length === 0 ? (
            <EmptyState
              icon="search"
              title="No jobs found"
              desc="Try adjusting your search or skill filters"
              action={
                <button onClick={clearAll} className="btn-secondary btn">
                  Clear filters
                </button>
              }
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {jobs.map(job => <JobCard key={job.id} job={job} />)}
              </div>
              {total > 9 && (
                <div className="flex justify-center gap-2 mt-8">
                  <button
                    className="btn-secondary btn btn-sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >Prev</button>
                  <span className="px-4 py-1.5 text-sm text-ink-400">
                    Page {page} of {Math.ceil(total / 9)}
                  </span>
                  <button
                    className="btn-secondary btn btn-sm"
                    disabled={page >= Math.ceil(total / 9)}
                    onClick={() => setPage(p => p + 1)}
                  >Next</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
