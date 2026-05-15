import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { fmtCurrency, fmtDate, fmtRelative, errMsg } from '../utils/helpers'
import { StarDisplay } from '../components/StarInput'
import ReviewsList from '../components/ReviewsList'
import CategorySkillPicker from '../components/CategorySkillPicker'

//  Design tokens 
const ROLE_CFG = {
  CLIENT:     { label: 'Client',     color: '#60a5fa', bg: 'rgba(96,165,250,.13)',  border: 'rgba(96,165,250,.28)'  },
  FREELANCER: { label: 'Freelancer', color: '#14b8a6', bg: 'rgba(20,184,166,.13)',  border: 'rgba(20,184,166,.28)' },
  ADMIN:      { label: 'Admin',      color: '#fb923c', bg: 'rgba(251,146,60,.13)',   border: 'rgba(251,146,60,.28)'  },
}

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan',
  'Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Delhi','Chandigarh','Puducherry','Jammu and Kashmir','Ladakh',
]
const EXP_LEVELS = ['Beginner (0-1 years)','Intermediate (2-4 years)','Advanced (5-8 years)','Expert (9+ years)']
const BIZ_TYPES  = ['Individual','Proprietorship','Partnership','LLP','Private Limited','Public Limited','Enterprise']

//  Stylesheet 
const css = `
  @keyframes tw-in   { from { opacity:0;transform:translateY(8px) } to { opacity:1;transform:translateY(0) } }
  @keyframes tw-spin { to   { transform:rotate(360deg) } }
  .tw-fade  { animation:tw-in .28s ease both }
  * { box-sizing:border-box }
  .p-card {
    background:rgba(255,255,255,.04);
    border:1px solid rgba(255,255,255,.08);
    border-radius:14px; padding:20px; margin-bottom:16px;
  }
  .p-input {
    width:100%; padding:10px 13px;
    background:rgba(255,255,255,.05);
    border:1.5px solid rgba(255,255,255,.1);
    border-radius:9px; color:#f8fafc;
    font-size:14px; font-family:inherit; outline:none;
    transition:border-color .18s, box-shadow .18s;
  }
  .p-input:focus  { border-color:#14b8a6; box-shadow:0 0 0 3px rgba(20,184,166,.1) }
  .p-input.err    { border-color:#f43f5e }
  .p-input::placeholder { color:#475569 }
  .p-input:disabled { opacity:.45; cursor:not-allowed }
  .p-select {
    width:100%; padding:10px 36px 10px 13px;
    background:rgba(255,255,255,.05);
    border:1.5px solid rgba(255,255,255,.1);
    border-radius:9px; color:#f8fafc;
    font-size:14px; font-family:inherit; outline:none; cursor:pointer;
    appearance:none;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:right 11px center; background-size:15px;
    transition:border-color .18s;
  }
  .p-select:focus   { border-color:#14b8a6; box-shadow:0 0 0 3px rgba(20,184,166,.1) }
  .p-select.err     { border-color:#f43f5e }
  .p-select option  { background:#1e293b }
  .p-label  { display:block; font-size:11px; color:rgba(255,255,255,.38); text-transform:uppercase; letter-spacing:.07em; margin-bottom:5px }
  .p-label .req { color:#f43f5e; margin-left:2px }
  .p-section { font-size:12px; font-weight:600; color:rgba(255,255,255,.32); text-transform:uppercase; letter-spacing:.08em; margin-bottom:14px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,.07) }
  .p-err    { font-size:11px; color:#fb7185; margin-top:4px }
  .p-hint   { font-size:11px; color:rgba(255,255,255,.28); margin-top:4px }
  .g2 { display:grid; grid-template-columns:1fr 1fr; gap:14px }
  .g3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px }
  @media(max-width:640px) { .g2,.g3 { grid-template-columns:1fr } }
  .stat-box { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:11px; padding:14px; text-align:center }
  .vl  { font-size:11px; color:rgba(255,255,255,.35); text-transform:uppercase; letter-spacing:.07em; margin-bottom:4px }
  .vv  { font-size:14px; color:#e2e8f0; line-height:1.5 }
  .tab-btn  { padding:8px 16px; border-radius:9px; border:none; cursor:pointer; font-family:inherit; font-size:13px; font-weight:600; transition:all .2s; white-space:nowrap }
  .edit-btn { display:flex; align-items:center; gap:7px; padding:8px 16px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:9px; color:rgba(255,255,255,.7); font-size:13px; font-weight:600; font-family:inherit; cursor:pointer; transition:all .18s }
  .edit-btn:hover { background:rgba(255,255,255,.1); color:#fff }
  .save-btn { padding:10px 24px; background:#14b8a6; border:none; border-radius:9px; color:#07111d; font-size:14px; font-weight:700; font-family:inherit; cursor:pointer; display:flex; align-items:center; gap:8px; transition:all .18s }
  .save-btn:disabled { opacity:.6; cursor:not-allowed }
  .save-btn:hover:not(:disabled) { background:#0d9488 }
  .cancel-btn { padding:10px 18px; background:transparent; border:1.5px solid rgba(255,255,255,.1); border-radius:9px; color:rgba(255,255,255,.5); font-size:14px; font-family:inherit; cursor:pointer; transition:all .15s }
  .cancel-btn:hover { border-color:rgba(255,255,255,.2); color:rgba(255,255,255,.75) }
  .chip { display:inline-flex; align-items:center; padding:3px 10px; border-radius:100px; font-size:12px; font-weight:500 }
  .empty-notice { font-size:13px; color:rgba(255,255,255,.32); padding:8px 0 }
`

//  Atoms 
function Spin({ size = 16 }) {
  return (
    <svg style={{ animation:'tw-spin .7s linear infinite', flexShrink:0 }} width={size} height={size}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  )
}

function Field({ label, required, error, hint, children }) {
  return (
    <div>
      <label className="p-label">{label}{required && <span className="req">*</span>}</label>
      {children}
      {error && <div className="p-err">{error}</div>}
      {hint && !error && <div className="p-hint">{hint}</div>}
    </div>
  )
}

// Controlled text input bound to form state
function TI({ f, form, set, type='text', placeholder, disabled, maxLen, cls }) {
  return (
    <input className={'p-input' + (cls ? ' ' + cls : '')} type={type}
      value={form[f] ?? ''} disabled={disabled} maxLength={maxLen}
      placeholder={placeholder} onChange={e => set(f)(e.target.value)} />
  )
}

function StatBox({ label, value, color='#14b8a6', sub }) {
  return (
    <div className="stat-box">
      <div style={{ fontSize:20, fontWeight:700, color, marginBottom:4 }}>{value}</div>
      <div style={{ fontSize:12, color:'rgba(255,255,255,.45)' }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginTop:2 }}>{sub}</div>}
    </div>
  )
}

function VF({ label, value, mono, href, copy }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div>
      <div className="vl">{label}</div>
      {href
        ? <a href={href.startsWith('http') ? href : 'https://' + href} target="_blank" rel="noreferrer"
            className="vv" style={{ color:'#14b8a6', textDecoration:'none', wordBreak:'break-all', display:'block' }}>{value}</a>
        : <div className="vv" style={{ fontFamily:mono?'monospace':'inherit', wordBreak:'break-all' }}>{value}</div>}
    </div>
  )
}

function AvatarBadge({ name, photo, color, size=80 }) {
  if (photo) return (
    <img src={photo} alt={name}
      style={{ width:size, height:size, borderRadius:size*0.22, objectFit:'cover', border:`2px solid ${color}50`, flexShrink:0 }} />
  )
  return (
    <div style={{ width:size, height:size, borderRadius:size*0.22, background:`${color}18`, border:`2px solid ${color}40`,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize:size*0.38, fontWeight:800, color, flexShrink:0 }}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

function EmptyEditCTA({ label, onEdit }) {
  return (
    <span className="empty-notice">
      Not set.{' '}
      {onEdit && <button onClick={onEdit} style={{ color:'#14b8a6', background:'none', border:'none', cursor:'pointer', fontSize:13, padding:0 }}>Add now</button>}
    </span>
  )
}

//  Edit form 
function EditProfile({ profile, initialSkillNames, onCancel, onSaved }) {
  const initForm = () => ({
    name:             profile.name             ?? '',
    email:            profile.email            ?? '',
    bio:              profile.bio              ?? '',
    title:            profile.title            ?? '',
    designation:      profile.designation      ?? '',
    city:             profile.city             ?? '',
    state:            profile.state            ?? '',
    country:          profile.country          ?? 'India',
    pincode:          profile.pincode          ?? '',
    addressLine1:     profile.addressLine1     ?? '',
    addressLine2:     profile.addressLine2     ?? '',
    companyName:      profile.companyName      ?? '',
    businessType:     profile.businessType     ?? '',
    website:          profile.website          ?? '',
    cinNumber:        profile.cinNumber        ?? '',
    gstNumber:        profile.gstNumber        ?? '',
    panNumber:        profile.panNumber        ?? '',
    experienceLevel:  profile.experienceLevel  ?? '',
    yearsOfExperience: profile.yearsOfExperience ?? '',
    portfolioUrl:     profile.portfolioUrl     ?? '',
    linkedinUrl:      profile.linkedinUrl      ?? '',
    githubUrl:        profile.githubUrl        ?? '',
    instagramUrl:     profile.instagramUrl     ?? '',
    facebookUrl:      profile.facebookUrl      ?? '',
    hourlyRate:       profile.hourlyRate        ?? '',
    demoRate:         profile.demoRate          ?? '',
    upiId:            profile.upiId            ?? '',
    bankName:         profile.bankName         ?? '',
    bankHolderName:   profile.bankHolderName   ?? '',
    accountNumber:    profile.accountNumber    ?? '',
    ifscCode:         profile.ifscCode         ?? '',
    preferredPayment: profile.preferredPayment ?? 'UPI',
  })

  const [form,      setForm]      = useState(initForm)
  const [selSkills, setSelSkills] = useState(initialSkillNames || [])
  const [errors,    setErrors]    = useState({})
  const [saving,    setSaving]    = useState(false)
  const role = profile.role

  const set = f => v => { setForm(p => ({ ...p, [f]: v })); setErrors(e => ({ ...e, [f]: null })) }
  const setEv = f => e => set(f)(e.target.value)

  const validate = () => {
    const e = {}
    if (!form.name.trim())       e.name = 'Full name is required'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email'
    if (form.phone && !/^[6-9]\d{9}$/.test(form.phone)) e.phone = 'Enter a valid 10-digit mobile'
    if (form.ifscCode  && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifscCode.toUpperCase()))  e.ifscCode  = 'Invalid IFSC (e.g. HDFC0001234)'
    if (form.gstNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(form.gstNumber.toUpperCase())) e.gstNumber = 'Invalid GST number'
    if (form.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.panNumber.toUpperCase()))  e.panNumber  = 'Invalid PAN (e.g. ABCDE1234F)'
    if (form.pincode   && !/^[1-9][0-9]{5}$/.test(form.pincode))                          e.pincode   = 'Invalid 6-digit pincode'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = async () => {
    if (!validate()) { toast.error('Fix the highlighted errors'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        skillNames:  selSkills,
        ifscCode:    form.ifscCode  ? form.ifscCode.toUpperCase()  : undefined,
        gstNumber:   form.gstNumber ? form.gstNumber.toUpperCase() : undefined,
        panNumber:   form.panNumber ? form.panNumber.toUpperCase() : undefined,
      }
      const { data } = await api.put('/users/me', payload)
      // Update localStorage with safe fields
      const stored = JSON.parse(localStorage.getItem('tw_user') || '{}')
      localStorage.setItem('tw_user', JSON.stringify({ ...stored, ...data.user }))
      toast.success('Profile saved!')
      onSaved()   // triggers full refetch from parent
    } catch (err) {
      const serverErrors = err?.response?.data?.errors || {}
      if (Object.keys(serverErrors).length) {
        setErrors(serverErrors)
        toast.error('Fix highlighted fields')
      } else {
        toast.error(err?.response?.data?.error || errMsg(err))
      }
    } finally { setSaving(false) }
  }

  const SaveBar = (
    <div style={{ display:'flex', gap:10 }}>
      <button className="cancel-btn" onClick={onCancel}>Cancel</button>
      <button className="save-btn" onClick={save} disabled={saving}>
        {saving ? <Spin /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  )

  return (
    <div className="tw-fade">
      {/* Sticky top bar */}
      <div style={{ position:'sticky', top:0, zIndex:20, background:'rgba(7,17,29,.93)', backdropFilter:'blur(14px)', borderBottom:'1px solid rgba(255,255,255,.08)', padding:'12px 0', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:16, fontWeight:700, color:'#f8fafc' }}>Edit Profile</div>
        {SaveBar}
      </div>

      {/* Basic */}
      <div className="p-card">
        <div className="p-section">Basic Information</div>
        <div className="g2" style={{ marginBottom:14 }}>
          <Field label="Full Name" required error={errors.name}>
            <TI f="name" form={form} set={set} placeholder="Your full name" cls={errors.name ? 'err' : ''} />
          </Field>
          <Field label="Email Address" error={errors.email}>
            <TI f="email" form={form} set={set} type="email" placeholder="you@email.com" cls={errors.email ? 'err' : ''} />
          </Field>
          <Field label="Mobile Number">
            <input className="p-input" value={profile.phone ? '+91 ' + profile.phone : 'Not set'} disabled />
          </Field>
        </div>
      </div>

      {/* Freelancer professional */}
      {role === 'FREELANCER' && (
        <div className="p-card">
          <div className="p-section">Professional Details</div>
          <div className="g2" style={{ marginBottom:14 }}>
            <Field label="Professional Title">
              <TI f="title" form={form} set={set} placeholder='e.g. "Full Stack Developer"' />
            </Field>
            <Field label="Experience Level">
              <select className="p-select" value={form.experienceLevel} onChange={setEv('experienceLevel')}>
                <option value="">Select level</option>
                {EXP_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Years of Experience">
              <TI f="yearsOfExperience" form={form} set={set} type="number" placeholder="e.g. 3" />
            </Field>
          </div>
          <Field label="Bio / About Yourself" hint={`${(form.bio||'').length}/600 chars`}>
            <textarea className="p-input" rows={4} value={form.bio || ''} maxLength={600}
              style={{ resize:'vertical' }} placeholder="Describe your skills, experience, and what makes you unique..."
              onChange={setEv('bio')} />
          </Field>
        </div>
      )}

      {/* Freelancer skills */}
      {role === 'FREELANCER' && (
        <div className="p-card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div className="p-section" style={{ margin:0 }}>Skills</div>
            <span style={{ fontSize:11, color:'rgba(255,255,255,.38)' }}>{selSkills.length}/15 selected</span>
          </div>
          <CategorySkillPicker selected={selSkills} onChange={setSelSkills} max={15} accent="#14b8a6" />
        </div>
      )}

      {/* Freelancer links */}
      {role === 'FREELANCER' && (
        <div className="p-card">
          <div className="p-section">Links, Rates & Social Profiles</div>
          <div className="g2" style={{ marginBottom:14 }}>
            <Field label="Portfolio URL"><TI f="portfolioUrl" form={form} set={set} placeholder="https://yourportfolio.com" /></Field>
            <Field label="LinkedIn URL"><TI f="linkedinUrl" form={form} set={set} placeholder="https://linkedin.com/in/..." /></Field>
            <Field label="GitHub URL"><TI f="githubUrl" form={form} set={set} placeholder="https://github.com/..." /></Field>
            <Field label="Instagram URL"><TI f="instagramUrl" form={form} set={set} placeholder="https://instagram.com/..." /></Field>
            <Field label="Facebook URL"><TI f="facebookUrl" form={form} set={set} placeholder="https://facebook.com/..." /></Field>
          </div>
          <div className="g2">
            <Field label="Hourly Rate (Rs.)" hint="What you charge per hour"><TI f="hourlyRate" form={form} set={set} type="number" placeholder="e.g. 500" /></Field>
            <Field label="Demo / Consultation Rate (Rs.)" hint="Optional intro call rate"><TI f="demoRate" form={form} set={set} type="number" placeholder="e.g. 200" /></Field>
          </div>
        </div>
      )}

      {/* Client business */}
      {role === 'CLIENT' && (
        <div className="p-card">
          <div className="p-section">Business Details</div>
          <div className="g2" style={{ marginBottom:14 }}>
            <Field label="Company Name"><TI f="companyName" form={form} set={set} placeholder="Acme Pvt Ltd" /></Field>
            <Field label="Designation"><TI f="designation" form={form} set={set} placeholder="CEO / Founder" /></Field>
            <Field label="Business Type">
              <select className="p-select" value={form.businessType} onChange={setEv('businessType')}>
                <option value="">Select type</option>
                {BIZ_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Website"><TI f="website" form={form} set={set} placeholder="https://yourcompany.com" /></Field>
          </div>
          <div className="g3">
            <Field label="GST Number" error={errors.gstNumber}>
              <input className={'p-input' + (errors.gstNumber?' err':'')} value={form.gstNumber||''} maxLength={15}
                placeholder="22AAAAA0000A1Z5" onChange={e => set('gstNumber')(e.target.value.toUpperCase())} />
            </Field>
            <Field label="PAN Number" error={errors.panNumber}>
              <input className={'p-input' + (errors.panNumber?' err':'')} value={form.panNumber||''} maxLength={10}
                placeholder="ABCDE1234F" onChange={e => set('panNumber')(e.target.value.toUpperCase())} />
            </Field>
            <Field label="CIN Number"><TI f="cinNumber" form={form} set={set} placeholder="Optional" /></Field>
          </div>
        </div>
      )}

      {/* Address */}
      <div className="p-card">
        <div className="p-section">Address</div>
        <div style={{ marginBottom:14 }}>
          <Field label="Address Line 1"><TI f="addressLine1" form={form} set={set} placeholder="Building / Street" /></Field>
        </div>
        <div style={{ marginBottom:14 }}>
          <Field label="Address Line 2"><TI f="addressLine2" form={form} set={set} placeholder="Area / Locality (optional)" /></Field>
        </div>
        <div className="g3">
          <Field label="City"><TI f="city" form={form} set={set} placeholder="Mumbai" /></Field>
          <Field label="State">
            <select className="p-select" value={form.state} onChange={setEv('state')}>
              <option value="">Select state</option>
              {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Pincode" error={errors.pincode}>
            <TI f="pincode" form={form} set={set} placeholder="400001" maxLen={6} cls={errors.pincode?'err':''} />
          </Field>
        </div>
        <div style={{ marginTop:14 }}>
          <Field label="Country"><input className="p-input" value="India" disabled /></Field>
        </div>
      </div>

      {/* Payments */}
      <div className="p-card">
        <div className="p-section">Payment Details</div>
        <div className="g2" style={{ marginBottom:14 }}>
          <Field label="Preferred Payment Method">
            <select className="p-select" value={form.preferredPayment} onChange={setEv('preferredPayment')}>
              <option value="UPI">UPI</option>
              <option value="BANK">Bank Transfer</option>
            </select>
          </Field>
          <Field label="UPI ID"><TI f="upiId" form={form} set={set} placeholder="yourname@upi" /></Field>
        </div>
        <div className="g2">
          <Field label="Bank Name"><TI f="bankName" form={form} set={set} placeholder="HDFC Bank" /></Field>
          <Field label="Account Holder Name"><TI f="bankHolderName" form={form} set={set} placeholder="As per bank records" /></Field>
          <Field label="Account Number"><TI f="accountNumber" form={form} set={set} type="password" placeholder="Account number" /></Field>
          <Field label="IFSC Code" error={errors.ifscCode}>
            <input className={'p-input'+(errors.ifscCode?' err':'')} value={form.ifscCode||''} maxLength={11}
              placeholder="HDFC0001234" onChange={e => set('ifscCode')(e.target.value.toUpperCase())} />
          </Field>
        </div>
      </div>

      {/* Bottom save bar */}
      <div style={{ display:'flex', justifyContent:'flex-end', gap:10, paddingBottom:32 }}>
        <button className="cancel-btn" onClick={onCancel}>Cancel</button>
        <button className="save-btn" onClick={save} disabled={saving}>
          {saving ? <Spin /> : null}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

//  View mode 
function ViewProfile({ profile, skills, isOwnProfile, roleCfg, onEdit }) {
  const [tab, setTab] = useState('overview')
  const totalJobs = (profile._count?.clientJobs || 0) + (profile._count?.freelancerJobs || 0)

  const TABS = profile.role === 'ADMIN'
    ? [{ id:'overview', l:'Overview' }, { id:'platform', l:'Platform' }]
    : [
        { id:'overview', l:'Overview'  },
        { id:'details',  l:'Details'   },
        { id:'reviews',  l:`Reviews${profile.ratingCount > 0 ? ' (' + profile.ratingCount + ')' : ''}` },
        ...(profile.role === 'FREELANCER' ? [{ id:'links', l:'Links' }] : []),
      ]

  return (
    <div className="tw-fade">
      {/*  Header card  */}
      <div className="p-card" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:20, flexWrap:'wrap' }}>
          <AvatarBadge name={profile.name} photo={profile.profilePhoto} color={roleCfg.color} />

          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
              <div>
                <h1 style={{ fontSize:22, fontWeight:700, color:'#f8fafc', marginBottom:8, letterSpacing:'-.3px' }}>{profile.name}</h1>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, alignItems:'center' }}>
                  {/* Role badge */}
                  <span style={{ fontSize:12, fontWeight:600, padding:'3px 10px', borderRadius:100, background:roleCfg.bg, color:roleCfg.color, border:`1px solid ${roleCfg.border}` }}>
                    {roleCfg.label}
                  </span>
                  {/* User ID */}
                  {profile.userId && (
                    <span style={{ fontSize:11, color:'rgba(255,255,255,.3)', fontFamily:'monospace' }}>{profile.userId}</span>
                  )}
                  {/* Rating */}
                  {profile.ratingCount > 0 && <StarDisplay value={profile.rating} count={profile.ratingCount} size="sm" />}
                  {/* Verified */}
                  {profile.isVerified && (
                    <span style={{ fontSize:11, color:'#14b8a6', display:'flex', alignItems:'center', gap:3 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                      Verified
                    </span>
                  )}
                </div>
                {/* Subtitle */}
                {(profile.title || profile.designation || profile.companyName) && (
                  <div style={{ fontSize:13, color:'rgba(255,255,255,.5)', marginTop:6 }}>
                    {profile.title || profile.designation}
                    {profile.companyName && <span style={{ color:'rgba(255,255,255,.3)' }}> &middot; {profile.companyName}</span>}
                  </div>
                )}
                {(profile.city || profile.state) && (
                  <div style={{ fontSize:12, color:'rgba(255,255,255,.32)', marginTop:4 }}>
                    {[profile.city, profile.state].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
              {/* Edit button (own profile) */}
              {isOwnProfile && (
                <button className="edit-btn" onClick={onEdit}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit Profile
                </button>
              )}
            </div>

            {/* Stats row */}
            <div style={{ display:'flex', gap:24, marginTop:16, paddingTop:14, borderTop:'1px solid rgba(255,255,255,.07)', flexWrap:'wrap' }}>
              {profile.role !== 'ADMIN' && <>
                <div><div style={{ fontSize:18, fontWeight:700, color:'#f8fafc' }}>{profile.ratingCount||0}</div><div style={{ fontSize:11, color:'rgba(255,255,255,.38)' }}>Reviews</div></div>
                <div><div style={{ fontSize:18, fontWeight:700, color:'#f8fafc' }}>{profile.rating ? profile.rating.toFixed(1) : '--'}</div><div style={{ fontSize:11, color:'rgba(255,255,255,.38)' }}>Rating</div></div>
                <div><div style={{ fontSize:18, fontWeight:700, color:'#f8fafc' }}>{totalJobs}</div><div style={{ fontSize:11, color:'rgba(255,255,255,.38)' }}>Jobs</div></div>
              </>}
              {profile.earnings && <div><div style={{ fontSize:18, fontWeight:700, color:'#34d399' }}>{fmtCurrency(profile.earnings.total)}</div><div style={{ fontSize:11, color:'rgba(255,255,255,.38)' }}>Earned</div></div>}
              {profile.spending && <div><div style={{ fontSize:18, fontWeight:700, color:'#fbbf24' }}>{fmtCurrency(profile.spending.total)}</div><div style={{ fontSize:11, color:'rgba(255,255,255,.38)' }}>Spent</div></div>}
              <div><div style={{ fontSize:18, fontWeight:700, color:'#f8fafc' }}>{fmtDate(profile.createdAt)}</div><div style={{ fontSize:11, color:'rgba(255,255,255,.38)' }}>Joined</div></div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', padding:4, borderRadius:12, width:'fit-content', marginBottom:20, overflowX:'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className="tab-btn"
            style={{ background:tab===t.id ? roleCfg.color : 'transparent', color:tab===t.id ? '#07111d' : 'rgba(255,255,255,.45)' }}>
            {t.l}
          </button>
        ))}
      </div>

      {/*  Overview  */}
      {tab === 'overview' && (
        <div className="tw-fade">

          {/* Contact card  always shown */}
          <div className="p-card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div className="p-section" style={{ margin:0 }}>Contact Information</div>
            </div>
            <div className="g2">
              <VF label="Full Name"   value={profile.name} />
              <VF label="Email"       value={profile.email || ''} />
              <VF label="Mobile"      value={profile.phone ? '+91 ' + profile.phone : ''} mono />
              <VF label="City"        value={profile.city} />
              <VF label="State"       value={profile.state} />
              <VF label="Country"     value={profile.country || 'India'} />
              {profile.pincode && <VF label="Pincode" value={profile.pincode} mono />}
            </div>
            {profile.addressLine1 && (
              <div style={{ marginTop:12 }}>
                <div className="vl">Address</div>
                <div className="vv">{[profile.addressLine1, profile.addressLine2].filter(Boolean).join(', ')}</div>
              </div>
            )}
            {!profile.email && !profile.city && isOwnProfile && (
              <div style={{ marginTop:8 }}>
                <EmptyEditCTA label="contact details" onEdit={onEdit} />
              </div>
            )}
          </div>

          {/* Freelancer: Professional */}
          {profile.role === 'FREELANCER' && (
            <div className="p-card">
              <div className="p-section">Professional</div>
              <div className="g2" style={{ marginBottom: profile.bio ? 14 : 0 }}>
                <VF label="Title"               value={profile.title} />
                <VF label="Experience Level"    value={profile.experienceLevel} />
                <VF label="Years of Experience" value={profile.yearsOfExperience ? profile.yearsOfExperience + ' years' : null} />
              </div>
              {profile.bio ? (
                <div style={{ marginTop:4 }}>
                  <div className="vl">Bio</div>
                  <div style={{ fontSize:14, color:'rgba(255,255,255,.65)', lineHeight:1.75 }}>{profile.bio}</div>
                </div>
              ) : isOwnProfile ? (
                <EmptyEditCTA label="bio and title" onEdit={onEdit} />
              ) : null}
            </div>
          )}

          {/* Freelancer: Skills */}
          {profile.role === 'FREELANCER' && (
            <div className="p-card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div className="p-section" style={{ margin:0 }}>Skills {skills.length > 0 ? `(${skills.length})` : ''}</div>
                {isOwnProfile && <button onClick={onEdit} style={{ fontSize:12, color:'#14b8a6', background:'none', border:'none', cursor:'pointer' }}>Edit skills</button>}
              </div>
              {skills.length > 0
                ? <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {skills.map(s => (
                      <span key={s.id||s} className="chip" style={{ background:'rgba(20,184,166,.12)', border:'1px solid rgba(20,184,166,.3)', color:'#14b8a6' }}>
                        {s.name||s}
                      </span>
                    ))}
                  </div>
                : <EmptyEditCTA label="skills" onEdit={isOwnProfile ? onEdit : null} />}
            </div>
          )}

          {/* Client: Business */}
          {profile.role === 'CLIENT' && (
            <div className="p-card">
              <div className="p-section">Business Details</div>
              {(profile.companyName || profile.businessType || profile.designation) ? (
                <div className="g2">
                  <VF label="Company Name"  value={profile.companyName} />
                  <VF label="Designation"   value={profile.designation} />
                  <VF label="Business Type" value={profile.businessType} />
                  <VF label="Website"       value={profile.website} href={profile.website} />
                  {isOwnProfile && <VF label="GST Number" value={profile.gstNumber} mono />}
                  {isOwnProfile && <VF label="PAN Number" value={profile.panNumber} mono />}
                  {isOwnProfile && <VF label="CIN Number" value={profile.cinNumber} mono />}
                </div>
              ) : isOwnProfile ? (
                <EmptyEditCTA label="company details" onEdit={onEdit} />
              ) : <div className="empty-notice">No business details added.</div>}
            </div>
          )}

          {/* Stats (own profile) */}
          {isOwnProfile && profile.role !== 'ADMIN' && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, marginBottom:16 }}>
              {profile.role === 'FREELANCER' && <>
                <StatBox label="Total Earned"     value={fmtCurrency(profile.earnings?.total || 0)} color="#34d399" />
                <StatBox label="Jobs Completed"   value={profile._count?.freelancerJobs || 0} color="#14b8a6" />
                <StatBox label="Reviews Received" value={profile.ratingCount || 0} color="#818cf8" />
                <StatBox label="Avg Rating"       value={profile.rating ? profile.rating.toFixed(1) + '/5' : '--'} color="#fbbf24" />
              </>}
              {profile.role === 'CLIENT' && <>
                <StatBox label="Total Spent"   value={fmtCurrency(profile.spending?.total || 0)} color="#fbbf24" />
                <StatBox label="Jobs Posted"   value={profile._count?.clientJobs || 0} color="#14b8a6" />
                <StatBox label="Reviews Given" value={profile._count?.reviewsGiven || 0} color="#818cf8" />
              </>}
            </div>
          )}

          {/* Recent transactions */}
          {isOwnProfile && profile.recentTxns?.length > 0 && (
            <div className="p-card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div className="p-section" style={{ margin:0 }}>Recent Transactions</div>
                <Link to="/transactions" style={{ fontSize:12, color:'#14b8a6', textDecoration:'none' }}>View all</Link>
              </div>
              {profile.recentTxns.map(t => {
                const cfg = { DEPOSIT:{ color:'#fbbf24', sign:'-' }, RELEASE:{ color:'#34d399', sign:'+' }, REFUND:{ color:'#fb7185', sign:'+' } }[t.type] || { color:'#94a3b8', sign:'' }
                return (
                  <div key={t.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 0', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
                    <div style={{ width:30, height:30, borderRadius:'50%', background:`${cfg.color}18`, border:`1px solid ${cfg.color}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <span style={{ color:cfg.color, fontSize:13, fontWeight:700 }}>{cfg.sign}</span>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, color:'#e2e8f0' }}>{t.type.charAt(0) + t.type.slice(1).toLowerCase()}</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,.32)' }}>{fmtRelative(t.createdAt)}</div>
                    </div>
                    <div style={{ fontSize:14, fontWeight:600, color:cfg.color }}>{cfg.sign}{fmtCurrency(t.amount)}</div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Payment details */}
          {isOwnProfile && (profile.upiId || profile.bankName) && (
            <div className="p-card">
              <div className="p-section">Payment Details</div>
              <div className="g2">
                <VF label="Preferred Method" value={profile.preferredPayment} />
                <VF label="UPI ID"           value={profile.upiId} mono />
                <VF label="Bank Name"        value={profile.bankName} />
                <VF label="Account Holder"   value={profile.bankHolderName} />
                <VF label="IFSC Code"        value={profile.ifscCode} mono />
              </div>
            </div>
          )}
          {isOwnProfile && !profile.upiId && !profile.bankName && (
            <div className="p-card">
              <div className="p-section">Payment Details</div>
              <EmptyEditCTA label="UPI or bank details" onEdit={onEdit} />
            </div>
          )}
        </div>
      )}

      {/*  Details tab  */}
      {tab === 'details' && (
        <div className="tw-fade">
          {profile.role === 'FREELANCER' && (
            <div className="p-card">
              <div className="p-section">All Skills</div>
              {skills.length > 0
                ? <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {skills.map(s => <span key={s.id||s} className="chip" style={{ background:'rgba(20,184,166,.12)', border:'1px solid rgba(20,184,166,.3)', color:'#14b8a6' }}>{s.name||s}</span>)}
                  </div>
                : <EmptyEditCTA label="skills" onEdit={isOwnProfile ? onEdit : null} />}
            </div>
          )}
          {isOwnProfile && (profile.panNumber || profile.gstNumber || profile.aadhaarNumber) && (
            <div className="p-card">
              <div className="p-section">Identity Documents</div>
              <div className="g2">
                {profile.panNumber    && <VF label="PAN Number" value={profile.panNumber} mono />}
                {profile.gstNumber    && <VF label="GST Number" value={profile.gstNumber} mono />}
                {profile.aadhaarNumber && <VF label="Aadhaar"   value={profile.aadhaarNumber} mono />}
              </div>
            </div>
          )}
          <div className="p-card">
            <div className="p-section">Account Info</div>
            <div className="g2">
              <VF label="User ID"        value={profile.userId} mono />
              <VF label="Account Status" value={profile.profileCompleted ? 'Active' : 'Incomplete'} />
              <VF label="Verification"   value={profile.isVerified ? 'Verified' : 'Pending'} />
              <VF label="Joined"         value={fmtDate(profile.createdAt)} />
              {profile.lastLoginAt && <VF label="Last Login" value={fmtRelative(profile.lastLoginAt)} />}
              <VF label="Role"           value={profile.role} />
            </div>
          </div>
        </div>
      )}

      {/*  Reviews tab  */}
      {tab === 'reviews' && (
        <div className="tw-fade">
          <ReviewsList userId={profile.id} />
        </div>
      )}

      {/*  Links tab (freelancer)  */}
      {tab === 'links' && profile.role === 'FREELANCER' && (
        <div className="tw-fade">
          <div className="p-card">
            <div className="p-section">Portfolio and Social Links</div>
            {(profile.portfolioUrl || profile.linkedinUrl || profile.githubUrl) ? (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {profile.portfolioUrl && (
                  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'rgba(255,255,255,.03)', borderRadius:10, border:'1px solid rgba(255,255,255,.07)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round"><path d="M21 13.255A23.931 23.931 0 0 1 12 15c-3.183 0-6.22-.62-9-1.745M16 6l2 2-2 2M8 6l-2 2 2 2"/></svg>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginBottom:2 }}>Portfolio</div>
                      <a href={profile.portfolioUrl} target="_blank" rel="noreferrer" style={{ fontSize:13, color:'#14b8a6', textDecoration:'none', wordBreak:'break-all' }}>{profile.portfolioUrl}</a>
                    </div>
                  </div>
                )}
                {profile.linkedinUrl && (
                  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'rgba(255,255,255,.03)', borderRadius:10, border:'1px solid rgba(255,255,255,.07)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginBottom:2 }}>LinkedIn</div>
                      <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" style={{ fontSize:13, color:'#818cf8', textDecoration:'none', wordBreak:'break-all' }}>{profile.linkedinUrl}</a>
                    </div>
                  </div>
                )}
                {profile.githubUrl && (
                  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'rgba(255,255,255,.03)', borderRadius:10, border:'1px solid rgba(255,255,255,.07)' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginBottom:2 }}>GitHub</div>
                      <a href={profile.githubUrl} target="_blank" rel="noreferrer" style={{ fontSize:13, color:'#94a3b8', textDecoration:'none', wordBreak:'break-all' }}>{profile.githubUrl}</a>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <EmptyEditCTA label="portfolio and social links" onEdit={isOwnProfile ? onEdit : null} />
            )}
          </div>
        </div>
      )}

      {/*  Platform tab (admin)  */}
      {tab === 'platform' && (
        <div className="tw-fade">
          {profile.platformStats ? (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:16 }}>
                <StatBox label="Total Users"   value={profile.platformStats.totalUsers}   color="#14b8a6" />
                <StatBox label="Total Jobs"    value={profile.platformStats.totalJobs}    color="#818cf8" />
                <StatBox label="Open Disputes" value={profile.platformStats.openDisputes} color="#fb7185" />
                <StatBox label="Locked Escrow" value={fmtCurrency(profile.platformStats.lockedEscrow)} color="#fbbf24" />
              </div>
              <div className="p-card">
                <div className="p-section">Admin Actions</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[['Manage Disputes','/disputes','#fb7185'],['All Transactions','/transactions','#fbbf24'],['Browse Jobs','/jobs','#818cf8']].map(([l,to,c]) => (
                    <Link key={to} to={to} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderRadius:10, background:`${c}0c`, border:`1px solid ${c}25`, textDecoration:'none' }}>
                      <span style={{ fontSize:14, fontWeight:500, color:c }}>{l}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="p-card">
                <div className="p-section">Role Switching</div>
                <p style={{ fontSize:13, color:'rgba(255,255,255,.45)', marginBottom:14 }}>Log in as a different role to test platform flows end-to-end.</p>
                <Link to="/admin/login" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 18px', background:'rgba(251,146,60,.12)', border:'1px solid rgba(251,146,60,.3)', borderRadius:9, color:'#fb923c', textDecoration:'none', fontSize:13, fontWeight:600 }}>
                  Open Admin Panel
                </Link>
              </div>
            </>
          ) : (
            <div className="p-card"><div className="empty-notice">Platform stats unavailable.</div></div>
          )}
        </div>
      )}
    </div>
  )
}

//  Main 
export default function ProfilePage() {
  const { id }       = useParams()
  const { user: me } = useAuth()
  const navigate     = useNavigate()

  const targetId     = id || me?.id
  const isOwnProfile = !id || id === me?.id

  const [profile,  setProfile]  = useState(null)
  const [skills,   setSkills]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(false)
  const [error,    setError]    = useState(null)

  const fetchProfile = useCallback(async () => {
    if (!targetId) return
    setLoading(true); setError(null)
    try {
      const { data } = await api.get('/users/' + targetId)
      setProfile(data)
      // Skills can be objects { id, name } or plain strings
      setSkills(data.skills || [])
    } catch (err) { setError(errMsg(err)) }
    finally { setLoading(false) }
  }, [targetId])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  // After save: always do a full refetch so all fields are fresh
  const handleSaved = useCallback(async () => {
    setEditing(false)
    await fetchProfile()
  }, [fetchProfile])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'50vh', fontFamily:'inherit' }}>
      <Spin size={28} />
    </div>
  )

  if (error) return (
    <div style={{ textAlign:'center', padding:'3rem 2rem', fontFamily:"'DM Sans',system-ui,sans-serif", color:'#f8fafc' }}>
      <div style={{ fontSize:14, color:'#fb7185', marginBottom:12 }}>{error}</div>
      <button onClick={fetchProfile} style={{ padding:'8px 20px', background:'#14b8a6', border:'none', borderRadius:8, color:'#07111d', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Retry</button>
    </div>
  )

  if (!profile) return null

  const roleCfg    = ROLE_CFG[profile.role] || ROLE_CFG.CLIENT
  // Normalise skills to array of strings for the picker
  const skillNames = skills.map(s => (typeof s === 'string' ? s : s.name)).filter(Boolean)

  return (
    <div style={{ maxWidth:800, fontFamily:"'DM Sans',system-ui,sans-serif", color:'#f8fafc' }}>
      <style>{css}</style>
      {editing
        ? <EditProfile
            profile={profile}
            initialSkillNames={skillNames}
            onCancel={() => setEditing(false)}
            onSaved={handleSaved}
          />
        : <ViewProfile
            profile={profile}
            skills={skills}
            isOwnProfile={isOwnProfile}
            roleCfg={roleCfg}
            onEdit={() => setEditing(true)}
          />
      }
    </div>
  )
}
