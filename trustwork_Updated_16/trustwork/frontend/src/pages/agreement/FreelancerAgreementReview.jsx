// FreelancerAgreementReview.jsx
// 3-page review: Read A+B -> Sign C (escrow terms) -> Confirm D (checklist) / request changes
import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { fmtCurrency, fmtDate } from '../../utils/helpers'

const TEAL = '#14b8a6'

const FREELANCER_CHECKLIST = [
  { key: 'scopeUnderstood',          label: 'I fully understand the scope of work required.' },
  { key: 'toolsAvailable',           label: 'I have all tools, licenses, and resources needed to complete this work.' },
  { key: 'timelineAchievable',       label: 'The agreed timeline is achievable given my current workload.' },
  { key: 'ambiguitiesCleared',       label: 'I have clarified all ambiguities with the client before signing.' },
  { key: 'milestoneAgreed',          label: 'I agree to the milestone structure and payment amounts.' },
  { key: 'revisionPolicyUnderstood', label: 'I understand the revision policy and its limits.' },
  { key: 'qualityAchievable',        label: 'I can deliver to the agreed quality standard.' },
  { key: 'escrowAgreed',             label: 'I have read and accept the TrustWork Escrow Agreement.' },
]

const css = `
  @keyframes tw-in { from { opacity:0;transform:translateY(8px) } to { opacity:1;transform:translateY(0) } }
  .ar-fade { animation: tw-in .25s ease both }
  .ar-input { width:100%; padding:10px 13px; background:rgba(255,255,255,.05); border:1.5px solid rgba(255,255,255,.1); border-radius:9px; color:#f8fafc; font-size:14px; font-family:inherit; outline:none; transition:all .18s; }
  .ar-input:focus { border-color:${TEAL}; box-shadow:0 0 0 3px rgba(20,184,166,.1) }
  .ar-label { display:block; font-size:11px; color:rgba(255,255,255,.38); text-transform:uppercase; letter-spacing:.07em; margin-bottom:5px }
  .ar-section { font-size:12px; font-weight:600; color:rgba(255,255,255,.32); text-transform:uppercase; letter-spacing:.08em; margin-bottom:14px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,.07) }
  .ar-card { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:12px; padding:18px }
  .ar-primary { padding:11px 24px; background:${TEAL}; border:none; border-radius:9px; color:#07111d; font-size:14px; font-weight:700; font-family:inherit; cursor:pointer; transition:all .18s; display:inline-flex; align-items:center; gap:7px }
  .ar-primary:disabled { opacity:.55; cursor:not-allowed }
  .ar-secondary { padding:11px 18px; background:transparent; border:1.5px solid rgba(255,255,255,.1); border-radius:9px; color:rgba(255,255,255,.5); font-size:14px; font-family:inherit; cursor:pointer; transition:all .15s }
  .ar-danger { padding:11px 18px; background:transparent; border:1.5px solid rgba(244,63,94,.3); border-radius:9px; color:#f43f5e; font-size:14px; font-family:inherit; cursor:pointer; transition:all .15s }
  .ar-check-row { display:flex; gap:11px; align-items:flex-start; padding:10px 12px; border-radius:9px; border:1px solid rgba(255,255,255,.07); cursor:pointer; transition:all .18s; margin-bottom:8px }
  .ar-check-row:hover { border-color:rgba(20,184,166,.25); background:rgba(20,184,166,.04) }
  .ar-check-row.checked { border-color:rgba(20,184,166,.35); background:rgba(20,184,166,.07) }
`

function ProgressBar({ step, total }) {
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
        <span style={{ fontSize:11, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.07em' }}>Step {step} of {total}</span>
        <span style={{ fontSize:11, color:TEAL }}>{Math.round((step/total)*100)}% complete</span>
      </div>
      <div style={{ height:4, background:'rgba(255,255,255,.07)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${(step/total)*100}%`, background:`linear-gradient(to right,${TEAL},#0d9488)`, borderRadius:2, transition:'width .4s ease' }}/>
      </div>
    </div>
  )
}

function ReadOnlyField({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div style={{ marginBottom:12 }}>
      <div className="ar-label">{label}</div>
      <div style={{ fontSize:14, color:'#e2e8f0', lineHeight:1.6 }}>{value}</div>
    </div>
  )
}

export default function FreelancerAgreementReview({ jobId, job, agreement, onSigned, onChangesRequested }) {
  const [step, setStep]                   = useState(1)
  const [checklist, setChecklist]         = useState({})
  const [escrowAccepted, setEscrowAccepted] = useState(false)
  const [changeNote, setChangeNote]       = useState('')
  const [showChangeForm, setShowChangeForm] = useState(false)
  const [saving, setSaving]               = useState(false)

  const toggleCheck = k => setChecklist(c => ({ ...c, [k]: !c[k] }))

  const submitSign = async () => {
    if (!FREELANCER_CHECKLIST.every(q => checklist[q.key])) { toast.error('Confirm all checklist items'); return }
    if (!escrowAccepted) { toast.error('You must accept the escrow release terms'); return }
    setSaving(true)
    try {
      await api.post(`/agreements/${jobId}/freelancer-sign`, {
        freelancerChecklist: checklist,
        escrowTermsAccepted: true,
      })
      toast.success('Agreement signed! Both parties have agreed. You may now start work.')
      onSigned?.()
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Signing failed')
    } finally { setSaving(false) }
  }

  const submitChanges = async () => {
    if (!changeNote.trim()) { toast.error('Describe what needs to change'); return }
    setSaving(true)
    try {
      await api.post(`/agreements/${jobId}/request-changes`, { changeNote })
      toast.success('Change request sent to client.')
      onChangesRequested?.()
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Request failed')
    } finally { setSaving(false) }
  }

  const H   = ({ children }) => <div style={{ fontSize:16, fontWeight:700, color:'#f8fafc', marginBottom:4 }}>{children}</div>
  const Sub = ({ children }) => <div style={{ fontSize:13, color:'rgba(255,255,255,.4)', marginBottom:20 }}>{children}</div>

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", color:'#f8fafc', maxWidth:680 }}>
      <style>{css}</style>
      <ProgressBar step={step} total={3} />

      {/*  STEP 1: Review Work Agreement (A + B)  */}
      {step === 1 && (
        <div className="ar-fade">
          <H>Review Agreement</H>
          <Sub>The client has sent you a work agreement. Review all terms carefully before signing.</Sub>

          <div className="ar-card" style={{ marginBottom:14 }}>
            <div className="ar-section">Section A  Work Agreement</div>
            <ReadOnlyField label="Scope of Work" value={agreement?.scope} />
            {agreement?.deliverables?.length > 0 && (
              <div style={{ marginBottom:12 }}>
                <div className="ar-label">Deliverables</div>
                {agreement.deliverables.map((d, i) => (
                  <div key={i} style={{ fontSize:13, color:'rgba(255,255,255,.7)', padding:'2px 0', display:'flex', gap:8 }}>
                    <span style={{ color:TEAL }}>+</span> {d}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 20px' }}>
              <ReadOnlyField label="Start Date"       value={agreement?.startDate ? fmtDate(agreement.startDate) : null} />
              <ReadOnlyField label="End Date"         value={agreement?.endDate   ? fmtDate(agreement.endDate)   : null} />
              <ReadOnlyField label="Revision Rounds"  value={agreement?.revisionRounds != null ? agreement.revisionRounds + ' rounds' : null} />
              <ReadOnlyField label="Revision Policy"  value={agreement?.revisionPolicy} />
              <ReadOnlyField label="Payment Terms"    value={agreement?.paymentTerms} />
            </div>
            {agreement?.specialConditions && (
              <div style={{ marginTop:12, padding:'10px 12px', background:'rgba(251,191,36,.07)', border:'1px solid rgba(251,191,36,.2)', borderRadius:9 }}>
                <div className="ar-label" style={{ color:'#fbbf24' }}>Special Conditions / Change Notes</div>
                <div style={{ fontSize:13, color:'#fbbf24', lineHeight:1.6 }}>{agreement.specialConditions}</div>
              </div>
            )}
          </div>

          <div className="ar-card" style={{ marginBottom:14 }}>
            <div className="ar-section">Section B  Milestone Agreement</div>
            {(agreement?.milestonesAgreed || []).length > 0 ? (
              <>
                {agreement.milestonesAgreed.map((m, i) => (
                  <div key={i} style={{ padding:'10px 12px', background:'rgba(255,255,255,.03)', borderRadius:9, border:'1px solid rgba(255,255,255,.07)', marginBottom:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:'#f8fafc', marginBottom:3 }}>{i+1}. {m.title}</div>
                        <div style={{ fontSize:12, color:'rgba(255,255,255,.5)' }}>{m.deliverable}</div>
                        {m.dueDate && <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginTop:3 }}>Due: {fmtDate(m.dueDate)}</div>}
                      </div>
                      <div style={{ fontSize:15, fontWeight:700, color:'#34d399', flexShrink:0, marginLeft:12 }}>{fmtCurrency(m.amount)}</div>
                    </div>
                  </div>
                ))}
                <div style={{ fontSize:13, color:'rgba(255,255,255,.5)', textAlign:'right', paddingTop:8, borderTop:'1px solid rgba(255,255,255,.07)' }}>
                  Total: <strong style={{ color:'#34d399' }}>{fmtCurrency(agreement.milestonesAgreed.reduce((s,m)=>s+parseFloat(m.amount||0),0))}</strong> / Budget: <strong style={{ color:'#f8fafc' }}>{fmtCurrency(job?.budget)}</strong>
                </div>
              </>
            ) : (
              <div style={{ fontSize:13, color:'rgba(255,255,255,.35)' }}>No milestones defined.</div>
            )}
          </div>

          {/* Change request option */}
          {showChangeForm ? (
            <div className="ar-card" style={{ marginBottom:14 }}>
              <div className="ar-section">Request Changes</div>
              <label className="ar-label">What needs to change?</label>
              <textarea className="ar-input" rows={4} value={changeNote} onChange={e => setChangeNote(e.target.value)}
                style={{ resize:'vertical', marginBottom:10 }}
                placeholder="Describe exactly what you want changed (scope, milestones, dates, terms)..." />
              <div style={{ display:'flex', gap:10 }}>
                <button className="ar-secondary" onClick={() => setShowChangeForm(false)}>Cancel</button>
                <button className="ar-danger" onClick={submitChanges} disabled={saving}
                  style={{ flex:1, padding:'11px', borderRadius:9, fontSize:14, fontWeight:600, fontFamily:'inherit', cursor:saving?'not-allowed':'pointer', opacity:saving?.7:1 }}>
                  {saving ? 'Sending...' : 'Send Change Request to Client'}
                </button>
              </div>
            </div>
          ) : null}

          <div style={{ display:'flex', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
            {!showChangeForm && (
              <button className="ar-danger" onClick={() => setShowChangeForm(true)}>
                Request Changes
              </button>
            )}
            <button className="ar-primary" onClick={() => setStep(2)} style={{ marginLeft:'auto' }}>
              Looks Good  Continue
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      )}

      {/*  STEP 2: Escrow Release Terms (Section C)  */}
      {step === 2 && (
        <div className="ar-fade">
          <H>Escrow Release Agreement</H>
          <Sub>Review and accept the escrow terms. This determines when and how you receive payment.</Sub>

          <div className="ar-card" style={{ marginBottom:14 }}>
            <div className="ar-section">Section C  Escrow Release Terms</div>

            {[
              ['How escrow works', 'The client has deposited the full project budget (or each milestone amount) into TrustWork escrow. The funds are held securely and cannot be withdrawn by either party during the project.'],
              ['When funds are released', 'Funds are released to you when the client approves your submitted work. For milestone projects, each milestone payment is released upon approval of that milestone.'],
              ['What happens if work is rejected', 'If the client rejects your submission, a dispute is raised. The assigned TrustWork mediator reviews both the original agreement (this document) and the submitted work to determine the outcome.'],
              ['Refund policy', 'If you fail to deliver within the agreed timeline without communication, the client may request a refund after a 7-day notice period.'],
              ['Your obligations', 'You must deliver all items listed in the Deliverables section of this agreement. Partial delivery does not entitle you to full payment.'],
            ].map(([title, text]) => (
              <div key={title} style={{ marginBottom:14 }}>
                <div style={{ fontSize:12, fontWeight:600, color:TEAL, marginBottom:5 }}>{title}</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,.6)', lineHeight:1.7 }}>{text}</div>
              </div>
            ))}

            <div style={{ marginTop:6, padding:'12px 14px', borderRadius:9,
              border:`1.5px solid ${escrowAccepted ? 'rgba(52,211,153,.4)' : 'rgba(255,255,255,.12)'}`,
              background: escrowAccepted ? 'rgba(52,211,153,.07)' : 'rgba(255,255,255,.03)',
              cursor:'pointer', display:'flex', gap:12, alignItems:'flex-start', transition:'all .18s' }}
              onClick={() => setEscrowAccepted(e => !e)}>
              <div style={{ width:18, height:18, borderRadius:4, flexShrink:0, marginTop:1,
                border:`2px solid ${escrowAccepted ? '#34d399' : 'rgba(255,255,255,.2)'}`,
                background: escrowAccepted ? '#34d399' : 'transparent',
                display:'flex', alignItems:'center', justifyContent:'center', transition:'all .18s' }}>
                {escrowAccepted && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#07111d" strokeWidth="1.8" strokeLinecap="round"/></svg>}
              </div>
              <span style={{ fontSize:13, color: escrowAccepted ? '#e2e8f0' : 'rgba(255,255,255,.55)', lineHeight:1.5 }}>
                I have read and accept the TrustWork Escrow Release Agreement. I understand that funds will only be released to me after the client approves my work.
              </span>
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', gap:10 }}>
            <button className="ar-secondary" onClick={() => setStep(1)}>Back</button>
            <button className="ar-primary" onClick={() => {
              if (!escrowAccepted) { toast.error('Please accept the escrow terms to continue'); return }
              setStep(3)
            }}>
              Accept & Continue
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      )}

      {/*  STEP 3: Freelancer Checklist + Final Sign (Section D)  */}
      {step === 3 && (
        <div className="ar-fade">
          <H>Confirm & Sign</H>
          <Sub>Confirm each item and sign the agreement. These answers are stored permanently.</Sub>

          <div className="ar-card" style={{ marginBottom:14 }}>
            <div className="ar-section">Section D  Freelancer Confirmation</div>
            {FREELANCER_CHECKLIST.map(({ key, label }) => (
              <div key={key} className={'ar-check-row' + (checklist[key] ? ' checked' : '')} onClick={() => toggleCheck(key)}>
                <div style={{ width:18, height:18, borderRadius:4, flexShrink:0, marginTop:1,
                  border:`2px solid ${checklist[key] ? TEAL : 'rgba(255,255,255,.2)'}`,
                  background: checklist[key] ? TEAL : 'transparent',
                  display:'flex', alignItems:'center', justifyContent:'center', transition:'all .18s' }}>
                  {checklist[key] && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#07111d" strokeWidth="1.8" strokeLinecap="round"/></svg>}
                </div>
                <span style={{ fontSize:13, color: checklist[key] ? '#e2e8f0' : 'rgba(255,255,255,.55)', lineHeight:1.5 }}>{label}</span>
              </div>
            ))}
            <div style={{ marginTop:10, fontSize:12, color:'rgba(255,255,255,.3)' }}>
              {FREELANCER_CHECKLIST.filter(q => checklist[q.key]).length} / {FREELANCER_CHECKLIST.length} confirmed
            </div>
          </div>

          <div style={{ padding:14, borderRadius:10, background:'rgba(20,184,166,.07)', border:'1px solid rgba(20,184,166,.2)', marginBottom:16, fontSize:13, color:'rgba(255,255,255,.65)', lineHeight:1.65 }}>
            By signing, you confirm all items above and agree to the full Work Agreement, Escrow Release Terms, and TrustWork platform rules. Your electronic signature (user ID + timestamp) will be recorded.
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', gap:10 }}>
            <button className="ar-secondary" onClick={() => setStep(2)}>Back</button>
            <button className="ar-primary" onClick={submitSign} disabled={saving}>
              {saving ? 'Signing...' : 'Sign Agreement'}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
