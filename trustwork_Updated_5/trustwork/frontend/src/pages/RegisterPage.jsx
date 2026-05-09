import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useRegistration, validators } from '../hooks/useRegistration'
import ClientRegistration  from './register/ClientRegistration'
import FreelancerRegistration from './register/FreelancerRegistration'

export default function RegisterPage() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) navigate('/login')
  }, [user, navigate])

  const reg = useRegistration(user?.role)

  const handleComplete = async () => {
    const result = await reg.submit()
    if (result.ok) {
      await refreshUser()
      toast.success('Profile completed! Welcome to TrustWork.')
      navigate('/dashboard')
    }
  }

  if (!user) return null

  return (
    <div style={{ minHeight: '100vh', background: '#07111d', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
      <style>{`
        * { box-sizing: border-box; }
        .reg-input {
          width: 100%; padding: 11px 14px;
          background: rgba(255,255,255,0.05);
          border: 1.5px solid rgba(255,255,255,0.1);
          border-radius: 10px; color: #f1f5f9;
          font-size: 14px; font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
        }
        .reg-input:focus { border-color: #14b8a6; box-shadow: 0 0 0 3px rgba(20,184,166,0.1); }
        .reg-input::placeholder { color: #475569; }
        .reg-input.error { border-color: #f43f5e; }
        .reg-input:disabled { opacity: 0.6; cursor: not-allowed; }
        .reg-select {
          width: 100%; padding: 11px 14px;
          background: rgba(255,255,255,0.05);
          border: 1.5px solid rgba(255,255,255,0.1);
          border-radius: 10px; color: #f1f5f9;
          font-size: 14px; font-family: inherit;
          cursor: pointer; outline: none;
          transition: border-color 0.2s;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 16px;
        }
        .reg-select:focus { border-color: #14b8a6; box-shadow: 0 0 0 3px rgba(20,184,166,0.1); }
        .reg-select option { background: #1e293b; }
        .reg-label { display: block; font-size: 12px; color: #94a3b8; margin-bottom: 6px; font-weight: 500; }
        .reg-label .req { color: #f43f5e; margin-left: 2px; }
        .field-error { font-size: 11px; color: #f43f5e; margin-top: 4px; }
        .section-title { font-size: 13px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.07); }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .form-grid.three { grid-template-columns: 1fr 1fr 1fr; }
        .form-grid.full { grid-template-columns: 1fr; }
        @media (max-width: 640px) { .form-grid, .form-grid.three { grid-template-columns: 1fr; } }
        .step-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 24px; margin-bottom: 16px; }
        .checkbox-row { display: flex; align-items: flex-start; gap: 10px; padding: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; cursor: pointer; transition: border-color 0.2s; }
        .checkbox-row:hover { border-color: rgba(20,184,166,0.3); }
        .checkbox-row.checked { border-color: rgba(20,184,166,0.4); background: rgba(20,184,166,0.05); }
        .btn-primary-reg { background: #14b8a6; color: #07111d; border: none; border-radius: 10px; padding: 12px 24px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit; display: inline-flex; align-items: center; gap: 8px; }
        .btn-primary-reg:hover:not(:disabled) { background: #0d9488; transform: translateY(-1px); }
        .btn-primary-reg:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-secondary-reg { background: transparent; color: #94a3b8; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 12px 24px; font-size: 14px; cursor: pointer; transition: all 0.15s; font-family: inherit; }
        .btn-secondary-reg:hover { border-color: rgba(255,255,255,0.2); color: #f1f5f9; }
        .progress-step { display: flex; align-items: center; gap: 6px; }
        .progress-dot { width: 8px; height: 8px; border-radius: 50%; transition: all 0.3s; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, background: '#14b8a6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#07111d' }}>TW</div>
        <div>
          <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 15 }}>TrustWork</div>
          <div style={{ fontSize: 11, color: '#475569' }}>Complete your profile to get started</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>Logged in as</div>
          <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 100, background: user?.role === 'CLIENT' ? 'rgba(96,165,250,0.15)' : 'rgba(20,184,166,0.15)', color: user?.role === 'CLIENT' ? '#60a5fa' : '#14b8a6', fontWeight: 600 }}>
            {user?.role}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>
        {user?.role === 'CLIENT' ? (
          <ClientRegistration reg={reg} phone={user?.phone} onComplete={handleComplete} />
        ) : (
          <FreelancerRegistration reg={reg} phone={user?.phone} onComplete={handleComplete} />
        )}
      </div>
    </div>
  )
}
