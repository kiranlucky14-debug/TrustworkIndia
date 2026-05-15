// FreelancerCard.jsx
// Rich freelancer profile card shown to clients when reviewing job applications.
// - Masks full phone/email for privacy
// - Shows all professional fields
// - Shortlist toggle + Assign action

import { useState } from 'react'
import { StarDisplay } from './StarInput'

// ---------------------------------------------------------------------------
// Privacy helpers
// ---------------------------------------------------------------------------
function maskEmail(email) {
  if (!email) return null
  const [local, domain] = email.split('@')
  if (!domain) return email
  const visible = local.slice(0, 2)
  return visible + '*'.repeat(Math.max(3, local.length - 2)) + '@' + domain
}

function maskPhone(phone) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7) return phone
  return '+91 XXXXXXX' + digits.slice(-3)
}

// ---------------------------------------------------------------------------
// Sub-atoms
// ---------------------------------------------------------------------------
function Avatar({ name, photo, color = '#14b8a6', size = 56 }) {
  if (photo) {
    return (
      <img src={photo} alt={name}
        style={{ width: size, height: size, borderRadius: size * 0.22, objectFit: 'cover', border: `2px solid ${color}40`, flexShrink: 0 }} />
    )
  }
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.22, background: `${color}18`, border: `2px solid ${color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 800, color, flexShrink: 0 }}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

function Chip({ children, color = '#14b8a6' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 100, fontSize: 11, fontWeight: 500, background: `${color}15`, border: `1px solid ${color}30`, color }}>
      {children}
    </span>
  )
}

function SLink({ href, icon, label, color }) {
  if (!href) return null
  const url = href.startsWith('http') ? href : 'https://' + href
  return (
    <a href={url} target="_blank" rel="noreferrer"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, background: `${color}10`, border: `1px solid ${color}25`, color, textDecoration: 'none', fontSize: 12, transition: 'all .15s' }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}22` }}
      onMouseLeave={e => { e.currentTarget.style.background = `${color}10` }}>
      {icon}
      {label}
    </a>
  )
}

function StatPill({ label, value, color = '#94a3b8' }) {
  if (!value && value !== 0) return null
  return (
    <div style={{ textAlign: 'center', padding: '8px 12px', background: 'rgba(255,255,255,.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,.07)' }}>
      <div style={{ fontSize: 17, fontWeight: 700, color, marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.38)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Score bar for trust score
// ---------------------------------------------------------------------------
function TrustBar({ score }) {
  const pct = Math.min(100, Math.max(0, score || 0))
  const color = pct >= 70 ? '#34d399' : pct >= 40 ? '#fbbf24' : '#fb7185'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,.08)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 3, transition: 'width .5s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, minWidth: 32 }}>{pct}%</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function FreelancerCard({ application, onShortlist, onAssign, assigning, isAssigned, compact = false }) {
  const fl = application?.user
  if (!fl) {
    return (
      <div style={{ padding:'16px', borderRadius:12, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', fontSize:13, color:'rgba(255,255,255,.4)' }}>
        Profile data not available for this applicant. They may need to complete their profile.
        {!compact && application?.message && (
          <div style={{ marginTop:10, fontStyle:'italic', color:'rgba(255,255,255,.5)' }}>Cover message: "{application.message}"</div>
        )}
      </div>
    )
  }

  const [shortlisted, setShortlisted] = useState(application.shortlisted || false)
  const [toggling,    setToggling]    = useState(false)

  const handleShortlist = async () => {
    setToggling(true)
    try {
      await onShortlist(application.id, !shortlisted)
      setShortlisted(s => !s)
    } catch {}
    finally { setToggling(false) }
  }

  const completedJobs = fl._count?.freelancerJobs || 0
  const reviews       = fl._count?.reviewsReceived || 0
  const teal  = '#14b8a6'
  const purple = '#818cf8'

  // ---------------------------------------------------------------------------
  // Compact card (used in applicant list)
  // ---------------------------------------------------------------------------
  if (compact) {
    return (
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 14,
        padding: '14px 16px',
        background: shortlisted ? 'rgba(20,184,166,.06)' : 'rgba(255,255,255,.03)',
        border: `1.5px solid ${shortlisted ? 'rgba(20,184,166,.3)' : 'rgba(255,255,255,.08)'}`,
        borderRadius: 12, transition: 'all .2s',
      }}>
        <Avatar name={fl.name} photo={fl.profilePhoto} color={teal} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f8fafc', marginBottom: 2 }}>{fl.name}</div>
              {fl.title && <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>{fl.title}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {/* Shortlist toggle */}
              <button onClick={e => { e.stopPropagation(); handleShortlist() }} disabled={toggling} title={shortlisted ? 'Remove from shortlist' : 'Shortlist'}
                style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${shortlisted ? 'rgba(251,191,36,.4)' : 'rgba(255,255,255,.12)'}`, background: shortlisted ? 'rgba(251,191,36,.12)' : 'transparent', color: shortlisted ? '#fbbf24' : 'rgba(255,255,255,.4)', fontSize: 12, fontWeight: 600, cursor: toggling ? 'wait' : 'pointer', fontFamily: 'inherit', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill={shortlisted ? '#fbbf24' : 'none'} stroke={shortlisted ? '#fbbf24' : 'currentColor'} strokeWidth="2" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                {shortlisted ? 'Shortlisted' : 'Shortlist'}
              </button>
              {/* Assign */}
              {!isAssigned && (
                <button onClick={e => { e.stopPropagation(); onAssign(fl.id) }} disabled={assigning}
                  style={{ padding: '5px 14px', borderRadius: 8, background: teal, border: 'none', color: '#07111d', fontSize: 12, fontWeight: 700, cursor: assigning ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: assigning ? .7 : 1 }}>
                  {assigning ? '...' : 'Assign'}
                </button>
              )}
            </div>
          </div>

          {/* Rating + experience */}
          <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {fl.ratingCount > 0 && <StarDisplay value={fl.rating} count={fl.ratingCount} size="sm" />}
            {fl.experienceLevel && <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{fl.experienceLevel}</span>}
            {fl.city && <span style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>{fl.city}{fl.state ? ', ' + fl.state : ''}</span>}
            {completedJobs > 0 && <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{completedJobs} jobs done</span>}
          </div>

          {/* Cover message */}
          {application.message && (
            <div style={{ marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,.55)', lineHeight: 1.6, fontStyle: 'italic' }}>
              "{application.message}"
            </div>
          )}

          {/* Skills chips (first 4) */}
          {fl.skills && fl.skills.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
              {fl.skills.slice(0, 4).map(s => <Chip key={s.id || s} color={teal}>{s.name || s}</Chip>)}
              {fl.skills.length > 4 && <Chip color="rgba(255,255,255,.3)">+{fl.skills.length - 4}</Chip>}
            </div>
          )}

          {/* Rate badges */}
          {(fl.hourlyRate || fl.demoRate) && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {fl.hourlyRate && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100, background: 'rgba(129,140,248,.12)', border: '1px solid rgba(129,140,248,.25)', color: purple }}>Rs.{Number(fl.hourlyRate)}/hr</span>}
              {fl.demoRate  && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100, background: 'rgba(251,191,36,.1)', border: '1px solid rgba(251,191,36,.25)', color: '#fbbf24' }}>Demo Rs.{Number(fl.demoRate)}</span>}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Full card (modal / side panel)
  // ---------------------------------------------------------------------------
  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, alignItems: 'flex-start' }}>
        <Avatar name={fl.name} photo={fl.profilePhoto} color={teal} size={68} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>{fl.name}</div>
          {fl.title && <div style={{ fontSize: 14, color: 'rgba(255,255,255,.6)', marginBottom: 6 }}>{fl.title}</div>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {fl.ratingCount > 0 && <StarDisplay value={fl.rating} count={fl.ratingCount} size="sm" />}
            {fl.city && <span style={{ fontSize: 12, color: 'rgba(255,255,255,.38)' }}>{[fl.city, fl.state].filter(Boolean).join(', ')}</span>}
          </div>
        </div>
        {/* Shortlist button (full card) */}
        <button onClick={handleShortlist} disabled={toggling}
          style={{ padding: '7px 14px', borderRadius: 9, border: `1.5px solid ${shortlisted ? 'rgba(251,191,36,.4)' : 'rgba(255,255,255,.15)'}`, background: shortlisted ? 'rgba(251,191,36,.12)' : 'transparent', color: shortlisted ? '#fbbf24' : 'rgba(255,255,255,.5)', fontSize: 12, fontWeight: 600, cursor: toggling ? 'wait' : 'pointer', fontFamily: 'inherit', transition: 'all .18s', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill={shortlisted ? '#fbbf24' : 'none'} stroke={shortlisted ? '#fbbf24' : 'currentColor'} strokeWidth="2" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          {shortlisted ? 'Shortlisted' : 'Shortlist'}
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
        <StatPill label="Rating" value={fl.rating ? fl.rating.toFixed(1) : '--'} color="#fbbf24" />
        <StatPill label="Jobs Done" value={completedJobs} color={teal} />
        <StatPill label="Reviews" value={reviews} color={purple} />
        <StatPill label="Experience" value={fl.yearsOfExperience ? fl.yearsOfExperience + 'y' : '--'} color="#94a3b8" />
      </div>

      {/* Trust score */}
      {fl.trustScore !== undefined && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(255,255,255,.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Trust Score</span>
          </div>
          <TrustBar score={fl.trustScore} />
        </div>
      )}

      {/* Experience level + rates */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {fl.experienceLevel && <Chip color={teal}>{fl.experienceLevel}</Chip>}
        {fl.hourlyRate && <Chip color={purple}>Rs.{Number(fl.hourlyRate)}/hr</Chip>}
        {fl.demoRate   && <Chip color="#fbbf24">Demo Rs.{Number(fl.demoRate)}</Chip>}
      </div>

      {/* Bio */}
      {fl.bio && (
        <div style={{ marginBottom: 16, padding: '12px 14px', background: 'rgba(255,255,255,.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.38)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>About</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.65)', lineHeight: 1.7 }}>{fl.bio}</div>
        </div>
      )}

      {/* Skills */}
      {fl.skills && fl.skills.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.38)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Skills ({fl.skills.length})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {fl.skills.map(s => <Chip key={s.id || s} color={teal}>{s.name || s}</Chip>)}
          </div>
        </div>
      )}

      {/* Cover message */}
      {application.message && (
        <div style={{ marginBottom: 16, padding: '12px 14px', background: 'rgba(129,140,248,.06)', borderRadius: 10, border: '1px solid rgba(129,140,248,.2)' }}>
          <div style={{ fontSize: 11, color: purple, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Cover Message</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', lineHeight: 1.7, fontStyle: 'italic' }}>"{application.message}"</div>
        </div>
      )}

      {/* Social links */}
      {(fl.portfolioUrl || fl.linkedinUrl || fl.githubUrl || fl.instagramUrl || fl.facebookUrl || fl.website) && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.38)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Links</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <SLink href={fl.portfolioUrl} color={teal}
              icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 13.255A23.931 23.931 0 0 1 12 15c-3.183 0-6.22-.62-9-1.745M16 6l2 2-2 2M8 6l-2 2 2 2"/></svg>}
              label="Portfolio" />
            <SLink href={fl.linkedinUrl} color={purple}
              icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>}
              label="LinkedIn" />
            <SLink href={fl.githubUrl} color="#94a3b8"
              icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>}
              label="GitHub" />
            <SLink href={fl.instagramUrl} color="#e1306c"
              icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>}
              label="Instagram" />
            <SLink href={fl.facebookUrl} color="#4267B2"
              icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>}
              label="Facebook" />
            <SLink href={fl.website} color="#60a5fa"
              icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
              label="Website" />
          </div>
        </div>
      )}

      {/* Privacy note */}
      {(fl.email || fl.phone) && (
        <div style={{ marginBottom: 16, padding: '10px 13px', background: 'rgba(255,255,255,.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,.06)', fontSize: 12, color: 'rgba(255,255,255,.35)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <span>
            {fl.email && <span>Email: <strong style={{ fontFamily: 'monospace' }}>{maskEmail(fl.email)}</strong>{fl.phone ? '  |  ' : ''}</span>}
            {fl.phone && <span>Phone: <strong style={{ fontFamily: 'monospace' }}>{maskPhone(fl.phone)}</strong></span>}
          </span>
        </div>
      )}

      {/* Action buttons */}
      {!isAssigned && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => window.open('/profile/' + fl.id, '_blank')}
            style={{ flex: 1, padding: '10px', background: 'transparent', border: '1.5px solid rgba(255,255,255,.1)', borderRadius: 10, color: 'rgba(255,255,255,.5)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', transition: 'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.25)'; e.currentTarget.style.color = '#f8fafc' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)'; e.currentTarget.style.color = 'rgba(255,255,255,.5)' }}>
            View Full Profile
          </button>
          <button onClick={() => onAssign(fl.id)} disabled={assigning}
            style={{ flex: 2, padding: '10px', background: teal, border: 'none', borderRadius: 10, color: '#07111d', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: assigning ? 'not-allowed' : 'pointer', opacity: assigning ? .7 : 1, transition: 'all .18s' }}>
            {assigning ? 'Assigning...' : 'Assign this Freelancer'}
          </button>
        </div>
      )}
    </div>
  )
}
