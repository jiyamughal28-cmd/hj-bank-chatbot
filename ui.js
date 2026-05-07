// ════════════════════════════════════════════════════
// HJ BANK CHATBOT v11 — js/ui.js
// All DOM/render functions, card builders, SYNONYMS
// ════════════════════════════════════════════════════

// ── SYNONYMS (Urdu / Roman Urdu expansion) ───────────
const SYNONYMS = {
  'acc': 'account', 'txn': 'transaction', 'trx': 'transaction', 'xfer': 'transfer', 'bal': 'balance',
  'pymnt': 'payment', 'pmnt': 'payment', 'fd': 'fixed deposit', 'otp': 'otp', 'pls': 'please', 'plz': 'please',
  'paise': 'money', 'paisa': 'money', 'raqam': 'money', 'qarz': 'loan', 'bijli': 'electricity',
  'munafa': 'profit', 'bakaya': 'balance', 'kya': 'what', 'kab': 'when', 'kyun': 'why', 'mera': 'my',
  'meri': 'my', 'hai': 'is', 'hoga': 'will', 'bheja': 'sent', 'nikalna': 'withdraw', 'nikal': 'withdraw',
  'bhejo': 'send', 'ko': 'to', 'kitnay': 'how much', 'kitne': 'how much', 'mujhe': 'me', 'batao': 'tell me',
  'apna': 'my', 'hain': 'are', 'chahiye': 'need', 'karo': 'do', 'dena': 'give', 'le': 'take'
};

function expandSynonyms(text) {
  return text.split(/\s+/).map(w => SYNONYMS[w.toLowerCase()] || w).join(' ');
}

// ── TEXT SANITISER (strip dangerous HTML before inject) ──
function sanitiseAiText(raw) {
  if (typeof raw !== 'string') return '';
  // Allow safe formatting tags only; strip everything else
  const allowed = new Set(['strong', 'em', 'br', 'b', 'i', 'span', 'div', 'ul', 'ol', 'li', 'p']);
  return raw
    .replace(/<(\/?)(\w+)([^>]*)>/g, (match, slash, tag, attrs) => {
      if (!allowed.has(tag.toLowerCase())) return ''; // strip unknown tags
      // Strip event handlers and javascript: from allowed tags
      const cleanAttrs = attrs.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
                               .replace(/javascript:/gi, '');
      return `<${slash}${tag}${cleanAttrs}>`;
    });
}

// ── UTILITY HELPERS ───────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
const esc = escapeHtml;

function getTime() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatResponse(text) {
  return sanitiseAiText(
    text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>')
  );
}

// ── FEEDBACK BUTTONS ──────────────────────────────────
function buildFeedbackButtons(msgEl) {
  const wrap = document.createElement('div');
  wrap.className = 'feedback-row';
  wrap.setAttribute('aria-label', 'Rate this response');

  const thumbUp = document.createElement('button');
  thumbUp.className = 'feedback-btn';
  thumbUp.setAttribute('aria-label', 'Thumbs up — helpful');
  thumbUp.innerHTML = '👍';
  thumbUp.onclick = () => {
    wrap.querySelectorAll('.feedback-btn').forEach(b => b.classList.remove('active', 'inactive'));
    thumbUp.classList.add('active');
    thumbDown.classList.add('inactive');
  };

  const thumbDown = document.createElement('button');
  thumbDown.className = 'feedback-btn';
  thumbDown.setAttribute('aria-label', 'Thumbs down — not helpful');
  thumbDown.innerHTML = '👎';
  thumbDown.onclick = () => {
    wrap.querySelectorAll('.feedback-btn').forEach(b => b.classList.remove('active', 'inactive'));
    thumbDown.classList.add('active');
    thumbUp.classList.add('inactive');
  };

  wrap.appendChild(thumbUp);
  wrap.appendChild(thumbDown);
  return wrap;
}

// ── APPEND MESSAGE ─────────────────────────────────────
function appendMessage(role, text, time, chips = []) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `msg ${role}`;

  const av = document.createElement('div');
  av.className = 'msg-avatar';
  av.textContent = role === 'bot' ? 'A' : '👤';

  const inner = document.createElement('div');
  const bubble = document.createElement('div');
  bubble.className = `bubble ${role === 'bot' ? 'bubble-bot' : 'bubble-user'}`;
  bubble.innerHTML = role === 'bot' ? sanitiseAiText(text) : escapeHtml(text);

  if (chips.length) {
    const chipsDiv = document.createElement('div');
    chipsDiv.className = 'quick-chips';
    chips.forEach(c => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = c;
      chip.onclick = () => sendQuick(c);
      chipsDiv.appendChild(chip);
    });
    bubble.appendChild(chipsDiv);
  }

  const timeEl = document.createElement('div');
  timeEl.className = 'msg-time';
  timeEl.textContent = time;

  inner.appendChild(bubble);
  if (role === 'bot') inner.appendChild(buildFeedbackButtons(div));
  inner.appendChild(timeEl);

  div.appendChild(av);
  div.appendChild(inner);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

// ── TYPING INDICATOR ──────────────────────────────────
function showTyping() {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'msg bot'; div.id = 'typingIndicator';
  div.innerHTML = `<div class="msg-avatar">A</div><div class="bubble bubble-bot"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

// ── TOAST ─────────────────────────────────────────────
function showToast(msg, type = 'error') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background    = type === 'warn' ? '#1a1a0a' : '#2a1515';
  t.style.borderColor   = type === 'warn' ? 'var(--gold)' : 'var(--red)';
  t.style.color         = type === 'warn' ? 'var(--gold)' : 'var(--red)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 4000);
}

// ── SEND BUTTON UI STATE ──────────────────────────────
function setLoadingUI(loading) {
  const btn   = document.getElementById('sendBtn');
  const input = document.getElementById('userInput');
  btn.disabled   = loading;
  input.disabled = loading;
  if (loading) {
    document.getElementById('sendIcon').outerHTML = `<div class="spinner" id="sendIcon"></div>`;
  } else {
    const s = document.getElementById('sendIcon');
    if (s) s.outerHTML = `<span id="sendIcon">${SVG_SEND}</span>`;
    input.focus();
  }
}

// SVG send icon
const SVG_SEND = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;

// ── RENDER STRUCTURED RESPONSE ─────────────────────────
function renderStructuredResponse(replyText, data) {
  const container = document.getElementById('chatMessages');
  const final     = document.createElement('div');
  final.className = 'msg bot';

  const av = document.createElement('div');
  av.className  = 'msg-avatar';
  av.textContent = 'A';

  const innerWrap = document.createElement('div');
  const bubble    = document.createElement('div');
  bubble.className = 'bubble bubble-bot';
  // sanitise before injecting
  bubble.innerHTML = `<div>${sanitiseAiText(replyText)}</div>`;

  const dtype = data?.type;
  if      (dtype === 'cheque_card'      && data)                       bubble.appendChild(buildChequeCard(data));
  else if (dtype === 'txn_table'        && data?.transactions?.length) bubble.appendChild(buildTxnTable(data.transactions));
  else if (dtype === 'balance_card'     && data?.balance !== undefined) bubble.appendChild(buildBalanceCard(data));
  else if (dtype === 'emi_card'         && data)                       bubble.appendChild(buildEMICard(data));
  else if (dtype === 'transfer_confirm' && data)                       bubble.appendChild(buildTransferCard(data));
  else if (dtype === 'spending_analysis'&& data)                       bubble.appendChild(buildSpendingCard(data));
  else if (dtype === 'card_service'     && data)                       bubble.appendChild(buildCardServiceCard(data));
  else if (dtype === 'security_alert'   && data)                       bubble.appendChild(buildSecurityAlertCard(data));
  else if (dtype === 'flow_steps'       && data)                       bubble.insertBefore(buildFlowSteps(data), bubble.firstChild);

  const timeEl = document.createElement('div');
  timeEl.className  = 'msg-time';
  timeEl.textContent = getTime();

  innerWrap.appendChild(bubble);
  innerWrap.appendChild(buildFeedbackButtons(final));
  innerWrap.appendChild(timeEl);
  final.appendChild(av);
  final.appendChild(innerWrap);
  container.appendChild(final);
  container.scrollTop = container.scrollHeight;
}

// ── CARD BUILDERS ──────────────────────────────────────

function buildFlowSteps(d) {
  const div = document.createElement('div');
  div.className = 'flow-steps';
  div.style.marginBottom = '10px';
  for (let i = 0; i < d.steps; i++) {
    const s = document.createElement('div');
    s.className = 'flow-step' + (i < d.done ? ' done' : i === d.active ? ' active' : '');
    div.appendChild(s);
  }
  return div;
}

function buildEMICard(d) {
  const div = document.createElement('div');
  div.className = 'emi-card';
  div.innerHTML = `
    <div class="emi-title">📊 EMI Breakdown</div>
    <div class="emi-grid">
      <div class="emi-field"><div class="ef-label">Principal</div><div class="ef-val">Rs. ${Number(d.principal).toLocaleString('en-IN')}</div></div>
      <div class="emi-field"><div class="ef-label">Rate p.a.</div><div class="ef-val">${d.rate}%</div></div>
      <div class="emi-field"><div class="ef-label">Tenure</div><div class="ef-val">${d.months} months</div></div>
      <div class="emi-field"><div class="ef-label">Total Interest</div><div class="ef-val" style="color:var(--red)">Rs. ${Number(d.interest).toLocaleString('en-IN')}</div></div>
    </div>
    <div class="emi-monthly">
      <div class="em-label">Monthly EMI</div>
      <div class="em-amount">Rs. ${Number(d.emi).toLocaleString('en-IN')}</div>
    </div>
    <div style="font-size:11px;color:var(--muted);margin-top:8px">Total repayable: Rs. ${Number(d.total).toLocaleString('en-IN')}</div>`;
  return div;
}

function buildTransferCard(d) {
  const div = document.createElement('div');
  div.className = 'transfer-card';
  const rows = [
    ['To',     d.to],
    ['Bank',   d.bank || '—'],
    ['Amount', `Rs. ${Number(d.amount).toLocaleString('en-IN')}`],
    ['Method', d.method || 'IBFT'],
    ['Fee',    d.fee ? `Rs. ${Number(d.fee).toLocaleString('en-IN')}` : 'Free']
  ];
  div.innerHTML = `
    <div class="tc-title">↗️ Transfer Confirmation</div>
    ${rows.map(([l, v]) => `<div class="tc-row"><span class="tc-label">${l}</span><span class="tc-val">${esc(String(v))}</span></div>`).join('')}
    <div class="tc-actions">
      <button class="tc-btn tc-btn-confirm" aria-label="Confirm transfer" onclick="sendQuick('confirm')">✅ Confirm Transfer</button>
      <button class="tc-btn tc-btn-cancel"  aria-label="Cancel transfer"  onclick="sendQuick('cancel')">❌ Cancel</button>
    </div>`;
  return div;
}

function buildSpendingCard(d) {
  const div = document.createElement('div');
  div.className = 'spend-card';
  const colors = ['#0ea5e9', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#C9A84C', '#6B7280'];
  let bars = '';
  let i = 0;
  for (const [cat, amt] of Object.entries(d.cats)) {
    if (!amt) continue;
    const pct = Math.round((amt / d.totalSpent) * 100);
    bars += `<div class="spend-bar-wrap">
      <div class="spend-bar-label"><span>${esc(cat)}</span><span>Rs. ${amt.toLocaleString('en-IN')} (${pct}%)</span></div>
      <div class="spend-bar-track"><div class="spend-bar-fill" style="width:${pct}%;background:${colors[i % colors.length]}"></div></div>
    </div>`;
    i++;
  }
  const netColor = d.netFlow >= 0 ? 'var(--green)' : 'var(--red)';
  div.innerHTML = `
    <div style="font-size:11px;font-weight:600;color:var(--accent);letter-spacing:.06em;text-transform:uppercase;margin-bottom:10px">📊 Spending Breakdown</div>
    ${bars}
    <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border);display:flex;justify-content:space-between;font-size:12px">
      <span style="color:var(--muted)">Net this period</span>
      <span style="font-family:var(--mono);color:${netColor}">Rs. ${Math.abs(d.netFlow).toLocaleString('en-IN')} ${d.netFlow >= 0 ? 'surplus' : 'deficit'}</span>
    </div>`;
  return div;
}

function buildCardServiceCard(d) {
  const div = document.createElement('div');
  div.className = 'card-service-card';
  const statusClass = d.card_status === 'active' ? 'csr-active' : 'csr-blocked';
  div.innerHTML = `
    <div class="csc-title">💳 Card Status</div>
    <div class="card-status-row"><span class="csr-label">Debit Card •••• 4829</span><span class="csr-badge ${statusClass}">${esc((d.card_status || 'ACTIVE').toUpperCase())}</span></div>
    <div class="card-status-row"><span class="csr-label">ATM Daily Limit</span><span class="csr-badge csr-active">Rs. ${Number(d.atm_limit || 50000).toLocaleString('en-IN')}</span></div>
    <div class="card-status-row"><span class="csr-label">POS / Shopping Limit</span><span class="csr-badge csr-active">Rs. ${Number(d.pos_limit || 200000).toLocaleString('en-IN')}</span></div>
    <div class="card-status-row"><span class="csr-label">International Transactions</span><span class="csr-badge ${d.international ? 'csr-active' : 'csr-disabled'}">${d.international ? 'ENABLED' : 'DISABLED'}</span></div>`;
  return div;
}

function buildSecurityAlertCard(d) {
  const div = document.createElement('div');
  div.className = 'security-card';
  div.innerHTML = `
    <div class="sc-header"><span class="sc-icon">🚨</span><span class="sc-title">Security Alert</span></div>
    <div style="font-size:12.5px;color:var(--text-dim)">${esc(d.reason || 'Suspicious activity detected')}</div>
    <div style="margin-top:10px;font-size:12px;color:var(--red)">📞 Fraud Helpline: <strong>0800-00426</strong> (24/7)</div>`;
  return div;
}

function buildChequeCard(d) {
  const status      = d.status || 'written';
  const statusClass = `status-${status}`;
  const statusLabel = status.replace('_', ' ').toUpperCase();
  const canW        = d.can_withdraw || dbCanWithdraw(d);
  const withdrawDate = d.can_withdraw_after
    ? new Date(d.can_withdraw_after).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  let barHtml = '';
  if (status === 'cleared')
    barHtml = `<div class="cheque-withdraw-bar bar-yes">✅ Funds cleared. Abhi nikal sakti hain.</div>`;
  else if (status === 'in_clearing') {
    if (canW) barHtml = `<div class="cheque-withdraw-bar bar-yes">✅ Clearing complete. Withdraw now.</div>`;
    else      barHtml = `<div class="cheque-withdraw-bar bar-no">⏳ In NIFT clearing. Available after <strong>${withdrawDate || esc(d.clearing_date)}</strong></div>`;
  } else if (status === 'bounced')
    barHtml = `<div class="cheque-withdraw-bar bar-err">❌ Bounced — ${esc(d.bounce_reason || 'Unknown')}. Charges: Rs. ${(d.bounce_charges || 0).toLocaleString('en-IN')}</div>`;
  else if (status === 'stopped')
    barHtml = `<div class="cheque-withdraw-bar bar-err">🛑 Stop payment placed. Will not be honoured.</div>`;
  else if (status === 'post_dated')
    barHtml = `<div class="cheque-withdraw-bar bar-no">📅 Post-dated. Cannot process before ${esc(d.cheque_date || '')}</div>`;

  const fields = [
    ['Cheque #',   d.cheque_number || '—'],
    ['Amount',     d.amount ? 'Rs. ' + Number(d.amount).toLocaleString('en-IN') : '—'],
    ['Payee',      d.payee_name || d.payee || '—'],
    ['Presented',  d.presented_date || '—'],
    ['Clearing',   d.clearing_date || '—'],
    ['Cleared On', d.actual_cleared_date ? new Date(d.actual_cleared_date).toLocaleDateString('en-PK') : '—']
  ];

  const card = document.createElement('div');
  card.className = 'cheque-card';
  card.innerHTML = `
    <div class="cheque-header">
      <span class="cheque-title">🏷️ Cheque Details</span>
      <span class="status-badge ${statusClass}">${statusLabel}</span>
    </div>
    <div class="cheque-body">${fields.map(([l, v]) => `<div class="cheque-field"><label>${l}</label><span>${esc(String(v))}</span></div>`).join('')}</div>
    ${barHtml}`;
  return card;
}

function buildTxnTable(txns) {
  const rows = txns.map(t => {
    const isCr = t.type?.includes('credit') || t.type === 'transfer_in' || t.isCr;
    return `<tr>
      <td style="font-family:var(--mono);font-size:11px">${esc(t.date || '')}</td>
      <td>${esc(t.desc || t.description || '')}</td>
      <td style="font-family:var(--mono);text-transform:uppercase;font-size:10px;color:var(--muted)">${esc((t.type || '').replace('_', ' '))}</td>
      <td style="font-family:var(--mono);text-align:right" class="${isCr ? 'amt-cr' : 'amt-dr'}">${isCr ? '+' : '−'} Rs. ${Number(t.amount || 0).toLocaleString('en-IN')}</td>
    </tr>`;
  }).join('');
  const div = document.createElement('div');
  div.style.cssText = 'overflow-x:auto;margin-top:10px;border-radius:8px;border:1px solid var(--border);overflow:hidden';
  div.innerHTML = `<table class="txn-table"><thead><tr><th>Date</th><th>Description</th><th>Type</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>`;
  return div;
}

function buildBalanceCard(d) {
  const div = document.createElement('div');
  div.className = 'balance-card';
  div.innerHTML = `
    <div class="bc-label">Available Balance</div>
    <div class="bc-amount">Rs. ${Number(d.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
    ${d.hold_amount ? `<div class="bc-sub">Hold: <span style="color:var(--orange)">Rs. ${Number(d.hold_amount).toLocaleString('en-IN')}</span></div>` : ''}`;
  return div;
}
