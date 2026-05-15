import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { StatusBadge } from '../components/UI'
import { fmtCurrency, fmtRelative, fmtDate, errMsg } from '../utils/helpers'
import { StarDisplay } from '../components/StarInput'

//  Status config 
const STATUS_COLOR = {
  CREATED:     { color: '#94a3b8', bg: 'rgba(148,163,184,.12)' },
  ASSIGNED:    { color: '#fbbf24', bg: 'rgba(251,191,36,.12)'  },
  FUNDED:      { color: '#60a5fa', bg: 'rgba(96,165,250,.12)'  },
  IN_PROGRESS: { color: '#14b8a6', bg: 'rgba(20,184,166,.12)'  },
  SUBMITTED:   { color: '#818cf8', bg: 'rgba(129,140,248,.12)' },
  COMPLETED:   { color: '#34d399', bg: 'rgba(52,211,153,.12)'  },
  DISPUTED:    { color: '#f43f5e', bg: 'rgba(244,63,94,.12)'   },
  CANCELLED:   { color: '#64748b', bg: 'rgba(100,116,139,.12)' },
}

function Badge({ status }) {
  const cfg = STATUS_COLOR[status] || STATUS_COLOR.CREATED
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 100,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`, whiteSpace: 'nowrap' }}>
      {status?.replace('_', ' ')}
    </span>
  )
}

//  Freelancer tabs config 
const FL_TABS = [
  { id: 'all',         label: 'All',         statuses: null },
  { id: 'assigned',    label: 'Assigned',    statuses: ['ASSIGNED'] },
  { id: 'inprogress',  label: 'In Progress', statuses: ['FUNDED', 'IN_PROGRESS'] },
  { id: 'submitted',   label: 'Submitted',   statuses: ['SUBMITTED'] },
  { id: 'completed',   label: 'Completed',   statuses: ['COMPLETED'] },
  { id: 'disputed',    label: 'Disputed',    statuses: ['DISPUTED'] },
]

const CLIENT_TABS = [
  { id: 'all',         label: 'All',         statuses: null },
  { id: 'open',        label: 'Open',        statuses: ['CREATED'] },
  { id: 'active',      label: 'Active',      statuses: ['ASSIGNED', 'FUNDED', 'IN_PROGRESS'] },
  { id: 'submitted',   label: 'Submitted',   statuses: ['SUBMITTED'] },
  { id: 'completed',   label: 'Completed',   statuses: ['COMPLETED'] },
  { id: 'disputed',    label: 'Disputed',    statuses: ['DISPUTED'] },
]

//  Action button for freelancer pending actions 
function ActionChip({ label, to, color = '#14b8a6' }) {
  return (
    <Link to={to}
      style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100,
        background: `${color}15`, border: `1px solid ${color}40`, color,
        textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
      onClick={e => e.stopPropagation()}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
      {label}
    </Link>
  )
}

function pendingAction(job, role) {
  if (role !== 'FREELANCER') return null
  if (job.status === 'ASSIGNED') {
    if (job.agreementStatus === 'CLIENT_SIGNED')
      return { label: 'Sign Agreement', to: `/jobs/${job.id}/agreement`, color: '#fbbf24' }
    if (!job.agreementStatus || job.agreementStatus === 'DRAFT')
      return { label: 'View Agreement', to: `/jobs/${job.id}/agreement`, color: '#94a3b8' }
    if (job.agreementStatus === 'ACTIVE')
      return { label: 'Agreement Signed', to: `/jobs/${job.id}`, color: '#34d399' }
  }
  if ((job.status === 'FUNDED' || job.status === 'IN_PROGRESS'))
    return { label: 'Submit Work', to: `/jobs/${job.id}`, color: '#818cf8' }
  return null
}

//  Job row card 
function JobRow({ job, role }) {
  const navigate = useNavigate()
  const action = pendingAction(job, role)
  const escrow = job.escrows?.find(e => e.milestoneId === null) || job.escrows?.[0]

  return (
    <div onClick={() => navigate(`/jobs/${job.id}`)}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '14px 18px',
        background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)',
        borderRadius: 12, cursor: 'pointer', transition: 'all .18s',
        borderLeft: action ? `3px solid ${action.color}` : '3px solid transparent' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.06)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.03)' }}>

      {/* Left: title + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280 }}>
            {job.title}
          </div>
          <Badge status={job.status} />
          {action && <ActionChip label={action.label} to={action.to} color={action.color} />}
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Budget */}
          <span style={{ fontSize: 15, fontWeight: 700, color: '#14b8a6' }}>{fmtCurrency(job.budget)}</span>
          {/* Escrow status */}
          {escrow && (
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100,
              background: escrow.status === 'LOCKED' ? 'rgba(251,191,36,.1)' : escrow.status === 'RELEASED' ? 'rgba(52,211,153,.1)' : 'rgba(100,116,139,.1)',
              color: escrow.status === 'LOCKED' ? '#fbbf24' : escrow.status === 'RELEASED' ? '#34d399' : '#94a3b8',
              border: `1px solid ${escrow.status === 'LOCKED' ? 'rgba(251,191,36,.25)' : escrow.status === 'RELEASED' ? 'rgba(52,211,153,.25)' : 'rgba(100,116,139,.2)'}` }}>
              Escrow {escrow.status}
            </span>
          )}
          {/* Agreement status */}
          {job.agreementStatus && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.38)' }}>
              Agreement: {job.agreementStatus?.replace('_', ' ')}
            </span>
          )}
          {/* Other party */}
          {role === 'CLIENT' && job.freelancer && (
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
              Freelancer: {job.freelancer.name}
            </span>
          )}
          {role === 'FREELANCER' && job.client && (
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
              Client: {job.client.name}
            </span>
          )}
        </div>

        {/* Deadline */}
        {job.deadline && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', marginTop: 4 }}>
            Deadline: {fmtDate(job.deadline)} &middot; Posted {fmtRelative(job.createdAt)}
          </div>
        )}
      </div>

      {/* Right: chevron */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 4 }}>
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  )
}

//  Main page 
export default function MyJobsPage() {
  const { user }      = useAuth()
  const isClient      = user?.role === 'CLIENT'
  const isFreelancer  = user?.role === 'FREELANCER'

  const [jobs,    setJobs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [tabId,   setTabId]   = useState('all')

  const TABS = isClient ? CLIENT_TABS : FL_TABS

  const fetchJobs = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      // Freelancers use ?myJobs=true to get their assigned/active jobs
      const url = isFreelancer ? '/jobs?myJobs=true&limit=100' : '/jobs?limit=100'
      const { data } = await api.get(url)
      setJobs(data.jobs || [])
    } catch (err) {
      setError(errMsg(err))
    } finally { setLoading(false) }
  }, [isFreelancer])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const tab      = TABS.find(t => t.id === tabId) || TABS[0]
  const filtered = tab.statuses
    ? jobs.filter(j => tab.statuses.includes(j.status))
    : jobs

  // Count pending actions for badge
  const pendingCount = isFreelancer
    ? jobs.filter(j => pendingAction(j, 'FREELANCER')).length
    : 0

  const tabCount = (t) => {
    if (!t.statuses) return jobs.length
    return jobs.filter(j => t.statuses.includes(j.status)).length
  }

  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", color: '#f8fafc' }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc', marginBottom: 4, letterSpacing: '-.3px' }}>My Jobs</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.45)' }}>
            {jobs.length} total job{jobs.length !== 1 ? 's' : ''}
            {pendingCount > 0 && (
              <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 100, background: 'rgba(244,63,94,.15)', color: '#f43f5e', border: '1px solid rgba(244,63,94,.3)' }}>
                {pendingCount} action{pendingCount !== 1 ? 's' : ''} required
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchJobs}
            style={{ padding: '8px 14px', borderRadius: 9, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.6)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Refresh
          </button>
          {isClient && (
            <Link to="/post-job" style={{ padding: '8px 16px', borderRadius: 9, background: '#14b8a6', color: '#07111d', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              + Post Job
            </Link>
          )}
        </div>
      </div>

      {/* Pending action alert (freelancer) */}
      {isFreelancer && pendingCount > 0 && !loading && (
        <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: 'rgba(251,191,36,.07)', border: '1px solid rgba(251,191,36,.25)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', marginBottom: 2 }}>
              {pendingCount} pending action{pendingCount !== 1 ? 's' : ''} need your attention
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>
              Check jobs with an action badge to sign agreements or submit work.
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', padding: 4, borderRadius: 12, marginBottom: 20, overflowX: 'auto', width: 'fit-content', maxWidth: '100%' }}>
        {TABS.map(t => {
          const cnt = tabCount(t)
          const isActive = t.id === tabId
          return (
            <button key={t.id} onClick={() => setTabId(t.id)}
              style={{ padding: '6px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, transition: 'all .18s', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
                background: isActive ? '#14b8a6' : 'transparent',
                color: isActive ? '#07111d' : 'rgba(255,255,255,.45)' }}>
              {t.label}
              {cnt > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, borderRadius: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isActive ? 'rgba(0,0,0,.2)' : 'rgba(255,255,255,.1)',
                  color: isActive ? '#07111d' : 'rgba(255,255,255,.6)', padding: '0 4px' }}>
                  {cnt}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: 80, borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)', animation: 'pulse 1.5s ease-in-out infinite' }}/>
          ))}
          <style>{`@keyframes pulse { 0%,100% { opacity:.5 } 50% { opacity:1 } }`}</style>
        </div>
      ) : error ? (
        <div style={{ padding: '32px', textAlign: 'center', background: 'rgba(244,63,94,.06)', borderRadius: 12, border: '1px solid rgba(244,63,94,.2)' }}>
          <div style={{ fontSize: 14, color: '#fb7185', marginBottom: 12 }}>{error}</div>
          <button onClick={fetchJobs} style={{ padding: '8px 20px', borderRadius: 9, background: '#14b8a6', border: 'none', color: '#07111d', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '48px 32px', textAlign: 'center', background: 'rgba(255,255,255,.03)', borderRadius: 14, border: '1px solid rgba(255,255,255,.07)' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" strokeLinecap="round" style={{ display: 'block', margin: '0 auto 12px' }}>
            <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
          </svg>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,.4)', marginBottom: 16 }}>
            {tab.id === 'all' ? 'No jobs yet' : `No ${tab.label.toLowerCase()} jobs`}
          </div>
          {isClient ? (
            <Link to="/post-job" style={{ display: 'inline-flex', padding: '9px 20px', borderRadius: 9, background: '#14b8a6', color: '#07111d', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
              Post a Job
            </Link>
          ) : (
            <Link to="/jobs" style={{ display: 'inline-flex', padding: '9px 20px', borderRadius: 9, background: '#14b8a6', color: '#07111d', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
              Browse Jobs
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(job => <JobRow key={job.id} job={job} role={user?.role} />)}
        </div>
      )}
    </div>
  )
}
