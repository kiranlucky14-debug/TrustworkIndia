// ReleaseConfirmModal.jsx
// Phase 2 - Client re-confirms work is complete and releases escrow payment.
// Replaces the simple "Approve & Release" confirm dialog.

import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { fmtCurrency, errMsg } from '../../utils/helpers'

const GREEN = '#34d399'

const RELEASE_ITEMS = [
  'I have reviewed all submitted deliverables.',
  'The work meets the agreed scope as defined in the Work Agreement.',
  'All items in the agreed deliverables list have been received.',
  'I am satisfied with the quality of the work submitted.',
  'I understand that releasing payment is permanent and cannot be reversed.',
]

function Checkbox({ checked, onChange, children, accent = GREEN }) {
  return (
    <div onClick={() => onChange(!checked)}
      style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '10px 12px',
        borderRadius: 9, cursor: 'pointer', transition: 'all .18s', marginBottom: 8,
        border: `1px solid ${checked ? `${accent}45` : 'rgba(255,255,255,.08)'}`,
        background: checked ? `${accent}08` : 'rgba(255,255,255,.03)' }}>
      <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
        border: `2px solid ${checked ? accent : 'rgba(255,255,255,.2)'}`,
        background: checked ? accent : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .18s' }}>
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2 2 4-4" stroke="#07111d" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        )}
      </div>
      <span style={{ fontSize: 13, color: checked ? '#e2e8f0' : 'rgba(255,255,255,.55)', lineHeight: 1.55 }}>
        {children}
      </span>
    </div>
  )
}

export default function ReleaseConfirmModal({ open, onClose, jobId, job, agreement, onReleased }) {
  const [confirmed,  setConfirmed]  = useState({})
  const [releaseOk,  setReleaseOk]  = useState(false)
  const [note,       setNote]       = useState('')
  const [saving,     setSaving]     = useState(false)

  const toggleItem = (i) => setConfirmed(prev => ({ ...prev, [i]: !prev[i] }))
  const allItemsChecked = RELEASE_ITEMS.every((_, i) => confirmed[i])
  const canRelease = allItemsChecked && releaseOk

  const deliverables  = Array.isArray(agreement?.deliverables) ? agreement.deliverables.filter(Boolean) : []
  const milestones    = Array.isArray(agreement?.milestonesAgreed) ? agreement.milestonesAgreed : []
  const submissionNote = agreement?.submissionNote
  const submittedAt   = agreement?.freelancerSubmitConfirmedAt

  const handleRelease = async () => {
    if (!canRelease) { toast.error('Please confirm all items before releasing payment'); return }
    setSaving(true)
    try {
      await api.post(`/agreements/${jobId}/release-confirm`, {
        escrowReleaseAccepted: true,
        releaseNote: note.trim() || undefined,
      })
      toast.success('Payment released! Job completed.')
      onReleased?.()
      onClose()
    } catch (err) {
      toast.error(errMsg(err))
    } finally { setSaving(false) }
  }

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto',
        background: '#0e1c2f', border: '1px solid rgba(255,255,255,.1)', borderRadius: 18,
        padding: 28, fontFamily: "'DM Sans',system-ui,sans-serif", color: '#f8fafc' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>Approve Work & Release Payment</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.45)' }}>{job?.title}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,.08)', margin: '16px 0' }} />

        {/* Payment amount */}
        <div style={{ marginBottom: 18, padding: 16, borderRadius: 12, background: 'rgba(52,211,153,.06)', border: '1px solid rgba(52,211,153,.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: GREEN, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>Escrow Amount to Release</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: GREEN }}>{fmtCurrency(job?.budget)}</div>
          </div>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(52,211,153,.4)" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>

        {/* Freelancer submission note */}
        {submissionNote && (
          <div style={{ marginBottom: 18, padding: 14, borderRadius: 10, background: 'rgba(129,140,248,.06)', border: '1px solid rgba(129,140,248,.2)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Freelancer Submission Note</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.65)', lineHeight: 1.65, fontStyle: 'italic' }}>"{submissionNote}"</div>
          </div>
        )}

        {/* Agreed deliverables */}
        {deliverables.length > 0 && (
          <div style={{ marginBottom: 18, padding: 14, borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
              Agreed Deliverables (from Work Agreement)
            </div>
            {deliverables.map((d, i) => (
              <div key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,.65)', display: 'flex', gap: 8, marginBottom: 4 }}>
                <span style={{ color: GREEN, flexShrink: 0 }}>+</span> {d}
              </div>
            ))}
          </div>
        )}

        {/* Milestone summary */}
        {milestones.length > 0 && (
          <div style={{ marginBottom: 18, padding: 14, borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Milestones</div>
            {milestones.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(255,255,255,.6)', marginBottom: 4 }}>
                <span>{i + 1}. {m.title || 'Untitled'}</span>
                <span style={{ color: GREEN }}>Rs. {Number(m.amount || 0).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        )}

        {/* Release checklist */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', marginBottom: 10 }}>Confirm before releasing payment</div>
          {RELEASE_ITEMS.map((item, i) => (
            <Checkbox key={i} checked={!!confirmed[i]} onChange={() => toggleItem(i)} accent={GREEN}>
              {item}
            </Checkbox>
          ))}
        </div>

        {/* Section C re-confirmation */}
        <div style={{ marginBottom: 18, padding: 14, borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
            Section C  Escrow Release Re-confirmation
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', lineHeight: 1.65, marginBottom: 12 }}>
            By releasing payment you confirm that the freelancer has fulfilled their obligations as stated in the Work Agreement. The funds held in escrow will be transferred immediately and this action cannot be undone. If you have concerns about the work, use the <strong style={{ color: '#fb7185' }}>Raise Dispute</strong> option instead.
          </div>
          <Checkbox checked={releaseOk} onChange={setReleaseOk} accent={GREEN}>
            I confirm the work is complete and authorise the release of <strong>{fmtCurrency(job?.budget)}</strong> to the freelancer.
          </Checkbox>
        </div>

        {/* Optional release note */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,.38)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>
            Feedback for Freelancer (optional)
          </label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
            placeholder="Great work! Any specific feedback..."
            style={{ width: '100%', padding: '10px 13px', background: 'rgba(255,255,255,.05)', border: '1.5px solid rgba(255,255,255,.1)', borderRadius: 9, color: '#f8fafc', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
            onFocus={e => { e.target.style.borderColor = GREEN; e.target.style.boxShadow = `0 0 0 3px rgba(52,211,153,.1)` }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,.1)'; e.target.style.boxShadow = 'none' }}
          />
        </div>

        {/* Dispute reminder */}
        <div style={{ marginBottom: 16, padding: '10px 13px', borderRadius: 9, background: 'rgba(244,63,94,.06)', border: '1px solid rgba(244,63,94,.15)', fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
          <strong style={{ color: '#fb7185' }}>Not satisfied?</strong> Close this dialog and use "Raise Dispute" to involve a TrustWork mediator. The Work Agreement and checklists will be used as evidence.
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '11px', background: 'transparent', border: '1.5px solid rgba(255,255,255,.1)', borderRadius: 10, color: 'rgba(255,255,255,.5)', fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleRelease} disabled={saving || !canRelease}
            style={{ flex: 2, padding: '11px', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', transition: 'all .18s', cursor: !canRelease || saving ? 'not-allowed' : 'pointer',
              background: canRelease ? GREEN : 'rgba(255,255,255,.08)',
              color: canRelease ? '#07111d' : 'rgba(255,255,255,.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {saving && (
              <svg style={{ animation: 'spin .7s linear infinite' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            )}
            {saving ? 'Releasing Payment...' : 'Release Payment'}
          </button>
        </div>

        <style>{`@keyframes spin { to { transform:rotate(360deg) } } * { box-sizing:border-box }`}</style>
      </div>
    </div>
  )
}
