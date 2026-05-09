import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { errMsg } from '../utils/helpers'

const ROLES = [
  {
    id: 'CLIENT',
    label: 'Client',
    tagline: 'Post jobs & release payments',
    accent: '#14b8a6',
    accentBg: 'rgba(20,184,166,0.08)',
    accentBorder: 'rgba(20,184,166,0.3)',
    demo: { phone: '9876543210', name: 'Arjun Sharma' },
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
  },
  {
    id: 'FREELANCER',
    label: 'Freelancer',
    tagline: 'Find work & get paid securely',
    accent: '#818cf8',
    accentBg: 'rgba(129,140,248,0.08)',
    accentBorder: 'rgba(129,140,248,0.3)',
    demo: { phone: '9876543212', name: 'Rahul Dev' },
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>`,
  },
  {
    id: 'ADMIN',
    label: 'Admin',
    tagline: 'Manage platform & disputes',
    accent: '#fb923c',
    accentBg: 'rgba(251,146,60,0.08)',
    accentBorder: 'rgba(251,146,60,0.3)',
    demo: { phone: '9876543214', name: 'Admin User' },
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`,
  },
]

function OTPInput({ value, onChange }) {
  const refs = useRef([])
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '')

  const handleChange = (i, e) => {
    const d = e.target.value.replace(/\D/g, '').slice(-1)
    const next = digits.map((v, idx) => idx === i ? d : v).join('')
    onChange(next)
    if (d && i < 5) refs.current[i + 1]?.focus()
  }
  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      if (!digits[i] && i > 0) { refs.current[i - 1]?.focus() }
      const next = digits.map((v, idx) => idx === i ? '' : v).join('')
      onChange(next)
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus()
  }
  const handlePaste = (e) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(p)
    refs.current[Math.min(p.length, 5)]?.focus()
    e.preventDefault()
  }

  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24 }}>
      {digits.map((d, i) => (
        <input
          key={i} ref={el => refs.current[i] = el}
          type="text" inputMode="numeric" maxLength={1}
          value={d}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          autoFocus={i === 0}
          style={{
            width: 48, height: 58, textAlign: 'center',
            fontSize: 24, fontWeight: 600, letterSpacing: 0,
            fontFamily: "'JetBrains Mono', monospace",
            color: '#f8fafc',
            background: d ? 'rgba(20,184,166,0.1)' : 'rgba(255,255,255,0.04)',
            border: `1.5px solid ${d ? 'rgba(20,184,166,0.45)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 14, outline: 'none', transition: 'all 0.18s',
            caretColor: '#14b8a6',
          }}
          onFocus={e => { e.target.style.borderColor = '#14b8a6'; e.target.style.boxShadow = '0 0 0 3px rgba(20,184,166,0.1)' }}
          onBlur={e => { e.target.style.borderColor = d ? 'rgba(20,184,166,0.45)' : 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }}
        />
      ))}
    </div>
  )
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [step, setStep]   = useState('role')
  const [role, setRole]   = useState(null)
  const [phone, setPhone] = useState('')
  const [otp, setOtp]     = useState('')
  const [name, setName]   = useState('')
  const [isNew, setIsNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [devOtp, setDevOtp]   = useState('')
  const [phoneErr, setPhoneErr] = useState('')

  const activeRole = ROLES.find(r => r.id === role)

  const pickRole = (r) => {
    setRole(r.id); setPhone(r.demo.phone)
    setStep('phone'); setPhoneErr(''); setDevOtp(''); setOtp(''); setIsNew(false); setName('')
  }

  const sendOTP = async () => {
    setPhoneErr('')
    if (!/^[6-9]\d{9}$/.test(phone)) { setPhoneErr('Enter a valid 10-digit Indian mobile number'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/send-otp', { phone })
      if (data.otp) setDevOtp(data.otp)
      toast.success('OTP sent!')
      setStep('otp')
    } catch (err) { toast.error(errMsg(err)) }
    finally { setLoading(false) }
  }

  const verifyOTP = async () => {
    if (otp.length < 6) { toast.error('Enter the 6-digit OTP'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/verify-otp', { phone, otp, role })
      login(data.token, data.user)
      if (data.isNewUser) {
        toast.success('Welcome to TrustWork! Complete your profile to get started.')
        navigate('/register')
      } else {
        toast.success('Welcome back, ' + data.user.name + '!')
        navigate('/dashboard')
      }
    } catch (err) {
      toast.error(errMsg(err))
    } finally { setLoading(false) }
  }

  const ar = activeRole

  return (
    <div style={{ minHeight: '100vh', background: '#07111d', display: 'flex', fontFamily: "'DM Sans', system-ui, sans-serif", position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes floatA{0%,100%{transform:translateY(0) translateX(0)}50%{transform:translateY(-28px) translateX(12px)}}
        @keyframes floatB{0%,100%{transform:translateY(0)}50%{transform:translateY(20px) translateX(-18px)}}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes panelIn{from{opacity:0;transform:scale(0.97) translateY(16px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .fade-slide{animation:fadeSlide 0.35s cubic-bezier(0.22,1,0.36,1) both}
        .role-card{cursor:pointer;transition:transform 0.2s,border-color 0.2s,background 0.2s}
        .role-card:hover{transform:translateY(-2px)}
        .btn-main{cursor:pointer;transition:filter 0.15s,transform 0.15s}
        .btn-main:hover:not(:disabled){filter:brightness(1.09);transform:translateY(-1px)}
        .btn-main:active:not(:disabled){transform:translateY(0)}
        .btn-main:disabled{opacity:0.6;cursor:not-allowed}
        .ghost-btn{cursor:pointer;transition:color 0.15s,border-color 0.15s,background 0.15s}
        .ghost-btn:hover{background:rgba(255,255,255,0.06)!important;border-color:rgba(255,255,255,0.15)!important;color:rgba(255,255,255,0.7)!important}
        input:focus{outline:none}
        ::selection{background:rgba(20,184,166,0.25);color:#f8fafc}
        ::-webkit-scrollbar{display:none}
        @media(max-width:900px){.left-panel{display:none!important}.right-panel{flex:1!important;padding:24px!important}}
      `}</style>

      {/* BG effects */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.03 }}>
          <defs><pattern id="g" width="56" height="56" patternUnits="userSpaceOnUse"><path d="M 56 0 L 0 0 0 56" fill="none" stroke="white" strokeWidth="0.7"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#g)"/>
        </svg>
        <div style={{ position: 'absolute', top: '10%', left: '8%', width: 500, height: 500, background: 'radial-gradient(circle,rgba(20,184,166,0.13) 0%,transparent 65%)', borderRadius: '50%', animation: 'floatA 9s ease-in-out infinite' }}/>
        <div style={{ position: 'absolute', bottom: '8%', right: '3%', width: 380, height: 380, background: 'radial-gradient(circle,rgba(129,140,248,0.1) 0%,transparent 65%)', borderRadius: '50%', animation: 'floatB 11s ease-in-out infinite' }}/>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 70% 50%, rgba(251,146,60,0.04) 0%, transparent 50%)' }}/>
        <div style={{ position: 'absolute', top: 0, right: '40%', width: 1, height: '100%', background: 'linear-gradient(to bottom, transparent 0%, rgba(20,184,166,0.12) 25%, rgba(20,184,166,0.12) 75%, transparent 100%)' }}/>
      </div>

      {/*  Left Panel  */}
      <div className="left-panel" style={{ flex: '0 0 50%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '44px 52px', position: 'relative' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#14b8a6,#0d9488)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 14, color: '#07111d', flexShrink: 0 }}>TW</div>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 19, color: '#f8fafc', letterSpacing: '-0.5px' }}>TrustWork</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', marginTop: 1 }}>SECURE ESCROW PLATFORM</div>
          </div>
        </div>

        {/* Hero */}
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(38px,4.5vw,58px)', fontWeight: 800, lineHeight: 1.08, color: '#f8fafc', letterSpacing: '-2px', marginBottom: 22 }}>
            Work with<br />
            <span style={{ color: '#14b8a6' }}>confidence.</span><br />
            Get paid<br />
            with trust.
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.42)', lineHeight: 1.75, maxWidth: 400, marginBottom: 36 }}>
            India's escrow-backed freelance marketplace. Funds stay locked until work is approved  no disputes, no defaults.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[['','Escrow Protected','#14b8a6'],['','Instant UPI Payout','#fbbf24'],['','Dispute Resolution','#818cf8']].map(([icon, label, color]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 100, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                <span style={{ fontSize: 14 }}>{icon}</span>{label}
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 36, paddingTop: 36, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {[['2.4Cr+','SECURED IN ESCROW'],['12k+','FREELANCERS'],['99.2%','RESOLVED']].map(([n,l]) => (
            <div key={l}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: '#f8fafc', letterSpacing: '-1px' }}>{n}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', marginTop: 3 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/*  Right Panel  */}
      <div className="right-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, position: 'relative' }}>
        <div style={{ width: '100%', maxWidth: 420, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '36px 36px 32px', backdropFilter: 'blur(24px)', animation: 'panelIn 0.5s cubic-bezier(0.22,1,0.36,1) both' }}>

          {/* Step bar */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
            {[0,1,2].map(i => {
              const stepIdx = step === 'role' ? 0 : step === 'phone' ? 1 : 2
              return <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: i < stepIdx ? '#14b8a6' : i === stepIdx ? (ar?.accent || '#14b8a6') : 'rgba(255,255,255,0.1)', transition: 'background 0.35s' }}/>
            })}
          </div>

          {/*  ROLE SELECTION  */}
          {step === 'role' && (
            <div className="fade-slide">
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 23, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px', marginBottom: 6 }}>Who are you?</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', marginBottom: 26, lineHeight: 1.5 }}>Select your role to get the right experience</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {ROLES.map(r => (
                  <div key={r.id} className="role-card" onClick={() => pickRole(r)}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 17px', borderRadius: 14, background: r.accentBg, border: `1.5px solid ${r.accentBorder}`, opacity: 0.85 }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0.85'}
                  >
                    <div style={{ width: 42, height: 42, borderRadius: 11, background: `${r.accent}18`, border: `1px solid ${r.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: r.accent, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: r.icon }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: r.accent, marginBottom: 2 }}>{r.label}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)' }}>{r.tagline}</div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={r.accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.7 }}><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/*  PHONE ENTRY  */}
          {step === 'phone' && ar && (
            <div className="fade-slide">
              {/* Role chip */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 12px 4px 8px', borderRadius: 100, background: ar.accentBg, border: `1px solid ${ar.accentBorder}`, marginBottom: 18 }}>
                <span style={{ color: ar.accent, display: 'flex' }} dangerouslySetInnerHTML={{ __html: ar.icon }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: ar.accent }}>{ar.label}</span>
              </div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 23, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px', marginBottom: 6 }}>Enter your number</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', marginBottom: 22, lineHeight: 1.5 }}>We'll send a one-time password to verify your identity</div>

              {/* Demo hint */}
              <div style={{ padding: '11px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 12, color: 'rgba(255,255,255,0.32)', marginBottom: 20, lineHeight: 1.7 }}>
                <span style={{ color: 'rgba(255,255,255,0.48)', fontWeight: 600 }}>Demo: </span>
                number <span style={{ fontFamily: 'JetBrains Mono', color: 'rgba(255,255,255,0.6)' }}>{ar.demo.phone}</span>  OTP <span style={{ fontFamily: 'JetBrains Mono', color: 'rgba(255,255,255,0.6)' }}>123456</span>
              </div>

              {/* Phone input */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Mobile Number</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono', userSelect: 'none', pointerEvents: 'none' }}>+91</span>
                  <input
                    type="tel" inputMode="numeric" maxLength={10}
                    value={phone}
                    onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setPhoneErr('') }}
                    onKeyDown={e => e.key === 'Enter' && sendOTP()}
                    placeholder="9876543210"
                    autoFocus
                    style={{ width: '100%', padding: '13px 16px 13px 52px', background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.09)', borderRadius: 12, color: '#f8fafc', fontSize: 16, fontFamily: 'JetBrains Mono', letterSpacing: '0.04em', transition: 'all 0.2s', boxSizing: 'border-box' }}
                    onFocus={e => { e.target.style.borderColor = ar.accent; e.target.style.boxShadow = `0 0 0 3px ${ar.accent}18` }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; e.target.style.boxShadow = 'none' }}
                  />
                </div>
                {phoneErr && <div style={{ fontSize: 12, color: '#fb7185', marginTop: 6 }}>{phoneErr}</div>}
              </div>

              {isNew && (
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Full Name</label>
                  <input
                    value={name} onChange={e => setName(e.target.value)} placeholder={ar.demo.name}
                    style={{ width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.09)', borderRadius: 12, color: '#f8fafc', fontSize: 15, fontFamily: 'DM Sans', transition: 'all 0.2s', boxSizing: 'border-box' }}
                    onFocus={e => { e.target.style.borderColor = ar.accent; e.target.style.boxShadow = `0 0 0 3px ${ar.accent}18` }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; e.target.style.boxShadow = 'none' }}
                  />
                </div>
              )}

              <button className="btn-main" onClick={sendOTP} disabled={loading} style={{ width: '100%', padding: '14px 20px', background: ar.accent, border: 'none', borderRadius: 12, color: '#07111d', fontSize: 15, fontWeight: 700, fontFamily: 'DM Sans', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '-0.2px' }}>
                {loading
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.75s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                  : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.64 3.38 2 2 0 0 1 3.63 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.85a16 16 0 0 0 8.24 8.24l1.21-1.87a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 17.92z"/></svg>
                }
                {loading ? 'Sending OTP' : 'Send OTP'}
              </button>
              <button className="ghost-btn" onClick={() => { setStep('role'); setPhone(''); setIsNew(false) }} style={{ width: '100%', marginTop: 10, padding: '12px 20px', background: 'transparent', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: 12, color: 'rgba(255,255,255,0.4)', fontSize: 14, fontFamily: 'DM Sans' }}> Change role</button>
            </div>
          )}

          {/*  OTP VERIFY  */}
          {step === 'otp' && ar && (
            <div className="fade-slide">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 12px 4px 8px', borderRadius: 100, background: ar.accentBg, border: `1px solid ${ar.accentBorder}`, marginBottom: 18 }}>
                <span style={{ color: ar.accent, display: 'flex' }} dangerouslySetInnerHTML={{ __html: ar.icon }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: ar.accent }}>{ar.label}</span>
              </div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 23, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px', marginBottom: 6 }}>Verify OTP</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', marginBottom: 22 }}>
                Sent to <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>+91 {phone}</span>
              </div>

              {devOtp && (
                <div style={{ padding: '11px 14px', borderRadius: 10, background: 'rgba(20,184,166,0.07)', border: '1px solid rgba(20,184,166,0.18)', fontSize: 13, color: '#5eead4', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Dev OTP: <strong style={{ fontFamily: 'JetBrains Mono', letterSpacing: '0.18em', fontSize: 15 }}>{devOtp}</strong>
                </div>
              )}

              <OTPInput value={otp} onChange={setOtp} />

              {isNew && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Your Name</label>
                  <input
                    value={name} onChange={e => setName(e.target.value)} placeholder={ar.demo.name}
                    style={{ width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.09)', borderRadius: 12, color: '#f8fafc', fontSize: 15, fontFamily: 'DM Sans', transition: 'all 0.2s', boxSizing: 'border-box' }}
                    onFocus={e => { e.target.style.borderColor = ar.accent; e.target.style.boxShadow = `0 0 0 3px ${ar.accent}18` }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; e.target.style.boxShadow = 'none' }}
                  />
                </div>
              )}

              <button className="btn-main" onClick={verifyOTP} disabled={loading || otp.length < 6} style={{ width: '100%', padding: '14px 20px', background: otp.length >= 6 ? ar.accent : 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 12, color: otp.length >= 6 ? '#07111d' : 'rgba(255,255,255,0.3)', fontSize: 15, fontWeight: 700, fontFamily: 'DM Sans', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: '-0.2px', transition: 'all 0.25s' }}>
                {loading
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.75s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                  : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                }
                {loading ? 'Verifying' : isNew ? 'Create Account' : 'Sign In'}
              </button>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button className="ghost-btn" onClick={() => { setStep('phone'); setOtp(''); setDevOtp('') }} style={{ flex: 1, padding: '11px', background: 'transparent', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: 12, color: 'rgba(255,255,255,0.38)', fontSize: 13, fontFamily: 'DM Sans' }}> Change number</button>
                <button className="ghost-btn" onClick={sendOTP} disabled={loading} style={{ flex: 1, padding: '11px', background: 'transparent', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: 12, color: 'rgba(255,255,255,0.38)', fontSize: 13, fontFamily: 'DM Sans' }}>Resend OTP</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
