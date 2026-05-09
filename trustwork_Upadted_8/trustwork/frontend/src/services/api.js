import axios from 'axios'

// Base URL: reads from .env (VITE_API_URL) or falls back to localhost:5000
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

//  Request interceptor  attach JWT token 
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('tw_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

//  Response interceptor  handle auth errors + network errors 
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with a non-2xx status
      if (error.response.status === 401) {
        // Token expired or invalid  clear session and redirect to login
        localStorage.removeItem('tw_token')
        localStorage.removeItem('tw_user')
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
    } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
      // Backend is not reachable
      console.error(
        ' Cannot reach backend API.\n' +
        `   Expected at: ${BASE_URL}\n` +
        '   Make sure the backend is running: cd backend && npm run dev'
      )
    } else if (error.code === 'ECONNABORTED') {
      console.error(' Request timed out  backend may be slow or unresponsive')
    }
    return Promise.reject(error)
  }
)

export default api
