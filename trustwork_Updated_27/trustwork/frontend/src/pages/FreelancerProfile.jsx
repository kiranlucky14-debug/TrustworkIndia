// FreelancerProfile.jsx  Public shareable freelancer portfolio page
// Route: /profile/:id  (shareable URL, no auth required to view)

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { fmtCurrency, fmtDate, errMsg } from '../utils/helpers'

const css = `
  @keyframes fp-in { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)} }
  .fp-fade { animation:fp-in .3s ease both }
  * { box-sizing:border-box }
`

function Stars({ rating, size=14 }) {
  return (
    <span style={{ display:'inline-flex', gap:1 }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i<=Math.round(rating)?'#fbbf24':'none'} stroke="#fbbf24" strokeWidth="1.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </span>
  )
}

function SkillBadge({ name, color='#14b8a6' }) {
  return (
    <span style={{ fontSize:12, padding:'3px 10px', borderRadius:100, background:`${color}15`, border:`1px solid ${color}35`, color, fontWeight:500 }}>
      {name}
    </span>
  )
}

export default function FreelancerProfile() {
  const { id }        = useParams()
  const { user }      = useAuth()
  const [profile, setProfile] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    Promise.all([
      api.get(`/users/${id}`),
      api.get(`/reviews?userId=${id}`).catch(() => ({ data: [] })),
    ])
      .then(([uRes, rRes]) => {
        setProfile(uRes.data)
        setReviews(Array.isArray(rRes.data) ? rRes.data : rRes.data?.reviews || [])
      })
      .catch(e => setError(errMsg(e)))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", color:'#f8fafc', textAlign:'center', padding:'3rem' }}>
      <style>{css}</style>
      Loading profile...
    </div>
  )

  if (error || !profile) return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", color:'#f8fafc', textAlign:'center', padding:'3rem' }}>
      <style>{css}</style>
      <div style={{ color:'#fb7185', marginBottom:12 }}>{error || 'Profile not found'}</div>
      <Link to="/jobs" style={{ color:'#14b8a6' }}>Browse Jobs</Link>
    </div>
  )

  const completionRate = profile.completedJobs
    ? Math.round((profile.completedJobs / Math.max(profile.totalJobs, 1)) * 100)
    : null

  const LEVEL_COLOR = { ENTRY:'#34d399', INTERMEDIATE:'#fbbf24', EXPERT:'#818cf8' }
  const levelColor  = LEVEL_COLOR[profile.experienceLevel] || '#14b8a6'

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", color:'#f8fafc', maxWidth:800 }}>
      <style>{css}</style>

      {/* Hero card */}
      <div className="fp-fade" style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.1)', borderRadius:18, padding:'28px 32px', marginBottom:16 }}>
        <div style={{ display:'flex', gap:20, alignItems:'flex-start', flexWrap:'wrap' }}>
          {/* Avatar */}
          <div style={{ width:72, height:72, borderRadius:'50%', background:'linear-gradient(135deg,#14b8a6,#818cf8)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, fontWeight:800, color:'#07111d', flexShrink:0 }}>
            {profile.name?.[0]?.toUpperCase()}
          </div>

          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:6 }}>
              <h1 style={{ fontSize:22, fontWeight:800, margin:0, letterSpacing:'-.3px' }}>{profile.name}</h1>
              {profile.isVerified && (
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100, background:'rgba(20,184,166,.15)', color:'#14b8a6', border:'1px solid rgba(20,184,166,.3)', display:'flex', alignItems:'center', gap:4 }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Verified
                </span>
              )}
              {profile.experienceLevel && (
                <span style={{ fontSize:11, fontWeight:600, padding:'2px 9px', borderRadius:100, background:`${levelColor}15`, color:levelColor, border:`1px solid ${levelColor}30` }}>
                  {profile.experienceLevel}
                </span>
              )}
            </div>

            {/* Rating + stats row */}
            <div style={{ display:'flex', gap:16, flexWrap:'wrap', alignItems:'center', marginBottom:10 }}>
              {profile.rating > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <Stars rating={profile.rating} />
                  <span style={{ fontSize:13, fontWeight:700, color:'#fbbf24' }}>{profile.rating.toFixed(1)}</span>
                  <span style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>({profile.ratingCount} reviews)</span>
                </div>
              )}
              {profile.trustScore > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background: profile.trustScore>=80?'rgba(52,211,153,.15)':profile.trustScore>=60?'rgba(251,191,36,.15)':'rgba(129,140,248,.15)', border:`2px solid ${profile.trustScore>=80?'rgba(52,211,153,.4)':profile.trustScore>=60?'rgba(251,191,36,.4)':'rgba(129,140,248,.4)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:profile.trustScore>=80?'#34d399':profile.trustScore>=60?'#fbbf24':'#818cf8' }}>
                    {profile.trustScore}
                  </div>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,.45)' }}>TW Score</span>
                </div>
              )}
              {profile.hourlyRate && (
                <span style={{ fontSize:13, color:'rgba(255,255,255,.6)' }}>
                  {fmtCurrency(profile.hourlyRate)}<span style={{ fontSize:11, color:'rgba(255,255,255,.35)' }}>/hr</span>
                </span>
              )}
              {completionRate !== null && (
                <span style={{ fontSize:12, color:'rgba(255,255,255,.5)' }}>
                  {completionRate}% completion rate
                </span>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <p style={{ fontSize:13, color:'rgba(255,255,255,.65)', lineHeight:1.7, margin:0 }}>{profile.bio}</p>
            )}
          </div>

          {/* CTA */}
          {user && user.role === 'CLIENT' && (
            <Link to={`/post-job?freelancer=${id}`}
              style={{ padding:'10px 22px', borderRadius:11, border:'none', background:'linear-gradient(135deg,#14b8a6,#0d9488)', color:'#07111d', fontWeight:700, fontSize:14, textDecoration:'none', display:'flex', alignItems:'center', gap:8, flexShrink:0, boxShadow:'0 4px 14px rgba(20,184,166,.25)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Hire Me
            </Link>
          )}
        </div>

        {/* Portfolio link */}
        {profile.portfolioUrl && (
          <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid rgba(255,255,255,.07)' }}>
            <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer"
              style={{ fontSize:13, color:'#14b8a6', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              {profile.portfolioUrl.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}
      </div>

      {/* Skills */}
      {profile.skills?.length > 0 && (
        <div className="fp-fade" style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:14, padding:'18px 22px', marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:12 }}>Skills</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
            {profile.skills.map(us => (
              <SkillBadge key={us.skill?.id || us} name={us.skill?.name || us} />
            ))}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="fp-fade" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:16 }}>
        {[
          { label:'Member since',  value: fmtDate(profile.createdAt), color:'#94a3b8' },
          { label:'Response rate', value: profile.responseRate ? profile.responseRate+'%' : 'N/A', color:'#34d399' },
          { label:'Jobs completed',value: profile.completedJobs || 0, color:'#14b8a6' },
          { label:'Repeat clients',value: profile.repeatClients || 0, color:'#818cf8' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding:'12px 14px', borderRadius:11, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', textAlign:'center' }}>
            <div style={{ fontSize:18, fontWeight:800, color, marginBottom:3 }}>{value}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.38)', textTransform:'uppercase', letterSpacing:'.06em' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Reviews */}
      {reviews.length > 0 && (
        <div className="fp-fade">
          <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:12 }}>
            Reviews ({reviews.length})
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {reviews.slice(0, 5).map(rv => (
              <div key={rv.id} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:7 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#f8fafc', marginBottom:3 }}>{rv.reviewer?.name || 'Anonymous'}</div>
                    <Stars rating={rv.rating} size={12} />
                    <span style={{ fontSize:12, fontWeight:600, color:'#fbbf24', marginLeft:6 }}>{rv.rating.toFixed(1)}</span>
                  </div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,.3)' }}>{fmtDate(rv.createdAt)}</div>
                </div>
                {rv.comment && <div style={{ fontSize:13, color:'rgba(255,255,255,.6)', lineHeight:1.6 }}>{rv.comment}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
