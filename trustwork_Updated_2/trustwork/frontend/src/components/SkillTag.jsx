// Reusable skill components used across the whole app

const CATEGORY_COLORS = {
  Frontend:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Backend:   'bg-brand-500/10 text-brand-400 border-brand-500/20',
  Database:  'bg-violet-500/10 text-violet-400 border-violet-500/20',
  Mobile:    'bg-pink-500/10 text-pink-400 border-pink-500/20',
  DevOps:    'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Design:    'bg-rose-500/10 text-rose-400 border-rose-500/20',
  Data:      'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  Marketing: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  CMS:       'bg-amber-500/10 text-amber-400 border-amber-500/20',
  General:   'bg-ink-700 text-ink-400 border-ink-600',
};

// Single skill chip - display only
export function SkillTag({ skill, onRemove }) {
  const color = CATEGORY_COLORS[skill.category] || CATEGORY_COLORS.General;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {skill.name}
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(skill.id)}
          className="ml-0.5 hover:opacity-60 transition-opacity leading-none"
        >
          x
        </button>
      )}
    </span>
  );
}

// Row of skill chips
export function SkillTagList({ skills = [], max, onRemove }) {
  const shown = max ? skills.slice(0, max) : skills;
  const rest  = max ? skills.length - max : 0;
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map(s => (
        <SkillTag key={s.id} skill={s} onRemove={onRemove} />
      ))}
      {rest > 0 && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-ink-700 text-ink-400 border border-ink-600">
          +{rest} more
        </span>
      )}
    </div>
  );
}

// Full skill picker with search + category tabs
import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

export function SkillPicker({ selected = [], onChange, max = 10 }) {
  const [allSkills, setAllSkills]     = useState([]);
  const [categories, setCategories]   = useState([]);
  const [activeCategory, setActiveCat] = useState('All');
  const [search, setSearch]           = useState('');
  const [open, setOpen]               = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    api.get('/skills').then(r => setAllSkills(r.data)).catch(() => {});
    api.get('/skills/categories').then(r => setCategories(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = allSkills.filter(s => {
    const matchCat  = activeCategory === 'All' || s.category === activeCategory;
    const matchName = !search || s.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchName;
  });

  const isSelected = (id) => selected.some(s => s.id === id);

  const toggle = (skill) => {
    if (isSelected(skill.id)) {
      onChange(selected.filter(s => s.id !== skill.id));
    } else {
      if (selected.length >= max) return;
      onChange([...selected, skill]);
    }
  };

  return (
    <div ref={ref} className="relative">
      {/* Selected chips + open button */}
      <div
        className="min-h-[42px] input cursor-pointer flex flex-wrap gap-1.5 items-center"
        onClick={() => setOpen(o => !o)}
      >
        {selected.length === 0 && (
          <span className="text-ink-500 text-sm">Click to add skills...</span>
        )}
        {selected.map(s => (
          <SkillTag key={s.id} skill={s} onRemove={(id) => onChange(selected.filter(x => x.id !== id))} />
        ))}
        <span className="ml-auto text-xs text-ink-600">{selected.length}/{max}</span>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-ink-900 border border-ink-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-ink-800">
            <input
              autoFocus
              className="input text-sm py-2"
              placeholder="Search skills..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          </div>

          {/* Category tabs */}
          <div className="flex gap-0 overflow-x-auto border-b border-ink-800 scrollbar-hide">
            {['All', ...categories].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={e => { e.stopPropagation(); setActiveCat(cat); setSearch(''); }}
                className={`px-3 py-2 text-xs font-medium whitespace-nowrap flex-shrink-0 border-b-2 transition-colors ${
                  activeCategory === cat
                    ? 'border-brand-500 text-brand-400'
                    : 'border-transparent text-ink-500 hover:text-ink-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Skill grid */}
          <div className="p-3 max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-center text-ink-600 text-sm py-4">No skills found</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {filtered.map(s => {
                  const sel = isSelected(s.id);
                  const color = CATEGORY_COLORS[s.category] || CATEGORY_COLORS.General;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={e => { e.stopPropagation(); toggle(s); }}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all ${
                        sel
                          ? color + ' ring-1 ring-offset-1 ring-offset-ink-900 opacity-100'
                          : 'bg-ink-800 text-ink-400 border-ink-700 hover:border-ink-500'
                      } ${selected.length >= max && !sel ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {sel ? ' ' : ''}{s.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selected.length > 0 && (
            <div className="px-3 py-2 border-t border-ink-800 flex justify-between items-center">
              <span className="text-xs text-ink-500">{selected.length} selected</span>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onChange([]); }}
                className="text-xs text-rose-400 hover:text-rose-300"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
