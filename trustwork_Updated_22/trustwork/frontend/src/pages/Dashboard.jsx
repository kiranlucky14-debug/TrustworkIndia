import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { fmtCurrency, fmtRelative } from '../utils/helpers'
import { StatusBadge, PageLoader } from '../components/UI'
import { StarDisplay } from '../components/StarInput'
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
    // Freelancers: fetch their own assigned jobs. Clients: their posted jobs.
    const url = user?.role === 'FREELANCER' ? '/jobs?myJobs=true&limit=10' : '/jobs?limit=6'
    api.get(url)
      .then(r => setJobs(r.data.jobs || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.role])

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
          <h1 className="page-title">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} </h1>
          <p className="page-subtitle">Here's what's happening on your account</p>
        </div>
        {isClient && (
          <Link to="/post-job" className="btn-primary btn">
             Post a Job
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Jobs" value={activeJobs.length} accent="text-brand-400" />
        <StatCard label="Completed" value={completedJobs.length} accent="text-emerald-400" />
        {isClient && <StatCard label="In Escrow" value={fmtCurrency(totalEscrow)} accent="text-amber-400" />}
        <StatCard label="Rating" value={user?.rating ? `${user.rating.toFixed(1)} ` : ''} sub={`${user?.ratingCount || 0} reviews`} accent="text-amber-400" />
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
            <StarDisplay value={user?.rating} count={user?.ratingCount} size='sm' />
          </div>
        </div>
      </div>

      {/* Freelancer pending action alert */}
      {isFreelancer && !loading && (() => {
        const pending = jobs.filter(j => {
          if (j.status === 'ASSIGNED' && j.agreementStatus === 'CLIENT_SIGNED') return true
          if (j.status === 'ASSIGNED' && !j.agreementStatus) return true
          return false
        })
        if (pending.length === 0) return null
        return (
          <div className="card p-4 mb-6 flex items-start gap-3" style={{ background:'rgba(251,191,36,.06)', borderColor:'rgba(251,191,36,.25)' }}>
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div className="flex-1">
              <div className="text-sm font-semibold mb-1" style={{ color:'#fbbf24' }}>
                {pending.length} job{pending.length !== 1 ? 's' : ''} need{pending.length === 1 ? 's' : ''} your attention
              </div>
              <div className="text-xs text-ink-400">Sign the Work Agreement to unlock escrow funding and start work.</div>
              <div className="flex flex-wrap gap-2 mt-2">
                {pending.slice(0, 3).map(j => (
                  <Link key={j.id} to={`/jobs/${j.id}/agreement`}
                    className="text-xs font-medium px-3 py-1 rounded-full transition-colors"
                    style={{ background:'rgba(251,191,36,.15)', color:'#fbbf24', border:'1px solid rgba(251,191,36,.3)', textDecoration:'none' }}>
                    {j.title.length > 30 ? j.title.slice(0,30)+'...' : j.title}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Recent jobs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg text-white">
            {isFreelancer ? 'My Active Jobs' : 'My Recent Jobs'}
          </h2>
          <Link to={isFreelancer ? '/my-jobs' : '/my-jobs'} className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            View all
          </Link>
        </div>

        {loading ? <PageLoader /> : jobs.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-3xl mb-3"></div>
            <div className="text-ink-400">
              {isClient ? (
                <>No jobs yet. <Link to="/post-job" className="text-brand-400 hover:underline">Post your first job </Link></>
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
