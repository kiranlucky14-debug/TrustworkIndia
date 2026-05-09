import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import { errMsg } from '../utils/helpers'
import { Spinner } from '../components/UI'
import { SkillPicker } from '../components/SkillTag'

const CATEGORIES = [
  'Web Development', 'Mobile Apps', 'Design & Creative',
  'Data & Analytics', 'DevOps & Cloud', 'Writing & Content',
  'Marketing & SEO', 'Video & Animation', 'General',
]

export default function PostJobPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [selectedSkills, setSelectedSkills] = useState([])
  const [form, setForm] = useState({
    title: '', description: '', budget: '', deadline: '',
    category: 'General', type: 'FIXED', isRemote: true, hourlyRate: '',
  })

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const toggle = (k) => setForm(f => ({ ...f, [k]: !f[k] }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.description || !form.budget || !form.deadline)
      return toast.error('All fields are required')
    if (parseFloat(form.budget) < 500)
      return toast.error('Minimum budget is Rs.500')
    if (form.type === 'HOURLY' && !form.hourlyRate)
      return toast.error('Hourly rate is required for hourly jobs')

    setLoading(true)
    try {
      const payload = {
        ...form,
        budget:     parseFloat(form.budget),
        hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : undefined,
        skillIds:   selectedSkills.map(s => s.id),
      }
      const { data: job } = await api.post('/jobs', payload)
      toast.success('Job posted successfully!')
      navigate('/jobs/' + job.id)
    } catch (err) {
      toast.error(errMsg(err))
    } finally { setLoading(false) }
  }

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="page-header">
        <h1 className="page-title">Post a Job</h1>
        <p className="page-subtitle">Describe your project to find the right freelancer</p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <div className="card p-6 space-y-5">

          {/* Title */}
          <div>
            <label className="label">Job Title *</label>
            <input className="input" value={form.title} onChange={set('title')}
              placeholder="e.g. Build a React dashboard for my SaaS" maxLength={120} />
            <div className="text-xs text-ink-600 mt-1 text-right">{form.title.length}/120</div>
          </div>

          {/* Description */}
          <div>
            <label className="label">Description *</label>
            <textarea className="input min-h-[120px] resize-y" value={form.description}
              onChange={set('description')} maxLength={2000}
              placeholder="Describe the work in detail -- tech stack, deliverables, requirements" />
            <div className="text-xs text-ink-600 mt-1 text-right">{form.description.length}/2000</div>
          </div>

          {/* Category + Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={set('category')}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Job Type</label>
              <div className="grid grid-cols-2 gap-2">
                {['FIXED', 'HOURLY'].map(t => (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={`py-2.5 rounded-lg text-sm font-medium border transition-all ${
                      form.type === t
                        ? 'bg-brand-500 text-ink-950 border-brand-500'
                        : 'bg-ink-800 text-ink-400 border-ink-700 hover:border-ink-500'
                    }`}>
                    {t === 'FIXED' ? 'Fixed Price' : 'Hourly'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Budget / Hourly rate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{form.type === 'FIXED' ? 'Total Budget (Rs.) *' : 'Max Budget (Rs.) *'}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 font-mono text-sm">Rs.</span>
                <input className="input pl-10" type="number" min={500} step={500}
                  value={form.budget} onChange={set('budget')} placeholder="15000" />
              </div>
            </div>
            {form.type === 'HOURLY' ? (
              <div>
                <label className="label">Hourly Rate (Rs./hr) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 font-mono text-sm">Rs.</span>
                  <input className="input pl-10" type="number" min={100} step={50}
                    value={form.hourlyRate} onChange={set('hourlyRate')} placeholder="500" />
                </div>
              </div>
            ) : (
              <div>
                <label className="label">Deadline *</label>
                <input className="input" type="date" min={tomorrow}
                  value={form.deadline} onChange={set('deadline')} />
              </div>
            )}
          </div>

          {/* Deadline for hourly */}
          {form.type === 'HOURLY' && (
            <div>
              <label className="label">Deadline *</label>
              <input className="input" type="date" min={tomorrow}
                value={form.deadline} onChange={set('deadline')} />
            </div>
          )}

          {/* Remote toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <div className="text-sm font-medium text-ink-200">Remote work</div>
              <div className="text-xs text-ink-500 mt-0.5">Freelancer can work from anywhere</div>
            </div>
            <button type="button" onClick={() => toggle('isRemote')}
              className={`w-11 h-6 rounded-full transition-colors relative ${form.isRemote ? 'bg-brand-500' : 'bg-ink-700'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.isRemote ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Skills */}
          <div>
            <label className="label">Required Skills</label>
            <SkillPicker selected={selectedSkills} onChange={setSelectedSkills} max={10} />
            <p className="text-xs text-ink-600 mt-1.5">Add skills to help freelancers find your job</p>
          </div>

        </div>

        <div className="card p-4 border-brand-500/20 bg-brand-500/5">
          <h4 className="text-sm font-medium text-brand-400 mb-2">Tips for getting good proposals</h4>
          <ul className="text-xs text-ink-400 space-y-1 list-disc list-inside">
            <li>Be specific about the tech stack or tools required</li>
            <li>Set a realistic budget -- it attracts quality freelancers</li>
            <li>Adding skill tags helps your job appear in freelancer searches</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button type="button" className="btn-secondary btn" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn-primary btn flex-1" disabled={loading}>
            {loading ? <Spinner /> : '+'} Post Job
          </button>
        </div>
      </form>
    </div>
  )
}