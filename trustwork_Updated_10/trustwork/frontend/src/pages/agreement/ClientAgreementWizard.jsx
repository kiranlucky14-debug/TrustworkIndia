// ClientAgreementWizard.jsx
// 4-step wizard: Section A -> B (milestones) -> D (checklist) -> Review & Sign
import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { fmtCurrency } from '../../utils/helpers'

const TEAL = '#14b8a6'

const CLIENT_CHECKLIST = [
  { key: 'deliverablesClear',  label: 'I have clearly described all deliverables in writing.' },
  { key: 'budgetFinalised',    label: 'My budget is finalised and sufficient for the agreed scope.' },
  { key: 'deadlineRealistic',  label: 'The agreed deadline is realistic and I commit to it.' },
  { key: 'exclusionsClear',    label: 'I understand what is NOT included in this engagement.' },
  { key: 'revisionsAgreed',    label: 'I have agreed on the revision policy with the freelancer.' },
  { key: 'contactAvailable',   label: 'I can respond to messages within 24 hours during the project.' },
  { key: 'feedbackTimely',     label: 'I commit to providing timely feedback on submissions.' },
  { key: 'escrowAgreed',       label: 'I have read and accept the TrustWork Escrow Agreement.' },
]

const css = `
  @keyframes tw-in { from { opacity:0;transform:translateY(8px) } to { opacity:1;transform:translateY(0) } }
  .aw-fade { animation: tw-in .25s ease both }
  .aw-input {
    width:100%; padding:10px 13px;
    background:rgba(255,255,255,.05);
    border:1.5px solid rgba(255,255,255,.1);
    border-radius:9px; color:#f8fafc; font-size:14px;
    font-family:inherit; outline:none; transition:all .18s;
    box-sizing:border-box;
  }
  .aw-input:focus { border-color:${TEAL}; box-shadow:0 0 0 3px rgba(20,184,166,.1) }
  .aw-input.err   { border-color:#f43f5e }
  .aw-input::placeholder { color:#475569 }
  .aw-select {
    width:100%; padding:10px 36px 10px 13px;
    background:rgba(255,255,255,.05);
    border:1.5px solid rgba(255,255,255,.1);
    border-radius:9px; color:#f8fafc; font-size:14px;
    font-family:inherit; outline:none; cursor:pointer;
    appearance:none;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:right 11px center; background-size:15px;
    transition:border-color .18s; box-sizing:border-box;
  }
  .aw-select:focus { border-color:${TEAL}; box-shadow:0 0 0 3px rgba(20,184,166,.1) }
  .aw-select option { background:#1e293b }
  .aw-label { display:block; font-size:11px; color:rgba(255,255,255,.38); text-transform:uppercase; letter-spacing:.07em; margin-bottom:5px }
  .aw-err   { font-size:11px; color:#fb7185; margin-top:4px }
  .aw-hint  { font-size:11px; color:rgba(255,255,255,.28); margin-top:4px }
  .aw-section { font-size:12px; font-weight:600; color:rgba(255,255,255,.32); text-transform:uppercase; letter-spacing:.08em; margin-bottom:14px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,.07) }
  .aw-card { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:12px; padding:18px; margin-bottom:14px }
  .aw-g2 { display:grid; grid-template-columns:1fr 1fr; gap:12px }
  @media(max-width:600px) { .aw-g2 { grid-template-columns:1fr } }
  .aw-primary { padding:11px 24px; background:${TEAL}; border:none; border-radius:9px; color:#07111d; font-size:14px; font-weight:700; font-family:inherit; cursor:pointer; transition:all .18s; display:inline-flex; align-items:center; gap:7px }
  .aw-primary:disabled { opacity:.55; cursor:not-allowed }
  .aw-primary:hover:not(:disabled) { background:#0d9488 }
  .aw-secondary { padding:11px 18px; background:transparent; border:1.5px solid rgba(255,255,255,.1); border-radius:9px; color:rgba(255,255,255,.5); font-size:14px; font-family:inherit; cursor:pointer; transition:all .15s }
  .aw-check-row { display:flex; gap:11px; align-items:flex-start; padding:10px 12px; border-radius:9px; border:1px solid rgba(255,255,255,.07); cursor:pointer; transition:all .18s; margin-bottom:8px }
  .aw-check-row:hover { border-color:rgba(20,184,166,.25); background:rgba(20,184,166,.04) }
  .aw-check-row.checked { border-color:rgba(20,184,166,.35); background:rgba(20,184,166,.07) }
  * { box-sizing:border-box }
`

function ProgressBar({ step, total }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
        <span style={{ fontSize:11, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.07em' }}>Step {step} of {total}</span>
        <span style={{ fontSize:11, color: TEAL }}>{Math.round((step/total)*100)}% complete</span>
      </div>
      <div style={{ height:4, background:'rgba(255,255,255,.07)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${(step/total)*100}%`, background:`linear-gradient(to right,${TEAL},#0d9488)`, borderRadius:2, transition:'width .4s ease' }}/>
      </div>
      <div style={{ display:'flex', gap:5, marginTop:8 }}>
        {Array.from({length:total},(_,i)=>(
          <div key={i} style={{ height:3, flex:1, borderRadius:2,
            background: i < step-1 ? TEAL : i === step-1 ? TEAL+'80' : 'rgba(255,255,255,.1)',
            transition:'background .3s' }}/>
        ))}
      </div>
    </div>
  )
}

function H({ children }) {
  return <div style={{ fontSize:18, fontWeight:700, color:'#f8fafc', marginBottom:4, letterSpacing:'-.3px' }}>{children}</div>
}
function Sub({ children }) {
  return <div style={{ fontSize:13, color:'rgba(255,255,255,.4)', marginBottom:20, lineHeight:1.55 }}>{children}</div>
}

export default function ClientAgreementWizard({ jobId, job, agreement, onSaved, onSigned }) {
  const [step,   setStep]   = useState(1)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  // Section A state
  const [scope,             setScope]           = useState(agreement?.scope || '')
  const [deliverables,      setDeliverables]    = useState(
    Array.isArray(agreement?.deliverables) && agreement.deliverables.length > 0
      ? agreement.deliverables
      : ['']
  )
  const [startDate,         setStartDate]       = useState(agreement?.startDate ? String(agreement.startDate).slice(0,10) : '')
  const [endDate,           setEndDate]         = useState(agreement?.endDate   ? String(agreement.endDate).slice(0,10)   : '')
  const [revisionRounds,    setRevisionRounds]  = useState(agreement?.revisionRounds ?? 2)
  const [revisionPolicy,    setRevisionPolicy]  = useState(agreement?.revisionPolicy || '')
  const [paymentTerms,      setPaymentTerms]    = useState(agreement?.paymentTerms || 'Full payment on project completion via TrustWork escrow.')
  const [specialConditions, setSpecial]         = useState(agreement?.specialConditions || '')

  // Section B state
  const [milestones, setMilestones] = useState(
    Array.isArray(agreement?.milestonesAgreed) && agreement.milestonesAgreed.length > 0
      ? agreement.milestonesAgreed
      : [{ title: '', deliverable: '', amount: '', dueDate: '' }]
  )

  // Section D state
  const [checklist, setChecklist] = useState({})

  //  helpers 
  const addDeliverable    = () => setDeliverables(d => [...d, ''])
  const setDeliverable    = (i, v) => setDeliverables(d => d.map((x,idx) => idx===i ? v : x))
  const removeDeliverable = (i) => setDeliverables(d => d.filter((_,idx) => idx!==i))

  const addMilestone    = () => setMilestones(m => [...m, { title:'', deliverable:'', amount:'', dueDate:'' }])
  const setMilestone    = (i, k, v) => setMilestones(m => m.map((x,idx) => idx===i ? {...x,[k]:v} : x))
  const removeMilestone = (i) => setMilestones(m => m.filter((_,idx) => idx!==i))
  const toggleCheck     = (key) => setChecklist(c => ({ ...c, [key]: !c[key] }))

  const milestonesTotal = milestones.reduce((s, m) => s + parseFloat(m.amount || 0), 0)

  const filteredDeliverables = deliverables.filter(d => d.trim())

  //  frontend validation per step 
  const validateStep1 = () => {
    const e = {}
    if (!scope.trim() || scope.trim().length < 30)
      e.scope = 'Scope must be at least 30 characters  be specific about what will be built'
    if (filteredDeliverables.length === 0)
      e.deliverables = 'Add at least one deliverable'
    if (!startDate)
      e.startDate = 'Start date is required'
    if (!endDate)
      e.endDate = 'End date is required'
    if (startDate && endDate && new Date(startDate) >= new Date(endDate))
      e.endDate = 'End date must be after start date'
    if (!paymentTerms.trim())
      e.paymentTerms = 'Payment terms are required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validateStep2 = () => {
    const e = {}
    milestones.forEach((m, i) => {
      if (!m.title?.trim())
        e[`m${i}_title`] = `Milestone ${i+1}: title required`
      if (!m.amount || parseFloat(m.amount) <= 0)
        e[`m${i}_amount`] = `Milestone ${i+1}: valid amount required`
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  //  draft save helper 
  const saveDraft = async () => {
    const { data } = await api.patch(`/agreements/${jobId}/draft`, {
      scope:             scope.trim(),
      deliverables:      filteredDeliverables,
      startDate:         startDate || null,
      endDate:           endDate   || null,
      revisionRounds:    Number(revisionRounds),
      revisionPolicy:    revisionPolicy.trim() || null,
      paymentTerms:      paymentTerms.trim(),
      specialConditions: specialConditions.trim() || null,
      milestonesAgreed:  milestones.map(m => ({
        ...m,
        amount: parseFloat(m.amount) || 0,
      })),
    })
    return data
  }

  //  step navigation 
  const goStep1to2 = async () => {
    if (!validateStep1()) {
      toast.error('Fix the highlighted fields before continuing')
      return
    }
    setSaving(true)
    try {
      await saveDraft()
      // Do NOT call onSaved() here - it would re-render parent and reset wizard state
      setErrors({})
      setStep(2)
    } catch (err) {
      const msg = err?.response?.data?.error || err?.userMessage || 'Save failed. Check backend is running and CORS is configured.'
      toast.error(msg)
    } finally { setSaving(false) }
  }

  const goStep2to3 = async () => {
    if (!validateStep2()) {
      toast.error('Fix milestone errors before continuing')
      return
    }
    setSaving(true)
    try {
      await saveDraft()
      // Do NOT call onSaved() here - it would re-render parent and reset wizard state
      setErrors({})
      setStep(3)
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.userMessage || 'Could not save. Check backend is running.')
    } finally { setSaving(false) }
  }

  const goStep3to4 = () => {
    if (!CLIENT_CHECKLIST.every(q => checklist[q.key])) {
      toast.error('Please confirm all items before continuing')
      return
    }
    setErrors({})
    setStep(4)
  }

  const submitSign = async () => {
    setSaving(true)
    try {
      // Save final draft state first
      await saveDraft()
      // Submit signature
      await api.post(`/agreements/${jobId}/client-sign`, {
        clientChecklist: checklist,
      })
      toast.success('Agreement signed! Sent to freelancer for review.')
      onSigned?.()
    } catch (err) {
      const serverErrors = err?.response?.data?.errors || {}
      const msg = err?.response?.data?.error || 'Signing failed'
      if (Object.keys(serverErrors).length > 0) {
        setErrors(serverErrors)
        toast.error('Some fields need attention - check highlighted errors')
      } else {
        toast.error(msg)
      }
    } finally { setSaving(false) }
  }

  const Err = ({ k }) => errors[k]
    ? <div className="aw-err">{errors[k]}</div>
    : null

  //  render 
  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", color:'#f8fafc', maxWidth:680 }}>
      <style>{css}</style>
      <ProgressBar step={step} total={4} />

      {/*  STEP 1: Work Agreement (Section A)  */}
      {step === 1 && (
        <div className="aw-fade">
          <H>Work Agreement</H>
          <Sub>Define the scope, deliverables, and terms of this engagement. Be specific  this document becomes the reference if any dispute arises.</Sub>

          <div className="aw-card">
            <div className="aw-section">Section A  Scope and Deliverables</div>

            {/* Scope */}
            <div style={{ marginBottom:14 }}>
              <label className="aw-label">Scope of Work <span style={{color:'#fb7185'}}>*</span></label>
              <textarea className={'aw-input' + (errors.scope ? ' err' : '')} rows={5}
                value={scope} onChange={e => { setScope(e.target.value); setErrors(v => ({...v, scope: null})) }}
                style={{ resize:'vertical' }}
                placeholder="Describe exactly what will be built/delivered. Include: what the work covers, what it does NOT cover, and any technical requirements. Min 30 characters." />
              <div className="aw-hint">{scope.length} chars {scope.length < 30 ? `(${30 - scope.length} more needed)` : ''}</div>
              <Err k="scope"/>
            </div>

            {/* Deliverables */}
            <div style={{ marginBottom:14 }}>
              <label className="aw-label">Deliverables <span style={{color:'#fb7185'}}>*</span></label>
              <div className="aw-hint" style={{ marginBottom:8 }}>Each item the freelancer must hand over. Be specific (e.g. "Figma source file + exported PNG assets").</div>
              {deliverables.map((d, i) => (
                <div key={i} style={{ display:'flex', gap:8, marginBottom:8 }}>
                  <input className="aw-input" value={d}
                    placeholder={`Deliverable ${i+1}  e.g. "Deployed web app + source code on GitHub"`}
                    onChange={e => setDeliverable(i, e.target.value)} />
                  {deliverables.length > 1 && (
                    <button onClick={() => removeDeliverable(i)} type="button"
                      style={{ padding:'0 12px', background:'rgba(244,63,94,.12)', border:'1px solid rgba(244,63,94,.25)', borderRadius:8, color:'#fb7185', cursor:'pointer', flexShrink:0, fontFamily:'inherit', fontSize:13 }}>
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addDeliverable} type="button"
                style={{ fontSize:12, color:TEAL, background:'none', border:`1px dashed rgba(20,184,166,.3)`, borderRadius:8, padding:'7px 16px', cursor:'pointer', fontFamily:'inherit', width:'100%', transition:'all .15s' }}>
                + Add Deliverable
              </button>
              <Err k="deliverables"/>
            </div>

            {/* Dates + revision */}
            <div className="aw-g2" style={{ marginBottom:14 }}>
              <div>
                <label className="aw-label">Start Date <span style={{color:'#fb7185'}}>*</span></label>
                <input className={'aw-input' + (errors.startDate ? ' err' : '')} type="date"
                  value={startDate} onChange={e => { setStartDate(e.target.value); setErrors(v=>({...v, startDate:null, endDate:null})) }} />
                <Err k="startDate"/>
              </div>
              <div>
                <label className="aw-label">End Date / Deadline <span style={{color:'#fb7185'}}>*</span></label>
                <input className={'aw-input' + (errors.endDate ? ' err' : '')} type="date"
                  value={endDate} onChange={e => { setEndDate(e.target.value); setErrors(v=>({...v, endDate:null})) }} />
                <Err k="endDate"/>
              </div>
              <div>
                <label className="aw-label">Revision Rounds Included</label>
                <select className="aw-select" value={revisionRounds}
                  onChange={e => setRevisionRounds(parseInt(e.target.value))}>
                  {[0,1,2,3,5,10].map(n => <option key={n} value={n}>{n} round{n!==1?'s':''}</option>)}
                </select>
              </div>
              <div>
                <label className="aw-label">Revision Policy</label>
                <input className="aw-input" value={revisionPolicy}
                  onChange={e => setRevisionPolicy(e.target.value)}
                  placeholder="e.g. Minor changes only within agreed scope" />
              </div>
            </div>

            {/* Payment terms */}
            <div style={{ marginBottom:14 }}>
              <label className="aw-label">Payment Terms <span style={{color:'#fb7185'}}>*</span></label>
              <textarea className={'aw-input' + (errors.paymentTerms ? ' err' : '')} rows={2}
                value={paymentTerms} onChange={e => { setPaymentTerms(e.target.value); setErrors(v=>({...v, paymentTerms:null})) }}
                style={{ resize:'vertical' }}
                placeholder="e.g. Full payment on project completion via TrustWork escrow." />
              <Err k="paymentTerms"/>
            </div>

            {/* Special conditions */}
            <div>
              <label className="aw-label">Special Conditions (optional)</label>
              <textarea className="aw-input" rows={2} value={specialConditions}
                onChange={e => setSpecial(e.target.value)}
                style={{ resize:'vertical' }}
                placeholder="Any additional terms, NDA requirements, confidentiality, IP ownership..." />
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button type="button" className="aw-primary" onClick={goStep1to2} disabled={saving}>
              {saving
                ? <svg style={{ animation:'spin .7s linear infinite' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                : null}
              {saving ? 'Saving...' : 'Save & Continue'}
              {!saving && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>}
            </button>
          </div>
          <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
        </div>
      )}

      {/*  STEP 2: Milestone Agreement (Section B)  */}
      {step === 2 && (
        <div className="aw-fade">
          <H>Milestone Agreement</H>
          <Sub>Break the project into payment milestones. Each milestone triggers a separate escrow release when approved.</Sub>

          <div className="aw-card">
            <div className="aw-section">Section B  Payment Milestones</div>

            {/* Budget tracker */}
            <div style={{ padding:'10px 14px', borderRadius:9, marginBottom:16,
              display:'flex', justifyContent:'space-between', alignItems:'center',
              background: Math.abs(milestonesTotal - (job?.budget || 0)) < 1
                ? 'rgba(52,211,153,.08)' : 'rgba(251,191,36,.08)',
              border: `1px solid ${Math.abs(milestonesTotal - (job?.budget || 0)) < 1
                ? 'rgba(52,211,153,.25)' : 'rgba(251,191,36,.25)'}` }}>
              <span style={{ fontSize:13, color:'rgba(255,255,255,.6)' }}>
                Allocated: <strong style={{ color: Math.abs(milestonesTotal - (job?.budget || 0)) < 1 ? '#34d399' : '#fbbf24' }}>{fmtCurrency(milestonesTotal)}</strong>
              </span>
              <span style={{ fontSize:13, color:'rgba(255,255,255,.5)' }}>
                Job budget: <strong style={{ color:'#f8fafc' }}>{fmtCurrency(job?.budget)}</strong>
              </span>
            </div>
            <div className="aw-hint" style={{ marginBottom:14 }}>
              You can have a single milestone (full payment on completion) or split into multiple phases.
            </div>

            {milestones.map((m, i) => (
              <div key={i} style={{ padding:14, background:'rgba(255,255,255,.03)', borderRadius:10, border:'1px solid rgba(255,255,255,.07)', marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <span style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,.5)' }}>Milestone {i+1}</span>
                  {milestones.length > 1 && (
                    <button onClick={() => removeMilestone(i)} type="button"
                      style={{ fontSize:12, color:'#fb7185', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'inherit' }}>
                      Remove
                    </button>
                  )}
                </div>
                <div className="aw-g2">
                  <div>
                    <label className="aw-label">Title <span style={{color:'#fb7185'}}>*</span></label>
                    <input className={'aw-input' + (errors[`m${i}_title`] ? ' err' : '')}
                      value={m.title} placeholder="e.g. Design mockups"
                      onChange={e => { setMilestone(i,'title',e.target.value); setErrors(v=>({...v,[`m${i}_title`]:null})) }} />
                    <Err k={`m${i}_title`}/>
                  </div>
                  <div>
                    <label className="aw-label">Amount (Rs.) <span style={{color:'#fb7185'}}>*</span></label>
                    <input className={'aw-input' + (errors[`m${i}_amount`] ? ' err' : '')}
                      type="number" min="1" value={m.amount} placeholder="0"
                      onChange={e => { setMilestone(i,'amount',e.target.value); setErrors(v=>({...v,[`m${i}_amount`]:null})) }} />
                    <Err k={`m${i}_amount`}/>
                  </div>
                  <div>
                    <label className="aw-label">Deliverable</label>
                    <input className="aw-input" value={m.deliverable}
                      placeholder="What will be handed over at this milestone?"
                      onChange={e => setMilestone(i,'deliverable',e.target.value)} />
                  </div>
                  <div>
                    <label className="aw-label">Due Date</label>
                    <input className="aw-input" type="date" value={m.dueDate}
                      onChange={e => setMilestone(i,'dueDate',e.target.value)} />
                  </div>
                </div>
              </div>
            ))}

            <button onClick={addMilestone} type="button"
              style={{ fontSize:12, color:TEAL, background:'none', border:`1px dashed rgba(20,184,166,.3)`, borderRadius:8, padding:'7px 16px', cursor:'pointer', fontFamily:'inherit', width:'100%', transition:'all .15s' }}>
              + Add Milestone
            </button>
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', gap:10 }}>
            <button type="button" className="aw-secondary" onClick={() => setStep(1)}>Back</button>
            <button type="button" className="aw-primary" onClick={goStep2to3} disabled={saving}>
              {saving ? 'Saving...' : 'Save & Continue'}
              {!saving && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>}
            </button>
          </div>
        </div>
      )}

      {/*  STEP 3: Dispute Prevention Checklist (Section D)  */}
      {step === 3 && (
        <div className="aw-fade">
          <H>Dispute Prevention Checklist</H>
          <Sub>Confirm each statement. These are stored permanently and referenced if any dispute arises during the project.</Sub>

          <div className="aw-card">
            <div className="aw-section">Section D  Client Confirmation</div>
            {CLIENT_CHECKLIST.map(({ key, label }) => (
              <div key={key}
                className={'aw-check-row' + (checklist[key] ? ' checked' : '')}
                onClick={() => toggleCheck(key)}>
                <div style={{ width:18, height:18, borderRadius:4, flexShrink:0, marginTop:2,
                  border:`2px solid ${checklist[key] ? TEAL : 'rgba(255,255,255,.2)'}`,
                  background: checklist[key] ? TEAL : 'transparent',
                  display:'flex', alignItems:'center', justifyContent:'center', transition:'all .18s' }}>
                  {checklist[key] && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2 2 4-4" stroke="#07111d" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>
                <span style={{ fontSize:13, color: checklist[key] ? '#e2e8f0' : 'rgba(255,255,255,.55)', lineHeight:1.55 }}>
                  {label}
                </span>
              </div>
            ))}
            <div style={{ marginTop:10, fontSize:12, color:'rgba(255,255,255,.3)' }}>
              {CLIENT_CHECKLIST.filter(q => checklist[q.key]).length} / {CLIENT_CHECKLIST.length} confirmed
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', gap:10 }}>
            <button type="button" className="aw-secondary" onClick={() => setStep(2)}>Back</button>
            <button type="button" className="aw-primary" onClick={goStep3to4}>
              Continue to Review
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      )}

      {/*  STEP 4: Review and Sign  */}
      {step === 4 && (
        <div className="aw-fade">
          <H>Review and Sign</H>
          <Sub>Review everything below. Once you sign, this is sent to the freelancer. You cannot edit after signing.</Sub>

          <div className="aw-card">
            <div className="aw-section">Agreement Summary</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 24px', marginBottom:16 }}>
              {[
                ['Job',          job?.title],
                ['Budget',       fmtCurrency(job?.budget)],
                ['Start Date',   startDate],
                ['End Date',     endDate],
                ['Revisions',    `${revisionRounds} rounds`],
                ['Payment',      paymentTerms],
              ].filter(([,v]) => v).map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginBottom:2 }}>{l}</div>
                  <div style={{ fontSize:13, color:'#e2e8f0' }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Scope */}
            {scope && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginBottom:5 }}>Scope of Work</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,.7)', lineHeight:1.65, background:'rgba(255,255,255,.03)', padding:'10px 12px', borderRadius:8 }}>{scope}</div>
              </div>
            )}

            {/* Deliverables */}
            {filteredDeliverables.length > 0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginBottom:6 }}>Deliverables ({filteredDeliverables.length})</div>
                {filteredDeliverables.map((d, i) => (
                  <div key={i} style={{ fontSize:13, color:'rgba(255,255,255,.7)', display:'flex', gap:8, padding:'3px 0' }}>
                    <span style={{ color:TEAL }}>+</span> {d}
                  </div>
                ))}
              </div>
            )}

            {/* Milestones */}
            <div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginBottom:6 }}>Milestones ({milestones.length})</div>
              {milestones.map((m, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'rgba(255,255,255,.65)', padding:'4px 0', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
                  <span>{i+1}. {m.title || 'Untitled'}</span>
                  <span style={{ color:'#34d399', fontWeight:600 }}>{fmtCurrency(m.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Signature notice */}
          <div style={{ padding:14, borderRadius:10, background:'rgba(20,184,166,.07)', border:'1px solid rgba(20,184,166,.2)', marginBottom:16, fontSize:13, color:'rgba(255,255,255,.65)', lineHeight:1.65 }}>
            By clicking <strong>"Sign Agreement"</strong>, you confirm all details above are accurate and you agree to the TrustWork platform terms. Your User ID and timestamp are recorded as your electronic signature. This cannot be undone.
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', gap:10 }}>
            <button type="button" className="aw-secondary" onClick={() => setStep(3)}>Back</button>
            <button type="button" className="aw-primary" onClick={submitSign} disabled={saving}>
              {saving
                ? <svg style={{ animation:'spin .7s linear infinite' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
              {saving ? 'Signing...' : 'Sign Agreement and Send to Freelancer'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
