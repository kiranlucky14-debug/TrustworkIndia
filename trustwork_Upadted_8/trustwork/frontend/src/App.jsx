import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout             from './components/Layout'
import LoginPage          from './pages/LoginPage'
import SignupPage         from './pages/SignupPage'
import RegisterPage       from './pages/RegisterPage'
import AdminLoginPage     from './pages/AdminLoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import Dashboard          from './pages/Dashboard'
import JobListPage        from './pages/JobListPage'
import JobDetailPage      from './pages/JobDetailPage'
import PostJobPage        from './pages/PostJobPage'
import MyJobsPage         from './pages/MyJobsPage'
import EscrowPage         from './pages/EscrowPage'
import DisputesPage       from './pages/DisputesPage'
import TransactionsPage   from './pages/TransactionsPage'
import MilestonesPage     from './pages/MilestonesPage'
import MySkillsPage       from './pages/MySkillsPage'
import ProfilePage        from './pages/ProfilePage'
import { PageLoader }     from './components/UI'

// Logged-in + profileCompleted=true users only
function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (user.profileCompleted === false) return <Navigate to="/register" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return <Layout>{children}</Layout>
}

// Always accessible - login, signup, admin, forgot
function OpenRoute({ children }) {
  const { loading } = useAuth()
  if (loading) return <PageLoader />
  return children
}

// /register: needs auth token but profile not yet completed
function RegisterRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (user.profileCompleted === true) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public auth - always accessible */}
          <Route path="/login"             element={<OpenRoute><LoginPage /></OpenRoute>} />
          <Route path="/forgot-password"   element={<OpenRoute><ForgotPasswordPage /></OpenRoute>} />
          <Route path="/admin/login"       element={<OpenRoute><AdminLoginPage /></OpenRoute>} />

          {/* Signup routes - no auth needed */}
          <Route path="/signup"            element={<OpenRoute><SignupPage /></OpenRoute>} />
          <Route path="/signup/:roleParam" element={<OpenRoute><SignupPage /></OpenRoute>} />

          {/* Legacy /register/client and /register/freelancer redirects */}
          <Route path="/register/client"      element={<Navigate to="/signup/client"     replace />} />
          <Route path="/register/freelancer"  element={<Navigate to="/signup/freelancer" replace />} />

          {/* Post-signup profile completion - needs token, profile incomplete */}
          <Route path="/register" element={<RegisterRoute><RegisterPage /></RegisterRoute>} />

          {/* Protected - needs completed profile */}
          <Route path="/dashboard"             element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/jobs"                  element={<ProtectedRoute><JobListPage /></ProtectedRoute>} />
          <Route path="/jobs/:id"              element={<ProtectedRoute><JobDetailPage /></ProtectedRoute>} />
          <Route path="/post-job"              element={<ProtectedRoute roles={['CLIENT','ADMIN']}><PostJobPage /></ProtectedRoute>} />
          <Route path="/my-jobs"               element={<ProtectedRoute><MyJobsPage /></ProtectedRoute>} />
          <Route path="/escrow"                element={<ProtectedRoute roles={['CLIENT','ADMIN']}><EscrowPage /></ProtectedRoute>} />
          <Route path="/disputes"              element={<ProtectedRoute><DisputesPage /></ProtectedRoute>} />
          <Route path="/transactions"          element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
          <Route path="/jobs/:jobId/milestones" element={<ProtectedRoute><MilestonesPage /></ProtectedRoute>} />
          <Route path="/my-skills"             element={<ProtectedRoute roles={['FREELANCER']}><MySkillsPage /></ProtectedRoute>} />
          <Route path="/profile"               element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/profile/:id"           element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/login"     replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
