import { useState, useCallback } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'

// Validation helpers
export const validators = {
  required:  (v) => !v?.toString().trim() ? 'This field is required' : null,
  email:     (v) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Enter a valid email' : null,
  pan:       (v) => !v || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.toUpperCase()) ? null : 'PAN format: ABCDE1234F',
  gst:       (v) => !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v.toUpperCase()) ? null : 'GST format: 22AAAAA0000A1Z5',
  ifsc:      (v) => !v || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.toUpperCase()) ? null : 'IFSC format: HDFC0001234',
  pincode:   (v) => !v || /^[1-9][0-9]{5}$/.test(v) ? null : 'Enter a valid 6-digit pincode',
  minLen:    (n) => (v) => !v || v.trim().length >= n ? null : `Minimum ${n} characters`,
}

export function useRegistration(role) {
  const [data,    setData]    = useState({})
  const [errors,  setErrors]  = useState({})
  const [saving,  setSaving]  = useState(false)
  const [step,    setStep]    = useState(0)

  const set = useCallback((field, value) => {
    setData(d => ({ ...d, [field]: value }))
    setErrors(e => ({ ...e, [field]: null }))
  }, [])

  const setMany = useCallback((obj) => {
    setData(d => ({ ...d, ...obj }))
  }, [])

  const validate = useCallback((rules) => {
    const errs = {}
    for (const [field, fns] of Object.entries(rules)) {
      for (const fn of (Array.isArray(fns) ? fns : [fns])) {
        const msg = fn(data[field])
        if (msg) { errs[field] = msg; break }
      }
    }
    setErrors(prev => ({ ...prev, ...errs }))
    return Object.keys(errs).length === 0
  }, [data])

  const submit = useCallback(async () => {
    setSaving(true)
    try {
      const { data: result } = await api.post('/auth/register', data)
      // Update stored user
      const stored = JSON.parse(localStorage.getItem('tw_user') || '{}')
      const updated = { ...stored, ...result.user }
      localStorage.setItem('tw_user', JSON.stringify(updated))
      return { ok: true, user: result.user }
    } catch (err) {
      const msg = err?.response?.data?.error || 'Registration failed'
      const backendErrors = err?.response?.data?.errors || {}
      if (Object.keys(backendErrors).length > 0) setErrors(backendErrors)
      else toast.error(msg)
      return { ok: false }
    } finally {
      setSaving(false)
    }
  }, [data])

  return { data, errors, saving, step, setStep, set, setMany, validate, submit }
}
