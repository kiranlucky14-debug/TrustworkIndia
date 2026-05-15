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
      console.error('Cannot reach backend API at ' + BASE_URL)
      // Attach a message so catch blocks can show a toast
      error.userMessage = 'Cannot reach the server. Make sure the backend is running.'
    } else if (error.code === 'ECONNABORTED') {
      console.error('Request timed out')
      error.userMessage = 'Request timed out. Please try again.'
    } else if (!error.response) {
      // CORS preflight rejection or other network-level failure
      console.error('Network or CORS error:', error.message)
      error.userMessage = 'Network error. This may be a CORS issue  check the backend is running and CORS is configured.'
    }
    return Promise.reject(error)
  }
)

export default api
