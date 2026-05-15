import { useState, useMemo } from 'react'

// ---------------------------------------------------------------------------
// Skill catalogue
// ---------------------------------------------------------------------------
export const SKILL_CATEGORIES = [
  {
    id: 'technology',
    label: 'Technology',
    icon: 'M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18',
    color: '#14b8a6',
    skills: [
      // Frontend
      'HTML', 'CSS', 'JavaScript', 'TypeScript',
      'React', 'React.js', 'Next.js', 'Angular', 'Vue.js', 'Redux',
      'Tailwind CSS', 'Bootstrap', 'Material UI', 'SASS/SCSS',
      'jQuery', 'Webpack', 'Vite',
      // Backend
      'Node.js', 'Express.js', 'Java', 'Spring Boot',
      'Python', 'Django', 'Flask', 'FastAPI',
      'PHP', 'Laravel', '.NET', 'ASP.NET', 'Ruby on Rails',
      'GoLang', 'Go', 'Rust', 'C++', 'C#',
      // Mobile
      'Flutter', 'React Native', 'Android Development', 'Android',
      'iOS Development', 'iOS/Swift', 'Kotlin', 'Swift', 'Ionic', 'Xamarin',
      // Database
      'MySQL', 'PostgreSQL', 'MongoDB', 'Oracle DB', 'SQL Server',
      'Redis', 'Firebase', 'Cassandra', 'DynamoDB', 'SQLite',
      // Cloud & DevOps
      'AWS', 'Azure', 'Microsoft Azure', 'GCP', 'Google Cloud Platform (GCP)',
      'Docker', 'Kubernetes', 'Jenkins', 'GitHub Actions', 'GitLab CI/CD',
      'Terraform', 'Ansible', 'Nginx', 'Apache Server', 'DevOps', 'Linux',
      // Other Tech
      'REST APIs',
    ],
  },
  {
    id: 'ai-ml',
    label: 'AI & Machine Learning',
    icon: 'M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2z',
    color: '#a78bfa',
    skills: [
      'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision',
      'TensorFlow', 'PyTorch', 'OpenAI API', 'LangChain',
      'Generative AI', 'AI Automation', 'Prompt Engineering',
      'Chatbot Development', 'AI Agent Development', 'LLM Integration',
    ],
  },
  {
    id: 'data-science',
    label: 'Data Science & Analytics',
    icon: 'M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z',
    color: '#38bdf8',
    skills: [
      'Data Analysis', 'Power BI', 'Tableau', 'Excel Automation',
      'Pandas', 'NumPy', 'Apache Spark', 'Hadoop',
      'ETL Development', 'Data Engineering',
    ],
  },
  {
    id: 'cybersecurity',
    label: 'Cybersecurity',
    icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    color: '#f43f5e',
    skills: [
      'Ethical Hacking', 'Penetration Testing', 'Network Security',
      'SOC Operations', 'SIEM', 'Vulnerability Assessment',
      'Cloud Security', 'IAM', 'Firewall Configuration',
    ],
  },
  {
    id: 'testing',
    label: 'Software Testing',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
    color: '#34d399',
    skills: [
      'Manual Testing', 'Automation Testing', 'Selenium', 'Cypress',
      'Appium', 'JUnit', 'Load Testing', 'Performance Testing', 'API Testing',
    ],
  },
  {
    id: 'cms-ecommerce',
    label: 'CMS & E-commerce',
    icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-8 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
    color: '#fb923c',
    skills: [
      'WordPress', 'Shopify', 'WooCommerce', 'Magento', 'Webflow', 'Wix',
    ],
  },
  {
    id: 'blockchain',
    label: 'Blockchain & Web3',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    color: '#fbbf24',
    skills: [
      'Solidity', 'Smart Contracts', 'Ethereum Development',
      'Web3.js', 'NFT Development', 'Crypto Wallet Integration',
    ],
  },
  {
    id: 'erp',
    label: 'ERP & Enterprise',
    icon: 'M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4',
    color: '#818cf8',
    skills: [
      'Pega', 'SAP', 'Salesforce', 'ServiceNow',
      'Oracle ERP', 'Workday', 'Microsoft Dynamics 365',
    ],
  },
  {
    id: 'networking',
    label: 'Networking & Infrastructure',
    icon: 'M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18',
    color: '#64748b',
    skills: [
      'CCNA', 'Network Administration', 'Linux Administration',
      'Windows Server', 'Virtualization', 'VMware',
    ],
  },
  {
    id: 'version-control',
    label: 'Version Control & Collaboration',
    icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
    color: '#f97316',
    skills: [
      'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Jira', 'Confluence',
    ],
  },
  {
    id: 'api-integration',
    label: 'API & Integration',
    icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z',
    color: '#06b6d4',
    skills: [
      'REST API', 'GraphQL', 'SOAP API', 'API Gateway',
      'MuleSoft', 'Postman',
    ],
  },
  {
    id: 'emerging-tech',
    label: 'Emerging Technologies',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    color: '#e879f9',
    skills: [
      'Robotics', 'IoT', 'AR/VR', 'Edge Computing',
      'Quantum Computing', 'Drone Technology', 'Automation Engineering',
    ],
  },
  {
    id: 'design',
    label: 'Design',
    icon: 'M12 19l7-7 3 3-7 7-3-3z M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z M2 2l7.586 7.586 M11 11a2 2 0 1 0 4 0 2 2 0 0 0-4 0',
    color: '#c084fc',
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
      'Account Management', 'CRM Management', 'HubSpot',
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

// Scrollable skill container - shows all skills but constrains height to ~3 rows, then scrolls
const SKILLS_MAX_H = 130  // px  about 3 chip rows

// ---------------------------------------------------------------------------
// CategorySkillPicker component
// ---------------------------------------------------------------------------
export default function CategorySkillPicker({ selected = [], onChange, max = 15, accent = '#818cf8' }) {
  const [search,    setSearch]   = useState('')
  const [openCats,  setOpenCats] = useState({ technology: true })

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
  const toggleCat   = id => setOpenCats(o => ({ ...o, [id]: !o[id] }))

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {SKILL_CATEGORIES.map(cat => {
            const open = openCats[cat.id]
            const catSelected = cat.skills.filter(s => isSelected(s))
            return (
              <div key={cat.id} style={{ border: `1px solid ${open ? cat.color + '30' : 'rgba(255,255,255,.08)'}`, borderRadius: 10, transition: 'border-color .2s' }}>

                {/* Accordion header */}
                <button onClick={() => toggleCat(cat.id)} type="button"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: open ? `${cat.color}0a` : 'rgba(255,255,255,.03)', border: 'none', borderRadius: open ? '10px 10px 0 0' : 10, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .18s' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: `${cat.color}18`, border: `1px solid ${cat.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={cat.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={cat.icon}/>
                    </svg>
                  </div>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: open ? cat.color : '#94a3b8', textAlign: 'left' }}>{cat.label}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', marginRight: 4 }}>{cat.skills.length}</span>
                  {catSelected.length > 0 && (
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100, background: `${cat.color}20`, color: cat.color, fontWeight: 700 }}>
                      {catSelected.length} selected
                    </span>
                  )}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={open ? cat.color : '#64748b'} strokeWidth="2.2" strokeLinecap="round"
                    style={{ transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {/* Skills  scrollable container */}
                {open && (
                  <div style={{ borderTop: `1px solid ${cat.color}20` }}>
                    {/* Scroll hint gradient fade at bottom */}
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        maxHeight: SKILLS_MAX_H,
                        overflowY: 'auto',
                        padding: '10px 14px 10px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 6,
                        alignContent: 'flex-start',
                        // Custom scrollbar styling via CSS injected below
                      }}>
                        <style>{`
                          .skill-scroll::-webkit-scrollbar { width: 4px }
                          .skill-scroll::-webkit-scrollbar-track { background: transparent }
                          .skill-scroll::-webkit-scrollbar-thumb { background: ${cat.color}40; border-radius: 2px }
                          .skill-scroll::-webkit-scrollbar-thumb:hover { background: ${cat.color}70 }
                        `}</style>
                        {cat.skills.map(name => {
                          const sel      = isSelected(name)
                          const disabled = !sel && selected.length >= max
                          return (
                            <button key={name} onClick={() => toggle(name)} type="button"
                              disabled={disabled}
                              style={{
                                padding: '5px 11px', borderRadius: 100, fontSize: 12,
                                cursor: disabled ? 'not-allowed' : 'pointer',
                                fontFamily: 'inherit', transition: 'all .15s',
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                flexShrink: 0, whiteSpace: 'nowrap',
                                background: sel ? `${cat.color}18` : 'rgba(255,255,255,.05)',
                                border: `1.5px solid ${sel ? cat.color + '55' : 'rgba(255,255,255,.1)'}`,
                                color: sel ? cat.color : '#94a3b8',
                                opacity: disabled ? .4 : 1,
                                fontWeight: sel ? 600 : 400,
                                boxShadow: sel ? `0 0 0 1px ${cat.color}25` : 'none',
                              }}>
                              {sel && (
                                <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke={cat.color} strokeWidth="1.8" strokeLinecap="round"/></svg>
                              )}
                              {name}
                            </button>
                          )
                        })}
                      </div>
                      {/* Fade overlay at bottom to hint scrollability */}
                      {cat.skills.length > 12 && (
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0, height: 24,
                          background: `linear-gradient(to top, ${cat.color}08, transparent)`,
                          pointerEvents: 'none', borderRadius: '0 0 0 0',
                        }}/>
                      )}
                    </div>
                    {/* Scroll hint text for large categories */}
                    {cat.skills.length > 12 && (
                      <div style={{ padding: '4px 14px 8px', fontSize: 10, color: 'rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                        Scroll to see all {cat.skills.length} skills
                      </div>
                    )}
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
