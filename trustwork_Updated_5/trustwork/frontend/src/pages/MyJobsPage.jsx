import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { PageLoader } from '../components/UI'
import JobCard from '../components/JobCard'

const TABS_CLIENT = ['All', 'Active', 'Completed', 'Disputed']
const TABS_FL     = ['All', 'Assigned', 'In Progress', 'Submitted', 'Completed']

export default function MyJobsPage() {
  const { user }   = useAuth()
  const [jobs, setJobs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]       = useState('All')

  useEffect(() => {
    api.get('/jobs?limit=50')
      .then(r => setJobs(r.data.jobs))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const tabs = user?.role === 'CLIENT' ? TABS_CLIENT : TABS_FL

  const filtered = jobs.filter(j => {
    if (tab === 'All')         return true
    if (tab === 'Active')      return !['COMPLETED', 'CANCELLED', 'DISPUTED'].includes(j.status)
    if (tab === 'Completed')   return j.status === 'COMPLETED'
    if (tab === 'Disputed')    return j.status === 'DISPUTED'
    if (tab === 'Assigned')    return j.status === 'ASSIGNED'
    if (tab === 'In Progress') return ['FUNDED', 'IN_PROGRESS'].includes(j.status)
    if (tab === 'Submitted')   return j.status === 'SUBMITTED'
    return true
  })

  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">My Jobs</h1>
          <p className="page-subtitle">{jobs.length} total job{jobs.length !== 1 ? 's' : ''}</p>
        </div>
        {user?.role === 'CLIENT' && (
          <Link to="/post-job" className="btn-primary btn">+ Post Job</Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-ink-900 border border-ink-800 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t ? 'bg-brand-500 text-ink-950' : 'text-ink-400 hover:text-ink-100'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? <PageLoader /> : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-ink-800 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-ink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
          </div>
          <p className="text-ink-400 text-sm">No jobs in this category</p>
          {user?.role === 'CLIENT' ? (
            <Link to="/post-job" className="btn-primary btn mt-4 inline-flex">Post a Job</Link>
          ) : (
            <Link to="/jobs" className="btn-primary btn mt-4 inline-flex">Browse Jobs</Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(job => <JobCard key={job.id} job={job} />)}
        </div>
      )}
    </div>
  )
}
