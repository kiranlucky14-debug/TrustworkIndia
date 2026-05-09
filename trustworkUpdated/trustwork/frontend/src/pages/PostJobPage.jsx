import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'
import { errMsg } from '../utils/helpers'
import { Spinner } from '../components/UI'

export default function PostJobPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', budget: '', deadline: '',
  })

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.description || !form.budget || !form.deadline) {
      return toast.error('All fields are required')
    }
    if (parseFloat(form.budget) < 500) return toast.error('Minimum budget is ₹500')
    setLoading(true)
    try {
      const { data } = await api.post('/jobs', form)
      toast.success('Job posted successfully!')
      navigate(`/jobs/${data.id}`)
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
          <div>
            <label className="label">Job Title *</label>
            <input
              className="input"
              value={form.title}
              onChange={set('title')}
              placeholder="e.g. Build a React dashboard for my SaaS"
              maxLength={120}
            />
            <div className="text-xs text-ink-600 mt-1 text-right">{form.title.length}/120</div>
          </div>

          <div>
            <label className="label">Description *</label>
            <textarea
              className="input min-h-[140px] resize-y"
              value={form.description}
              onChange={set('description')}
              placeholder="Describe the work in detail — tech stack, deliverables, requirements…"
              maxLength={2000}
            />
            <div className="text-xs text-ink-600 mt-1 text-right">{form.description.length}/2000</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Budget (₹) *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 font-mono text-sm">₹</span>
                <input
                  className="input pl-8"
                  type="number"
                  min={500}
                  step={500}
                  value={form.budget}
                  onChange={set('budget')}
                  placeholder="15000"
                />
              </div>
            </div>
            <div>
              <label className="label">Deadline *</label>
              <input
                className="input"
                type="date"
                min={tomorrow}
                value={form.deadline}
                onChange={set('deadline')}
              />
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="card p-4 border-brand-500/20 bg-brand-500/5">
          <h4 className="text-sm font-medium text-brand-400 mb-2">💡 Tips for getting good proposals</h4>
          <ul className="text-xs text-ink-400 space-y-1 list-disc list-inside">
            <li>Be specific about the tech stack or tools you want used</li>
            <li>Mention existing code or systems the freelancer needs to work with</li>
            <li>Set a realistic budget — it increases quality of proposals</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            className="btn-secondary btn"
            onClick={() => navigate(-1)}
          >Cancel</button>
          <button type="submit" className="btn-primary btn flex-1" disabled={loading}>
            {loading ? <Spinner /> : '✚'} Post Job
          </button>
        </div>
      </form>
    </div>
  )
}
