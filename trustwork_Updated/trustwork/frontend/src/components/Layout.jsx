import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/dashboard', icon: '', label: 'Dashboard' },
  { to: '/jobs', icon: '', label: 'Browse Jobs', roles: ['FREELANCER', 'ADMIN'] },
  { to: '/my-jobs', icon: '', label: 'My Jobs' },
  { to: '/my-skills', icon: '', label: 'My Skills', roles: ['FREELANCER'] },
  { to: '/milestones', icon: '', label: 'Milestones', hidden: true },
  { to: '/post-job', icon: '', label: 'Post Job', roles: ['CLIENT', 'ADMIN'] },
  { to: '/escrow', icon: '', label: 'Escrow', roles: ['CLIENT', 'ADMIN'] },
  { to: '/disputes', icon: '', label: 'Disputes' },
  { to: '/transactions', icon: '', label: 'Transactions' },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Logged out')
    navigate('/login')
  }

  const filtered = navItems.filter(n => !n.hidden && (!n.roles || n.roles.includes(user?.role)))

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-ink-900 border-r border-ink-800 flex flex-col fixed inset-y-0 left-0 z-30">
        {/* Logo */}
        <div className="p-5 border-b border-ink-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <span className="text-ink-950 font-display font-bold text-sm">TW</span>
            </div>
            <div>
              <div className="font-display font-bold text-white leading-none">TrustWork</div>
              <div className="text-[10px] text-ink-500 mt-0.5">Secure Escrow</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {filtered.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150
                 ${isActive
                   ? 'bg-brand-500/10 text-brand-400 font-medium'
                   : 'text-ink-400 hover:bg-ink-800 hover:text-ink-100'}`
              }
            >
              <span className="w-5 text-center">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-ink-800">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-ink-800">
            <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 font-semibold text-sm flex-shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink-100 truncate">{user?.name}</div>
              <div className="text-xs text-ink-500">{user?.role}</div>
            </div>
            <button onClick={handleLogout} title="Logout" className="text-ink-500 hover:text-rose-400 transition-colors text-sm">
              
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-64 min-h-screen">
        <div className="max-w-6xl mx-auto p-6 lg:p-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
