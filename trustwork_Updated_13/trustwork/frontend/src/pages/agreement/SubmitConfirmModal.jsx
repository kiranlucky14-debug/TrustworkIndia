// SubmitConfirmModal.jsx
// Phase 2 - Freelancer re-confirms Section C (escrow release terms) before submitting work.
// Replaces the simple "Submit Work" confirm dialog.

import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { errMsg } from '../../utils/helpers'

const TEAL = '#14b8a6'

const CONFIRM_ITEMS = [
  'I have completed all deliverables listed in the Work Agreement.',
  'The work meets the quality standard agreed in the contract.',
  'I have included all files, source code, or assets specified.',
  'I understand that payment will be released only after client approval.',
  'If the client raises a dispute, the Work Agreement will be used as the reference document.',
]

function Checkbox({ checked, onChange, children }) {
  return (
    <div onClick={() => onChange(!checked)}
      style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '10px 12px',
        borderRadius: 9, cursor: 'pointer', transition: 'all .18s', marginBottom: 8,
        border: `1px solid ${checked ? 'rgba(20,184,166,.35)' : 'rgba(255,255,255,.08)'}`,
        background: checked ? 'rgba(20,184,166,.07)' : 'rgba(255,255,255,.03)' }}>
      <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
        border: `2px solid ${checked ? TEAL : 'rgba(255,255,255,.2)'}`,
        background: checked ? TEAL : 'transparent',
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

export default function SubmitConfirmModal({ open, onClose, jobId, job, agreement, onSubmitted }) {
  const [confirmed,  setConfirmed]  = useState({})
  const [escrowOk,   setEscrowOk]   = useState(false)
  const [note,       setNote]       = useState('')
  const [saving,     setSaving]     = useState(false)

  const toggleItem = (i) => setConfirmed(prev => ({ ...prev, [i]: !prev[i] }))
  const allItemsChecked = CONFIRM_ITEMS.every((_, i) => confirmed[i])
  const canSubmit = allItemsChecked && escrowOk

  const deliverables = Array.isArray(agreement?.deliverables) ? agreement.deliverables.filter(Boolean) : []

  const handleSubmit = async () => {
    if (!canSubmit) { toast.error('Please confirm all items before submitting'); return }
    setSaving(true)
    try {
      await api.post(`/agreements/${jobId}/submit-confirm`, {
        escrowTermsReconfirmed: true,
        submissionNote: note.trim() || undefined,
      })
      toast.success('Work submitted successfully!')
      onSubmitted?.()
      onClose()
    } catch (err) {
      toast.error(errMsg(err))
    } finally { setSaving(false) }
  }

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
        background: '#0e1c2f', border: '1px solid rgba(255,255,255,.1)', borderRadius: 18,
        padding: 28, fontFamily: "'DM Sans',system-ui,sans-serif", color: '#f8fafc' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>Submit Work</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.45)' }}>{job?.title}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,.08)', margin: '16px 0' }} />

        {/* Agreed deliverables reference */}
        {deliverables.length > 0 && (
          <div style={{ marginBottom: 18, padding: 14, borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: TEAL, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
              Agreed Deliverables (from Work Agreement)
            </div>
            {deliverables.map((d, i) => (
              <div key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,.65)', display: 'flex', gap: 8, marginBottom: 4 }}>
                <span style={{ color: TEAL, flexShrink: 0 }}>+</span> {d}
              </div>
            ))}
          </div>
        )}

        {/* Submission checklist */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', marginBottom: 10 }}>
            Confirm before submitting
          </div>
          {CONFIRM_ITEMS.map((item, i) => (
            <Checkbox key={i} checked={!!confirmed[i]} onChange={() => toggleItem(i)}>
              {item}
            </Checkbox>
          ))}
        </div>

        {/* Escrow re-confirmation (Section C) */}
        <div style={{ marginBottom: 18, padding: 14, borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
            Section C  Escrow Release Re-confirmation
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', lineHeight: 1.65, marginBottom: 12 }}>
            As agreed in the Work Agreement: payment of <strong style={{ color: '#f8fafc' }}>
            Rs. {Number(job?.budget || 0).toLocaleString('en-IN')}
            </strong> is currently held in escrow and will be released to you once the client approves this submission. If the client disputes the work, the original Work Agreement will be used as the reference.
          </div>
          <Checkbox checked={escrowOk} onChange={setEscrowOk}>
            I re-confirm the escrow release terms and submit my work for client review.
          </Checkbox>
        </div>

        {/* Optional submission note */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,.38)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>
            Submission Notes (optional)
          </label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
            placeholder="Any notes for the client about the submitted work..."
            style={{ width: '100%', padding: '10px 13px', background: 'rgba(255,255,255,.05)', border: '1.5px solid rgba(255,255,255,.1)', borderRadius: 9, color: '#f8fafc', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
            onFocus={e => { e.target.style.borderColor = TEAL; e.target.style.boxShadow = `0 0 0 3px rgba(20,184,166,.1)` }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,.1)'; e.target.style.boxShadow = 'none' }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '11px', background: 'transparent', border: '1.5px solid rgba(255,255,255,.1)', borderRadius: 10, color: 'rgba(255,255,255,.5)', fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving || !canSubmit}
            style={{ flex: 2, padding: '11px', background: canSubmit ? TEAL : 'rgba(255,255,255,.08)', border: 'none', borderRadius: 10, color: canSubmit ? '#07111d' : 'rgba(255,255,255,.3)', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: !canSubmit || saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .18s' }}>
            {saving && (
              <svg style={{ animation: 'spin .7s linear infinite' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            )}
            {saving ? 'Submitting...' : 'Submit Work'}
          </button>
        </div>

        <style>{`@keyframes spin { to { transform:rotate(360deg) } } * { box-sizing:border-box }`}</style>
      </div>
    </div>
  )
}
