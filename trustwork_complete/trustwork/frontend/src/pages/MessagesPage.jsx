// MessagesPage.jsx  Inbox listing all job conversations
// /chat  shows list of jobs with message previews + unread counts
// Clicking a job opens /chat/:jobId

import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { fmtRelative } from '../utils/helpers'

export default function MessagesPage() {
  const { user }    = useAuth()
  const navigate    = useNavigate()
  const [jobs,      setJobs]      = useState([])
  const [unread,    setUnread]    = useState({})
  const [previews,  setPreviews]  = useState({})
  const [loading,   setLoading]   = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch jobs where user is a party
      const url = user?.role === 'FREELANCER' ? '/jobs?myJobs=true&limit=50' : '/jobs?limit=50'
      const [jobsRes, unreadRes] = await Promise.all([
        api.get(url),
        api.get('/chat/unread/all').catch(() => ({ data: { byJob: {}, total: 0 } })),
      ])

      const jobList = jobsRes.data.jobs || []
      // Only show assigned jobs (have a freelancer)
      const activeJobs = jobList.filter(j => j.freelancerId)
      setJobs(activeJobs)
      setUnread(unreadRes.data.byJob || {})

      // Fetch last message preview for each job (top 10)
      const previewMap = {}
      await Promise.all(
        activeJobs.slice(0, 10).map(async j => {
          try {
            const { data } = await api.get(`/chat/${j.id}?limit=1`)
            const msgs = data.messages || []
            if (msgs.length > 0) previewMap[j.id] = msgs[msgs.length - 1]
          } catch {}
        })
      )
      setPreviews(previewMap)
    } catch {}
    finally { setLoading(false) }
  }, [user?.role])

  useEffect(() => { load() }, [load])

  const totalUnread = Object.values(unread).reduce((s, v) => s + v, 0)

  const STATUS_COLOR = {
    COMPLETED: '#34d399', IN_PROGRESS: '#60a5fa', ASSIGNED: '#fbbf24',
    DISPUTED: '#f43f5e', FUNDED: '#fbbf24', CREATED: '#94a3b8',
  }

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", color:'#f8fafc' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4, letterSpacing:'-.3px' }}>
            Messages
            {totalUnread > 0 && (
              <span style={{ marginLeft:10, fontSize:13, fontWeight:700, padding:'2px 10px', borderRadius:100, background:'rgba(244,63,94,.15)', color:'#f43f5e', border:'1px solid rgba(244,63,94,.3)' }}>
                {totalUnread} unread
              </span>
            )}
          </h1>
          <p style={{ fontSize:13, color:'rgba(255,255,255,.45)', margin:0 }}>
            Job conversations  click any job to open the chat
          </p>
        </div>
        <button onClick={load} style={{ padding:'8px 14px', borderRadius:9, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.6)', fontSize:13, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh
        </button>
      </div>

      {/* Job conversation list */}
      {loading ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ height:76, borderRadius:13, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.06)', animation:'pulse 1.5s ease-in-out infinite' }}/>
          ))}
          <style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:.7}}`}</style>
        </div>
      ) : jobs.length === 0 ? (
        <div style={{ padding:'56px 32px', textAlign:'center', background:'rgba(255,255,255,.03)', borderRadius:16, border:'1px solid rgba(255,255,255,.07)' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" strokeLinecap="round" style={{ display:'block', margin:'0 auto 14px' }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <div style={{ fontSize:15, fontWeight:600, color:'rgba(255,255,255,.5)', marginBottom:6 }}>No conversations yet</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,.35)', marginBottom:16 }}>
            Chats open once a freelancer is assigned to a job.
          </div>
          <Link to={user?.role === 'CLIENT' ? '/post-job' : '/jobs'}
            style={{ padding:'9px 20px', borderRadius:9, background:'#14b8a6', color:'#07111d', textDecoration:'none', fontWeight:700, fontSize:13 }}>
            {user?.role === 'CLIENT' ? 'Post a Job' : 'Browse Jobs'}
          </Link>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {jobs.map(job => {
            const unreadCount = unread[job.id] || 0
            const preview     = previews[job.id]
            const otherParty  = user?.id === job.clientId ? job.freelancer : job.client
            const statusColor = STATUS_COLOR[job.status] || '#94a3b8'

            return (
              <div key={job.id}
                onClick={() => navigate(`/chat/${job.id}`)}
                style={{ display:'flex', gap:14, alignItems:'center', padding:'14px 18px', background: unreadCount > 0 ? 'rgba(20,184,166,.04)' : 'rgba(255,255,255,.04)', border:`1px solid ${unreadCount > 0 ? 'rgba(20,184,166,.2)' : 'rgba(255,255,255,.08)'}`, borderRadius:13, cursor:'pointer', transition:'all .18s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(20,184,166,.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = unreadCount > 0 ? 'rgba(20,184,166,.2)' : 'rgba(255,255,255,.08)'}>

                {/* Avatar */}
                <div style={{ width:44, height:44, borderRadius:'50%', background:'linear-gradient(135deg,rgba(20,184,166,.3),rgba(129,140,248,.3))', border:'2px solid rgba(255,255,255,.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, color:'#f8fafc', flexShrink:0 }}>
                  {otherParty?.name?.[0]?.toUpperCase() || '?'}
                </div>

                {/* Content */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:3 }}>
                    <div style={{ fontWeight: unreadCount > 0 ? 700 : 600, fontSize:14, color:'#f8fafc', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'60%' }}>
                      {job.title}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                      {preview && <span style={{ fontSize:11, color:'rgba(255,255,255,.35)' }}>{fmtRelative(preview.createdAt)}</span>}
                      {unreadCount > 0 && (
                        <span style={{ minWidth:20, height:20, borderRadius:100, background:'#14b8a6', color:'#07111d', fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 6px' }}>
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:12, color:'rgba(255,255,255,.5)' }}>{otherParty?.name || 'Unknown'}</span>
                    <span style={{ width:3, height:3, borderRadius:'50%', background:'rgba(255,255,255,.2)', flexShrink:0 }}/>
                    <span style={{ fontSize:11, fontWeight:600, color:statusColor }}>{job.status?.replace(/_/g,' ')}</span>
                  </div>
                  <div style={{ fontSize:12, color: unreadCount > 0 ? 'rgba(255,255,255,.65)' : 'rgba(255,255,255,.38)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight: unreadCount > 0 ? 500 : 400 }}>
                    {preview
                      ? (preview.sender?.id === user?.id ? 'You: ' : '') + preview.content
                      : 'No messages yet  start the conversation'}
                  </div>
                </div>

                {/* Chevron */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink:0 }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
