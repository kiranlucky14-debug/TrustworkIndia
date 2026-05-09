import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token  = localStorage.getItem('tw_token')
    const stored = localStorage.getItem('tw_user')
    if (token && stored) {
      try { setUser(JSON.parse(stored)) } catch {}
    }
    setLoading(false)
  }, [])

  const login = (token, userData) => {
    localStorage.setItem('tw_token', token)
    localStorage.setItem('tw_user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('tw_token')
    localStorage.removeItem('tw_user')
    setUser(null)
  }

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/auth/me')
      const updated = { ...user, ...data }
      localStorage.setItem('tw_user', JSON.stringify(updated))
      setUser(updated)
      return updated
    } catch {}
  }

  // profileCompleted check helper
  const needsRegistration = user && user.profileCompleted === false

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, loading, needsRegistration }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
