import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { fmtDate } from '../utils/helpers'
import { PageLoader } from '../components/UI'
import { StarDisplay } from '../components/StarInput'
import ReviewsList from '../components/ReviewsList'
import { SkillTagList } from '../components/SkillTag'

const ROLE_COLOR = {
  CLIENT:     'bg-blue-500/15 text-blue-400',
  FREELANCER: 'bg-brand-500/15 text-brand-400',
  ADMIN:      'bg-orange-500/15 text-orange-400',
}

export default function ProfilePage() {
  const { id }     = useParams()
  const { user }   = useAuth()
  const [profile, setProfile] = useState(null)
  const [skills, setSkills]   = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('reviews')

  const targetId = id || user?.id

  useEffect(() => {
    if (!targetId) return
    Promise.all([
      api.get('/users/' + targetId),
      api.get('/skills/user/' + targetId),
    ])
      .then(([pRes, sRes]) => {
        setProfile(pRes.data)
        setSkills(sRes.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [targetId])

  if (loading) return <PageLoader />
  if (!profile)  return <div className="text-ink-400 p-8">Profile not found.</div>

  const isOwnProfile = user?.id === targetId
  const completedJobs = (profile._count?.clientJobs || 0) + (profile._count?.freelancerJobs || 0)

  return (
    <div className="animate-fade-in max-w-3xl">

      {/* Header card */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-brand-500/20 border-2 border-brand-500/30 flex items-center justify-center text-3xl font-display font-bold text-brand-400 flex-shrink-0">
            {profile.name?.[0]?.toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl font-display font-bold text-white">{profile.name}</h1>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${ROLE_COLOR[profile.role] || 'bg-ink-700 text-ink-400'}`}>
                    {profile.role}
                  </span>
                  {profile.ratingCount > 0 && (
                    <StarDisplay value={profile.rating} count={profile.ratingCount} size="sm" />
                  )}
                </div>
              </div>
              {isOwnProfile && (
                <Link to="/my-skills" className="btn-secondary btn btn-sm">Edit Skills</Link>
              )}
            </div>

            {/* Stats row */}
            <div className="flex gap-6 mt-4">
              <div className="text-center">
                <div className="text-xl font-display font-bold text-white">{profile.ratingCount || 0}</div>
                <div className="text-xs text-ink-500">Reviews</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-display font-bold text-white">
                  {profile.rating ? profile.rating.toFixed(1) : '-'}
                </div>
                <div className="text-xs text-ink-500">Avg Rating</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-display font-bold text-white">
                  {(profile._count?.clientJobs || 0) + (profile._count?.freelancerJobs || 0)}
                </div>
                <div className="text-xs text-ink-500">Jobs</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-display font-bold text-white">
                  {fmtDate(profile.createdAt)}
                </div>
                <div className="text-xs text-ink-500">Joined</div>
              </div>
            </div>
          </div>
        </div>

        {/* Skills */}
        {skills.length > 0 && (
          <div className="mt-5 pt-5 border-t border-ink-800">
            <div className="text-xs font-medium text-ink-500 uppercase tracking-wide mb-2.5">Skills</div>
            <SkillTagList skills={skills} />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-ink-900 border border-ink-800 p-1 rounded-xl w-fit mb-5">
        {['reviews'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
              tab === t ? 'bg-brand-500 text-ink-950' : 'text-ink-400 hover:text-ink-100'
            }`}
          >
            {t} {t === 'reviews' && profile.ratingCount > 0 ? `(${profile.ratingCount})` : ''}
          </button>
        ))}
      </div>

      {/* Reviews tab */}
      {tab === 'reviews' && <ReviewsList userId={targetId} />}
    </div>
  )
}
