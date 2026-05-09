import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout        from './components/Layout'
import LoginPage     from './pages/LoginPage'
import RegisterPage  from './pages/RegisterPage'
import Dashboard     from './pages/Dashboard'
import JobListPage   from './pages/JobListPage'
import JobDetailPage from './pages/JobDetailPage'
import PostJobPage   from './pages/PostJobPage'
import MyJobsPage    from './pages/MyJobsPage'
import EscrowPage    from './pages/EscrowPage'
import DisputesPage  from './pages/DisputesPage'
import TransactionsPage from './pages/TransactionsPage'
import MilestonesPage   from './pages/MilestonesPage'
import MySkillsPage  from './pages/MySkillsPage'
import ProfilePage   from './pages/ProfilePage'
import { PageLoader } from './components/UI'

// Redirect new users to /register before they can access any protected page
function ProtectedRoute({ children, roles }) {
  const { user, loading, needsRegistration } = useAuth()
  if (loading) return <PageLoader />
  if (!user)             return <Navigate to="/login"    replace />
  if (needsRegistration) return <Navigate to="/register" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return <Layout>{children}</Layout>
}

// Public routes redirect logged-in + complete users to dashboard
// Logged-in but incomplete users should still see /register
function PublicRoute({ children }) {
  const { user, loading, needsRegistration } = useAuth()
  if (loading) return <PageLoader />
  if (user && !needsRegistration) return <Navigate to="/dashboard" replace />
  return children
}

// Register route: only accessible to authenticated but incomplete users
function RegisterRoute({ children }) {
  const { user, loading, needsRegistration } = useAuth()
  if (loading)           return <PageLoader />
  if (!user)             return <Navigate to="/login"    replace />
  if (!needsRegistration) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<RegisterRoute><RegisterPage /></RegisterRoute>} />

          <Route path="/dashboard"  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/jobs"       element={<ProtectedRoute><JobListPage /></ProtectedRoute>} />
          <Route path="/jobs/:id"   element={<ProtectedRoute><JobDetailPage /></ProtectedRoute>} />
          <Route path="/post-job"   element={<ProtectedRoute roles={['CLIENT','ADMIN']}><PostJobPage /></ProtectedRoute>} />
          <Route path="/my-jobs"    element={<ProtectedRoute><MyJobsPage /></ProtectedRoute>} />
          <Route path="/escrow"     element={<ProtectedRoute roles={['CLIENT','ADMIN']}><EscrowPage /></ProtectedRoute>} />
          <Route path="/disputes"   element={<ProtectedRoute><DisputesPage /></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
          <Route path="/jobs/:jobId/milestones" element={<ProtectedRoute><MilestonesPage /></ProtectedRoute>} />
          <Route path="/my-skills"  element={<ProtectedRoute roles={['FREELANCER']}><MySkillsPage /></ProtectedRoute>} />
          <Route path="/profile"    element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/profile/:id" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

          <Route path="/"  element={<Navigate to="/dashboard" replace />} />
          <Route path="*"  element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
