import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'
import { errMsg } from '../utils/helpers'
import { Modal, Spinner } from './UI'
import { StarInput } from './StarInput'

const CATEGORIES = [
  { key: 'quality',       label: 'Quality of Work',   hint: 'How well was the work done?' },
  { key: 'communication', label: 'Communication',      hint: 'Were they responsive and clear?' },
  { key: 'timeliness',    label: 'Timeliness',         hint: 'Was the work delivered on time?' },
]

const SCORE_LABELS = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' }

export default function ReviewModal({ open, onClose, job, revieweeName, onReviewed }) {
  const [scores, setScores] = useState({ quality: 0, communication: 0, timeliness: 0 })
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  const setScore = (key, val) => setScores(s => ({ ...s, [key]: val }))
  const allFilled = scores.quality > 0 && scores.communication > 0 && scores.timeliness > 0
  const overall = allFilled
    ? Math.round(((scores.quality + scores.communication + scores.timeliness) / 3) * 10) / 10
    : 0

  const submit = async () => {
    if (!allFilled) return toast.error('Please rate all three categories')
    setLoading(true)
    try {
      await api.post('/reviews', {
        jobId: job.id,
        quality:       scores.quality,
        communication: scores.communication,
        timeliness:    scores.timeliness,
        comment:       comment.trim() || undefined,
      })
      toast.success('Review submitted!')
      onReviewed()
      onClose()
    } catch (err) {
      toast.error(errMsg(err))
    } finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={'Review ' + (revieweeName || 'this user')}>
      <p className="text-sm text-ink-400 mb-5 leading-relaxed">
        Share your experience working on <span className="text-ink-200 font-medium">{job?.title}</span>.
        Your review helps build trust in the community.
      </p>

      <div className="space-y-5 mb-5">
        {CATEGORIES.map(({ key, label, hint }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <span className="text-sm font-medium text-ink-200">{label}</span>
                <p className="text-xs text-ink-500">{hint}</p>
              </div>
              {scores[key] > 0 && (
                <span className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  {SCORE_LABELS[scores[key]]}
                </span>
              )}
            </div>
            <StarInput value={scores[key]} onChange={val => setScore(key, val)} size="lg" />
          </div>
        ))}
      </div>

      {/* Overall preview */}
      {allFilled && (
        <div className="mb-5 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 flex items-center justify-between">
          <span className="text-sm text-ink-300">Overall score</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-display font-bold text-amber-400">{overall}</span>
            <span className="text-amber-400 text-lg">/ 5</span>
          </div>
        </div>
      )}

      {/* Comment */}
      <div className="mb-5">
        <label className="label">Comment <span className="text-ink-600 font-normal">(optional)</span></label>
        <textarea
          className="input resize-none"
          rows={3}
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Share specific feedback about your experience..."
          maxLength={500}
        />
        <div className="text-xs text-ink-600 text-right mt-1">{comment.length}/500</div>
      </div>

      <div className="flex gap-3">
        <button className="btn-secondary btn" onClick={onClose}>Skip</button>
        <button
          className="btn-primary btn flex-1"
          onClick={submit}
          disabled={loading || !allFilled}
        >
          {loading ? <Spinner /> : null}
          Submit Review
        </button>
      </div>
    </Modal>
  )
}
