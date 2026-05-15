import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { errMsg } from '../utils/helpers'
import CategorySkillPicker from '../components/CategorySkillPicker'

// ---------------------------------------------------------------------------
// Design tokens - same as LoginPage
// ---------------------------------------------------------------------------
const C = {
  teal: '#14b8a6', purple: '#818cf8', orange: '#fb923c',
  bg: '#07111d', text: '#f8fafc', sub: 'rgba(255,255,255,0.38)',
  border: 'rgba(255,255,255,0.1)', card: 'rgba(255,255,255,0.03)',
}

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Chandigarh','Puducherry','Jammu and Kashmir','Ladakh',
]


const EXP_LEVELS = [
  'Beginner (0-1 years)','Intermediate (2-4 years)',
  'Advanced (5-8 years)','Expert (9+ years)',
]

const globalCss = `
  @keyframes tw-spin { to { transform:rotate(360deg) } }
  @keyframes tw-float { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-16px) } }
  @keyframes tw-in { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
  @keyframes tw-scale { from { opacity:0; transform:scale(0.96) } to { opacity:1; transform:scale(1) } }
  .tw-fade { animation: tw-in 0.3s cubic-bezier(.22,1,.36,1) both }
  .tw-scale { animation: tw-scale 0.35s cubic-bezier(.22,1,.36,1) both }
  * { box-sizing:border-box; margin:0; padding:0 }
  input:-webkit-autofill { -webkit-box-shadow:0 0 0 100px #0e1c2f inset !important; -webkit-text-fill-color:#f8fafc !important }
  select option { background:#1e293b; color:#f8fafc }
  ::-webkit-scrollbar { width:4px }
  ::-webkit-scrollbar-track { background:transparent }
  ::-webkit-scrollbar-thumb { background:rgba(255,255,255,.1); border-radius:2px }
`

// ---------------------------------------------------------------------------
// Atoms
// ---------------------------------------------------------------------------
function Spinner({ size = 16 }) {
  return (
    <svg style={{ animation: 'tw-spin .7s linear infinite', flexShrink: 0 }} width={size} height={size}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  )
}

function TwInput({ label, value, onChange, placeholder, type = 'text', required, hint, error, accent, prefix, disabled, autoFocus }) {
  const [f, setF] = useState(false)
  const ac = accent || C.teal
  return (
    <div>
      {label && (
        <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,.38)', marginBottom: 6, letterSpacing: '.07em', textTransform: 'uppercase' }}>
          {label}{required && <span style={{ color: '#fb7185', marginLeft: 3 }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {prefix && (
          <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontFamily: 'monospace', color: 'rgba(255,255,255,.35)', pointerEvents: 'none', userSelect: 'none' }}>{prefix}</span>
        )}
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          type={type} autoFocus={autoFocus} disabled={disabled}
          onFocus={e => { setF(true); e.target.style.borderColor = ac; e.target.style.boxShadow = `0 0 0 3px ${ac}20` }}
          onBlur={e => { setF(false); e.target.style.borderColor = error ? '#f43f5e' : C.border; e.target.style.boxShadow = 'none' }}
          style={{
            width: '100%', padding: `12px 14px`, paddingLeft: prefix ? 44 : 14,
            background: 'rgba(255,255,255,.05)',
            border: `1.5px solid ${error ? '#f43f5e' : C.border}`,
            borderRadius: 10, color: C.text, fontSize: 14, fontFamily: 'inherit',
            outline: 'none', transition: 'all .18s', opacity: disabled ? .5 : 1,
          }}
        />
      </div>
      {error && <div style={{ fontSize: 11, color: '#fb7185', marginTop: 4 }}>{error}</div>}
      {hint && !error && <div style={{ fontSize: 11, color: 'rgba(255,255,255,.25)', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

function TwSelect({ label, value, onChange, options, placeholder, required, error, accent }) {
  const [f, setF] = useState(false)
  const ac = accent || C.teal
  return (
    <div>
      {label && (
        <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,.38)', marginBottom: 6, letterSpacing: '.07em', textTransform: 'uppercase' }}>
          {label}{required && <span style={{ color: '#fb7185', marginLeft: 3 }}>*</span>}
        </label>
      )}
      <select value={value} onChange={e => onChange(e.target.value)}
        onFocus={e => { e.target.style.borderColor = ac; e.target.style.boxShadow = `0 0 0 3px ${ac}20` }}
        onBlur={e => { e.target.style.borderColor = error ? '#f43f5e' : C.border; e.target.style.boxShadow = 'none' }}
        style={{
          width: '100%', padding: '12px 14px',
          background: 'rgba(255,255,255,.05)',
          border: `1.5px solid ${error ? '#f43f5e' : C.border}`,
          borderRadius: 10, color: value ? C.text : 'rgba(255,255,255,.38)',
          fontSize: 14, fontFamily: 'inherit', outline: 'none', transition: 'all .18s',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: 16,
        }}>
        <option value="">{placeholder || 'Select...'}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {error && <div style={{ fontSize: 11, color: '#fb7185', marginTop: 4 }}>{error}</div>}
    </div>
  )
}

function PasswordField({ label, value, onChange, placeholder, required, error, accent, hint }) {
  const [show, setShow] = useState(false)
  const [f, setF] = useState(false)
  const ac = accent || C.teal
  return (
    <div>
      {label && (
        <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,.38)', marginBottom: 6, letterSpacing: '.07em', textTransform: 'uppercase' }}>
          {label}{required && <span style={{ color: '#fb7185', marginLeft: 3 }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          type={show ? 'text' : 'password'}
          onFocus={e => { setF(true); e.target.style.borderColor = ac; e.target.style.boxShadow = `0 0 0 3px ${ac}20` }}
          onBlur={e => { setF(false); e.target.style.borderColor = error ? '#f43f5e' : C.border; e.target.style.boxShadow = 'none' }}
          style={{
            width: '100%', padding: '12px 40px 12px 14px',
            background: 'rgba(255,255,255,.05)',
            border: `1.5px solid ${error ? '#f43f5e' : C.border}`,
            borderRadius: 10, color: C.text, fontSize: 14, fontFamily: 'inherit',
            outline: 'none', transition: 'all .18s',
          }}
        />
        <button onClick={() => setShow(s => !s)} type="button"
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,.3)', cursor: 'pointer', display: 'flex', padding: 4 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {show ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
          </svg>
        </button>
      </div>
      {error && <div style={{ fontSize: 11, color: '#fb7185', marginTop: 4 }}>{error}</div>}
      {hint && !error && <div style={{ fontSize: 11, color: 'rgba(255,255,255,.25)', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

function ProgressBar({ step, total, accent }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Step {step} of {total}</span>
        <span style={{ fontSize: 11, color: accent }}>{Math.round((step / total) * 100)}%</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,.07)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(step / total) * 100}%`, background: `linear-gradient(to right, ${accent}, ${accent}cc)`, borderRadius: 2, transition: 'width .4s ease' }} />
      </div>
    </div>
  )
}

function PrimaryBtn({ onClick, loading, disabled, children, accent, fullWidth = true }) {
  const ac = accent || C.teal
  return (
    <button onClick={onClick} disabled={disabled || loading} type="button"
      style={{
        width: fullWidth ? '100%' : 'auto', padding: '13px 24px',
        background: disabled || loading ? 'rgba(255,255,255,.08)' : ac,
        border: 'none', borderRadius: 11,
        color: disabled || loading ? 'rgba(255,255,255,.3)' : '#07111d',
        fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'all .18s',
      }}>
      {loading && <Spinner />}
      {children}
    </button>
  )
}

function SecondaryBtn({ onClick, children }) {
  return (
    <button onClick={onClick} type="button"
      style={{ width: '100%', padding: '12px', background: 'transparent', border: '1.5px solid rgba(255,255,255,.09)', borderRadius: 11, color: 'rgba(255,255,255,.4)', fontSize: 14, fontFamily: 'inherit', cursor: 'pointer', transition: 'all .15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.18)'; e.currentTarget.style.color = 'rgba(255,255,255,.7)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.09)'; e.currentTarget.style.color = 'rgba(255,255,255,.4)' }}>
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Step 0: Role picker
// ---------------------------------------------------------------------------
function RolePicker({ onSelect }) {
  const roles = [
    {
      id: 'CLIENT', label: 'Client', accent: C.teal, bg: 'rgba(20,184,166,.08)', border: 'rgba(20,184,166,.3)',
      tagline: 'Post jobs and hire talented freelancers',
      perks: ['Post unlimited jobs', 'Secure escrow payments', 'Verified freelancers'],
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <rect x="2" y="7" width="20" height="14" rx="2"/>
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
          <line x1="12" y1="12" x2="12" y2="16"/>
          <line x1="10" y1="14" x2="14" y2="14"/>
        </svg>
      ),
    },
    {
      id: 'FREELANCER', label: 'Freelancer', accent: C.purple, bg: 'rgba(129,140,248,.08)', border: 'rgba(129,140,248,.3)',
      tagline: 'Find work and get paid securely',
      perks: ['Browse 1000+ jobs', 'Milestone-based payments', 'Build your reputation'],
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
          <circle cx="12" cy="12" r="2"/>
          <path d="M6 12h.01M18 12h.01"/>
        </svg>
      ),
    },
  ]

  return (
    <div className="tw-fade">
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: C.text, letterSpacing: '-.5px', marginBottom: 8 }}>
          Who are you?
        </div>
        <div style={{ fontSize: 14, color: C.sub }}>Choose your role to create the right account</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {roles.map(r => (
          <button key={r.id} onClick={() => onSelect(r.id)} type="button"
            style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '18px 18px', borderRadius: 14, background: r.bg, border: `1.5px solid ${r.border}`, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all .18s', width: '100%' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 32px ${r.accent}20` }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: `${r.accent}18`, border: `1px solid ${r.accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: r.accent, flexShrink: 0 }}>
              {r.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: r.accent, marginBottom: 4 }}>{r.label}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', marginBottom: 10 }}>{r.tagline}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {r.perks.map(p => (
                  <span key={p} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100, background: `${r.accent}12`, color: r.accent, border: `1px solid ${r.accent}25` }}>{p}</span>
                ))}
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={r.accent} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 16 }}><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'rgba(255,255,255,.3)' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: C.teal, textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Client registration form - 2 steps
// ---------------------------------------------------------------------------
function ClientForm({ onSuccess, accent }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name: '', email: '', phone: '', companyName: '', gstNumber: '',
    city: '', state: '', password: '', confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const set = (k) => (v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: null })) }

  const validateStep1 = () => {
    const e = {}
    if (!form.name.trim())  e.name  = 'Full name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.phone.trim()) e.phone = 'Mobile number is required'
    else if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = 'Enter a valid 10-digit mobile number'
    setErrors(e); return Object.keys(e).length === 0
  }

  const validateStep2 = () => {
    const e = {}
    if (!form.city.trim())  e.city  = 'City is required'
    if (!form.state)        e.state = 'State is required'
    if (!form.password)     e.password = 'Password is required'
    else if (form.password.length < 8) e.password = 'Minimum 8 characters'
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) e.password = 'Must include A-Z, a-z and a number'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match'
    setErrors(e); return Object.keys(e).length === 0
  }

  const nextStep = () => { if (validateStep1()) setStep(2) }

  const submit = async () => {
    if (!validateStep2()) return
    setLoading(true)
    try {
      const { data } = await api.post('/auth/signup', {
        name:        form.name.trim(),
        email:       form.email.trim().toLowerCase(),
        phone:       form.phone.trim(),
        password:    form.password,
        role:        'CLIENT',
        companyName: form.companyName.trim() || undefined,
        gstNumber:   form.gstNumber.trim()   || undefined,
        city:        form.city.trim(),
        state:       form.state,
      })
      login(data.token, data.user)
      toast.success('Account created! Complete your profile.')
      navigate('/register')
    } catch (err) { toast.error(errMsg(err)) }
    finally { setLoading(false) }
  }

  return (
    <div className="tw-fade">
      <ProgressBar step={step} total={2} accent={accent} />

      {/* Step header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: '-.3px', marginBottom: 4 }}>
          {step === 1 ? 'Your details' : 'Location & security'}
        </div>
        <div style={{ fontSize: 13, color: C.sub }}>
          {step === 1 ? 'Basic information about you and your business' : 'Where you are based and secure your account'}
        </div>
      </div>

      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <TwInput label="Full Name" value={form.name} onChange={set('name')} placeholder="Arjun Sharma" required error={errors.name} accent={accent} autoFocus />
            <TwInput label="Company Name" value={form.companyName} onChange={set('companyName')} placeholder="Acme Pvt Ltd" accent={accent} />
          </div>
          <TwInput label="Email Address" value={form.email} onChange={set('email')} placeholder="you@company.com" type="email" required error={errors.email} accent={accent} />
          <TwInput label="Mobile Number" value={form.phone} onChange={v => set('phone')(v.replace(/\D/g,'').slice(0,10))} placeholder="9876543210" prefix="+91" required error={errors.phone} accent={accent} />
          <TwInput label="GST Number" value={form.gstNumber} onChange={v => set('gstNumber')(v.toUpperCase())} placeholder="22AAAAA0000A1Z5 (optional)" accent={accent} />

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <SecondaryBtn onClick={() => onSuccess(null)}>Back</SecondaryBtn>
            <PrimaryBtn onClick={nextStep} accent={accent}>
              Continue
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </PrimaryBtn>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <TwInput label="City" value={form.city} onChange={set('city')} placeholder="Mumbai" required error={errors.city} accent={accent} autoFocus />
            <TwSelect label="State" value={form.state} onChange={set('state')} options={INDIAN_STATES} required error={errors.state} accent={accent} />
          </div>
          <PasswordField label="Password" value={form.password} onChange={set('password')} placeholder="Min 8 chars, A-Z, a-z, 0-9" required error={errors.password} accent={accent}
            hint="Must include uppercase, lowercase and a number" />
          <PasswordField label="Confirm Password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Re-enter password" required error={errors.confirmPassword} accent={accent} />

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <SecondaryBtn onClick={() => setStep(1)}>Back</SecondaryBtn>
            <PrimaryBtn onClick={submit} loading={loading} accent={accent}>
              {loading ? 'Creating account...' : 'Create Account'}
            </PrimaryBtn>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Freelancer registration form - 2 steps
// ---------------------------------------------------------------------------
function FreelancerForm({ onSuccess, accent }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    skills: [], experienceLevel: '', portfolioUrl: '',
    city: '', state: '', password: '', confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const set = (k) => (v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: null })) }

  const validateStep1 = () => {
    const e = {}
    if (!form.name.trim())  e.name  = 'Full name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.phone.trim()) e.phone = 'Mobile number is required'
    else if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = 'Enter a valid 10-digit mobile number'
    if (form.skills.length === 0) e.skills = 'Select at least one skill'
    if (!form.experienceLevel) e.experienceLevel = 'Select your experience level'
    setErrors(e); return Object.keys(e).length === 0
  }

  const validateStep2 = () => {
    const e = {}
    if (!form.city.trim())  e.city  = 'City is required'
    if (!form.state)        e.state = 'State is required'
    if (!form.password)     e.password = 'Password is required'
    else if (form.password.length < 8) e.password = 'Minimum 8 characters'
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) e.password = 'Must include A-Z, a-z and a number'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match'
    setErrors(e); return Object.keys(e).length === 0
  }

  const nextStep = () => { if (validateStep1()) setStep(2) }

  const submit = async () => {
    if (!validateStep2()) return
    setLoading(true)
    try {
      const { data } = await api.post('/auth/signup', {
        name:            form.name.trim(),
        email:           form.email.trim().toLowerCase(),
        phone:           form.phone.trim(),
        password:        form.password,
        role:            'FREELANCER',
        city:            form.city.trim(),
        state:           form.state,
        experienceLevel: form.experienceLevel,
        portfolioUrl:    form.portfolioUrl.trim() || undefined,
      })
      login(data.token, data.user)
      toast.success('Account created! Complete your profile.')
      navigate('/register')
    } catch (err) { toast.error(errMsg(err)) }
    finally { setLoading(false) }
  }

  return (
    <div className="tw-fade">
      <ProgressBar step={step} total={2} accent={accent} />

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: '-.3px', marginBottom: 4 }}>
          {step === 1 ? 'Your expertise' : 'Location & security'}
        </div>
        <div style={{ fontSize: 13, color: C.sub }}>
          {step === 1 ? 'Tell clients what you do and your experience' : 'Where you work from and secure your account'}
        </div>
      </div>

      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <TwInput label="Full Name" value={form.name} onChange={set('name')} placeholder="Rahul Dev" required error={errors.name} accent={accent} autoFocus />
            <TwSelect label="Experience Level" value={form.experienceLevel} onChange={set('experienceLevel')} options={EXP_LEVELS} required error={errors.experienceLevel} accent={accent} />
          </div>
          <TwInput label="Email Address" value={form.email} onChange={set('email')} placeholder="you@example.com" type="email" required error={errors.email} accent={accent} />
          <TwInput label="Mobile Number" value={form.phone} onChange={v => set('phone')(v.replace(/\D/g,'').slice(0,10))} placeholder="9876543210" prefix="+91" required error={errors.phone} accent={accent} />
          <TwInput label="Portfolio URL" value={form.portfolioUrl} onChange={set('portfolioUrl')} placeholder="https://yourportfolio.com (optional)" accent={accent} />

          {/* Categorized skill picker */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,.38)', letterSpacing: '.07em', textTransform: 'uppercase' }}>
                Skills <span style={{ color: '#fb7185' }}>*</span>
              </label>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.28)' }}>{form.skills.length}/10 selected</span>
            </div>
            <CategorySkillPicker
              selected={form.skills}
              onChange={skills => { setForm(f => ({ ...f, skills })); setErrors(e => ({ ...e, skills: null })) }}
              max={10}
              accent={accent}
            />
            {errors.skills && <div style={{ fontSize: 11, color: '#fb7185', marginTop: 6 }}>{errors.skills}</div>}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <SecondaryBtn onClick={() => onSuccess(null)}>Back</SecondaryBtn>
            <PrimaryBtn onClick={nextStep} accent={accent}>
              Continue
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </PrimaryBtn>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <TwInput label="City" value={form.city} onChange={set('city')} placeholder="Bengaluru" required error={errors.city} accent={accent} autoFocus />
            <TwSelect label="State" value={form.state} onChange={set('state')} options={INDIAN_STATES} required error={errors.state} accent={accent} />
          </div>
          <PasswordField label="Password" value={form.password} onChange={set('password')} placeholder="Min 8 chars, A-Z, a-z, 0-9" required error={errors.password} accent={accent}
            hint="Must include uppercase, lowercase and a number" />
          <PasswordField label="Confirm Password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Re-enter password" required error={errors.confirmPassword} accent={accent} />

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <SecondaryBtn onClick={() => setStep(1)}>Back</SecondaryBtn>
            <PrimaryBtn onClick={submit} loading={loading} accent={accent}>
              {loading ? 'Creating account...' : 'Create Account'}
            </PrimaryBtn>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main SignupPage
// ---------------------------------------------------------------------------
export default function SignupPage() {
  const { roleParam } = useParams()    // 'client' | 'freelancer' | undefined
  const navigate = useNavigate()

  // Derive initial role from URL param
  const initialRole = roleParam === 'client' ? 'CLIENT' : roleParam === 'freelancer' ? 'FREELANCER' : null
  const [selectedRole, setSelectedRole] = useState(initialRole)

  const accent = selectedRole === 'FREELANCER' ? C.purple : C.teal

  const handleRoleSelect = (role) => {
    setSelectedRole(role)
    navigate(role === 'CLIENT' ? '/signup/client' : '/signup/freelancer', { replace: true })
  }

  const handleBack = () => {
    setSelectedRole(null)
    navigate('/signup', { replace: true })
  }

  // step label for header
  const stepLabel = !selectedRole ? 'Create account' : selectedRole === 'CLIENT' ? 'Client signup' : 'Freelancer signup'

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', fontFamily: "'DM Sans',system-ui,sans-serif", position: 'relative', overflow: 'hidden' }}>
      <style>{globalCss}</style>

      {/* BG blobs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '6%', left: '4%', width: 480, height: 480, background: 'radial-gradient(circle,rgba(20,184,166,.11) 0%,transparent 65%)', borderRadius: '50%', animation: 'tw-float 11s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '6%', right: '4%', width: 360, height: 360, background: 'radial-gradient(circle,rgba(129,140,248,.09) 0%,transparent 65%)', borderRadius: '50%', animation: 'tw-float 14s ease-in-out infinite reverse' }} />
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: .022 }}>
          <defs><pattern id="sig" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.5"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#sig)"/>
        </svg>
      </div>

      {/* Left hero - hidden on mobile */}
      <div className="tw-left" style={{ flex: '0 0 42%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 52px', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', marginBottom: 48 }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#14b8a6,#0d9488)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: '#07111d' }}>TW</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: C.text, letterSpacing: '-.5px' }}>TrustWork</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.28)', letterSpacing: '.12em' }}>SECURE ESCROW PLATFORM</div>
          </div>
        </Link>

        <h2 style={{ fontSize: 'clamp(30px,3.5vw,46px)', fontWeight: 800, lineHeight: 1.1, color: C.text, letterSpacing: '-1.5px', marginBottom: 18 }}>
          Join India's trusted<br/><span style={{ color: C.teal }}>freelance marketplace</span>
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,.4)', lineHeight: 1.75, maxWidth: 340, marginBottom: 32 }}>
          Secure payments, verified profiles, and milestone-based escrow  built for India's freelance economy.
        </p>

        {/* Trust signals */}
        {[
          ['Escrow-protected payments', 'Funds locked until work is approved'],
          ['Verified community', '12,000+ freelancers and growing'],
          ['India-first platform', 'UPI, NEFT, GST invoicing built in'],
        ].map(([t, s]) => (
          <div key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${C.teal}20`, border: `1px solid ${C.teal}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.8)', marginBottom: 2 }}>{t}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.35)' }}>{s}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Right form panel */}
      <div className="tw-right" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 40px', position: 'relative', zIndex: 1 }}>
        <div className="tw-scale" style={{ width: '100%', maxWidth: 500, background: C.card, border: '1px solid rgba(255,255,255,.08)', borderRadius: 24, padding: '32px 32px 28px', backdropFilter: 'blur(24px)', maxHeight: '90vh', overflowY: 'auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {selectedRole && (
                <button onClick={handleBack} type="button"
                  style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.5)', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
              )}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{stepLabel}</div>
                {selectedRole && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', marginTop: 1 }}>
                    <span style={{ color: accent }}>
                      {selectedRole === 'CLIENT' ? 'Client' : 'Freelancer'}
                    </span>{' '}account
                  </div>
                )}
              </div>
            </div>
            <Link to="/login" style={{ fontSize: 12, color: 'rgba(255,255,255,.3)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              Sign in
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </Link>
          </div>

          {/* Content */}
          {!selectedRole && <RolePicker onSelect={handleRoleSelect} />}
          {selectedRole === 'CLIENT'     && <ClientForm onSuccess={handleBack} accent={C.teal} />}
          {selectedRole === 'FREELANCER' && <FreelancerForm onSuccess={handleBack} accent={C.purple} />}

        </div>
      </div>
    </div>
  )
}
