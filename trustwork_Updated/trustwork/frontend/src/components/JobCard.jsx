import { Link } from 'react-router-dom'
import { StatusBadge, StarRating } from './UI'
import { fmtCurrency, fmtRelative, daysUntil } from '../utils/helpers'
import { SkillTagList } from './SkillTag'

export default function JobCard({ job }) {
  return (
    <Link to={`/jobs/${job.id}`} className="card-hover block p-5 group">

      {/* ── Title row ── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-display font-semibold text-white group-hover:text-brand-300 transition-colors line-clamp-1 flex-1">
          {job.title}
        </h3>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {job.type === 'HOURLY' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20">
              Hourly
            </span>
          )}
          <StatusBadge status={job.status} />
        </div>
      </div>

      {/* ── Description ── */}
      <p className="text-ink-400 text-sm line-clamp-2 mb-3 leading-relaxed">
        {job.description}
      </p>

      {/* ── Skills ── */}
      {job.skills && job.skills.length > 0 && (
        <div className="mb-3">
          <SkillTagList skills={job.skills.map(s => s.skill || s)} max={4} />
        </div>
      )}

      {/* ── Category + Hourly rate ── */}
      {(job.category && job.category !== 'General') || (job.type === 'HOURLY' && job.hourlyRate) ? (
        <div className="flex items-center gap-2 mb-3">
          {job.category && job.category !== 'General' && (
            <span className="text-xs text-ink-600 bg-ink-800 px-2 py-0.5 rounded">
              {job.category}
            </span>
          )}
          {job.type === 'HOURLY' && job.hourlyRate && (
            <span className="text-xs text-ink-500">
              Rs.{job.hourlyRate}/hr
            </span>
          )}
        </div>
      ) : null}

      {/* ── Budget + deadline + meta ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-lg font-display font-bold text-brand-400">
            {fmtCurrency(job.budget)}
          </div>
          {job.deadline && (
            <div className="text-xs text-ink-500 bg-ink-800 px-2 py-1 rounded-md">
              {daysUntil(job.deadline)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {job._count?.applicants > 0 && (
            <span className="text-xs text-ink-500">
              {job._count.applicants} applicant{job._count.applicants !== 1 ? 's' : ''}
            </span>
          )}
          {job.client && (
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-ink-700 flex items-center justify-center text-xs text-ink-400">
                {job.client.name[0]}
              </div>
              <span className="text-xs text-ink-500 hidden sm:block">{job.client.name}</span>
              <StarRating rating={job.client.rating} />
            </div>
          )}
        </div>
      </div>

      {/* ── Escrow status ── */}
      {job.escrows?.[0] && (
        <div className="mt-3 pt-3 border-t border-ink-800 flex items-center gap-2">
          <span className="text-xs text-ink-500">Escrow:</span>
          <span className={`text-xs font-medium ${
            job.escrows[0].status === 'LOCKED'   ? 'text-amber-400' :
            job.escrows[0].status === 'RELEASED' ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {job.escrows[0].status}
          </span>
          <span className="text-xs text-ink-500">
            {fmtCurrency(job.escrows[0].amount)}
          </span>
        </div>
      )}

      <div className="mt-3 text-xs text-ink-600">{fmtRelative(job.createdAt)}</div>
    </Link>
  )
}