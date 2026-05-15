import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import { errMsg } from '../utils/helpers'

const T = '#14b8a6'
const css = `
  @keyframes tw-spin { to { transform:rotate(360deg) } }
  @keyframes tw-in { from { opacity:0;transform:translateY(10px) } to { opacity:1;transform:translateY(0) } }
  .tw-fade { animation: tw-in 0.28s ease both }
  * { box-sizing:border-box; margin:0; padding:0 }
`

function useInput(init = '') {
  const [val, set] = useState(init)
  return [val, e => set(typeof e === 'string' ? e : e.target.value)]
}

function Field({ label, children, hint, error }) {
  return (
    <div>
      {label && <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,.35)', marginBottom: 7, letterSpacing: '.08em', textTransform: 'uppercase' }}>{label}</label>}
      {children}
      {hint  && !error && <div style={{ fontSize: 11, color: 'rgba(255,255,255,.28)', marginTop: 5 }}>{hint}</div>}
      {error && <div style={{ fontSize: 12, color: '#fb7185', marginTop: 5 }}>{error}</div>}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', autoFocus, accent = T }) {
  const [f, setF] = useState(false)
  return (
    <input value={value} onChange={onChange} placeholder={placeholder} type={type} autoFocus={autoFocus}
      onFocus={e => { setF(true); e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${accent}18` }}
      onBlur={e => { setF(false); e.target.style.borderColor = 'rgba(255,255,255,.1)'; e.target.style.boxShadow = 'none' }}
      style={{ width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,.05)', border: `1.5px solid rgba(255,255,255,.1)`, borderRadius: 12, color: '#f8fafc', fontSize: 15, fontFamily: 'inherit', outline: 'none', transition: 'all .2s' }} />
  )
}

function PrimaryBtn({ onClick, loading, children }) {
  return (
    <button onClick={onClick} disabled={loading} type="button"
      style={{ width: '100%', padding: '13px', background: T, border: 'none', borderRadius: 12, color: '#07111d', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {loading && <svg style={{ animation: 'tw-spin .7s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>}
      {children}
    </button>
  )
}

export default function ForgotPasswordPage() {
  const [step,      setStep]    = useState('email')  // email | sent | reset | done
  const [email,     onEmail]    = useInput('')
  const [token,     onToken]    = useInput('')
  const [pass,      onPass]     = useInput('')
  const [confirm,   onConfirm]  = useInput('')
  const [showPass,  setShowPass] = useState(false)
  const [loading,   setLoading] = useState(false)
  const [devToken,  setDevToken] = useState('')

  const sendReset = async () => {
    if (!email.trim()) { toast.error('Enter your email address'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error('Enter a valid email address'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/forgot-password', { email })
      if (data.resetToken) setDevToken(data.resetToken)
      setStep('sent'); toast.success('Reset email sent!')
    } catch (err) { toast.error(errMsg(err)) }
    finally { setLoading(false) }
  }

  const doReset = async () => {
    if (!token.trim())   { toast.error('Enter the reset token'); return }
    if (pass.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pass)) { toast.error('Password needs uppercase, lowercase and a number'); return }
    if (pass !== confirm) { toast.error('Passwords do not match'); return }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password: pass })
      setStep('done'); toast.success('Password reset!')
    } catch (err) { toast.error(errMsg(err)) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#07111d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans',system-ui,sans-serif", padding: 24 }}>
      <style>{css}</style>
      <div style={{ width: '100%', maxWidth: 420, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 24, padding: '36px 32px 28px', backdropFilter: 'blur(24px)' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#14b8a6,#0d9488)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: '#07111d' }}>TW</div>
          <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: 16 }}>TrustWork</div>
        </div>

        {/* STEP: enter email */}
        {step === 'email' && (
          <div className="tw-fade">
            <div style={{ fontSize: 21, fontWeight: 700, color: '#f8fafc', marginBottom: 6, letterSpacing: '-.5px' }}>Forgot password?</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.38)', marginBottom: 24, lineHeight: 1.6 }}>Enter your registered email and we'll send a reset link.</div>
            <div style={{ marginBottom: 20 }}>
              <Field label="Email Address">
                <Input value={email} onChange={onEmail} placeholder="your@email.com" type="email" autoFocus />
              </Field>
            </div>
            <PrimaryBtn onClick={sendReset} loading={loading}>{loading ? 'Sending...' : 'Send Reset Link'}</PrimaryBtn>
          </div>
        )}

        {/* STEP: email sent */}
        {step === 'sent' && (
          <div className="tw-fade">
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${T}15`, border: `1px solid ${T}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T} strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>Check your email</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.38)', marginBottom: 20, lineHeight: 1.6 }}>
              Sent reset link to <strong style={{ color: T }}>{email}</strong>
            </div>
            {devToken && (
              <div style={{ padding: '11px 13px', borderRadius: 10, background: `${T}10`, border: `1px solid ${T}25`, fontSize: 12, color: T, marginBottom: 20, lineHeight: 1.8 }}>
                <strong>Dev mode token:</strong><br/>
                <code style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>{devToken}</code>
              </div>
            )}
            <PrimaryBtn onClick={() => setStep('reset')}>Enter Reset Token</PrimaryBtn>
            <button onClick={() => setStep('email')} type="button"
              style={{ width: '100%', marginTop: 8, padding: '12px', background: 'transparent', border: '1.5px solid rgba(255,255,255,.09)', borderRadius: 12, color: 'rgba(255,255,255,.4)', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
              Try a different email
            </button>
          </div>
        )}

        {/* STEP: enter token + new password */}
        {step === 'reset' && (
          <div className="tw-fade">
            <div style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', marginBottom: 6 }}>Set new password</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.38)', marginBottom: 20 }}>Paste the token from your email and choose a new password.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <Field label="Reset Token">
                <Input value={token} onChange={onToken} placeholder="Paste token from email" autoFocus />
              </Field>
              <Field label="New Password" hint="Min 8 chars, must include A-Z, a-z, 0-9">
                <div style={{ position: 'relative' }}>
                  <Input value={pass} onChange={onPass} type={showPass ? 'text' : 'password'} placeholder="New password" />
                  <button onClick={() => setShowPass(s => !s)} type="button"
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,.3)', cursor: 'pointer', display: 'flex', padding: 4 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      {showPass ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                    </svg>
                  </button>
                </div>
              </Field>
              <Field label="Confirm Password" error={confirm && confirm !== pass ? 'Passwords do not match' : null}>
                <input value={confirm} onChange={onConfirm} type="password" placeholder="Re-enter new password"
                  style={{ width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,.05)', border: `1.5px solid ${confirm && confirm !== pass ? '#f43f5e' : 'rgba(255,255,255,.1)'}`, borderRadius: 12, color: '#f8fafc', fontSize: 15, fontFamily: 'inherit', outline: 'none', transition: 'all .2s' }} />
              </Field>
            </div>
            <PrimaryBtn onClick={doReset} loading={loading}>{loading ? 'Resetting...' : 'Reset Password'}</PrimaryBtn>
          </div>
        )}

        {/* STEP: done */}
        {step === 'done' && (
          <div className="tw-fade" style={{ textAlign: 'center' }}>
            <div style={{ width: 54, height: 54, borderRadius: '50%', background: `${T}15`, border: `2px solid ${T}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>Password Reset!</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.38)', marginBottom: 24, lineHeight: 1.6 }}>Your password has been updated. Sign in with your new password.</div>
            <Link to="/login" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '13px', background: T, borderRadius: 12, color: '#07111d', fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
              Go to Login
            </Link>
          </div>
        )}

        {step !== 'done' && (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Link to="/login" style={{ fontSize: 13, color: 'rgba(255,255,255,.3)', textDecoration: 'none' }}>Back to login</Link>
          </div>
        )}
      </div>
    </div>
  )
}
