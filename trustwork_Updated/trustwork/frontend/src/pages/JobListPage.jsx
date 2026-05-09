import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { PageLoader, EmptyState } from '../components/UI'
import JobCard from '../components/JobCard'
import { SkillTagList } from '../components/SkillTag'

const SORT_OPTIONS = [
  { label: 'Newest first',    value: 'newest' },
  { label: 'Budget: High',    value: 'budget_high' },
  { label: 'Budget: Low',     value: 'budget_low' },
  { label: 'Deadline soon',   value: 'deadline' },
]

export default function JobListPage() {
  const [jobs, setJobs]             = useState([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(true)
  const [meta, setMeta]             = useState({ categories: [], budgetRange: { min: 500, max: 500000 } })

  // Filters
  const [search, setSearch]         = useState('')
  const [status, setStatus]         = useState('')
  const [sort, setSort]             = useState('newest')
  const [category, setCategory]     = useState('')
  const [jobType, setJobType]       = useState('')
  const [minBudget, setMinBudget]   = useState('')
  const [maxBudget, setMaxBudget]   = useState('')
  const [selectedSkills, setSelected] = useState([])
  const [allSkills, setAllSkills]   = useState([])
  const [allCategories, setAllCategories] = useState([])
  const [activeCat, setActiveCat]   = useState('All')

  useEffect(() => {
    api.get('/jobs/meta').then(r => {
      setMeta(r.data)
    }).catch(() => {})
    api.get('/skills').then(r => setAllSkills(r.data)).catch(() => {})
    api.get('/skills/categories').then(r => setAllCategories(r.data)).catch(() => {})
  }, [])

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const params = { search, status, sort, page, limit: 9 }
      if (category)   params.category  = category
      if (jobType)    params.type      = jobType
      if (minBudget)  params.minBudget = minBudget
      if (maxBudget)  params.maxBudget = maxBudget
      if (selectedSkills.length > 0)
        params.skills = selectedSkills.map(s => s.name).join(',')
      const { data } = await api.get('/jobs', { params })
      setJobs(data.jobs)
      setTotal(data.total)
    } catch {} finally { setLoading(false) }
  }, [search, status, sort, category, jobType, minBudget, maxBudget, selectedSkills, page])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const clearAll = () => {
    setSearch(''); setStatus(''); setSort('newest'); setCategory('');
    setJobType(''); setMinBudget(''); setMaxBudget(''); setSelected([]); setPage(1)
  }

  const toggleSkill = (skill) => {
    setPage(1)
    setSelected(prev =>
      prev.some(s => s.id === skill.id) ? prev.filter(s => s.id !== skill.id) : [...prev, skill]
    )
  }

  const panelSkills = allSkills.filter(s => activeCat === 'All' || s.category === activeCat)

  const hasFilters = search || status || category || jobType || minBudget || maxBudget || selectedSkills.length > 0

  const STATUS_FILTERS = [
    { label: 'All',          value: '' },
    { label: 'Open',         value: 'CREATED' },
    { label: 'In Progress',  value: 'IN_PROGRESS' },
    { label: 'Under Review', value: 'SUBMITTED' },
  ]

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Browse Jobs</h1>
        <p className="page-subtitle">Find work that matches your skills</p>
      </div>

      <div className="flex gap-6">

        {/* ── Sidebar ── */}
        <div className="w-60 flex-shrink-0 hidden lg:block space-y-4">

          {/* Category filter */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-ink-400 uppercase tracking-wide">Category</span>
              {category && <button onClick={() => setCategory('')} className="text-xs text-rose-400">Clear</button>}
            </div>
            <div className="space-y-0.5">
              <button onClick={() => { setCategory(''); setPage(1) }}
                className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  !category ? 'bg-brand-500/15 text-brand-300' : 'text-ink-400 hover:bg-ink-800'
                }`}>All categories</button>
              {meta.categories.map(cat => (
                <button key={cat} onClick={() => { setCategory(cat); setPage(1) }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex justify-between ${
                    category === cat ? 'bg-brand-500/15 text-brand-300' : 'text-ink-400 hover:bg-ink-800'
                  }`}>
                  <span>{cat}</span>
                  {meta.categoryCounts?.[cat] && (
                    <span className="text-ink-600">{meta.categoryCounts[cat]}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Job type */}
          <div className="card p-4">
            <div className="text-xs font-medium text-ink-400 uppercase tracking-wide mb-3">Job Type</div>
            <div className="space-y-0.5">
              {[{ label: 'All types', value: '' }, { label: 'Fixed Price', value: 'FIXED' }, { label: 'Hourly', value: 'HOURLY' }].map(opt => (
                <button key={opt.value} onClick={() => { setJobType(opt.value); setPage(1) }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                    jobType === opt.value ? 'bg-brand-500/15 text-brand-300' : 'text-ink-400 hover:bg-ink-800'
                  }`}>{opt.label}</button>
              ))}
            </div>
          </div>

          {/* Budget range */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-ink-400 uppercase tracking-wide">Budget (Rs.)</span>
              {(minBudget || maxBudget) && (
                <button onClick={() => { setMinBudget(''); setMaxBudget(''); setPage(1) }} className="text-xs text-rose-400">Clear</button>
              )}
            </div>
            <div className="flex gap-2">
              <input className="input text-xs py-2 w-full" type="number" placeholder="Min"
                value={minBudget} onChange={e => { setMinBudget(e.target.value); setPage(1) }} />
              <input className="input text-xs py-2 w-full" type="number" placeholder="Max"
                value={maxBudget} onChange={e => { setMaxBudget(e.target.value); setPage(1) }} />
            </div>
            {/* Quick budget presets */}
            <div className="flex flex-wrap gap-1 mt-2">
              {[['<5k','','5000'],['5-25k','5000','25000'],['25k+','25000','']].map(([l,mn,mx]) => (
                <button key={l} onClick={() => { setMinBudget(mn); setMaxBudget(mx); setPage(1) }}
                  className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                    minBudget === mn && maxBudget === mx
                      ? 'bg-brand-500/15 text-brand-400 border-brand-500/30'
                      : 'text-ink-500 border-ink-700 hover:border-ink-500'
                  }`}>{l}</button>
              ))}
            </div>
          </div>

          {/* Skills filter */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-ink-400 uppercase tracking-wide">Skills</span>
              {selectedSkills.length > 0 && (
                <button onClick={() => { setSelected([]); setPage(1) }} className="text-xs text-rose-400">Clear</button>
              )}
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {['All', ...allCategories].map(cat => (
                <button key={cat} onClick={() => setActiveCat(cat)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    activeCat === cat ? 'bg-brand-500 text-ink-950 font-medium' : 'bg-ink-800 text-ink-400 hover:text-ink-200'
                  }`}>{cat}</button>
              ))}
            </div>
            <div className="space-y-0.5 max-h-52 overflow-y-auto">
              {panelSkills.map(s => {
                const sel = selectedSkills.some(x => x.id === s.id)
                return (
                  <button key={s.id} onClick={() => toggleSkill(s)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center gap-2 transition-colors ${
                      sel ? 'bg-brand-500/15 text-brand-300' : 'text-ink-400 hover:bg-ink-800'
                    }`}>
                    <span className={`w-3 h-3 rounded border flex items-center justify-center text-[9px] flex-shrink-0 ${
                      sel ? 'bg-brand-500 border-brand-500 text-ink-950' : 'border-ink-600'
                    }`}>{sel ? 'v' : ''}</span>
                    {s.name}
                  </button>
                )
              })}
            </div>
            {selectedSkills.length > 0 && (
              <div className="mt-3 pt-3 border-t border-ink-800">
                <SkillTagList skills={selectedSkills} onRemove={(id) => {
                  setSelected(prev => prev.filter(s => s.id !== id)); setPage(1)
                }} />
              </div>
            )}
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0">

          {/* Search + sort bar */}
          <div className="flex gap-3 mb-4">
            <input className="input flex-1" placeholder="Search jobs..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            <select className="input w-44" value={sort} onChange={e => { setSort(e.target.value); setPage(1) }}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Status pills */}
          <div className="flex gap-2 flex-wrap mb-4">
            {STATUS_FILTERS.map(f => (
              <button key={f.value} onClick={() => { setStatus(f.value); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  status === f.value ? 'bg-brand-500 text-ink-950' : 'bg-ink-800 text-ink-400 hover:bg-ink-700 hover:text-ink-100'
                }`}>{f.label}</button>
            ))}
          </div>

          {/* Active filter chips */}
          {hasFilters && (
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <span className="text-xs text-ink-500">Filters:</span>
              {category && <span className="chip">{category} <button onClick={() => setCategory('')} className="ml-1 text-ink-400 hover:text-rose-400">x</button></span>}
              {jobType && <span className="chip">{jobType === 'FIXED' ? 'Fixed Price' : 'Hourly'} <button onClick={() => setJobType('')} className="ml-1 text-ink-400 hover:text-rose-400">x</button></span>}
              {(minBudget || maxBudget) && <span className="chip">Rs.{minBudget || '0'} - Rs.{maxBudget || 'any'} <button onClick={() => { setMinBudget(''); setMaxBudget('') }} className="ml-1 text-ink-400 hover:text-rose-400">x</button></span>}
              <SkillTagList skills={selectedSkills} onRemove={(id) => setSelected(prev => prev.filter(s => s.id !== id))} />
              <button onClick={clearAll} className="text-xs text-rose-400 hover:text-rose-300 ml-auto">Clear all</button>
            </div>
          )}

          {/* Result count */}
          {!loading && (
            <div className="text-sm text-ink-500 mb-4">
              {total} job{total !== 1 ? 's' : ''} found
            </div>
          )}

          {/* Job grid */}
          {loading ? <PageLoader /> : jobs.length === 0 ? (
            <EmptyState icon="search" title="No jobs found"
              desc="Try adjusting your filters"
              action={<button onClick={clearAll} className="btn-secondary btn">Clear all filters</button>}
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {jobs.map(job => <JobCard key={job.id} job={job} />)}
              </div>
              {total > 9 && (
                <div className="flex justify-center gap-2 mt-8">
                  <button className="btn-secondary btn btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                  <span className="px-4 py-1.5 text-sm text-ink-400">Page {page} of {Math.ceil(total / 9)}</span>
                  <button className="btn-secondary btn btn-sm" disabled={page >= Math.ceil(total / 9)} onClick={() => setPage(p => p + 1)}>Next</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}