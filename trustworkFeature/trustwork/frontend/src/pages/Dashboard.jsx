import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { fmtCurrency, fmtRelative } from '../utils/helpers'
import { StatusBadge, PageLoader, StarRating } from '../components/UI'
import JobCard from '../components/JobCard'

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="stat-card">
      <div className="text-ink-500 text-sm">{label}</div>
      <div className={`text-2xl font-display font-bold ${accent || 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-ink-600">{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/jobs?limit=6')
      .then(r => setJobs(r.data.jobs))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const activeJobs = jobs.filter(j => !['COMPLETED', 'CANCELLED'].includes(j.status))
  const completedJobs = jobs.filter(j => j.status === 'COMPLETED')
  const fundedJobs = jobs.filter(j => j.escrows?.some(e => e.status === 'LOCKED'))
  const totalEscrow = fundedJobs.reduce((s, j) => s + (j.escrows?.filter(e=>e.status==='LOCKED').reduce((s,e)=>s+e.amount,0) || 0), 0)

  const isClient = user?.role === 'CLIENT'
  const isFreelancer = user?.role === 'FREELANCER'

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Here's what's happening on your account</p>
        </div>
        {isClient && (
          <Link to="/post-job" className="btn-primary btn">
            ✚ Post a Job
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Jobs" value={activeJobs.length} accent="text-brand-400" />
        <StatCard label="Completed" value={completedJobs.length} accent="text-emerald-400" />
        {isClient && <StatCard label="In Escrow" value={fmtCurrency(totalEscrow)} accent="text-amber-400" />}
        <StatCard label="Rating" value={user?.rating ? `${user.rating.toFixed(1)} ★` : '—'} sub={`${user?.ratingCount || 0} reviews`} accent="text-amber-400" />
      </div>

      {/* Profile card */}
      <div className="card p-5 mb-8 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-brand-500/20 border-2 border-brand-500/30 flex items-center justify-center text-brand-300 font-display font-bold text-xl flex-shrink-0">
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold text-lg text-white">{user?.name}</div>
          <div className="flex items-center gap-3 mt-1">
            <span className="badge badge-created">{user?.role}</span>
            <span className="text-ink-500 text-sm font-mono">+91 {user?.phone}</span>
            <StarRating rating={user?.rating} count={user?.ratingCount} />
          </div>
        </div>
      </div>

      {/* Recent jobs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg text-white">
            {isFreelancer ? 'Available Jobs' : 'My Recent Jobs'}
          </h2>
          <Link to={isFreelancer ? '/jobs' : '/my-jobs'} className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            View all →
          </Link>
        </div>

        {loading ? <PageLoader /> : jobs.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-3xl mb-3">📋</div>
            <div className="text-ink-400">
              {isClient ? (
                <>No jobs yet. <Link to="/post-job" className="text-brand-400 hover:underline">Post your first job →</Link></>
              ) : 'No jobs available right now. Check back soon!'}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {jobs.slice(0, 6).map(job => <JobCard key={job.id} job={job} />)}
          </div>
        )}
      </div>
    </div>
  )
}
