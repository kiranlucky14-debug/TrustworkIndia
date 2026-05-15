import { useState } from 'react'
import { validators } from '../../hooks/useRegistration'

const INDIAN_STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh','Puducherry','Chandigarh']
const BUSINESS_TYPES = ['Individual','Proprietorship','Partnership','LLP','Private Limited','Public Limited','Enterprise','NGO / Non-Profit']
const STEPS = ['Basic Info','Business Details','Address','Verification','Payments','Review & Submit']

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="reg-label">{label}{required && <span className="req">*</span>}</label>
      {children}
      {error && <div className="field-error">{error}</div>}
    </div>
  )
}

function Input({ field, reg, placeholder, type='text', disabled, maxLength }) {
  return (
    <input
      className={'reg-input' + (reg.errors[field] ? ' error' : '')}
      type={type} value={reg.data[field] || ''} disabled={disabled}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={e => reg.set(field, e.target.value)}
    />
  )
}

function Select({ field, reg, options, placeholder }) {
  return (
    <select className="reg-select" value={reg.data[field] || ''} onChange={e => reg.set(field, e.target.value)}>
      <option value="">{placeholder || 'Select...'}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
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
        <div style={{ height: '100%', width: ((step + 1) / total * 100) + '%', background: 'linear-gradient(to right, #14b8a6, #0d9488)', borderRadius: 2, transition: 'width 0.4s ease' }} />
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        {labels.map((l, i) => (
          <div key={i} className="progress-dot" style={{ background: i <= step ? '#14b8a6' : 'rgba(255,255,255,0.12)', width: i === step ? 20 : 8, borderRadius: 4 }} />
        ))}
      </div>
    </div>
  )
}

export default function ClientRegistration({ reg, phone, onComplete }) {
  const { step, setStep, data, errors, saving, validate, set } = reg

  const goNext = () => {
    const rules = getStepRules(step)
    if (validate(rules)) setStep(s => s + 1)
  }

  const goBack = () => setStep(s => s - 1)

  const getStepRules = (s) => {
    if (s === 0) return {
      name:        [validators.required],
      email:       [validators.required, validators.email],
      designation: [validators.required],
    }
    if (s === 1) return {
      businessType: [validators.required],
    }
    if (s === 2) return {
      addressLine1: [validators.required],
      city:         [validators.required],
      state:        [validators.required],
      pincode:      [validators.required, validators.pincode],
    }
    return {}
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>Client Registration</h1>
        <p style={{ fontSize: 14, color: '#64748b' }}>Complete your business profile to start posting jobs and hiring freelancers.</p>
      </div>

      <ProgressBar step={step} total={STEPS.length} labels={STEPS} />

      {/* STEP 0: Basic Info */}
      {step === 0 && (
        <div className="step-card">
          <div className="section-title">Basic Information</div>
          <div className="form-grid" style={{ marginBottom: 14 }}>
            <Field label="Full Name" required error={errors.name}>
              <Input field="name" reg={reg} placeholder="Arjun Sharma" />
            </Field>
            <Field label="Email Address" required error={errors.email}>
              <Input field="email" reg={reg} placeholder="arjun@company.com" type="email" />
            </Field>
            <Field label="Mobile Number">
              <input className="reg-input" value={phone || ''} disabled />
            </Field>
            <Field label="Designation" required error={errors.designation}>
              <Input field="designation" reg={reg} placeholder="CEO / Founder / Manager" />
            </Field>
            <Field label="Company / Business Name" error={errors.companyName}>
              <Input field="companyName" reg={reg} placeholder="Acme Pvt Ltd" />
            </Field>
            <Field label="Website URL" error={errors.website}>
              <Input field="website" reg={reg} placeholder="https://yourcompany.com" />
            </Field>
          </div>
        </div>
      )}

      {/* STEP 1: Business Details */}
      {step === 1 && (
        <div className="step-card">
          <div className="section-title">Business Details</div>
          <div className="form-grid" style={{ marginBottom: 14 }}>
            <Field label="Business Type" required error={errors.businessType}>
              <Select field="businessType" reg={reg} options={BUSINESS_TYPES} placeholder="Select type" />
            </Field>
            <Field label="GST Number" error={errors.gstNumber}>
              <input className={'reg-input' + (errors.gstNumber ? ' error' : '')}
                value={data.gstNumber || ''} placeholder="22AAAAA0000A1Z5" maxLength={15}
                onChange={e => reg.set('gstNumber', e.target.value.toUpperCase())} />
              {errors.gstNumber && <div className="field-error">{errors.gstNumber}</div>}
            </Field>
            <Field label="PAN Number" error={errors.panNumber}>
              <input className={'reg-input' + (errors.panNumber ? ' error' : '')}
                value={data.panNumber || ''} placeholder="ABCDE1234F" maxLength={10}
                onChange={e => reg.set('panNumber', e.target.value.toUpperCase())} />
              {errors.panNumber && <div className="field-error">{errors.panNumber}</div>}
            </Field>
            <Field label="CIN Number (optional)" error={errors.cinNumber}>
              <input className="reg-input" value={data.cinNumber || ''} placeholder="U72200TN2021PTC140000"
                onChange={e => reg.set('cinNumber', e.target.value.toUpperCase())} />
            </Field>
          </div>
          <Field label="Company Description" error={errors.companyDescription}>
            <textarea className="reg-input" rows={4} value={data.companyDescription || ''}
              placeholder="Tell freelancers about your business..."
              style={{ resize: 'vertical' }}
              onChange={e => reg.set('companyDescription', e.target.value)} />
          </Field>
        </div>
      )}

      {/* STEP 2: Address */}
      {step === 2 && (
        <div className="step-card">
          <div className="section-title">Address Details</div>
          <div className="form-grid full" style={{ marginBottom: 14 }}>
            <Field label="Address Line 1" required error={errors.addressLine1}>
              <Input field="addressLine1" reg={reg} placeholder="Building, Street" />
            </Field>
            <Field label="Address Line 2" error={errors.addressLine2}>
              <Input field="addressLine2" reg={reg} placeholder="Area, Locality" />
            </Field>
          </div>
          <div className="form-grid three" style={{ marginBottom: 14 }}>
            <Field label="City" required error={errors.city}>
              <Input field="city" reg={reg} placeholder="Mumbai" />
            </Field>
            <Field label="State" required error={errors.state}>
              <Select field="state" reg={reg} options={INDIAN_STATES} placeholder="Select state" />
            </Field>
            <Field label="Pincode" required error={errors.pincode}>
              <Input field="pincode" reg={reg} placeholder="400001" maxLength={6} />
            </Field>
          </div>
          <div className="form-grid">
            <Field label="Country">
              <input className="reg-input" value="India" disabled />
            </Field>
          </div>
        </div>
      )}

      {/* STEP 3: Verification */}
      {step === 3 && (
        <div className="step-card">
          <div className="section-title">Documents</div>
          <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#fbbf24', fontWeight: 500, marginBottom: 4 }}>Document Upload</div>
            <div style={{ fontSize: 12, color: '#92400e' }}>Document upload feature coming soon. For now, enter your document numbers in the Business Details step. Your profile will be verified by our team.</div>
          </div>
          <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
            Documents required for full verification:
            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
              <li>PAN Card (mandatory for payments above Rs. 50,000)</li>
              <li>GST Certificate (if GST registered)</li>
              <li>Company Logo (optional)</li>
            </ul>
          </div>
        </div>
      )}

      {/* STEP 4: Payments */}
      {step === 4 && (
        <div className="step-card">
          <div className="section-title">Billing and Payments</div>
          <div className="form-grid" style={{ marginBottom: 14 }}>
            <Field label="Preferred Payment Method">
              <select className="reg-select" value={data.preferredPayment || 'UPI'} onChange={e => reg.set('preferredPayment', e.target.value)}>
                <option value="UPI">UPI</option>
                <option value="BANK">Bank Transfer (NEFT/RTGS)</option>
              </select>
            </Field>
            <Field label="UPI ID" error={errors.upiId}>
              <Input field="upiId" reg={reg} placeholder="yourname@upi" />
            </Field>
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)' }}>
            Bank account details (for refunds and transactions above UPI limits)
          </div>
          <div className="form-grid" style={{ marginBottom: 14 }}>
            <Field label="Account Holder Name" error={errors.bankHolderName}>
              <Input field="bankHolderName" reg={reg} placeholder="As per bank records" />
            </Field>
            <Field label="Bank Name" error={errors.bankName}>
              <Input field="bankName" reg={reg} placeholder="HDFC Bank" />
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

      {/* STEP 5: Review and Submit */}
      {step === 5 && (
        <div>
          <div className="step-card">
            <div className="section-title">Review Your Information</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px' }}>
              {[
                ['Name', data.name], ['Email', data.email],
                ['Designation', data.designation], ['Mobile', phone],
                ['Business Type', data.businessType], ['Company', data.companyName],
                ['GST', data.gstNumber], ['PAN', data.panNumber],
                ['City', data.city], ['State', data.state],
                ['Pincode', data.pincode], ['UPI ID', data.upiId],
              ].map(([label, value]) => value ? (
                <div key={label} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13, color: '#e2e8f0' }}>{value}</div>
                </div>
              ) : null)}
            </div>
          </div>

          {/* Terms */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            <div className={'checkbox-row' + (data.termsAccepted ? ' checked' : '')}
              onClick={() => reg.set('termsAccepted', !data.termsAccepted)}>
              <div style={{ width: 18, height: 18, borderRadius: 4, border: '2px solid ' + (data.termsAccepted ? '#14b8a6' : 'rgba(255,255,255,0.2)'), background: data.termsAccepted ? '#14b8a6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', marginTop: 1 }}>
                {data.termsAccepted && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#07111d" strokeWidth="1.5" strokeLinecap="round"/></svg>}
              </div>
              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                I agree to the <span style={{ color: '#14b8a6' }}>Terms and Conditions</span> and <span style={{ color: '#14b8a6' }}>Privacy Policy</span> of TrustWork.
              </div>
            </div>
            {errors.termsAccepted && <div className="field-error">{errors.termsAccepted}</div>}

            <div className={'checkbox-row' + (data.escrowAccepted ? ' checked' : '')}
              onClick={() => reg.set('escrowAccepted', !data.escrowAccepted)}>
              <div style={{ width: 18, height: 18, borderRadius: 4, border: '2px solid ' + (data.escrowAccepted ? '#14b8a6' : 'rgba(255,255,255,0.2)'), background: data.escrowAccepted ? '#14b8a6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', marginTop: 1 }}>
                {data.escrowAccepted && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#07111d" strokeWidth="1.5" strokeLinecap="round"/></svg>}
              </div>
              <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                I understand and agree to TrustWork's <span style={{ color: '#14b8a6' }}>Escrow Agreement</span>. Funds will be held securely until work is approved.
              </div>
            </div>
            {errors.escrowAccepted && <div className="field-error">{errors.escrowAccepted}</div>}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <button className="btn-secondary-reg" onClick={goBack} style={{ visibility: step === 0 ? 'hidden' : 'visible' }}>
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button className="btn-primary-reg" onClick={goNext}>
            Continue
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        ) : (
          <button className="btn-primary-reg" onClick={() => {
            if (!data.termsAccepted)  { reg.set('termsAccepted',  false); return alert('Please accept Terms and Conditions') }
            if (!data.escrowAccepted) { reg.set('escrowAccepted', false); return alert('Please accept the Escrow Agreement') }
            onComplete()
          }} disabled={saving}>
            {saving ? 'Saving...' : 'Complete Registration'}
            {!saving && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
          </button>
        )}
      </div>
    </div>
  )
}
