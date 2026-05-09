import { useState, useEffect } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { PageLoader, EmptyState } from '../components/UI'
import JobCard from '../components/JobCard'
import { Link } from 'react-router-dom'

const TABS_CLIENT = ['All', 'Active', 'Completed', 'Disputed']
const TABS_FL = ['All', 'Assigned', 'In Progress', 'Submitted', 'Completed']

export default function MyJobsPage() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('All')

  useEffect(() => {
    api.get('/jobs?limit=50')
      .then(r => setJobs(r.data.jobs))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const tabs = user?.role === 'CLIENT' ? TABS_CLIENT : TABS_FL

  const filtered = jobs.filter(j => {
    if (tab === 'All') return true
    if (tab === 'Active') return !['COMPLETED', 'CANCELLED', 'DISPUTED'].includes(j.status)
    if (tab === 'Completed') return j.status === 'COMPLETED'
    if (tab === 'Disputed') return j.status === 'DISPUTED'
    if (tab === 'Assigned') return j.status === 'ASSIGNED'
    if (tab === 'In Progress') return ['FUNDED', 'IN_PROGRESS'].includes(j.status)
    if (tab === 'Submitted') return j.status === 'SUBMITTED'
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
          <Link to="/post-job" className="btn-primary btn">✚ Post Job</Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-ink-900 border border-ink-800 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t ? 'bg-brand-500 text-ink-950' : 'text-ink-400 hover:text-ink-100'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? <PageLoader /> : filtered.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No jobs here"
          desc={user?.role === 'CLIENT' ? 'Post your first job to get started' : 'Apply to jobs to see them here'}
          action={user?.role === 'CLIENT' ? <Link to="/post-job" className="btn-primary btn">Post a Job</Link> : <Link to="/jobs" className="btn-primary btn">Browse Jobs</Link>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(job => <JobCard key={job.id} job={job} />)}
        </div>
      )}
    </div>
  )
}
