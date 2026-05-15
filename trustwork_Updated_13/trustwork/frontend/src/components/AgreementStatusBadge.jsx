// AgreementStatusBadge  shows current agreement status inline on job cards / detail

export const AGREEMENT_STATUS_CFG = {
  NOT_CREATED:       { label: 'Agreement Pending',     color: '#fb923c', bg: 'rgba(251,146,60,.12)',  border: 'rgba(251,146,60,.28)'  },
  DRAFT:             { label: 'Agreement Draft',        color: '#fbbf24', bg: 'rgba(251,191,36,.12)',  border: 'rgba(251,191,36,.28)'  },
  CHANGES_REQUESTED: { label: 'Changes Requested',      color: '#f43f5e', bg: 'rgba(244,63,94,.12)',   border: 'rgba(244,63,94,.28)'   },
  CLIENT_SIGNED:     { label: 'Awaiting Your Signature',color: '#818cf8', bg: 'rgba(129,140,248,.12)', border: 'rgba(129,140,248,.28)' },
  ACTIVE:            { label: 'Agreement Active',       color: '#34d399', bg: 'rgba(52,211,153,.12)',  border: 'rgba(52,211,153,.28)'  },
}

export default function AgreementStatusBadge({ status, className }) {
  const cfg = AGREEMENT_STATUS_CFG[status] || AGREEMENT_STATUS_CFG.NOT_CREATED
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600,
      background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
    }} className={className}>
      <svg width="7" height="7" viewBox="0 0 8 8">
        <circle cx="4" cy="4" r="4" fill={cfg.color}/>
      </svg>
      {cfg.label}
    </span>
  )
}
