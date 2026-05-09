// StarInput.jsx -- interactive star rating + display components

import { useState } from 'react'

// Interactive star picker for a single category
export function StarInput({ value, onChange, size = 'md' }) {
  const [hover, setHover] = useState(0)
  const sz = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-base' : 'text-xl'

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className={`${sz} transition-all leading-none ${
            n <= (hover || value)
              ? 'text-amber-400 scale-110'
              : 'text-ink-700 hover:text-amber-300'
          }`}
        >
          {n <= (hover || value) ? '\u2605' : '\u2606'}
        </button>
      ))}
    </div>
  )
}

// Display-only stars (fractional support)
export function StarDisplay({ value, size = 'sm', showNumber = true, count }) {
  const sz = size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-lg' : 'text-sm'
  const full  = Math.floor(value || 0)
  const half  = (value || 0) - full >= 0.3 && (value || 0) - full < 0.8
  const empty = 5 - full - (half ? 1 : 0)

  return (
    <div className="flex items-center gap-1.5">
      <div className={`flex gap-0.5 ${sz}`}>
        {Array(full).fill(0).map((_, i) => (
          <span key={'f' + i} className="text-amber-400">\u2605</span>
        ))}
        {half && <span className="text-amber-300">\u2605</span>}
        {Array(empty).fill(0).map((_, i) => (
          <span key={'e' + i} className="text-ink-700">\u2606</span>
        ))}
      </div>
      {showNumber && (
        <span className={`font-medium text-ink-200 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          {value ? value.toFixed(1) : '0.0'}
        </span>
      )}
      {count !== undefined && (
        <span className="text-ink-500 text-xs">({count})</span>
      )}
    </div>
  )
}

// Score bar -- used in breakdown display
export function ScoreBar({ label, value }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-ink-400 w-32 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-ink-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all duration-500"
          style={{ width: ((value / 5) * 100) + '%' }}
        />
      </div>
      <span className="text-xs font-medium text-ink-300 w-6 text-right">{value ? value.toFixed(1) : '0'}</span>
    </div>
  )
}
