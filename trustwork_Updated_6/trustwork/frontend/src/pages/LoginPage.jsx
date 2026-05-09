import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { errMsg } from '../utils/helpers'

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const C = { teal: '#14b8a6', purple: '#818cf8', orange: '#fb923c', bg: '#07111d', text: '#f8fafc', sub: 'rgba(255,255,255,0.38)', border: 'rgba(255,255,255,0.1)', card: 'rgba(255,255,255,0.03)' }

const ROLES = [
  { id: 'CLIENT',     label: 'Client',     tagline: 'Post jobs & release payments',    accent: C.teal,   bg: 'rgba(20,184,166,0.08)',   demo: { phone: '9876543210', email: 'arjun@example.com' } },
  { id: 'FREELANCER', label: 'Freelancer', tagline: 'Find work & get paid securely',   accent: C.purple, bg: 'rgba(129,140,248,0.08)',  demo: { phone: '9876543212', email: 'rahul@example.com' } },
]

// ---------------------------------------------------------------------------
// Shared atoms
// ---------------------------------------------------------------------------
const css = `
  @keyframes tw-spin { to { transform: rotate(360deg) } }
  @keyframes tw-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-18px) } }
  @keyframes tw-in { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
  @keyframes tw-panel { from { opacity:0; transform:scale(0.97) } to { opacity:1; transform:scale(1) } }
  .tw-fade { animation: tw-in 0.28s cubic-bezier(.22,1,.36,1) both }
  .tw-panel { animation: tw-panel 0.4s cubic-bezier(.22,1,.36,1) both }
  * { box-sizing: border-box; margin: 0; padding: 0 }
  input:-webkit-autofill { -webkit-box-shadow: 0 0 0 100px #0e1c2f inset !important; -webkit-text-fill-color: #f8fafc !important }
  ::-webkit-scrollbar { display: none }
  @media (max-width: 860px) { .tw-left { display: none !important } .tw-right { flex: 1 !important; padding: 24px !important } }
`

function Spinner() {
  return <svg style={{ animation: 'tw-spin .7s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
}

function Input({ value, onChange, placeholder, type = 'text', icon, autoFocus, disabled, onKeyDown, accent = C.teal, prefix }) {
  const [focused, setFocused] = useState(false)
  const base = {
    width: '100%', padding: '13px 44px 13px', paddingLeft: icon ? 44 : prefix ? 52 : 16,
    background: 'rgba(255,255,255,0.05)', border: `1.5px solid ${focused ? accent : C.border}`,
    boxShadow: focused ? `0 0 0 3px ${accent}20` : 'none',
    borderRadius: 12, color: C.text, fontSize: 15, fontFamily: 'inherit',
    outline: 'none', transition: 'all .2s', opacity: disabled ? .5 : 1,
  }
  return (
    <div style={{ position: 'relative' }}>
      {icon && <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused ? accent : 'rgba(255,255,255,.3)', transition: 'color .2s', pointerEvents: 'none', display: 'flex' }}>{icon}</span>}
      {prefix && <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontFamily: 'monospace', color: 'rgba(255,255,255,.35)', pointerEvents: 'none', userSelect: 'none' }}>{prefix}</span>}
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        type={type} autoFocus={autoFocus} disabled={disabled} onKeyDown={onKeyDown}
        onFocus={e => setFocused(true)} onBlur={e => setFocused(false)} style={base} />
    </div>
  )
}

function PasswordInput({ value, onChange, placeholder, autoFocus, onKeyDown, accent = C.teal }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <Input value={value} onChange={onChange} placeholder={placeholder}
        type={show ? 'text' : 'password'} autoFocus={autoFocus} onKeyDown={onKeyDown} accent={accent}
        icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
      />
      <button onClick={() => setShow(s => !s)} type="button"
        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,.3)', cursor: 'pointer', display: 'flex', padding: 4 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {show ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
        </svg>
      </button>
    </div>
  )
}

function Btn({ onClick, disabled, loading, children, accent = C.teal, ghost = false, sm = false }) {
  return (
    <button onClick={onClick} disabled={disabled || loading} type="button"
      style={{
        width: '100%', padding: sm ? '10px 16px' : '13px 20px', borderRadius: 12,
        fontSize: sm ? 13 : 15, fontWeight: 700, fontFamily: 'inherit', cursor: disabled || loading ? 'not-allowed' : 'pointer',
        border: ghost ? `1.5px solid rgba(255,255,255,.09)` : 'none',
        background: ghost ? 'transparent' : accent,
        color: ghost ? 'rgba(255,255,255,.4)' : '#07111d',
        opacity: disabled || loading ? .65 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'all .15s',
      }}>
      {loading && <Spinner />}
      {children}
    </button>
  )
}

function OTPInput({ value, onChange, accent = C.teal }) {
  const refs = useRef([])
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '')
  const change = (i, e) => {
    const d = e.target.value.replace(/\D/g, '').slice(-1)
    onChange(digits.map((v, idx) => idx === i ? d : v).join(''))
    if (d && i < 5) refs.current[i + 1]?.focus()
  }
  const keydown = (i, e) => {
    if (e.key === 'Backspace') { onChange(digits.map((v, idx) => idx === i ? '' : v).join('')); if (!digits[i] && i > 0) refs.current[i - 1]?.focus() }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus()
  }
  const paste = e => { const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6); onChange(p); refs.current[Math.min(p.length, 5)]?.focus(); e.preventDefault() }
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {digits.map((d, i) => (
        <input key={i} ref={el => refs.current[i] = el} type="text" inputMode="numeric" maxLength={1} value={d}
          onChange={e => change(i, e)} onKeyDown={e => keydown(i, e)} onPaste={paste} autoFocus={i === 0}
          style={{ width: 46, height: 54, textAlign: 'center', fontSize: 22, fontWeight: 700, fontFamily: 'monospace',
            color: C.text, background: d ? `${accent}18` : 'rgba(255,255,255,.04)',
            border: `1.5px solid ${d ? accent + '60' : C.border}`, borderRadius: 12,
            outline: 'none', transition: 'all .18s', caretColor: accent }}
          onFocus={e => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${accent}18` }}
          onBlur={e => { e.target.style.borderColor = d ? accent + '60' : C.border; e.target.style.boxShadow = 'none' }}
        />
      ))}
    </div>
  )
}

function MethodToggle({ method, setMethod, accent }) {
  return (
    <div style={{ display: 'flex', background: 'rgba(255,255,255,.04)', borderRadius: 12, padding: 4, marginBottom: 22, gap: 4 }}>
      {[['otp', 'Mobile + OTP'], ['email', 'Email + Password']].map(([m, label]) => (
        <button key={m} onClick={() => setMethod(m)} type="button"
          style={{ flex: 1, padding: '9px 6px', borderRadius: 9, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 13, fontWeight: 600, transition: 'all .2s',
            background: method === m ? accent : 'transparent',
            color: method === m ? '#07111d' : 'rgba(255,255,255,.35)' }}>
          {label}
        </button>
      ))}
    </div>
  )
}

function RoleIcon({ id, color, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {id === 'CLIENT'
        ? <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></>
        : <><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="2"/></>}
    </svg>
  )
}

function RolePill({ r }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px 3px 7px', borderRadius: 100, background: r.bg, border: `1px solid ${r.accent}40`, marginBottom: 14 }}>
      <RoleIcon id={r.id} color={r.accent} size={12} />
      <span style={{ fontSize: 11, fontWeight: 600, color: r.accent }}>{r.label}</span>
    </div>
  )
}

function DemoBox({ phone, email, note, accent }) {
  return (
    <div style={{ padding: '10px 13px', borderRadius: 10, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', fontSize: 12, color: 'rgba(255,255,255,.35)', marginBottom: 18, lineHeight: 1.7 }}>
      <span style={{ fontWeight: 600, color: 'rgba(255,255,255,.5)' }}>Demo: </span>
      <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,.6)' }}>{phone || email}</span>
      {note && <span> &mdash; {note}</span>}
    </div>
  )
}

function DevOTP({ otp, accent }) {
  return (
    <div style={{ padding: '10px 13px', borderRadius: 10, background: `${accent}10`, border: `1px solid ${accent}25`, fontSize: 12, color: accent, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      Dev OTP: <strong style={{ fontFamily: 'monospace', letterSpacing: '.14em', fontSize: 15 }}>{otp}</strong>
    </div>
  )
}

function ProgressBar({ step, accent }) {
  return (
    <div style={{ display: 'flex', gap: 5, marginBottom: 22 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, transition: 'background .3s',
          background: i < step ? accent : i === step ? accent + '90' : 'rgba(255,255,255,.08)' }} />
      ))}
    </div>
  )
}

function Divider({ text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.07)' }} />
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,.25)' }}>{text}</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.07)' }} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  // state
  const [method,   setMethod]  = useState('otp')      // 'otp' | 'email'
  const [step,     setStep]    = useState('role')      // 'role' | 'phone' | 'otp' | 'creds'
  const [role,     setRole]    = useState(null)
  const [phone,    setPhone]   = useState('')
  const [otp,      setOtp]     = useState('')
  const [ident,    setIdent]   = useState('')
  const [pass,     setPass]    = useState('')
  const [loading,  setLoading] = useState(false)
  const [devOtp,   setDevOtp]  = useState('')
  const [phoneErr, setPhoneErr] = useState('')

  const ar = ROLES.find(r => r.id === role)
  const accent = ar?.accent || C.teal

  const stepIdx = step === 'role' ? 0 : step === 'phone' || step === 'creds' ? 1 : 2

  const pickRole = r => {
    setRole(r.id); setPhone(r.demo.phone); setIdent(r.demo.email)
    setOtp(''); setPass(''); setDevOtp(''); setPhoneErr('')
    setStep(method === 'otp' ? 'phone' : 'creds')
  }

  const switchMethod = m => {
    setMethod(m); setStep('role'); setRole(null)
    setOtp(''); setPass(''); setDevOtp(''); setPhoneErr('')
  }

  const sendOTP = async () => {
    setPhoneErr('')
    if (!/^[6-9]\d{9}$/.test(phone)) { setPhoneErr('Enter a valid 10-digit Indian mobile number'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/send-otp', { phone })
      if (data.otp) setDevOtp(data.otp)
      toast.success('OTP sent!'); setStep('otp')
    } catch (err) { toast.error(errMsg(err)) }
    finally { setLoading(false) }
  }

  const verifyOTP = async () => {
    if (otp.length < 6) { toast.error('Enter the 6-digit OTP'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/verify-otp', { phone, otp, role })
      login(data.token, data.user)
      if (data.isNewUser) { toast.success('Welcome! Complete your profile.'); navigate('/register') }
      else { toast.success('Welcome back, ' + data.user.name + '!'); navigate('/dashboard') }
    } catch (err) { toast.error(errMsg(err)) }
    finally { setLoading(false) }
  }

  const loginEmail = async () => {
    if (!ident.trim() || !pass) { toast.error('Enter your email/ID and password'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { identifier: ident, password: pass })
      login(data.token, data.user)
      toast.success('Welcome back, ' + data.user.name + '!'); navigate('/dashboard')
    } catch (err) { toast.error(errMsg(err)) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', fontFamily: "'DM Sans',system-ui,sans-serif", position: 'relative', overflow: 'hidden' }}>
      <style>{css}</style>

      {/* BG blobs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '8%', left: '5%', width: 500, height: 500, background: 'radial-gradient(circle,rgba(20,184,166,.13) 0%,transparent 65%)', borderRadius: '50%', animation: 'tw-float 10s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '8%', right: '5%', width: 380, height: 380, background: 'radial-gradient(circle,rgba(129,140,248,.1) 0%,transparent 65%)', borderRadius: '50%', animation: 'tw-float 13s ease-in-out infinite reverse' }} />
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: .025 }}>
          <defs><pattern id="twg" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.5"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#twg)"/>
        </svg>
      </div>

      {/* Left hero panel */}
      <div className="tw-left" style={{ flex: '0 0 48%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '44px 52px', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg,#14b8a6,#0d9488)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#07111d' }}>TW</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: C.text, letterSpacing: '-.5px' }}>TrustWork</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', letterSpacing: '.12em' }}>SECURE ESCROW PLATFORM</div>
          </div>
        </div>

        {/* Hero copy */}
        <div>
          <h1 style={{ fontSize: 'clamp(36px,4vw,56px)', fontWeight: 800, lineHeight: 1.08, color: C.text, letterSpacing: '-2px', marginBottom: 20 }}>
            Work with<br/><span style={{ color: C.teal }}>confidence.</span><br/>Get paid<br/>with trust.
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,.38)', lineHeight: 1.75, maxWidth: 380, marginBottom: 32 }}>
            India's escrow-backed freelance marketplace. Funds locked until work is approved.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[['Escrow Protected', C.teal], ['Instant UPI Payouts', '#fbbf24'], ['Dispute Resolution', C.purple]].map(([l, c]) => (
              <span key={l} style={{ padding: '7px 14px', borderRadius: 100, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', fontSize: 12, color: c }}>{l}</span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 36, paddingTop: 28, borderTop: '1px solid rgba(255,255,255,.07)' }}>
          {[['2.4Cr+', 'SECURED'], ['12k+', 'FREELANCERS'], ['99.2%', 'RESOLVED']].map(([n, l]) => (
            <div key={l}>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: '-1px' }}>{n}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', letterSpacing: '.1em', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right auth panel */}
      <div className="tw-right" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, position: 'relative', zIndex: 1 }}>
        <div className="tw-panel" style={{ width: '100%', maxWidth: 420, background: C.card, border: '1px solid rgba(255,255,255,.08)', borderRadius: 24, padding: '32px 32px 28px', backdropFilter: 'blur(24px)' }}>

          {/* Admin link */}
          <div style={{ textAlign: 'right', marginBottom: 14 }}>
            <Link to="/admin/login" style={{ fontSize: 12, color: 'rgba(255,255,255,.28)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Admin Login
            </Link>
          </div>

          {/* Progress bar */}
          <ProgressBar step={stepIdx} accent={accent} />

          {/* Method toggle  show on role + creds steps */}
          {(step === 'role' || step === 'creds') && (
            <MethodToggle method={method} setMethod={switchMethod} accent={C.teal} />
          )}

          {/* ---- STEP: role selection ---- */}
          {step === 'role' && (
            <div className="tw-fade">
              <div style={{ fontSize: 21, fontWeight: 700, color: C.text, letterSpacing: '-.5px', marginBottom: 6 }}>
                {method === 'otp' ? 'Select your role' : 'Sign in as'}
              </div>
              <div style={{ fontSize: 13, color: C.sub, marginBottom: 20 }}>
                {method === 'otp' ? 'Choose your role to login with mobile OTP' : 'Choose your role to login with email'}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {ROLES.map(r => (
                  <div key={r.id} onClick={() => pickRole(r)}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, background: r.bg, border: `1.5px solid ${r.accent}45`, cursor: 'pointer', transition: 'all .18s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = r.accent; e.currentTarget.style.transform = 'translateY(-1px)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = r.accent + '45'; e.currentTarget.style.transform = 'none' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${r.accent}18`, border: `1px solid ${r.accent}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <RoleIcon id={r.id} color={r.accent} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: r.accent, marginBottom: 2 }}>{r.label}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,.35)' }}>{r.tagline}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={r.accent} strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                ))}
              </div>

              <Divider text="new to trustwork?" />
              <Link to="/register" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px', borderRadius: 12, border: '1.5px solid rgba(255,255,255,.09)', color: 'rgba(255,255,255,.5)', textDecoration: 'none', fontSize: 14, fontWeight: 600, transition: 'all .15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.teal + '60'; e.currentTarget.style.color = C.teal }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.09)'; e.currentTarget.style.color = 'rgba(255,255,255,.5)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                Create a free account
              </Link>
            </div>
          )}

          {/* ---- STEP: phone entry ---- */}
          {step === 'phone' && ar && (
            <div className="tw-fade">
              <RolePill r={ar} />
              <div style={{ fontSize: 21, fontWeight: 700, color: C.text, letterSpacing: '-.5px', marginBottom: 6 }}>Enter your number</div>
              <div style={{ fontSize: 13, color: C.sub, marginBottom: 20 }}>We'll send a one-time password to verify</div>
              <DemoBox phone={ar.demo.phone} note="OTP: 123456" accent={accent} />
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,.35)', marginBottom: 7, letterSpacing: '.08em', textTransform: 'uppercase' }}>Mobile Number</label>
                <Input value={phone} onChange={v => { setPhone(v.replace(/\D/g, '')); setPhoneErr('') }}
                  placeholder="9876543210" type="tel" autoFocus prefix="+91"
                  onKeyDown={e => e.key === 'Enter' && sendOTP()} accent={accent} />
                {phoneErr && <div style={{ fontSize: 12, color: '#fb7185', marginTop: 5 }}>{phoneErr}</div>}
              </div>
              <Btn onClick={sendOTP} loading={loading} accent={accent}>Send OTP</Btn>
              <div style={{ marginTop: 8 }}>
                <Btn onClick={() => setStep('role')} ghost>Change role</Btn>
              </div>
              <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'rgba(255,255,255,.3)' }}>
                New here? <Link to="/register" style={{ color: accent, textDecoration: 'none', fontWeight: 600 }}>Create account</Link>
              </div>
            </div>
          )}

          {/* ---- STEP: OTP verify ---- */}
          {step === 'otp' && ar && (
            <div className="tw-fade">
              <RolePill r={ar} />
              <div style={{ fontSize: 21, fontWeight: 700, color: C.text, letterSpacing: '-.5px', marginBottom: 6 }}>Enter OTP</div>
              <div style={{ fontSize: 13, color: C.sub, marginBottom: 20 }}>
                Sent to <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,.65)', fontSize: 13 }}>+91 {phone}</span>
              </div>
              {devOtp && <DevOTP otp={devOtp} accent={accent} />}
              <div style={{ marginBottom: 22 }}>
                <OTPInput value={otp} onChange={setOtp} accent={accent} />
              </div>
              <Btn onClick={verifyOTP} loading={loading} disabled={otp.length < 6} accent={otp.length >= 6 ? accent : 'rgba(255,255,255,.12)'}>
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </Btn>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <Btn onClick={() => { setStep('phone'); setOtp(''); setDevOtp('') }} ghost sm>Change number</Btn>
                <Btn onClick={sendOTP} disabled={loading} ghost sm>Resend OTP</Btn>
              </div>
            </div>
          )}

          {/* ---- STEP: email + password ---- */}
          {step === 'creds' && ar && (
            <div className="tw-fade">
              <RolePill r={ar} />
              <div style={{ fontSize: 21, fontWeight: 700, color: C.text, letterSpacing: '-.5px', marginBottom: 6 }}>Sign in</div>
              <div style={{ fontSize: 13, color: C.sub, marginBottom: 20 }}>Use your email address or User ID</div>
              <DemoBox email={ar.demo.email} note="use OTP login (no password set on demo)" accent={accent} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 4 }}>
                <Input value={ident} onChange={setIdent} placeholder="Email or User ID (TW-xxxxxx)" type="email" autoFocus accent={accent}
                  onKeyDown={e => e.key === 'Enter' && loginEmail()}
                  icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
                />
                <PasswordInput value={pass} onChange={setPass} placeholder="Password"
                  onKeyDown={e => e.key === 'Enter' && loginEmail()} accent={accent} />
              </div>
              <div style={{ textAlign: 'right', marginBottom: 16 }}>
                <Link to="/forgot-password" style={{ fontSize: 12, color: 'rgba(255,255,255,.32)', textDecoration: 'none' }}>Forgot password?</Link>
              </div>
              <Btn onClick={loginEmail} loading={loading} accent={accent}>Sign In</Btn>
              <div style={{ marginTop: 8 }}>
                <Btn onClick={() => setStep('role')} ghost>Change role</Btn>
              </div>
              <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'rgba(255,255,255,.3)' }}>
                New here? <Link to="/register" style={{ color: accent, textDecoration: 'none', fontWeight: 600 }}>Create a free account</Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
