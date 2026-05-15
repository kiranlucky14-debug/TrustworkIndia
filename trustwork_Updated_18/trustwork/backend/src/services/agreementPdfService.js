// agreementPdfService.js
// Generates a professional agreement certificate as a styled HTML string.
// The browser renders it and the user prints / saves as PDF.
// Zero external dependencies - pure Node.js string template.

function fmtDate(d) {
  if (!d) return '--'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
}

function fmtCurrency(n) {
  if (!n && n !== 0) return '--'
  return 'Rs. ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function escHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function row(label, value) {
  if (!value) return ''
  return `
    <div class="kv">
      <div class="kv-label">${escHtml(label)}</div>
      <div class="kv-value">${escHtml(String(value))}</div>
    </div>`
}

function sectionHeader(letter, title) {
  return `<div class="section-header"><span class="section-letter">${letter}</span>${escHtml(title)}</div>`
}

function checkItem(label, checked) {
  const icon = checked ? '&#10003;' : '&#10007;'
  const cls  = checked ? 'check-yes' : 'check-no'
  return `<div class="check-row"><span class="check-icon ${cls}">${icon}</span><span>${escHtml(label)}</span></div>`
}

function generateAgreementHtml({ agreement: ag, job, client, freelancer, agreementId }) {
  const deliverables  = Array.isArray(ag.deliverables)    ? ag.deliverables.filter(Boolean)  : []
  const milestones    = Array.isArray(ag.milestonesAgreed) ? ag.milestonesAgreed               : []
  const clientCk      = ag.clientChecklist     || {}
  const freelancerCk  = ag.freelancerChecklist || {}

  const milestonesTotal = milestones.reduce((s, m) => s + Number(m.amount || 0), 0)

  const clientChecklistLabels = [
    ['deliverablesClear',  'Deliverables clearly described in writing'],
    ['budgetFinalised',    'Budget finalised and sufficient for scope'],
    ['deadlineRealistic',  'Deadline is realistic and committed'],
    ['exclusionsClear',    'Exclusions from scope clearly understood'],
    ['revisionsAgreed',    'Revision policy agreed with freelancer'],
    ['contactAvailable',   'Can respond to messages within 24 hours'],
    ['feedbackTimely',     'Committed to providing timely feedback'],
    ['escrowAgreed',       'Read and accepted TrustWork Escrow Agreement'],
  ]

  const freelancerChecklistLabels = [
    ['scopeUnderstood',          'Scope of work fully understood'],
    ['toolsAvailable',           'All tools, licenses, and resources available'],
    ['timelineAchievable',       'Timeline achievable given current workload'],
    ['ambiguitiesCleared',       'All ambiguities clarified with client'],
    ['milestoneAgreed',          'Milestone structure and payment amounts agreed'],
    ['revisionPolicyUnderstood', 'Revision policy and its limits understood'],
    ['qualityAchievable',        'Can deliver to the agreed quality standard'],
    ['escrowAgreed',             'Read and accepted TrustWork Escrow Agreement'],
  ]

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>TrustWork Work Agreement - ${escHtml(job.title)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono&display=swap');
  @page { size: A4; margin: 16mm 14mm; }
  @media print {
    .no-print { display: none !important; }
    body { background: white !important; }
    .page-break { page-break-before: always; }
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'DM Sans', system-ui, sans-serif;
    font-size: 12px; line-height: 1.6;
    color: #1e293b; background: #f8fafc;
  }
  .page {
    max-width: 794px; margin: 0 auto;
    background: white;
    padding: 40px 44px;
    box-shadow: 0 0 0 1px #e2e8f0;
  }

  /* Header */
  .doc-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding-bottom: 20px; margin-bottom: 24px;
    border-bottom: 2px solid #0f766e;
  }
  .logo-block { display: flex; align-items: center; gap: 10px; }
  .logo-box {
    width: 36px; height: 36px; background: #14b8a6; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    color: white; font-weight: 800; font-size: 12px; letter-spacing: -.5px;
  }
  .logo-text { font-weight: 800; font-size: 18px; color: #0f172a; letter-spacing: -.5px; }
  .logo-sub  { font-size: 10px; color: #64748b; letter-spacing: .08em; }
  .doc-meta { text-align: right; }
  .doc-meta-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
  .doc-meta-id { font-size: 10px; color: #64748b; font-family: 'DM Mono', monospace; }
  .doc-meta-date { font-size: 11px; color: #64748b; margin-top: 2px; }

  /* Status badge */
  .status-badge {
    display: inline-block; padding: 3px 12px; border-radius: 100px;
    font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
    background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;
    margin-bottom: 20px;
  }

  /* Job summary bar */
  .job-bar {
    background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;
    padding: 14px 16px; margin-bottom: 24px;
    display: flex; justify-content: space-between; align-items: flex-start; gap: 20px;
    flex-wrap: wrap;
  }
  .job-bar-title { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 3px; }
  .job-bar-sub   { font-size: 11px; color: #64748b; }
  .job-bar-amount { font-size: 20px; font-weight: 800; color: #0f766e; }
  .job-bar-amount-label { font-size: 10px; color: #64748b; text-align: right; }

  /* Parties */
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
  .party-card {
    border: 1px solid #e2e8f0; border-radius: 9px; padding: 12px 14px;
  }
  .party-role  { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #64748b; margin-bottom: 5px; }
  .party-name  { font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
  .party-meta  { font-size: 11px; color: #64748b; }

  /* Sections */
  .section { margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
  .section-header {
    display: flex; align-items: center; gap: 10px;
    background: #f8fafc; padding: 10px 14px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 12px; font-weight: 700; color: #0f172a;
  }
  .section-letter {
    width: 22px; height: 22px; border-radius: 6px;
    background: #0f766e; color: white;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 800; flex-shrink: 0;
  }
  .section-body { padding: 14px; }

  /* Key-value */
  .kv { margin-bottom: 9px; }
  .kv-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 2px; font-weight: 600; }
  .kv-value { font-size: 12px; color: #1e293b; line-height: 1.5; }
  .kv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; }

  /* Deliverables */
  .deliverable { display: flex; gap: 8px; font-size: 12px; color: #334155; margin-bottom: 4px; }
  .deliverable-dot { color: #0f766e; font-weight: 700; flex-shrink: 0; }

  /* Milestones */
  .milestone-row {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding: 8px 0; border-bottom: 1px solid #f1f5f9; gap: 16px;
  }
  .milestone-row:last-child { border-bottom: none; }
  .milestone-title { font-size: 12px; font-weight: 600; color: #1e293b; }
  .milestone-detail { font-size: 11px; color: #64748b; margin-top: 1px; }
  .milestone-amount { font-size: 13px; font-weight: 700; color: #0f766e; flex-shrink: 0; }
  .milestone-total {
    display: flex; justify-content: space-between;
    padding-top: 8px; margin-top: 4px;
    border-top: 1.5px solid #0f766e;
    font-size: 12px; font-weight: 700; color: #0f766e;
  }

  /* Checklist */
  .check-row { display: flex; gap: 8px; font-size: 11px; color: #334155; margin-bottom: 5px; align-items: flex-start; }
  .check-icon { font-size: 11px; flex-shrink: 0; margin-top: 1px; }
  .check-yes { color: #16a34a; }
  .check-no  { color: #dc2626; }
  .checklist-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 20px; }
  .checklist-col-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; margin-bottom: 8px; }
  .client-col     { color: #1d4ed8; }
  .freelancer-col { color: #0f766e; }

  /* Signatures */
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .sig-block { border: 1px solid #e2e8f0; border-radius: 9px; padding: 12px; }
  .sig-role  { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #64748b; margin-bottom: 6px; }
  .sig-name  { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 3px; }
  .sig-stamp { font-size: 10px; color: #64748b; font-family: 'DM Mono', monospace; }
  .sig-line  { height: 1px; background: #e2e8f0; margin: 8px 0; }
  .sig-accepted { font-size: 11px; color: #16a34a; font-weight: 600; }

  /* Phase 2 confirmation */
  .phase2-block { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 9px; padding: 12px 14px; margin-bottom: 10px; }
  .phase2-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #15803d; margin-bottom: 5px; }
  .phase2-meta  { font-size: 11px; color: #1e293b; }
  .phase2-note  { font-size: 11px; color: #334155; font-style: italic; margin-top: 4px; }

  /* Footer */
  .doc-footer {
    margin-top: 28px; padding-top: 16px;
    border-top: 1px solid #e2e8f0;
    font-size: 10px; color: #94a3b8;
    display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;
  }
  .footer-trust { color: #0f766e; font-weight: 600; }

  /* Print button (screen only) */
  .print-bar {
    position: fixed; top: 0; left: 0; right: 0;
    background: #0f172a; padding: 12px 24px;
    display: flex; justify-content: space-between; align-items: center;
    z-index: 100; box-shadow: 0 2px 12px rgba(0,0,0,.4);
  }
  .print-bar-title { font-size: 14px; font-weight: 600; color: #f8fafc; }
  .print-btn {
    padding: 8px 20px; background: #14b8a6; border: none; border-radius: 8px;
    color: #0f172a; font-size: 13px; font-weight: 700; cursor: pointer;
    font-family: inherit; display: flex; align-items: center; gap: 7px;
  }
  .print-hint { font-size: 11px; color: #64748b; margin-top: 2px; }
  body.has-print-bar .page { margin-top: 60px; }
</style>
</head>
<body class="has-print-bar">

<!-- Print bar (hidden when printing) -->
<div class="print-bar no-print">
  <div>
    <div class="print-bar-title">TrustWork Work Agreement</div>
    <div class="print-hint">Use your browser's Print dialog to save as PDF &mdash; set paper to A4, no margins</div>
  </div>
  <button class="print-btn" onclick="window.print()">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
    Save as PDF
  </button>
</div>

<div class="page">

  <!-- Document header -->
  <div class="doc-header">
    <div class="logo-block">
      <div class="logo-box">TW</div>
      <div>
        <div class="logo-text">TrustWork</div>
        <div class="logo-sub">SECURE ESCROW PLATFORM</div>
      </div>
    </div>
    <div class="doc-meta">
      <div class="doc-meta-title">Work Agreement Certificate</div>
      <div class="doc-meta-id">ID: ${escHtml(agreementId)}</div>
      <div class="doc-meta-date">Generated: ${fmtDate(new Date())}</div>
    </div>
  </div>

  <div class="status-badge">Fully Signed &amp; Active</div>

  <!-- Job summary -->
  <div class="job-bar">
    <div>
      <div class="job-bar-title">${escHtml(job.title)}</div>
      <div class="job-bar-sub">Job ID: ${escHtml(job.id)}</div>
    </div>
    <div style="text-align:right">
      <div class="job-bar-amount">${fmtCurrency(job.budget)}</div>
      <div class="job-bar-amount-label">Project Budget</div>
    </div>
  </div>

  <!-- Parties -->
  <div class="parties">
    <div class="party-card">
      <div class="party-role">Client</div>
      <div class="party-name">${escHtml(client.name)}</div>
      <div class="party-meta">${client.companyName ? escHtml(client.companyName) + ' &middot; ' : ''}${client.designation ? escHtml(client.designation) : ''}</div>
      ${client.city ? `<div class="party-meta">${escHtml(client.city)}${client.state ? ', ' + escHtml(client.state) : ''}</div>` : ''}
    </div>
    <div class="party-card">
      <div class="party-role">Freelancer</div>
      <div class="party-name">${escHtml(freelancer.name)}</div>
      <div class="party-meta">${freelancer.title ? escHtml(freelancer.title) : ''}</div>
      ${freelancer.city ? `<div class="party-meta">${escHtml(freelancer.city)}${freelancer.state ? ', ' + escHtml(freelancer.state) : ''}</div>` : ''}
    </div>
  </div>

  <!-- Section A: Work Agreement -->
  <div class="section">
    ${sectionHeader('A', 'Work Agreement')}
    <div class="section-body">
      ${ag.scope ? `<div class="kv"><div class="kv-label">Scope of Work</div><div class="kv-value">${escHtml(ag.scope)}</div></div>` : ''}

      ${deliverables.length > 0 ? `
      <div class="kv">
        <div class="kv-label">Deliverables (${deliverables.length})</div>
        ${deliverables.map(d => `<div class="deliverable"><span class="deliverable-dot">+</span><span>${escHtml(d)}</span></div>`).join('')}
      </div>` : ''}

      <div class="kv-grid">
        ${row('Start Date', fmtDate(ag.startDate))}
        ${row('End Date', fmtDate(ag.endDate))}
        ${row('Revision Rounds', ag.revisionRounds + ' rounds')}
        ${row('Revision Policy', ag.revisionPolicy)}
        ${row('Payment Terms', ag.paymentTerms)}
        ${ag.specialConditions ? row('Special Conditions', ag.specialConditions) : ''}
      </div>
    </div>
  </div>

  <!-- Section B: Milestone Agreement -->
  ${milestones.length > 0 ? `
  <div class="section">
    ${sectionHeader('B', 'Milestone Agreement')}
    <div class="section-body">
      ${milestones.map((m, i) => `
      <div class="milestone-row">
        <div>
          <div class="milestone-title">${i + 1}. ${escHtml(m.title || 'Untitled')}</div>
          ${m.deliverable ? `<div class="milestone-detail">${escHtml(m.deliverable)}</div>` : ''}
          ${m.dueDate ? `<div class="milestone-detail">Due: ${escHtml(m.dueDate)}</div>` : ''}
        </div>
        <div class="milestone-amount">${fmtCurrency(m.amount)}</div>
      </div>`).join('')}
      <div class="milestone-total">
        <span>Total</span>
        <span>${fmtCurrency(milestonesTotal)}</span>
      </div>
    </div>
  </div>` : ''}

  <!-- Section C: Escrow Release Terms -->
  <div class="section">
    ${sectionHeader('C', 'Escrow Release Agreement')}
    <div class="section-body">
      <div class="check-row">
        <span class="check-icon check-yes">&#10003;</span>
        <span>Freelancer accepted: funds held in TrustWork escrow are released upon client approval of submitted work.</span>
      </div>
      <div class="check-row">
        <span class="check-icon check-yes">&#10003;</span>
        <span>Both parties acknowledged that disputes will be resolved using this Work Agreement as the reference document.</span>
      </div>
    </div>
  </div>

  <!-- Section D: Dispute Prevention Checklists -->
  <div class="section">
    ${sectionHeader('D', 'Dispute Prevention Checklist')}
    <div class="section-body">
      <div class="checklist-grid">
        <div>
          <div class="checklist-col-title client-col">Client Confirmation</div>
          ${clientChecklistLabels.map(([k, l]) => checkItem(l, clientCk[k] === true)).join('')}
        </div>
        <div>
          <div class="checklist-col-title freelancer-col">Freelancer Confirmation</div>
          ${freelancerChecklistLabels.map(([k, l]) => checkItem(l, freelancerCk[k] === true)).join('')}
        </div>
      </div>
    </div>
  </div>

  <!-- Phase 2: Submission & Release Confirmations -->
  ${ag.freelancerSubmitConfirmedAt ? `
  <div class="section">
    ${sectionHeader('E', 'Submission &amp; Release Confirmations')}
    <div class="section-body">
      <div class="phase2-block">
        <div class="phase2-title">Freelancer Work Submission</div>
        <div class="phase2-meta">Submitted on: ${fmtDate(ag.freelancerSubmitConfirmedAt)} &middot; Escrow terms re-confirmed</div>
        ${ag.submissionNote ? `<div class="phase2-note">Submission note: "${escHtml(ag.submissionNote)}"</div>` : ''}
      </div>
      ${ag.clientReleaseConfirmedAt ? `
      <div class="phase2-block">
        <div class="phase2-title">Client Payment Release</div>
        <div class="phase2-meta">Released on: ${fmtDate(ag.clientReleaseConfirmedAt)} &middot; Work approved</div>
        ${ag.releaseNote ? `<div class="phase2-note">Client feedback: "${escHtml(ag.releaseNote)}"</div>` : ''}
      </div>` : ''}
    </div>
  </div>` : ''}

  <!-- Signatures -->
  <div class="section">
    ${sectionHeader('F', 'Electronic Signatures')}
    <div class="section-body">
      <div class="sig-grid">
        <div class="sig-block">
          <div class="sig-role">Client</div>
          <div class="sig-name">${escHtml(client.name)}</div>
          <div class="sig-line"></div>
          <div class="sig-accepted">&#10003; Signed Agreement</div>
          <div class="sig-stamp" style="margin-top:4px">Signed: ${fmtDate(ag.clientSignedAt)}</div>
          <div class="sig-stamp">User ID: ${escHtml(ag.clientSignedById || '--')}</div>
        </div>
        <div class="sig-block">
          <div class="sig-role">Freelancer</div>
          <div class="sig-name">${escHtml(freelancer.name)}</div>
          <div class="sig-line"></div>
          <div class="sig-accepted">&#10003; Signed Agreement</div>
          <div class="sig-stamp" style="margin-top:4px">Signed: ${fmtDate(ag.freelancerSignedAt)}</div>
          <div class="sig-stamp">User ID: ${escHtml(ag.freelancerSignedById || '--')}</div>
        </div>
      </div>
      <div style="margin-top:10px; font-size:10px; color:#94a3b8; text-align:center;">
        Agreement became active on ${fmtDate(ag.agreedAt)}. 
        Both parties electronically signed via TrustWork platform.
        User IDs and timestamps serve as legally binding electronic signatures.
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="doc-footer">
    <div>
      <span class="footer-trust">TrustWork</span> &mdash; Secure Escrow Platform &mdash; trustwork.in<br/>
      This document is an electronically generated agreement certificate.
    </div>
    <div style="text-align:right">
      Agreement ID: <span style="font-family:'DM Mono',monospace">${escHtml(agreementId)}</span><br/>
      Generated: ${fmtDate(new Date())}
    </div>
  </div>

</div>
</body>
</html>`
}

module.exports = { generateAgreementHtml }
