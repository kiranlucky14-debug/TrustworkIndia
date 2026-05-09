import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { errMsg } from '../utils/helpers'
import { PageLoader } from '../components/UI'
import { SkillPicker, SkillTagList } from '../components/SkillTag'

export default function MySkillsPage() {
  const { user } = useAuth()
  const [mySkills, setMySkills]   = useState([])
  const [selected, setSelected]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [editing, setEditing]     = useState(false)

  useEffect(() => {
    api.get('/skills/user/' + user.id)
      .then(r => { setMySkills(r.data); setSelected(r.data); })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user.id])

  const save = async () => {
    setSaving(true)
    try {
      await api.put('/skills/me', { skillIds: selected.map(s => s.id) })
      setMySkills(selected)
      setEditing(false)
      toast.success('Skills updated!')
    } catch (err) {
      toast.error(errMsg(err))
    } finally { setSaving(false) }
  }

  if (loading) return <PageLoader />

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">My Skills</h1>
          <p className="page-subtitle">Skills shown on your profile and matched to jobs</p>
        </div>
        {!editing && (
          <button className="btn-primary btn" onClick={() => setEditing(true)}>
            Edit Skills
          </button>
        )}
      </div>

      {!editing ? (
        <div className="card p-6">
          {mySkills.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-3"></div>
              <p className="text-ink-400 mb-4">No skills added yet.</p>
              <button className="btn-primary btn" onClick={() => setEditing(true)}>
                Add Skills
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-ink-400 mb-4">
                {mySkills.length} skill{mySkills.length !== 1 ? 's' : ''} on your profile
              </p>
              <SkillTagList skills={mySkills} />
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card p-6">
            <label className="label mb-2 block">Select your skills (up to 15)</label>
            <SkillPicker selected={selected} onChange={setSelected} max={15} />
            <p className="text-xs text-ink-600 mt-2">
              These appear on your public profile and help clients find you for relevant jobs.
            </p>
          </div>

          {selected.length > 0 && (
            <div className="card p-4 bg-brand-500/5 border-brand-500/20">
              <p className="text-xs text-ink-400 mb-2">Preview on your profile:</p>
              <SkillTagList skills={selected} />
            </div>
          )}

          <div className="flex gap-3">
            <button
              className="btn-secondary btn"
              onClick={() => { setSelected(mySkills); setEditing(false); }}
            >
              Cancel
            </button>
            <button
              className="btn-primary btn flex-1"
              onClick={save}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Skills'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
