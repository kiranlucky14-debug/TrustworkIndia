import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/dashboard',    icon: 'grid',      label: 'Dashboard' },
  { to: '/jobs',         icon: 'search',    label: 'Browse Jobs',  roles: ['FREELANCER', 'ADMIN'] },
  { to: '/my-jobs',      icon: 'briefcase', label: 'My Jobs' },
  { to: '/post-job',     icon: 'plus',      label: 'Post Job',     roles: ['CLIENT', 'ADMIN'] },
  { to: '/my-skills',    icon: 'tag',       label: 'My Skills',    roles: ['FREELANCER'] },
  { to: '/escrow',       icon: 'lock',      label: 'Escrow',       roles: ['CLIENT', 'ADMIN'] },
  { to: '/disputes',     icon: 'scale',     label: 'Disputes' },
  { to: '/transactions', icon: 'receipt',   label: 'Transactions' },
  { to: '/profile',      icon: 'user',      label: 'My Profile' },
]

// SVG icon renderer - pure SVG, zero emoji, zero unicode issues
function Icon({ name, className = 'w-4 h-4' }) {
  const icons = {
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    briefcase: <><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    tag: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    scale: <><line x1="12" y1="3" x2="12" y2="21"/><path d="M3 9l4-6 5 6"/><path d="M21 9l-4-6-5 6"/><line x1="3" y1="21" x2="21" y2="21"/></>,
    receipt: <><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></>,
    user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    admin: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name] || icons.grid}
    </svg>
  )
}

const ROLE_COLORS = {
  CLIENT:     'text-blue-400',
  FREELANCER: 'text-brand-400',
  ADMIN:      'text-orange-400',
}

const ROLE_BG = {
  CLIENT:     'bg-blue-500/15',
  FREELANCER: 'bg-brand-500/15',
  ADMIN:      'bg-orange-500/15',
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  const filtered = navItems.filter(n => !n.roles || n.roles.includes(user?.role))

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-ink-900 border-r border-ink-800 flex flex-col fixed inset-y-0 left-0 z-30">

        {/* Logo */}
        <div className="p-5 border-b border-ink-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-ink-950 font-bold text-sm">TW</span>
            </div>
            <div>
              <div className="font-bold text-white leading-none text-sm">TrustWork</div>
              <div className="text-[10px] text-ink-500 mt-0.5">Secure Escrow</div>
            </div>
          </div>
        </div>

        {/* Role badge */}
        <div className="px-4 pt-3 pb-1">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_BG[user?.role] || 'bg-ink-800'} ${ROLE_COLORS[user?.role] || 'text-ink-400'}`}>
            {user?.role === 'ADMIN' && <Icon name="admin" className="w-3 h-3" />}
            {user?.role}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {filtered.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-500/10 text-brand-400 font-medium'
                    : 'text-ink-400 hover:bg-ink-800 hover:text-ink-100'
                }`
              }
            >
              <Icon name={icon} className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User panel */}
        <div className="p-3 border-t border-ink-800 space-y-2">

          {/* Switch user hint */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ink-800/60 cursor-pointer hover:bg-ink-800 transition-colors"
            onClick={() => navigate('/login')}
            title="Switch to a different user"
          >
            <div className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 font-semibold text-xs flex-shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-ink-100 truncate">{user?.name}</div>
              <div className="text-[10px] text-ink-500">Click to switch user</div>
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-rose-400 hover:bg-rose-500/10 transition-all duration-150 border border-transparent hover:border-rose-500/20"
          >
            <Icon name="logout" className="w-4 h-4 flex-shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 min-h-screen">
        <div className="max-w-6xl mx-auto p-6 lg:p-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
