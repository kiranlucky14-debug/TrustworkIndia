import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { errMsg } from '../utils/helpers'

const O = '#fb923c'
const css = `
  @keyframes tw-spin { to { transform:rotate(360deg) } }
  @keyframes tw-in { from { opacity:0;transform:translateY(10px) } to { opacity:1;transform:translateY(0) } }
  .tw-fade { animation: tw-in 0.28s ease both }
  * { box-sizing:border-box; margin:0; padding:0 }
`

const inputStyle = {
  width: '100%', padding: '13px 16px 13px 44px',
  background: 'rgba(255,255,255,.05)',
  border: '1.5px solid rgba(255,255,255,.1)',
  borderRadius: 12, color: '#f8fafc', fontSize: 15,
  fontFamily: 'inherit', outline: 'none', transition: 'all .2s',
}

function focusStyle(e, on, accent = O) {
  e.target.style.borderColor = on ? accent : 'rgba(255,255,255,.1)'
  e.target.style.boxShadow   = on ? `0 0 0 3px ${accent}20` : 'none'
}

function Spinner() {
  return <svg style={{ animation: 'tw-spin .7s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
}

const ROLE_OPTS = [
  { role: 'CLIENT',     label: 'Login as Client',     color: '#14b8a6', desc: 'Test client job-posting and escrow flows' },
  { role: 'FREELANCER', label: 'Login as Freelancer', color: '#818cf8', desc: 'Test freelancer apply and payment flows' },
  { role: 'ADMIN',      label: 'Stay as Admin',       color: O,         desc: 'Admin dashboard and dispute management' },
]

export default function AdminLoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [id,       setId]       = useState('9876543214')
  const [pass,     setPass]     = useState('Admin@123')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [panel,    setPanel]    = useState(false)   // false = login form | true = role switcher
  const [switching,setSwitching]= useState(null)

  const doLogin = async () => {
    if (!id.trim() || !pass.trim()) { toast.error('Enter credentials'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/admin/login', { identifier: id, password: pass })
      // Store token before login() so AdminRoute reads fresh state
      localStorage.setItem('tw_token', data.token)
      localStorage.setItem('tw_user', JSON.stringify(data.user))
      login(data.token, data.user)
      toast.success('Admin authenticated')
      // Hard redirect ensures AdminRoute reads fresh localStorage state
      window.location.href = '/admin/dashboard' 
    } catch (err) { toast.error(errMsg(err)) }
    finally { setLoading(false) }
  }

  const loginAs = async (targetRole) => {
    setSwitching(targetRole)
    try {
      const { data } = await api.post('/auth/admin/login-as', { targetRole })
      localStorage.setItem('tw_token', data.token)
      localStorage.setItem('tw_user', JSON.stringify(data.user))
      login(data.token, data.user)
      toast.success('Switched to ' + data.user.name + ' (' + targetRole + ')')
      window.location.href = targetRole === 'ADMIN' ? '/admin/dashboard' : '/dashboard' 
    } catch (err) { toast.error(errMsg(err)) }
    finally { setSwitching(null) }
  }

  const doLogout = () => {
    login(null, null)   // clears auth context
    localStorage.removeItem('tw_token')
    localStorage.removeItem('tw_user')
    setPanel(false); setPass('')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#07111d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans',system-ui,sans-serif", padding: 24, position: 'relative', overflow: 'hidden' }}>
      <style>{css}</style>

      {/* bg blobs */}
      <div style={{ position: 'absolute', top: '8%', right: '8%',  width: 380, height: 380, background: 'radial-gradient(circle,rgba(251,146,60,.13) 0%,transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '8%', left: '8%', width: 280, height: 280, background: 'radial-gradient(circle,rgba(20,184,166,.08) 0%,transparent 65%)',  borderRadius: '50%', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: panel ? 520 : 400 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg,#fb923c,#ea580c)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#07111d" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f8fafc', letterSpacing: '-.5px', marginBottom: 4 }}>
            {panel ? 'Admin Panel' : 'Admin Login'}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.35)' }}>
            {panel ? 'Switch role to test platform flows' : 'Restricted access - TrustWork admins only'}
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 20, padding: '28px 28px 24px', backdropFilter: 'blur(24px)' }}>

          {/* ------- LOGIN FORM ------- */}
          {!panel && (
            <div className="tw-fade">
              {/* Demo hint */}
              <div style={{ padding: '10px 13px', borderRadius: 10, background: `${O}10`, border: `1px solid ${O}25`, fontSize: 12, color: O, marginBottom: 20, lineHeight: 1.65 }}>
                <strong>Demo admin credentials:</strong><br/>
                Phone: <code style={{ fontFamily: 'monospace' }}>9876543214</code> &nbsp;|&nbsp; Password: <code style={{ fontFamily: 'monospace' }}>Admin@123</code>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {/* Identifier */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,.35)', marginBottom: 7, letterSpacing: '.08em', textTransform: 'uppercase' }}>Email / Phone / User ID</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.3)', display: 'flex', pointerEvents: 'none' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </span>
                    <input value={id} onChange={e => setId(e.target.value)} placeholder="9876543214 or admin@trustwork.in"
                      type="text" autoFocus onKeyDown={e => e.key === 'Enter' && doLogin()}
                      onFocus={e => focusStyle(e, true)} onBlur={e => focusStyle(e, false)}
                      style={inputStyle} />
                  </div>
                </div>
                {/* Password */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,.35)', marginBottom: 7, letterSpacing: '.08em', textTransform: 'uppercase' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.3)', display: 'flex', pointerEvents: 'none' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </span>
                    <input value={pass} onChange={e => setPass(e.target.value)} placeholder="Admin password"
                      type={showPass ? 'text' : 'password'} onKeyDown={e => e.key === 'Enter' && doLogin()}
                      onFocus={e => focusStyle(e, true)} onBlur={e => focusStyle(e, false)}
                      style={inputStyle} />
                    <button onClick={() => setShowPass(p => !p)} type="button"
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,.3)', cursor: 'pointer', display: 'flex', padding: 4 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        {showPass ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <button onClick={doLogin} disabled={loading} type="button"
                style={{ width: '100%', padding: '13px', background: O, border: 'none', borderRadius: 12, color: '#07111d', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading && <Spinner />}
                {loading ? 'Authenticating...' : 'Access Admin Panel'}
              </button>

              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Link to="/login" style={{ fontSize: 13, color: 'rgba(255,255,255,.3)', textDecoration: 'none' }}>Back to user login</Link>
              </div>
            </div>
          )}

          {/* ------- ROLE SWITCHER ------- */}
          {panel && (
            <div className="tw-fade">
              {/* Auth badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, background: `${O}10`, border: `1px solid ${O}25`, marginBottom: 20 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={O} strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: O }}>Admin authenticated</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.38)' }}>Select a role to test the platform</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {ROLE_OPTS.map(({ role, label, color, desc }) => (
                  <button key={role} onClick={() => loginAs(role)} disabled={!!switching} type="button"
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14,
                      background: `${color}0c`, border: `1.5px solid ${color}30`,
                      cursor: switching ? 'not-allowed' : 'pointer', textAlign: 'left',
                      opacity: switching && switching !== role ? .45 : 1,
                      transition: 'all .18s', fontFamily: 'inherit', width: '100%' }}
                    onMouseEnter={e => { if (!switching) { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-1px)' }}}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = color + '30'; e.currentTarget.style.transform = 'none' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {switching === role
                        ? <Spinner />
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color, marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,.35)' }}>{desc}</div>
                    </div>
                    {!switching && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>}
                  </button>
                ))}
              </div>

              <button onClick={doLogout} type="button"
                style={{ width: '100%', padding: '11px', background: 'transparent', border: '1.5px solid rgba(255,255,255,.08)', borderRadius: 10, color: 'rgba(255,255,255,.35)', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
