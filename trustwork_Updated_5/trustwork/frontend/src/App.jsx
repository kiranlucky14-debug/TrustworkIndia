import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout           from './components/Layout'
import LoginPage        from './pages/LoginPage'
import RegisterPage     from './pages/RegisterPage'
import Dashboard        from './pages/Dashboard'
import JobListPage      from './pages/JobListPage'
import JobDetailPage    from './pages/JobDetailPage'
import PostJobPage      from './pages/PostJobPage'
import MyJobsPage       from './pages/MyJobsPage'
import EscrowPage       from './pages/EscrowPage'
import DisputesPage     from './pages/DisputesPage'
import TransactionsPage from './pages/TransactionsPage'
import MilestonesPage   from './pages/MilestonesPage'
import MySkillsPage     from './pages/MySkillsPage'
import ProfilePage      from './pages/ProfilePage'
import { PageLoader }   from './components/UI'

// Full users (profileCompleted=true) get dashboard
// Incomplete users (profileCompleted=false) get /register
function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (user.profileCompleted === false) return <Navigate to="/register" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return <Layout>{children}</Layout>
}

// /login is always accessible  even when logged in
// This lets users switch accounts by going back to login
function LoginRoute({ children }) {
  const { loading } = useAuth()
  if (loading) return <PageLoader />
  return children
}

// /register: only for authenticated users who haven't completed profile
function RegisterRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  // If already completed, go to dashboard
  if (user.profileCompleted === true) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth  always accessible */}
          <Route path="/login"    element={<LoginRoute><LoginPage /></LoginRoute>} />
          <Route path="/register" element={<RegisterRoute><RegisterPage /></RegisterRoute>} />

          {/* Protected  needs login + completed profile */}
          <Route path="/dashboard"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/jobs"        element={<ProtectedRoute><JobListPage /></ProtectedRoute>} />
          <Route path="/jobs/:id"    element={<ProtectedRoute><JobDetailPage /></ProtectedRoute>} />
          <Route path="/post-job"    element={<ProtectedRoute roles={['CLIENT','ADMIN']}><PostJobPage /></ProtectedRoute>} />
          <Route path="/my-jobs"     element={<ProtectedRoute><MyJobsPage /></ProtectedRoute>} />
          <Route path="/escrow"      element={<ProtectedRoute roles={['CLIENT','ADMIN']}><EscrowPage /></ProtectedRoute>} />
          <Route path="/disputes"    element={<ProtectedRoute><DisputesPage /></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
          <Route path="/jobs/:jobId/milestones" element={<ProtectedRoute><MilestonesPage /></ProtectedRoute>} />
          <Route path="/my-skills"   element={<ProtectedRoute roles={['FREELANCER']}><MySkillsPage /></ProtectedRoute>} />
          <Route path="/profile"     element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/profile/:id" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
