// ChatPage.jsx  Real-time per-job messaging
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { fmtRelative, errMsg } from '../utils/helpers'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const css = `
  @keyframes ch-in { from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)} }
  .ch-bubble { animation: ch-in .18s ease both }
  * { box-sizing: border-box }
  .ch-input { width:100%; padding:10px 14px; background:rgba(255,255,255,.06); border:1.5px solid rgba(255,255,255,.1); border-radius:12px; color:#f8fafc; font-size:14px; font-family:inherit; outline:none; resize:none; transition:all .18s; line-height:1.5 }
  .ch-input:focus { border-color:#14b8a6; box-shadow:0 0 0 3px rgba(20,184,166,.1) }
  .ch-input::placeholder { color:#475569 }
  ::-webkit-scrollbar { width:4px } ::-webkit-scrollbar-track { background:transparent } ::-webkit-scrollbar-thumb { background:rgba(255,255,255,.15);border-radius:2px }
`

export default function ChatPage() {
  const { jobId }       = useParams()
  const { user }        = useAuth()
  const [messages,  setMessages]  = useState([])
  const [job,       setJob]       = useState(null)
  const [text,      setText]      = useState('')
  const [loading,   setLoading]   = useState(true)
  const [sending,   setSending]   = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editText,  setEditText]  = useState('')
  const bottomRef  = useRef(null)
  const socketRef  = useRef(null)
  const token = localStorage.getItem('tw_token')

  // Load messages
  const loadMessages = useCallback(async () => {
    try {
      const [jobRes, chatRes] = await Promise.all([
        api.get(`/jobs/${jobId}`),
        api.get(`/chat/${jobId}`),
      ])
      setJob(jobRes.data)
      setMessages(chatRes.data.messages || [])
    } catch (e) { toast.error(errMsg(e)) }
    finally { setLoading(false) }
  }, [jobId])

  useEffect(() => { loadMessages() }, [loadMessages])

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Socket.io real-time connection
  useEffect(() => {
    const socket = io(API_URL, {
      auth:       { token },
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket._userId = user?.id   // tag socket with current user id for dedup check
    socket.emit('join_job', jobId)

    socket.on('new_message', (msg) => {
      // Skip messages sent by this user  already handled by optimistic update
      setMessages(prev => {
        const alreadyHas = prev.some(m => m.id === msg.id || m.id === 'tmp_' + msg.id)
        if (alreadyHas) return prev
        // Only add if NOT sent by current user (their own msg is in optimistic already)
        if (msg.sender?.id === socket._userId) return prev
        return [...prev, msg]
      })
    })
    socket.on('message_edited', (updated) => {
      setMessages(prev => prev.map(m => m.id === updated.id ? updated : m))
    })
    socket.on('message_deleted', ({ id }) => {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, content: '[Message deleted]', type: 'SYSTEM' } : m))
    })

    return () => {
      socket.emit('leave_job', jobId)
      socket.disconnect()
    }
  }, [jobId, token])

  const send = async () => {
    if (!text.trim()) return
    setSending(true)
    const optimistic = {
      id: 'tmp_' + Date.now(), jobId, content: text.trim(),
      type: 'TEXT', createdAt: new Date().toISOString(),
      sender: { id: user.id, name: user.name, role: user.role },
    }
    setMessages(prev => [...prev, optimistic])
    setText('')
    try {
      const { data } = await api.post(`/chat/${jobId}`, { content: optimistic.content })
      setMessages(prev => prev.map(m => m.id === optimistic.id ? data.message : m))
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      toast.error(errMsg(e))
      setText(optimistic.content)
    }
    setSending(false)
  }

  const saveEdit = async (id) => {
    if (!editText.trim()) return
    try {
      const { data } = await api.patch(`/chat/${jobId}/${id}`, { content: editText })
      setMessages(prev => prev.map(m => m.id === id ? data.message : m))
      setEditingId(null)
    } catch (e) { toast.error(errMsg(e)) }
  }

  const deleteMsg = async (id) => {
    try {
      await api.delete(`/chat/${jobId}/${id}`)
    } catch (e) { toast.error(errMsg(e)) }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const isMe = (msg) => msg.sender?.id === user?.id

  const otherParty = job
    ? user?.id === job.clientId
      ? job.freelancer
      : job.client
    : null

  if (loading) return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", color:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', height:400 }}>
      <style>{css}</style>
      <div style={{ color:'rgba(255,255,255,.4)', fontSize:14 }}>Loading messages...</div>
    </div>
  )

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", color:'#f8fafc', display:'flex', flexDirection:'column', height:'calc(100vh - 120px)', maxWidth:760 }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:'14px 14px 0 0', flexShrink:0 }}>
        <Link to={`/jobs/${jobId}`} style={{ color:'#14b8a6', display:'flex', textDecoration:'none' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </Link>
        <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(20,184,166,.15)', border:'2px solid rgba(20,184,166,.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#14b8a6', flexShrink:0 }}>
          {otherParty?.name?.[0] || '?'}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#f8fafc' }}>{otherParty?.name || 'Chat'}</div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{job?.title}</div>
        </div>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'#34d399', flexShrink:0 }} title="Online"/>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 18px', display:'flex', flexDirection:'column', gap:8, background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.08)', borderTop:'none' }}>
        {messages.length === 0 && (
          <div style={{ textAlign:'center', margin:'auto', color:'rgba(255,255,255,.3)', fontSize:13 }}>
            No messages yet. Start the conversation!
          </div>
        )}
        {messages.map((msg, idx) => {
          const mine     = isMe(msg)
          const isSystem = msg.type === 'SYSTEM' || msg.content === '[Message deleted]'
          const showSender = !mine && (!messages[idx-1] || messages[idx-1].sender?.id !== msg.sender?.id)
          const showTime   = !messages[idx+1] || messages[idx+1].sender?.id !== msg.sender?.id || new Date(messages[idx+1].createdAt) - new Date(msg.createdAt) > 120000

          if (isSystem) return (
            <div key={msg.id} style={{ textAlign:'center', fontSize:11, color:'rgba(255,255,255,.3)', padding:'4px 0' }}>
              {msg.content}
            </div>
          )

          return (
            <div key={msg.id} className="ch-bubble" style={{ display:'flex', flexDirection:'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
              {showSender && !mine && (
                <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginBottom:3, marginLeft:10 }}>{msg.sender?.name}</div>
              )}
              <div style={{ display:'flex', alignItems:'flex-end', gap:6, flexDirection: mine ? 'row-reverse' : 'row', maxWidth:'75%' }}>
                {!mine && (
                  <div style={{ width:26, height:26, borderRadius:'50%', background:'rgba(255,255,255,.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'rgba(255,255,255,.6)', flexShrink:0 }}>
                    {msg.sender?.name?.[0]}
                  </div>
                )}
                <div style={{ position:'relative' }}>
                  {editingId === msg.id ? (
                    <div style={{ display:'flex', gap:6, alignItems:'flex-end' }}>
                      <textarea className="ch-input" value={editText} onChange={e => setEditText(e.target.value)} rows={2} style={{ minWidth:220, maxWidth:360 }}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), saveEdit(msg.id))}/>
                      <button onClick={() => saveEdit(msg.id)} style={{ padding:'6px 12px', borderRadius:8, border:'none', background:'#14b8a6', color:'#07111d', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>Save</button>
                      <button onClick={() => setEditingId(null)} style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,.1)', background:'transparent', color:'rgba(255,255,255,.5)', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}></button>
                    </div>
                  ) : (
                    <div style={{ padding:'9px 13px', borderRadius: mine ? '14px 14px 3px 14px' : '14px 14px 14px 3px', background: mine ? 'rgba(20,184,166,.2)' : 'rgba(255,255,255,.07)', border: `1px solid ${mine ? 'rgba(20,184,166,.3)' : 'rgba(255,255,255,.1)'}`, color:'#f8fafc', fontSize:13, lineHeight:1.55, wordBreak:'break-word' }}>
                      {msg.type === 'FILE' ? (
                        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color:'#14b8a6', display:'flex', alignItems:'center', gap:6, textDecoration:'none' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          {msg.fileName || msg.content}
                        </a>
                      ) : msg.content}
                      {msg.editedAt && <span style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginLeft:6 }}>(edited)</span>}
                    </div>
                  )}
                  {/* Hover actions */}
                  {mine && editingId !== msg.id && msg.type === 'TEXT' && (
                    <div style={{ position:'absolute', top:-24, right:0, display:'flex', gap:4, background:'rgba(14,28,47,.95)', border:'1px solid rgba(255,255,255,.1)', borderRadius:8, padding:'3px 6px', opacity:0 }}
                      className="msg-actions"
                      onMouseEnter={e => e.currentTarget.style.opacity='1'}
                      onMouseLeave={e => e.currentTarget.style.opacity='0'}>
                      <button onClick={() => { setEditingId(msg.id); setEditText(msg.content) }} style={{ background:'none', border:'none', color:'rgba(255,255,255,.5)', cursor:'pointer', fontSize:11, padding:0 }}>Edit</button>
                      <button onClick={() => deleteMsg(msg.id)} style={{ background:'none', border:'none', color:'#f43f5e', cursor:'pointer', fontSize:11, padding:0 }}>Del</button>
                    </div>
                  )}
                </div>
              </div>
              {showTime && (
                <div style={{ fontSize:10, color:'rgba(255,255,255,.28)', marginTop:3, [mine?'marginRight':'marginLeft']:'10px' }}>
                  {fmtRelative(msg.createdAt)}
                </div>
              )}
            </div>
          )
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{ padding:'12px 18px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderTop:'none', borderRadius:'0 0 14px 14px', flexShrink:0 }}>
        <div style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
          <textarea
            className="ch-input"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            rows={1}
            style={{ flex:1, minHeight:42, maxHeight:120 }}
          />
          <button
            onClick={send}
            disabled={sending || !text.trim()}
            style={{ width:42, height:42, borderRadius:12, border:'none', background: text.trim() ? '#14b8a6' : 'rgba(255,255,255,.08)', color: text.trim() ? '#07111d' : 'rgba(255,255,255,.3)', cursor: text.trim() ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .18s' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.25)', marginTop:6 }}>
          Press Enter to send  Shift+Enter for new line
        </div>
      </div>
    </div>
  )
}
