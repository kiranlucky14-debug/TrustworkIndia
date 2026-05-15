// NotificationBell.jsx
// Polls /notifications/count every 30s, shows dropdown of notifications.
// Zero external deps - pure React + inline SVG.

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { fmtRelative } from '../utils/helpers'

const TYPE_CFG = {
  ASSIGNED:           { color: '#14b8a6', icon: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6' },
  AGREEMENT_PENDING:  { color: '#fbbf24', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M12 18v-4M12 14h.01' },
  AGREEMENT_SIGNED:   { color: '#34d399', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 15l2 2 4-4' },
  CHANGES_REQUESTED:  { color: '#fb923c', icon: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' },
  FUNDED:             { color: '#fbbf24', icon: 'M3 11V7a5 5 0 0 1 10 0v4M5 11h14l1 9H4zM12 11v5' },
  SUBMITTED:          { color: '#818cf8', icon: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12' },
  APPROVED:           { color: '#34d399', icon: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3' },
  REJECTED:           { color: '#f43f5e', icon: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01' },
}

function NIcon({ type, size = 16 }) {
  const cfg = TYPE_CFG[type] || TYPE_CFG.ASSIGNED
  return (
    <div style={{ width: size + 8, height: size + 8, borderRadius: '50%', background: `${cfg.color}18`, border: `1px solid ${cfg.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={cfg.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={cfg.icon}/>
      </svg>
    </div>
  )
}

export default function NotificationBell() {
  const [count,   setCount]   = useState(0)
  const [open,    setOpen]    = useState(false)
  const [notifs,  setNotifs]  = useState([])
  const [loading, setLoading] = useState(false)
  const ref     = useRef(null)
  const navigate = useNavigate()

  // Poll unread count every 30s
  const fetchCount = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications/count')
      setCount(data.count || 0)
    } catch {}
  }, [])

  useEffect(() => {
    fetchCount()
    const id = setInterval(fetchCount, 30000)
    return () => clearInterval(id)
  }, [fetchCount])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const openDropdown = async () => {
    setOpen(o => !o)
    if (!open) {
      setLoading(true)
      try {
        const { data } = await api.get('/notifications?limit=15')
        setNotifs(data.notifications || [])
        setCount(data.unreadCount || 0)
      } catch {}
      finally { setLoading(false) }
    }
  }

  const markRead = async (n) => {
    if (!n.read) {
      try { await api.patch(`/notifications/${n.id}/read`) } catch {}
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
      setCount(c => Math.max(0, c - 1))
    }
    if (n.jobId) { navigate(`/jobs/${n.jobId}`); setOpen(false) }
  }

  const markAllRead = async () => {
    try { await api.patch('/notifications/read-all') } catch {}
    setNotifs(prev => prev.map(x => ({ ...x, read: true })))
    setCount(0)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={openDropdown}
        style={{ position: 'relative', width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: open ? 'rgba(20,184,166,.12)' : 'rgba(255,255,255,.05)', border: `1px solid ${open ? 'rgba(20,184,166,.3)' : 'rgba(255,255,255,.08)'}`, cursor: 'pointer', transition: 'all .18s' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={open ? '#14b8a6' : 'rgba(255,255,255,.55)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {count > 0 && (
          <div style={{ position: 'absolute', top: -5, right: -5, minWidth: 16, height: 16, borderRadius: 100, background: '#f43f5e', border: '2px solid #07111d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff', padding: '0 3px' }}>
            {count > 99 ? '99+' : count}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 44, width: 340, maxHeight: 460, overflowY: 'auto', background: '#0e1c2f', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,.6)', zIndex: 200, fontFamily: "'DM Sans',system-ui,sans-serif" }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>Notifications {count > 0 && <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 100, background: 'rgba(244,63,94,.15)', color: '#f43f5e', marginLeft: 6 }}>{count}</span>}</div>
            {count > 0 && (
              <button onClick={markAllRead} style={{ fontSize: 11, color: '#14b8a6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,.4)' }}>Loading...</div>
          ) : notifs.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" strokeLinecap="round" style={{ display: 'block', margin: '0 auto 10px' }}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.3)' }}>No notifications yet</div>
            </div>
          ) : (
            notifs.map(n => (
              <div key={n.id} onClick={() => markRead(n)}
                style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,.05)', cursor: n.jobId ? 'pointer' : 'default', background: n.read ? 'transparent' : 'rgba(20,184,166,.04)', transition: 'background .15s' }}
                onMouseEnter={e => { if (n.jobId) e.currentTarget.style.background = 'rgba(255,255,255,.04)' }}
                onMouseLeave={e => { e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(20,184,166,.04)' }}>
                <NIcon type={n.type} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: n.read ? 500 : 700, color: n.read ? 'rgba(255,255,255,.65)' : '#f8fafc', lineHeight: 1.4 }}>{n.title}</div>
                    {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#14b8a6', flexShrink: 0, marginTop: 3 }}/>}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', lineHeight: 1.5, marginTop: 3 }}>{n.message}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.25)', marginTop: 5 }}>{fmtRelative(n.createdAt)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
