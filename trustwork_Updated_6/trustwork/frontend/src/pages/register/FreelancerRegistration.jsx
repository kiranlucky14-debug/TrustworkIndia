import { useState, useEffect } from 'react'
import { validators } from '../../hooks/useRegistration'
import api from '../../services/api'

const INDIAN_STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh','Puducherry','Chandigarh']
const EXP_LEVELS  = ['Beginner (0-1 years)','Intermediate (2-4 years)','Advanced (5-8 years)','Expert (9+ years)']
const STEPS = ['Basic Info','Professional','Skills & Bio','Verification','Payments','Review & Submit']

function Field({ label, required, error, children, hint }) {
  return (
    <div>
      <label className="reg-label">{label}{required && <span className="req">*</span>}</label>
      {children}
      {hint && !error && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{hint}</div>}
      {error && <div className="field-error">{error}</div>}
    </div>
  )
}

function Input({ field, reg, placeholder, type='text', disabled, maxLength }) {
  return (
    <input className={'reg-input' + (reg.errors[field] ? ' error' : '')}
      type={type} value={reg.data[field] || ''} disabled={disabled}
      maxLength={maxLength} placeholder={placeholder}
      onChange={e => reg.set(field, e.target.value)} />
  )
}

function ProgressBar({ step, total, labels }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{labels[step]}</span>
        <span style={{ fontSize: 12, color: '#64748b' }}>Step {step + 1} of {total}</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: ((step + 1) / total * 100) + '%', background: 'linear-gradient(to right, #818cf8, #6366f1)', borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        {labels.map((l, i) => (
          <div key={i} className="progress-dot" style={{ background: i <= step ? '#818cf8' : 'rgba(255,255,255,0.12)', width: i === step ? 20 : 8, borderRadius: 4 }} />
        ))}
      </div>
    </div>
  )
}

export default function FreelancerRegistration({ reg, phone, onComplete }) {
  const { step, setStep, data, errors, saving, validate, set } = reg
  const [allSkills, setAllSkills]   = useState([])
  const [skillSearch, setSkillSearch] = useState('')
  const [selSkills, setSelSkills]   = useState([])

  useEffect(() => {
    api.get('/skills').then(r => setAllSkills(r.data)).catch(() => {})
  }, [])

  // Sync selected skills into reg data
  useEffect(() => {
    reg.set('skillIds', selSkills.map(s => s.id))
  }, [selSkills])

  const toggleSkill = (skill) => {
    setSelSkills(prev =>
      prev.some(s => s.id === skill.id)
        ? prev.filter(s => s.id !== skill.id)
        : prev.length >= 15 ? prev : [...prev, skill]
    )
  }

  const goNext = () => {
    const rules = getStepRules(step)
    if (validate(rules)) setStep(s => s + 1)
  }
  const goBack = () => setStep(s => s - 1)

  const getStepRules = (s) => {
    if (s === 0) return {
      name:  [validators.required],
      email: [validators.required, validators.email],
      city:  [validators.required],
      state: [validators.required],
    }
    if (s === 1) return {
      title:           [validators.required],
      experienceLevel: [validators.required],
      yearsOfExperience: [(v) => (!v && v !== 0) ? 'Required' : null],
    }
    if (s === 2) return {
      bio: [(v) => !v || v.trim().length < 50 ? 'Bio must be at least 50 characters' : null],
    }
    return {}
  }

  const filteredSkills = allSkills.filter(s =>
    !skillSearch || s.name.toLowerCase().includes(skillSearch.toLowerCase())
  )

  const accentColor = '#818cf8'

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>Freelancer Registration</h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>Set up your professional profile to start finding work and getting paid securely.</p>
      </div>

      <ProgressBar step={step} total={STEPS.length} labels={STEPS} />

      {/* STEP 0: Basic */}
      {step === 0 && (
        <div className="step-card">
          <div className="section-title">Basic Information</div>
          <div className="form-grid" style={{ marginBottom: 14 }}>
            <Field label="Full Name" required error={errors.name}>
              <Input field="name" reg={reg} placeholder="Rahul Dev" />
            </Field>
            <Field label="Email Address" required error={errors.email}>
              <Input field="email" reg={reg} placeholder="rahul@example.com" type="email" />
            </Field>
            <Field label="Mobile Number">
              <input className="reg-input" value={phone || ''} disabled />
            </Field>
            <Field label="City" required error={errors.city}>
              <Input field="city" reg={reg} placeholder="Bengaluru" />
            </Field>
            <Field label="State" required error={errors.state}>
              <select className="reg-select" value={data.state || ''} onChange={e => reg.set('state', e.target.value)}>
                <option value="">Select state</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.state && <div className="field-error">{errors.state}</div>}
            </Field>
            <Field label="Country">
              <input className="reg-input" value="India" disabled />
            </Field>
          </div>
        </div>
      )}

      {/* STEP 1: Professional */}
      {step === 1 && (
        <div className="step-card">
          <div className="section-title">Professional Details</div>
          <div className="form-grid" style={{ marginBottom: 14 }}>
            <Field label="Professional Title" required error={errors.title} hint='e.g. "Full Stack Developer" or "UI/UX Designer"'>
              <Input field="title" reg={reg} placeholder="Full Stack Developer" />
            </Field>
            <Field label="Experience Level" required error={errors.experienceLevel}>
              <select className="reg-select" value={data.experienceLevel || ''} onChange={e => reg.set('experienceLevel', e.target.value)}>
                <option value="">Select level</option>
                {EXP_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              {errors.experienceLevel && <div className="field-error">{errors.experienceLevel}</div>}
            </Field>
            <Field label="Years of Experience" required error={errors.yearsOfExperience}>
              <input className={'reg-input' + (errors.yearsOfExperience ? ' error' : '')}
                type="number" min="0" max="50"
                value={data.yearsOfExperience ?? ''}
                placeholder="3"
                onChange={e => reg.set('yearsOfExperience', e.target.value)} />
            </Field>
            <Field label="Portfolio URL" error={errors.portfolioUrl}>
              <Input field="portfolioUrl" reg={reg} placeholder="https://yourportfolio.com" />
            </Field>
            <Field label="LinkedIn URL" error={errors.linkedinUrl}>
              <Input field="linkedinUrl" reg={reg} placeholder="https://linkedin.com/in/yourname" />
            </Field>
            <Field label="GitHub URL" error={errors.githubUrl}>
              <Input field="githubUrl" reg={reg} placeholder="https://github.com/yourname" />
            </Field>
          </div>
        </div>
      )}

      {/* STEP 2: Skills + Bio */}
      {step === 2 && (
        <div className="step-card">
          <div className="section-title">Skills and Bio</div>

          {/* Skill picker */}
          <div style={{ marginBottom: 20 }}>
            <label className="reg-label">Skills <span style={{ fontSize: 11, color: '#64748b' }}>({selSkills.length}/15 selected)</span></label>
            <input className="reg-input" placeholder="Search skills..."
              value={skillSearch} onChange={e => setSkillSearch(e.target.value)}
              style={{ marginBottom: 10 }} />

            {selSkills.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {selSkills.map(s => (
                  <span key={s.id} onClick={() => toggleSkill(s)}
                    style={{ padding: '3px 10px', borderRadius: 100, background: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.3)', color: '#818cf8', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {s.name} x
                  </span>
                ))}
              </div>
            )}

            <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)' }}>
              {filteredSkills.map(s => {
                const sel = selSkills.some(x => x.id === s.id)
                return (
                  <span key={s.id} onClick={() => toggleSkill(s)}
                    style={{ padding: '4px 11px', borderRadius: 100, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
                      background: sel ? 'rgba(129,140,248,0.15)' : 'rgba(255,255,255,0.05)',
                      border: '1px solid ' + (sel ? 'rgba(129,140,248,0.4)' : 'rgba(255,255,255,0.1)'),
                      color: sel ? '#818cf8' : '#94a3b8' }}>
                    {sel ? '+ ' : ''}{s.name}
                  </span>
                )
              })}
              {filteredSkills.length === 0 && <div style={{ color: '#64748b', fontSize: 13 }}>No skills found</div>}
            </div>
          </div>

          <Field label="Bio / About Yourself" required error={errors.bio}
            hint={`${(data.bio || '').length}/500 chars. Min 50 characters.`}>
            <textarea className={'reg-input' + (errors.bio ? ' error' : '')} rows={5}
              value={data.bio || ''} maxLength={500}
              placeholder="Describe your experience, expertise, and what makes you unique as a freelancer..."
              style={{ resize: 'vertical' }}
              onChange={e => reg.set('bio', e.target.value)} />
          </Field>
        </div>
      )}

      {/* STEP 3: Verification */}
      {step === 3 && (
        <div className="step-card">
          <div className="section-title">Identity Verification</div>
          <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#fbbf24', fontWeight: 500, marginBottom: 4 }}>KYC Verification</div>
            <div style={{ fontSize: 12, color: '#92400e' }}>Enter your document numbers below. Physical document verification will be done separately by our team before your first withdrawal.</div>
          </div>
          <div className="form-grid" style={{ marginBottom: 14 }}>
            <Field label="PAN Number" error={errors.panNumber} hint="Required for payments above Rs. 50,000">
              <input className={'reg-input' + (errors.panNumber ? ' error' : '')}
                value={data.panNumber || ''} placeholder="ABCDE1234F" maxLength={10}
                onChange={e => reg.set('panNumber', e.target.value.toUpperCase())} />
              {errors.panNumber && <div className="field-error">{errors.panNumber}</div>}
            </Field>
            <Field label="Aadhaar Number" error={errors.aadhaarNumber} hint="Stored securely (masked after saving)">
              <input className="reg-input" type="password"
                value={data.aadhaarNumber || ''} placeholder="12-digit Aadhaar" maxLength={12}
                onChange={e => reg.set('aadhaarNumber', e.target.value.replace(/\D/g,''))} />
            </Field>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Resume/Portfolio upload coming soon. You can add your portfolio URL in the Professional step.
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Payments */}
      {step === 4 && (
        <div className="step-card">
          <div className="section-title">Payment Details</div>
          <div className="form-grid" style={{ marginBottom: 14 }}>
            <Field label="UPI ID" error={errors.upiId} hint="For instant payouts (recommended)">
              <Input field="upiId" reg={reg} placeholder="yourname@upi" />
            </Field>
            <div />
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)' }}>
            Bank account (for transfers above UPI limits)
          </div>
          <div className="form-grid">
            <Field label="Bank Name" error={errors.bankName}>
              <Input field="bankName" reg={reg} placeholder="HDFC Bank" />
            </Field>
            <Field label="Account Holder Name" error={errors.bankHolderName}>
              <Input field="bankHolderName" reg={reg} placeholder="As per bank records" />
            </Field>
            <Field label="Account Number" error={errors.accountNumber}>
              <Input field="accountNumber" reg={reg} placeholder="Account number" type="password" />
            </Field>
            <Field label="IFSC Code" error={errors.ifscCode}>
              <input className={'reg-input' + (errors.ifscCode ? ' error' : '')}
                value={data.ifscCode || ''} placeholder="HDFC0001234" maxLength={11}
                onChange={e => reg.set('ifscCode', e.target.value.toUpperCase())} />
              {errors.ifscCode && <div className="field-error">{errors.ifscCode}</div>}
            </Field>
          </div>
        </div>
      )}

      {/* STEP 5: Review */}
      {step === 5 && (
        <div>
          <div className="step-card">
            <div className="section-title">Review Your Profile</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px' }}>
              {[
                ['Name', data.name], ['Email', data.email],
                ['Mobile', phone], ['City', data.city + (data.state ? ', ' + data.state : '')],
                ['Title', data.title], ['Experience', data.experienceLevel],
                ['Years', data.yearsOfExperience], ['PAN', data.panNumber],
                ['UPI ID', data.upiId], ['Bank', data.bankName],
              ].map(([label, value]) => value ? (
                <div key={label} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13, color: '#e2e8f0' }}>{value}</div>
                </div>
              ) : null)}
            </div>
            {selSkills.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Skills</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {selSkills.map(s => (
                    <span key={s.id} style={{ padding: '2px 9px', borderRadius: 100, background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.25)', color: '#818cf8', fontSize: 11 }}>{s.name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Terms */}
          <div style={{ marginBottom: 20 }}>
            <div className={'checkbox-row' + (data.termsAccepted ? ' checked' : '')}
              onClick={() => reg.set('termsAccepted', !data.termsAccepted)}>
              <div style={{ width: 18, height: 18, borderRadius: 4, border: '2px solid ' + (data.termsAccepted ? accentColor : 'rgba(255,255,255,0.2)'), background: data.termsAccepted ? accentColor : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', marginTop: 1 }}>
                {data.termsAccepted && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#07111d" strokeWidth="1.5" strokeLinecap="round"/></svg>}
              </div>
              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                I agree to the <span style={{ color: accentColor }}>Terms and Conditions</span>, <span style={{ color: accentColor }}>Privacy Policy</span>, and TrustWork's freelancer guidelines.
              </div>
            </div>
            {errors.termsAccepted && <div className="field-error">{errors.termsAccepted}</div>}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <button className="btn-secondary-reg" onClick={goBack} style={{ visibility: step === 0 ? 'hidden' : 'visible' }}>
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button className="btn-primary-reg" onClick={goNext} style={{ background: accentColor }}>
            Continue
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        ) : (
          <button className="btn-primary-reg" style={{ background: accentColor }}
            onClick={() => {
              if (!data.termsAccepted) { return alert('Please accept the Terms and Conditions') }
              onComplete()
            }}
            disabled={saving}>
            {saving ? 'Saving...' : 'Complete Registration'}
            {!saving && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
          </button>
        )}
      </div>
    </div>
  )
}

const accentColor = '#818cf8'
