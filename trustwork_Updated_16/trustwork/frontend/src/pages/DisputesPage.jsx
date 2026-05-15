// DisputesPage.jsx - Phase 4: Dispute Integration
// Shows disputes with full WorkAgreement evidence panel.
// Admin can resolve with full context. Parties see their dispute status + evidence.

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { fmtCurrency, fmtDate, fmtRelative, errMsg } from '../utils/helpers'

//  Design tokens 
const css = `
  @keyframes tw-in { from { opacity:0;transform:translateY(6px) } to { opacity:1;transform:translateY(0) } }
  .dp-fade { animation: tw-in .25s ease both }
  * { box-sizing:border-box }
  .dp-card { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:14px; padding:20px; margin-bottom:14px }
  .dp-label { font-size:10px; font-weight:600; color:rgba(255,255,255,.35); text-transform:uppercase; letter-spacing:.08em; margin-bottom:4px; display:block }
  .dp-val   { font-size:13px; color:#e2e8f0; line-height:1.6 }
  .dp-sec   { font-size:11px; font-weight:700; color:rgba(255,255,255,.3); text-transform:uppercase; letter-spacing:.08em; padding-bottom:8px; margin-bottom:14px; border-bottom:1px solid rgba(255,255,255,.07) }
  .dp-kv    { margin-bottom:10px }
  .dp-g2    { display:grid; grid-template-columns:1fr 1fr; gap:12px 24px }
  @media(max-width:640px) { .dp-g2 { grid-template-columns:1fr } }
  .dp-check { display:flex; align-items:flex-start; gap:7px; margin-bottom:5px; font-size:12px }
  .dp-overlay { position:fixed; inset:0; background:rgba(0,0,0,.75); backdropFilter:blur(4px); z-index:500; display:flex; align-items:flex-start; justify-content:center; padding:24px 16px; overflow-y:auto }
  .dp-panel { width:100%; max-width:760px; background:#0e1c2f; border:1px solid rgba(255,255,255,.1); border-radius:18px; padding:28px; font-family:'DM Sans',system-ui,sans-serif; color:#f8fafc }
  .dp-btn-pri { padding:10px 22px; background:#14b8a6; border:none; border-radius:9px; color:#07111d; font-size:14px; font-weight:700; font-family:inherit; cursor:pointer; display:inline-flex; align-items:center; gap:7px; transition:all .18s }
  .dp-btn-pri:disabled { opacity:.55; cursor:not-allowed }
  .dp-btn-sec { padding:10px 18px; background:transparent; border:1.5px solid rgba(255,255,255,.12); border-radius:9px; color:rgba(255,255,255,.55); font-size:14px; font-family:inherit; cursor:pointer; transition:all .15s }
  .dp-input   { width:100%; padding:10px 13px; background:rgba(255,255,255,.05); border:1.5px solid rgba(255,255,255,.1); border-radius:9px; color:#f8fafc; font-size:14px; font-family:inherit; outline:none; resize:vertical; transition:border-color .18s }
  .dp-input:focus { border-color:#14b8a6; box-shadow:0 0 0 3px rgba(20,184,166,.1) }
`

//  Helpers 
function Kv({ label, value, mono }) {
  if (!value && value !== 0) return null
  return (
    <div className="dp-kv">
      <div className="dp-label">{label}</div>
      <div className="dp-val" style={{ fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</div>
    </div>
  )
}

function CheckItem({ label, checked }) {
  const color = checked ? '#34d399' : '#fb7185'
  return (
    <div className="dp-check" style={{ color: 'rgba(255,255,255,.6)' }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
        {checked
          ? <polyline points="20 6 9 17 4 12"/>
          : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
      </svg>
      <span style={{ fontSize: 12 }}>{label}</span>
    </div>
  )
}

const CLIENT_CK_LABELS = {
  deliverablesClear: 'Deliverables clearly described in writing',
  budgetFinalised:   'Budget finalised and sufficient for scope',
  deadlineRealistic: 'Deadline realistic and committed',
  exclusionsClear:   'Exclusions from scope understood',
  revisionsAgreed:   'Revision policy agreed with freelancer',
  contactAvailable:  'Can respond within 24 hours',
  feedbackTimely:    'Committed to timely feedback',
  escrowAgreed:      'Accepted TrustWork Escrow Agreement',
}

const FL_CK_LABELS = {
  scopeUnderstood:          'Scope of work fully understood',
  toolsAvailable:           'All tools and resources available',
  timelineAchievable:       'Timeline achievable',
  ambiguitiesCleared:       'All ambiguities clarified',
  milestoneAgreed:          'Milestone structure and amounts agreed',
  revisionPolicyUnderstood: 'Revision policy understood',
  qualityAchievable:        'Can deliver to agreed quality',
  escrowAgreed:             'Accepted TrustWork Escrow Agreement',
}

//  Evidence panel (shown inside the detail modal) 
function EvidencePanel({ agreement, escrow }) {
  if (!agreement) {
    return (
      <div style={{ padding: '20px', borderRadius: 12, background: 'rgba(251,191,36,.06)', border: '1px solid rgba(251,191,36,.2)', fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: 20 }}>
        No Work Agreement found for this job. The dispute cannot reference agreement evidence.
      </div>
    )
  }

  const deliverables = Array.isArray(agreement.deliverables) ? agreement.deliverables.filter(Boolean) : []
  const milestones   = Array.isArray(agreement.milestonesAgreed) ? agreement.milestonesAgreed : []
  const clientCk     = agreement.clientChecklist    || {}
  const freelancerCk = agreement.freelancerChecklist || {}
  const agStatusColor = agreement.status === 'ACTIVE' || agreement.status === 'COMPLETED'
    ? '#34d399' : agreement.status === 'CLIENT_SIGNED' ? '#fbbf24' : '#94a3b8'

  return (
    <div>
      {/* Agreement status + escrow */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}>
          <div className="dp-label">Agreement Status</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: agStatusColor }}>{agreement.status?.replace('_', ' ')}</div>
          {agreement.agreedAt && <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginTop: 3 }}>Active since {fmtDate(agreement.agreedAt)}</div>}
        </div>
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}>
          <div className="dp-label">Escrow Amount</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24' }}>{fmtCurrency(escrow?.amount)}</div>
          <div style={{ fontSize: 11, color: escrow?.status === 'LOCKED' ? '#fbbf24' : '#94a3b8', marginTop: 3 }}>{escrow?.status || 'No escrow'}</div>
        </div>
      </div>

      {/* Section A: Scope & Deliverables */}
      <div className="dp-card" style={{ marginBottom: 12 }}>
        <div className="dp-sec">A  Work Agreement (Scope)</div>
        {agreement.scope && (
          <div className="dp-kv">
            <div className="dp-label">Scope of Work</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', lineHeight: 1.7, background: 'rgba(255,255,255,.03)', padding: '10px 12px', borderRadius: 8 }}>{agreement.scope}</div>
          </div>
        )}
        {deliverables.length > 0 && (
          <div className="dp-kv">
            <div className="dp-label">Agreed Deliverables ({deliverables.length})</div>
            {deliverables.map((d, i) => (
              <div key={i} style={{ display: 'flex', gap: 7, fontSize: 13, color: 'rgba(255,255,255,.65)', marginBottom: 3 }}>
                <span style={{ color: '#14b8a6', flexShrink: 0 }}>+</span> {d}
              </div>
            ))}
          </div>
        )}
        <div className="dp-g2">
          <Kv label="Start Date"      value={fmtDate(agreement.startDate)} />
          <Kv label="End Date"        value={fmtDate(agreement.endDate)} />
          <Kv label="Revision Rounds" value={agreement.revisionRounds != null ? agreement.revisionRounds + ' rounds' : null} />
          <Kv label="Revision Policy" value={agreement.revisionPolicy} />
          <Kv label="Payment Terms"   value={agreement.paymentTerms} />
        </div>
        {agreement.specialConditions && <Kv label="Special Conditions" value={agreement.specialConditions} />}
      </div>

      {/* Section B: Milestones */}
      {milestones.length > 0 && (
        <div className="dp-card" style={{ marginBottom: 12 }}>
          <div className="dp-sec">B  Milestone Agreement</div>
          {milestones.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,.05)', fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{i + 1}. {m.title || 'Untitled'}</div>
                {m.deliverable && <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 1 }}>{m.deliverable}</div>}
                {m.dueDate && <div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', marginTop: 1 }}>Due: {m.dueDate}</div>}
              </div>
              <div style={{ fontWeight: 700, color: '#34d399', flexShrink: 0 }}>{fmtCurrency(m.amount)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Section D: Dispute Prevention Checklists side by side */}
      <div className="dp-card" style={{ marginBottom: 12 }}>
        <div className="dp-sec">D  Dispute Prevention Checklist (Both Parties)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
              Client ({Object.values(clientCk).filter(Boolean).length}/{Object.keys(CLIENT_CK_LABELS).length})
            </div>
            {Object.entries(CLIENT_CK_LABELS).map(([k, l]) => (
              <CheckItem key={k} label={l} checked={clientCk[k] === true} />
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#14b8a6', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
              Freelancer ({Object.values(freelancerCk).filter(Boolean).length}/{Object.keys(FL_CK_LABELS).length})
            </div>
            {Object.entries(FL_CK_LABELS).map(([k, l]) => (
              <CheckItem key={k} label={l} checked={freelancerCk[k] === true} />
            ))}
          </div>
        </div>
      </div>

      {/* Phase 2: Submission and release notes */}
      {(agreement.freelancerSubmitConfirmedAt || agreement.submissionNote) && (
        <div className="dp-card" style={{ marginBottom: 12, borderColor: 'rgba(129,140,248,.2)' }}>
          <div className="dp-sec">E  Freelancer Submission Record</div>
          <div className="dp-g2">
            <Kv label="Submitted At" value={fmtDate(agreement.freelancerSubmitConfirmedAt)} />
          </div>
          {agreement.submissionNote && (
            <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 8, background: 'rgba(129,140,248,.06)', border: '1px solid rgba(129,140,248,.15)', fontSize: 13, color: 'rgba(255,255,255,.65)', fontStyle: 'italic' }}>
              "{agreement.submissionNote}"
            </div>
          )}
        </div>
      )}

      {/* Signatures */}
      <div className="dp-card" style={{ marginBottom: 0 }}>
        <div className="dp-sec">F  Electronic Signatures</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ padding: '10px 12px', borderRadius: 9, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}>
            <div className="dp-label">Client Signed</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: agreement.clientSignedAt ? '#34d399' : '#fb7185' }}>
              {agreement.clientSignedAt ? fmtDate(agreement.clientSignedAt) : 'Not signed'}
            </div>
            {agreement.clientSignedById && <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', fontFamily: 'monospace', marginTop: 2 }}>{agreement.clientSignedById}</div>}
          </div>
          <div style={{ padding: '10px 12px', borderRadius: 9, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}>
            <div className="dp-label">Freelancer Signed</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: agreement.freelancerSignedAt ? '#34d399' : '#fb7185' }}>
              {agreement.freelancerSignedAt ? fmtDate(agreement.freelancerSignedAt) : 'Not signed'}
            </div>
            {agreement.freelancerSignedById && <div style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', fontFamily: 'monospace', marginTop: 2 }}>{agreement.freelancerSignedById}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

//  Resolve modal 
function ResolveModal({ dispute, onClose, onResolved }) {
  const [outcome,    setOutcome]    = useState('RELEASE')
  const [resolution, setResolution] = useState('')
  const [tab,        setTab]        = useState('decision')  // decision | evidence
  const [saving,     setSaving]     = useState(false)

  const resolve = async () => {
    if (!resolution.trim()) { toast.error('Enter resolution notes'); return }
    setSaving(true)
    try {
      await api.post(`/disputes/${dispute.id}/resolve`, { outcome, resolution })
      toast.success(`Dispute resolved  ${outcome === 'RELEASE' ? 'payment released to freelancer' : 'funds refunded to client'}`)
      onResolved()
      onClose()
    } catch (err) { toast.error(errMsg(err)) }
    finally { setSaving(false) }
  }

  const ag     = dispute.job?.agreement
  const escrow = dispute.job?.escrows?.[0]

  return (
    <div className="dp-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dp-panel">
        <style>{css}</style>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: '#f43f5e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>Resolving Dispute</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc' }}>{dispute.job?.title}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', marginTop: 3 }}>
              Raised by <strong style={{ color: '#f8fafc' }}>{dispute.raisedBy?.name}</strong> &middot; {fmtRelative(dispute.createdAt)}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', cursor: 'pointer', padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Dispute reason */}
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(244,63,94,.07)', border: '1px solid rgba(244,63,94,.2)', marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#f43f5e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Dispute Reason</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', lineHeight: 1.65 }}>{dispute.reason}</div>
        </div>

        {/* Tabs: Decision | Evidence */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', padding: 3, borderRadius: 10, marginBottom: 20, width: 'fit-content' }}>
          {[['decision', 'Make Decision'], ['evidence', 'View Evidence']].map(([id, l]) => (
            <button key={id} type="button" onClick={() => setTab(id)}
              style={{ padding: '6px 16px', borderRadius: 8, border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .18s',
                background: tab === id ? '#14b8a6' : 'transparent',
                color: tab === id ? '#07111d' : 'rgba(255,255,255,.45)' }}>
              {l}
            </button>
          ))}
        </div>

        {/* Decision tab */}
        {tab === 'decision' && (
          <div className="dp-fade">
            {/* Parties */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(96,165,250,.06)', border: '1px solid rgba(96,165,250,.2)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Client</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{dispute.job?.client?.name}</div>
              </div>
              <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(20,184,166,.06)', border: '1px solid rgba(20,184,166,.2)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#14b8a6', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>Freelancer</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{dispute.job?.freelancer?.name}</div>
              </div>
            </div>

            {/* Outcome selector */}
            <div style={{ marginBottom: 16 }}>
              <div className="dp-label" style={{ marginBottom: 8 }}>Resolution Outcome</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button type="button" onClick={() => setOutcome('RELEASE')}
                  style={{ padding: '14px', borderRadius: 11, border: `2px solid ${outcome === 'RELEASE' ? 'rgba(52,211,153,.5)' : 'rgba(255,255,255,.1)'}`, background: outcome === 'RELEASE' ? 'rgba(52,211,153,.08)' : 'rgba(255,255,255,.03)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all .18s' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={outcome === 'RELEASE' ? '#34d399' : 'rgba(255,255,255,.35)'} strokeWidth="2" strokeLinecap="round" style={{ marginBottom: 8, display: 'block' }}>
                    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                  <div style={{ fontSize: 13, fontWeight: 700, color: outcome === 'RELEASE' ? '#34d399' : 'rgba(255,255,255,.55)', marginBottom: 3 }}>Release Payment</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>Freelancer did the work  {fmtCurrency(escrow?.amount)} released</div>
                </button>
                <button type="button" onClick={() => setOutcome('REFUND')}
                  style={{ padding: '14px', borderRadius: 11, border: `2px solid ${outcome === 'REFUND' ? 'rgba(244,63,94,.5)' : 'rgba(255,255,255,.1)'}`, background: outcome === 'REFUND' ? 'rgba(244,63,94,.07)' : 'rgba(255,255,255,.03)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all .18s' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={outcome === 'REFUND' ? '#f43f5e' : 'rgba(255,255,255,.35)'} strokeWidth="2" strokeLinecap="round" style={{ marginBottom: 8, display: 'block' }}>
                    <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
                  </svg>
                  <div style={{ fontSize: 13, fontWeight: 700, color: outcome === 'REFUND' ? '#f43f5e' : 'rgba(255,255,255,.55)', marginBottom: 3 }}>Refund Client</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>Work was not delivered  {fmtCurrency(escrow?.amount)} refunded</div>
                </button>
              </div>
            </div>

            {/* Resolution notes */}
            <div style={{ marginBottom: 20 }}>
              <label className="dp-label" style={{ marginBottom: 6 }}>Resolution Notes (required)</label>
              <textarea className="dp-input" rows={4} value={resolution} onChange={e => setResolution(e.target.value)}
                placeholder="Explain the basis for this decision. Reference specific deliverables, checklist answers, or submission notes as evidence..." />
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.28)', marginTop: 4 }}>This note is shown to both parties.</div>
            </div>

            {/* Evidence quick summary */}
            {ag && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Evidence Summary</div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: 'rgba(255,255,255,.4)' }}>Agreement:</span>{' '}
                    <span style={{ color: ag.agreedAt ? '#34d399' : '#fb7185', fontWeight: 600 }}>{ag.agreedAt ? 'Signed by both' : 'Not fully signed'}</span>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: 'rgba(255,255,255,.4)' }}>Client checklist:</span>{' '}
                    <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{Object.values(ag.clientChecklist || {}).filter(Boolean).length}/8</span>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: 'rgba(255,255,255,.4)' }}>Freelancer checklist:</span>{' '}
                    <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{Object.values(ag.freelancerChecklist || {}).filter(Boolean).length}/8</span>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: 'rgba(255,255,255,.4)' }}>Work submitted:</span>{' '}
                    <span style={{ color: ag.freelancerSubmitConfirmedAt ? '#34d399' : '#fb7185', fontWeight: 600 }}>{ag.freelancerSubmitConfirmedAt ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <button type="button" onClick={() => setTab('evidence')} style={{ marginTop: 8, fontSize: 11, color: '#14b8a6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  View full evidence panel
                </button>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="dp-btn-sec" onClick={onClose}>Cancel</button>
              <button type="button" className="dp-btn-pri" onClick={resolve} disabled={saving || !resolution.trim()}
                style={{ flex: 1, justifyContent: 'center', background: outcome === 'REFUND' ? '#f43f5e' : '#14b8a6', color: '#07111d' }}>
                {saving && <svg style={{ animation: 'spin .7s linear infinite' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>}
                {saving ? 'Resolving...' : outcome === 'RELEASE' ? 'Release Payment to Freelancer' : 'Refund Client'}
              </button>
            </div>
            <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>
          </div>
        )}

        {/* Evidence tab */}
        {tab === 'evidence' && (
          <div className="dp-fade">
            <EvidencePanel agreement={ag} escrow={escrow} />
            <div style={{ marginTop: 16 }}>
              <button type="button" className="dp-btn-sec" onClick={() => setTab('decision')}>
                Back to Decision
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

//  Dispute detail view (non-admin parties) 
function DisputeDetailModal({ dispute, onClose }) {
  const ag     = dispute.job?.agreement
  const escrow = dispute.job?.escrows?.[0]

  return (
    <div className="dp-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dp-panel">
        <style>{css}</style>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: dispute.status === 'OPEN' ? '#f43f5e' : '#34d399', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>
              Dispute {dispute.status}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc' }}>{dispute.job?.title}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', cursor: 'pointer', padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Status */}
        <div style={{ padding: '12px 14px', borderRadius: 10, marginBottom: 16, background: dispute.status === 'OPEN' ? 'rgba(244,63,94,.07)' : 'rgba(52,211,153,.07)', border: `1px solid ${dispute.status === 'OPEN' ? 'rgba(244,63,94,.2)' : 'rgba(52,211,153,.2)'}` }}>
          <div style={{ fontSize: 11, color: dispute.status === 'OPEN' ? '#f43f5e' : '#34d399', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 5 }}>
            {dispute.status === 'OPEN' ? 'Awaiting mediator decision' : 'Resolved'}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.65)' }}>{dispute.reason}</div>
          {dispute.resolution && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.08)', fontSize: 13, color: 'rgba(255,255,255,.7)' }}>
              <strong style={{ color: '#f8fafc' }}>Resolution:</strong> {dispute.resolution}
            </div>
          )}
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>Agreement Evidence</div>
        <EvidencePanel agreement={ag} escrow={escrow} />
      </div>
    </div>
  )
}

//  Main page 
export default function DisputesPage() {
  const { user }    = useAuth()
  const isAdmin     = user?.role === 'ADMIN'

  const [disputes,  setDisputes]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [resolving, setResolving] = useState(null)  // dispute being resolved (admin)
  const [viewing,   setViewing]   = useState(null)  // dispute being viewed (party)
  const [filter,    setFilter]    = useState('all') // all | open | resolved

  const fetchDisputes = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get('/disputes')
      setDisputes(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(errMsg(err))
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchDisputes() }, [fetchDisputes])

  const filtered = filter === 'open'     ? disputes.filter(d => d.status === 'OPEN')
                 : filter === 'resolved' ? disputes.filter(d => d.status !== 'OPEN')
                 : disputes

  const openCount = disputes.filter(d => d.status === 'OPEN').length

  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", color: '#f8fafc' }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc', marginBottom: 4, letterSpacing: '-.3px' }}>
            {isAdmin ? 'Dispute Management' : 'My Disputes'}
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.45)' }}>
            {isAdmin ? 'Review agreement evidence and mediate platform disputes' : 'View your dispute status and agreement evidence'}
            {openCount > 0 && (
              <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 100, background: 'rgba(244,63,94,.15)', color: '#f43f5e', border: '1px solid rgba(244,63,94,.3)' }}>
                {openCount} open
              </span>
            )}
          </p>
        </div>
        <button onClick={fetchDisputes}
          style={{ padding: '8px 14px', borderRadius: 9, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.6)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      {disputes.length > 0 && (
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', padding: 4, borderRadius: 12, width: 'fit-content', marginBottom: 20 }}>
          {[['all', 'All', disputes.length], ['open', 'Open', openCount], ['resolved', 'Resolved', disputes.length - openCount]].map(([id, l, cnt]) => (
            <button key={id} type="button" onClick={() => setFilter(id)}
              style={{ padding: '6px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, transition: 'all .18s', display: 'flex', alignItems: 'center', gap: 6,
                background: filter === id ? (id === 'open' ? '#f43f5e' : id === 'resolved' ? '#34d399' : '#14b8a6') : 'transparent',
                color: filter === id ? '#07111d' : 'rgba(255,255,255,.45)' }}>
              {l}
              <span style={{ fontSize: 10, minWidth: 16, height: 16, borderRadius: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: filter === id ? 'rgba(0,0,0,.2)' : 'rgba(255,255,255,.1)', color: filter === id ? '#07111d' : 'rgba(255,255,255,.55)', padding: '0 4px' }}>
                {cnt}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2].map(i => <div key={i} style={{ height: 90, borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)', animation: 'pulse 1.5s ease-in-out infinite' }}/>)}
          <style>{`@keyframes pulse { 0%,100% { opacity:.5 } 50% { opacity:1 } }`}</style>
        </div>
      ) : error ? (
        <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(244,63,94,.06)', borderRadius: 12, border: '1px solid rgba(244,63,94,.2)' }}>
          <div style={{ fontSize: 14, color: '#fb7185', marginBottom: 12 }}>{error}</div>
          <button onClick={fetchDisputes} style={{ padding: '8px 20px', borderRadius: 9, background: '#14b8a6', border: 'none', color: '#07111d', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '48px 32px', textAlign: 'center', background: 'rgba(52,211,153,.04)', borderRadius: 14, border: '1px solid rgba(52,211,153,.15)' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(52,211,153,.4)" strokeWidth="1.5" strokeLinecap="round" style={{ display: 'block', margin: '0 auto 12px' }}>
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,.45)' }}>
            {filter === 'open' ? 'No open disputes' : filter === 'resolved' ? 'No resolved disputes' : 'No disputes  all clear!'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(d => {
            const isOpen = d.status === 'OPEN'
            const ag     = d.job?.agreement
            return (
              <div key={d.id}
                style={{ padding: '16px 20px', background: 'rgba(255,255,255,.04)', border: `1px solid ${isOpen ? 'rgba(244,63,94,.2)' : 'rgba(255,255,255,.08)'}`, borderRadius: 14, borderLeft: `3px solid ${isOpen ? '#f43f5e' : '#34d399'}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title + status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <Link to={`/jobs/${d.jobId}`}
                        style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', textDecoration: 'none' }}
                        onClick={e => e.stopPropagation()}>
                        {d.job?.title}
                      </Link>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 100,
                        background: isOpen ? 'rgba(244,63,94,.12)' : 'rgba(52,211,153,.12)',
                        color: isOpen ? '#f43f5e' : '#34d399',
                        border: `1px solid ${isOpen ? 'rgba(244,63,94,.3)' : 'rgba(52,211,153,.3)'}` }}>
                        {d.status}
                      </span>
                    </div>

                    {/* Reason */}
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', lineHeight: 1.55, marginBottom: 8 }}>{d.reason}</div>

                    {/* Resolution */}
                    {d.resolution && (
                      <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(52,211,153,.06)', border: '1px solid rgba(52,211,153,.15)', fontSize: 12, color: 'rgba(255,255,255,.65)', marginBottom: 8 }}>
                        <strong style={{ color: '#34d399' }}>Resolution:</strong> {d.resolution}
                      </div>
                    )}

                    {/* Meta row */}
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'rgba(255,255,255,.38)' }}>
                      <span>Raised by <strong style={{ color: 'rgba(255,255,255,.6)' }}>{d.raisedBy?.name}</strong></span>
                      <span>{fmtRelative(d.createdAt)}</span>
                      <span>Budget: <strong style={{ color: '#fbbf24' }}>{fmtCurrency(d.job?.budget)}</strong></span>
                      {ag && (
                        <span>Agreement: <strong style={{ color: ag.agreedAt ? '#34d399' : '#94a3b8' }}>{ag.agreedAt ? 'Both signed' : ag.status?.replace('_', ' ')}</strong></span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'flex-start' }}>
                    <button type="button"
                      onClick={() => isAdmin ? setResolving(d) : setViewing(d)}
                      style={{ padding: '7px 14px', borderRadius: 9, border: `1px solid ${isOpen && isAdmin ? 'rgba(244,63,94,.35)' : 'rgba(255,255,255,.12)'}`, background: isOpen && isAdmin ? 'rgba(244,63,94,.12)' : 'rgba(255,255,255,.05)', color: isOpen && isAdmin ? '#f43f5e' : 'rgba(255,255,255,.65)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .18s' }}>
                      {isAdmin && isOpen ? 'Resolve' : 'View Evidence'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Admin resolve modal */}
      {resolving && (
        <ResolveModal
          dispute={resolving}
          onClose={() => setResolving(null)}
          onResolved={() => { setResolving(null); fetchDisputes() }}
        />
      )}

      {/* Party view modal */}
      {viewing && (
        <DisputeDetailModal
          dispute={viewing}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  )
}
