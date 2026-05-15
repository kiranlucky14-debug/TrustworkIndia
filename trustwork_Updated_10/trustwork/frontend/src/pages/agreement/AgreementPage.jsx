// AgreementPage.jsx
// Main router for the Work Agreement flow.
// Reads job + agreement state, shows the right component based on role + status.

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { fmtDate, errMsg } from '../../utils/helpers'
import ClientAgreementWizard     from './ClientAgreementWizard'
import FreelancerAgreementReview from './FreelancerAgreementReview'

const STATUS_CFG = {
  DRAFT:              { color: '#94a3b8', bg: 'rgba(148,163,184,.12)', label: 'Draft'              },
  CLIENT_SIGNED:      { color: '#fbbf24', bg: 'rgba(251,191,36,.12)',  label: 'Awaiting Freelancer' },
  CHANGES_REQUESTED:  { color: '#fb923c', bg: 'rgba(251,146,60,.12)',  label: 'Changes Requested'  },
  ACTIVE:             { color: '#34d399', bg: 'rgba(52,211,153,.12)',  label: 'Active - Fully Signed' },
}

function Spin() {
  return (
    <svg style={{ animation: 'spin .7s linear infinite' }} width="20" height="20"
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  )
}

// Download Certificate button - opens the PDF HTML in a new tab
function DownloadBtn({ jobId }) {
  const [loading, setLoading] = useState(false)

  const download = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('tw_token')
      // Open the PDF endpoint in a new tab - the HTML has a print button
      const url = (import.meta.env.VITE_API_URL || 'http://localhost:5000')
        + '/agreements/' + jobId + '/pdf'
      // Fetch with auth, create blob URL
      const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } })
      if (!res.ok) throw new Error('Could not generate certificate')
      const html = await res.text()
      const blob = new Blob([html], { type: 'text/html' })
      const blobUrl = URL.createObjectURL(blob)
      window.open(blobUrl, '_blank')
    } catch (err) {
      toast.error('Could not generate certificate')
    } finally { setLoading(false) }
  }

  return (
    <button onClick={download} disabled={loading}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px',
        borderRadius: 8, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)',
        color: 'rgba(255,255,255,.7)', fontSize: 12, fontWeight: 600,
        fontFamily: 'inherit', cursor: loading ? 'wait' : 'pointer', transition: 'all .15s' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.1)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.06)' }}>
      {loading
        ? <svg style={{ animation: 'spin .7s linear infinite' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
        : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
      {loading ? 'Generating...' : 'Download Certificate'}
    </button>
  )
}

// Completed agreement read-only summary
function AgreementSummary({ agreement, job }) {
  const deliverables = Array.isArray(agreement.deliverables) ? agreement.deliverables : []
  const milestones   = Array.isArray(agreement.milestonesAgreed) ? agreement.milestonesAgreed : []
  const clientCk     = agreement.clientChecklist    || {}
  const freelancerCk = agreement.freelancerChecklist || {}

  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", color: '#f8fafc', maxWidth: 680 }}>
      <style>{`@keyframes spin { to { transform:rotate(360deg) } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>Work Agreement</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.45)' }}>{job.title}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 100, background: 'rgba(52,211,153,.12)', color: '#34d399', border: '1px solid rgba(52,211,153,.25)' }}>
            Fully Signed
          </span>
          <DownloadBtn jobId={job.id} />
        </div>
      </div>

      {/* Signature record */}
      <div style={{ background: 'rgba(52,211,153,.06)', border: '1px solid rgba(52,211,153,.2)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#34d399', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.07em' }}>Signature Record</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px' }}>
          <Kv label="Client Signed"     value={agreement.clientSignedAt    ? fmtDate(agreement.clientSignedAt)    : '--'} />
          <Kv label="Freelancer Signed" value={agreement.freelancerSignedAt ? fmtDate(agreement.freelancerSignedAt) : '--'} />
          <Kv label="Agreement Active"  value={agreement.agreedAt           ? fmtDate(agreement.agreedAt)           : '--'} />
        </div>
      </div>

      {/* Section A */}
      <Section title="A  Work Agreement">
        <Kv label="Scope" value={agreement.scope} />
        {deliverables.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.38)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Deliverables</div>
            {deliverables.map((d, i) => (
              <div key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', display: 'flex', gap: 8, marginBottom: 3 }}>
                <span style={{ color: '#14b8a6' }}>+</span> {d}
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px' }}>
          <Kv label="Start Date"      value={agreement.startDate ? fmtDate(agreement.startDate) : '--'} />
          <Kv label="End Date"        value={agreement.endDate   ? fmtDate(agreement.endDate)   : '--'} />
          <Kv label="Revision Rounds" value={agreement.revisionRounds + ' rounds'} />
          <Kv label="Revision Policy" value={agreement.revisionPolicy} />
          <Kv label="Payment Terms"   value={agreement.paymentTerms} />
        </div>
        {agreement.specialConditions && (
          <Kv label="Special Conditions" value={agreement.specialConditions} />
        )}
      </Section>

      {/* Section B */}
      {milestones.length > 0 && (
        <Section title="B  Milestone Agreement">
          {milestones.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.05)', gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{i + 1}. {m.title || 'Untitled'}</div>
                {m.deliverable && <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>{m.deliverable}</div>}
                {m.dueDate     && <div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)',  marginTop: 2 }}>Due: {m.dueDate}</div>}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#34d399', flexShrink: 0 }}>
                Rs. {Number(m.amount || 0).toLocaleString('en-IN')}
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* Section C */}
      <Section title="C  Escrow Release Agreement">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#34d399' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          Freelancer accepted escrow release terms
        </div>
      </Section>

      {/* Section D  checklists side by side */}
      <Section title="D  Dispute Prevention Checklist">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Client</div>
            {Object.entries(clientCk).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 6, fontSize: 12, color: v ? '#34d399' : '#fb7185', marginBottom: 5, alignItems: 'center' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  {v ? <polyline points="20 6 9 17 4 12"/> : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
                </svg>
                <span style={{ color: 'rgba(255,255,255,.6)', textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1')}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#14b8a6', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Freelancer</div>
            {Object.entries(freelancerCk).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 6, fontSize: 12, color: v ? '#34d399' : '#fb7185', marginBottom: 5, alignItems: 'center' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  {v ? <polyline points="20 6 9 17 4 12"/> : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
                </svg>
                <span style={{ color: 'rgba(255,255,255,.6)', textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1')}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.32)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,.07)' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Kv({ label, value }) {
  if (!value) return null
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.38)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.6 }}>{value}</div>
    </div>
  )
}

//  Main 
export default function AgreementPage() {
  const { jobId } = useParams()
  const { user }  = useAuth()
  const navigate  = useNavigate()

  const [data,    setData]    = useState(null)   // { agreement, job }
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [creating, setCreating] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data: res } = await api.get('/agreements/' + jobId)
      setData(res)
    } catch (err) {
      setError(errMsg(err))
    } finally { setLoading(false) }
  }, [jobId])

  useEffect(() => { fetch() }, [fetch])

  const createAgreement = async () => {
    setCreating(true)
    try {
      await api.post('/agreements/' + jobId)
      toast.success('Agreement created. Fill in the details below.')
      await fetch()
    } catch (err) {
      toast.error(errMsg(err))
    } finally { setCreating(false) }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', fontFamily: 'inherit' }}>
      <Spin />
    </div>
  )

  if (error) return (
    <div style={{ textAlign: 'center', padding: '3rem', fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <div style={{ fontSize: 14, color: '#fb7185', marginBottom: 12 }}>{error}</div>
      <button onClick={fetch} style={{ padding: '8px 20px', background: '#14b8a6', border: 'none', borderRadius: 8, color: '#07111d', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Retry</button>
    </div>
  )

  const { agreement, job } = data
  const isClient     = user?.id === job?.clientId
  const isFreelancer = user?.id === job?.freelancerId
  const ag = agreement

  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", color: '#f8fafc', maxWidth: 720 }}>
      <style>{`@keyframes spin { to { transform:rotate(360deg) } } * { box-sizing:border-box; margin:0; padding:0 }`}</style>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: 'rgba(255,255,255,.4)' }}>
        <Link to={'/jobs/' + jobId} style={{ color: '#14b8a6', textDecoration: 'none' }}>{job?.title || 'Job'}</Link>
        <span>/</span>
        <span>Work Agreement</span>
        {ag && (
          <>
            <span>/</span>
            <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 11, fontWeight: 600,
              background: STATUS_CFG[ag.status]?.bg || 'rgba(148,163,184,.1)',
              color: STATUS_CFG[ag.status]?.color || '#94a3b8' }}>
              {STATUS_CFG[ag.status]?.label || ag.status}
            </span>
          </>
        )}
      </div>

      {/* Case 1  No agreement yet and user is client */}
      {!ag && isClient && job?.status === 'ASSIGNED' && (
        <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(20,184,166,.6)" strokeWidth="1.5" strokeLinecap="round" style={{ display: 'block', margin: '0 auto' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>Create Work Agreement</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,.45)', marginBottom: 24, maxWidth: 420, margin: '0 auto 24px', lineHeight: 1.65 }}>
            You've assigned a freelancer. Before funding escrow, both parties must sign a formal work agreement covering scope, milestones, escrow terms, and dispute prevention.
          </div>
          <button onClick={createAgreement} disabled={creating}
            style={{ padding: '12px 28px', background: '#14b8a6', border: 'none', borderRadius: 10, color: '#07111d', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? .7 : 1, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {creating && <Spin />}
            {creating ? 'Creating...' : 'Create Agreement'}
          </button>
        </div>
      )}

      {/* Case 2  No agreement, freelancer view  waiting for client */}
      {!ag && isFreelancer && (
        <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', lineHeight: 1.7 }}>
            The client has not yet created the work agreement. Once they do, it will appear here for your review and signature.
          </div>
        </div>
      )}

      {/* Case 3  Agreement exists: DRAFT or CHANGES_REQUESTED  client fills wizard */}
      {ag && ['DRAFT', 'CHANGES_REQUESTED'].includes(ag.status) && isClient && (
        <ClientAgreementWizard
          jobId={jobId}
          job={job}
          agreement={ag}
          onSaved={fetch}
          onSigned={fetch}
        />
      )}

      {/* Case 4  CLIENT_SIGNED  freelancer reviews */}
      {ag && ag.status === 'CLIENT_SIGNED' && isFreelancer && (
        <FreelancerAgreementReview
          jobId={jobId}
          job={job}
          agreement={ag}
          onSigned={fetch}
          onChangesRequested={fetch}
        />
      )}

      {/* Case 5  CLIENT_SIGNED  client waits */}
      {ag && ag.status === 'CLIENT_SIGNED' && isClient && (
        <div style={{ background: 'rgba(251,191,36,.06)', border: '1px solid rgba(251,191,36,.2)', borderRadius: 14, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fbbf24' }}>Awaiting Freelancer Signature</div>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', lineHeight: 1.65 }}>
            You signed the agreement on {fmtDate(ag.clientSignedAt)}. The freelancer is reviewing it and will sign shortly. You'll be able to fund escrow once both parties have signed.
          </div>
          {ag.specialConditions?.startsWith('[CHANGE REQUEST]') && (
            <div style={{ marginTop: 14, padding: 12, borderRadius: 9, background: 'rgba(251,146,60,.1)', border: '1px solid rgba(251,146,60,.25)', fontSize: 13, color: '#fb923c' }}>
              <strong>Change request note:</strong> {ag.specialConditions.replace('[CHANGE REQUEST]', '').trim()}
            </div>
          )}
        </div>
      )}

      {/* Case 6  CHANGES_REQUESTED  freelancer requested changes, client edit */}
      {ag && ag.status === 'CHANGES_REQUESTED' && isClient && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ padding: 14, borderRadius: 10, background: 'rgba(251,146,60,.08)', border: '1px solid rgba(251,146,60,.25)', marginBottom: 16, fontSize: 13, color: '#fb923c' }}>
            <strong>Freelancer requested changes.</strong> Review the note below and update the agreement.
            {ag.specialConditions && (
              <div style={{ marginTop: 8, color: 'rgba(255,255,255,.6)' }}>{ag.specialConditions}</div>
            )}
          </div>
          <ClientAgreementWizard
            jobId={jobId}
            job={job}
            agreement={ag}
            onSaved={fetch}
            onSigned={fetch}
          />
        </div>
      )}

      {/* Case 7  CHANGES_REQUESTED  freelancer waits for client */}
      {ag && ag.status === 'CHANGES_REQUESTED' && isFreelancer && (
        <div style={{ background: 'rgba(251,146,60,.06)', border: '1px solid rgba(251,146,60,.2)', borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fb923c', marginBottom: 8 }}>Changes Sent to Client</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', lineHeight: 1.65 }}>
            Your change request has been sent. The client is updating the agreement. You'll be notified to review and sign once they resubmit.
          </div>
        </div>
      )}

      {/* Case 8  ACTIVE  show completed summary */}
      {ag && ag.status === 'ACTIVE' && (
        <AgreementSummary agreement={ag} job={job} />
      )}

      {/* Back to job link */}
      <div style={{ marginTop: 24 }}>
        <Link to={'/jobs/' + jobId}
          style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back to job
        </Link>
      </div>
    </div>
  )
}
