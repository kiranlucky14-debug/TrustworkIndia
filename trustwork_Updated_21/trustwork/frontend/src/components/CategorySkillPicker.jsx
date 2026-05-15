import { useState, useMemo } from 'react'

// ---------------------------------------------------------------------------
// Skill catalogue - categorised
// ---------------------------------------------------------------------------
export const SKILL_CATEGORIES = [
  {
    id: 'technology',
    label: 'Technology',
    icon: 'M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18',
    color: '#14b8a6',
    skills: [
      'React', 'Node.js', 'Python', 'Java', 'JavaScript', 'TypeScript',
      'Angular', 'Vue.js', 'Next.js', 'PHP', 'Laravel', 'Django',
      'FastAPI', 'Spring Boot', 'AWS', 'Azure', 'GCP', 'Docker',
      'Kubernetes', 'DevOps', 'Linux', 'PostgreSQL', 'MySQL', 'MongoDB',
      'Redis', 'GraphQL', 'REST APIs', 'Flutter', 'React Native',
      'Android', 'iOS/Swift', 'SAP', 'Pega', 'Salesforce', 'Go', 'Rust',
      'C++', 'C#', '.NET', 'Machine Learning', 'Data Analysis', 'TensorFlow',
    ],
  },
  {
    id: 'design',
    label: 'Design',
    icon: 'M12 19l7-7 3 3-7 7-3-3z M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z M2 2l7.586 7.586 M11 11a2 2 0 1 0 4 0 2 2 0 0 0-4 0',
    color: '#818cf8',
    skills: [
      'UI/UX Design', 'Figma', 'Adobe XD', 'Sketch', 'Graphic Design',
      'Logo Design', 'Brand Identity', 'Illustration', 'Photoshop',
      'Illustrator', 'InDesign', 'After Effects', 'Premiere Pro',
      'Video Editing', 'Motion Graphics', 'Canva', '3D Design',
      'Product Design', 'Wireframing', 'Prototyping',
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    icon: 'M11 3.055A9.001 9.001 0 1 0 20.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0 1 20.488 9z',
    color: '#fb923c',
    skills: [
      'Digital Marketing', 'SEO', 'SEM', 'Google Ads', 'Facebook Ads',
      'Instagram Marketing', 'Social Media Marketing', 'Influencer Marketing',
      'Email Marketing', 'Content Marketing', 'Affiliate Marketing',
      'Product Promotion', 'Brand Strategy', 'Market Research',
      'Analytics', 'Growth Hacking', 'Performance Marketing',
    ],
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
    color: '#f43f5e',
    skills: [
      'Lead Generation', 'B2B Sales', 'Cold Calling', 'Inside Sales',
      'Account Management', 'CRM Management', 'Salesforce', 'HubSpot',
      'Business Development', 'Client Acquisition', 'Negotiation',
      'Retail Sales', 'E-Commerce Sales', 'Telemarketing',
    ],
  },
  {
    id: 'content',
    label: 'Content',
    icon: 'M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    color: '#fbbf24',
    skills: [
      'Content Writing', 'Copywriting', 'Blogging', 'Technical Writing',
      'Creative Writing', 'Script Writing', 'Ghostwriting', 'Proofreading',
      'Editing', 'Translation', 'Research Writing', 'Press Release',
      'Product Descriptions', 'Social Media Content', 'Newsletter Writing',
    ],
  },
  {
    id: 'finance',
    label: 'Finance & Legal',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
    color: '#34d399',
    skills: [
      'Accounting', 'Bookkeeping', 'Tax Filing', 'GST Compliance',
      'Financial Modelling', 'Tally', 'QuickBooks', 'Auditing',
      'Legal Research', 'Contract Drafting', 'Compliance', 'HR & Payroll',
    ],
  },
]

// Flat lookup: skill name -> category id/color
const SKILL_META = {}
SKILL_CATEGORIES.forEach(cat => {
  cat.skills.forEach(s => { SKILL_META[s] = { categoryId: cat.id, color: cat.color, categoryLabel: cat.label } })
})

export function getSkillMeta(name) { return SKILL_META[name] || { color: '#64748b', categoryLabel: 'Other' } }

// ---------------------------------------------------------------------------
// CategorySkillPicker component
// ---------------------------------------------------------------------------
export default function CategorySkillPicker({ selected = [], onChange, max = 15, accent = '#818cf8' }) {
  const [search,       setSearch]      = useState('')
  const [openCats,     setOpenCats]    = useState({ technology: true })  // tech open by default

  const isSelected = name => selected.includes(name)

  const toggle = name => {
    if (isSelected(name)) {
      onChange(selected.filter(s => s !== name))
    } else {
      if (selected.length >= max) return
      onChange([...selected, name])
    }
  }

  const removeSkill = name => onChange(selected.filter(s => s !== name))

  const toggleCat = id => setOpenCats(o => ({ ...o, [id]: !o[id] }))

  // Search: show all matching skills across all categories
  const searchResults = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    const results = []
    SKILL_CATEGORIES.forEach(cat => {
      cat.skills.forEach(s => {
        if (s.toLowerCase().includes(q)) results.push({ name: s, color: cat.color, categoryLabel: cat.label })
      })
    })
    return results
  }, [search])

  return (
    <div>
      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeLinecap="round"
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search any skill (e.g. React, SEO, Figma)..."
          style={{
            width: '100%', padding: '10px 14px 10px 36px',
            background: 'rgba(255,255,255,.05)',
            border: '1.5px solid rgba(255,255,255,.1)',
            borderRadius: 10, color: '#f1f5f9', fontSize: 13,
            fontFamily: 'inherit', outline: 'none', transition: 'border-color .18s',
          }}
          onFocus={e => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${accent}20` }}
          onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,.1)'; e.target.style.boxShadow = 'none' }}
        />
        {search && (
          <button onClick={() => setSearch('')} type="button"
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,.35)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>
            x
          </button>
        )}
      </div>

      {/* Search results */}
      {search && (
        <div style={{ marginBottom: 12 }}>
          {searchResults.length === 0 ? (
            <div style={{ padding: '12px', fontSize: 13, color: '#64748b', textAlign: 'center', background: 'rgba(255,255,255,.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,.07)' }}>
              No skills found for "{search}"
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '12px', background: 'rgba(255,255,255,.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,.07)' }}>
              {searchResults.map(({ name, color, categoryLabel }) => {
                const sel = isSelected(name)
                const disabled = !sel && selected.length >= max
                return (
                  <button key={name} onClick={() => toggle(name)} type="button"
                    disabled={disabled}
                    title={categoryLabel}
                    style={{
                      padding: '4px 12px', borderRadius: 100, fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 5,
                      background: sel ? `${color}20` : 'rgba(255,255,255,.06)',
                      border: `1.5px solid ${sel ? color + '60' : 'rgba(255,255,255,.12)'}`,
                      color: sel ? color : '#94a3b8', opacity: disabled ? .4 : 1,
                    }}>
                    {sel && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke={color} strokeWidth="1.8" strokeLinecap="round"/></svg>
                    )}
                    {name}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Category accordions */}
      {!search && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto', paddingRight: 2 }}>
          {SKILL_CATEGORIES.map(cat => {
            const open = openCats[cat.id]
            const catSelected = cat.skills.filter(s => isSelected(s))
            return (
              <div key={cat.id} style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, overflow: 'hidden', transition: 'border-color .18s' }}>
                {/* Accordion header */}
                <button onClick={() => toggleCat(cat.id)} type="button"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: open ? `${cat.color}08` : 'rgba(255,255,255,.03)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'background .18s' }}>
                  {/* Category icon */}
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: `${cat.color}18`, border: `1px solid ${cat.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={cat.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={cat.icon}/>
                    </svg>
                  </div>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: open ? cat.color : '#94a3b8', textAlign: 'left' }}>{cat.label}</span>
                  {catSelected.length > 0 && (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100, background: `${cat.color}20`, color: cat.color, fontWeight: 600 }}>
                      {catSelected.length}
                    </span>
                  )}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={open ? cat.color : '#64748b'} strokeWidth="2.2" strokeLinecap="round"
                    style={{ transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {/* Skills grid */}
                {open && (
                  <div style={{ padding: '10px 14px 12px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {cat.skills.map(name => {
                      const sel = isSelected(name)
                      const disabled = !sel && selected.length >= max
                      return (
                        <button key={name} onClick={() => toggle(name)} type="button"
                          disabled={disabled}
                          style={{
                            padding: '4px 11px', borderRadius: 100, fontSize: 12,
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            fontFamily: 'inherit', transition: 'all .15s',
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: sel ? `${cat.color}18` : 'rgba(255,255,255,.05)',
                            border: `1.5px solid ${sel ? cat.color + '50' : 'rgba(255,255,255,.1)'}`,
                            color: sel ? cat.color : '#94a3b8',
                            opacity: disabled ? .4 : 1, fontWeight: sel ? 600 : 400,
                          }}>
                          {sel && (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke={cat.color} strokeWidth="1.8" strokeLinecap="round"/></svg>
                          )}
                          {name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Selected chips footer */}
      {selected.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              {selected.length}/{max} skills selected
            </span>
            <button onClick={() => onChange([])} type="button"
              style={{ fontSize: 11, color: '#f43f5e', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Clear all
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {selected.map(name => {
              const meta = getSkillMeta(name)
              return (
                <span key={name}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 100, fontSize: 12, fontWeight: 500, background: `${meta.color}15`, border: `1px solid ${meta.color}40`, color: meta.color }}>
                  {name}
                  <button onClick={() => removeSkill(name)} type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: meta.color, padding: 0, display: 'flex', alignItems: 'center', opacity: .7, fontSize: 14, lineHeight: 1 }}>
                    x
                  </button>
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
