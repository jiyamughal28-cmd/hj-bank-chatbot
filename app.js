// ════════════════════════════════════════════════════
// HJ BANK CHATBOT v11 — js/app.js
// Main application logic
// Depends on: db.js, intents.js, flows.js, ui.js
// ════════════════════════════════════════════════════

// ── STATE ─────────────────────────────────────────────
let isLoading      = false;
let lastCallTime   = 0;
let _pendingUserText = '';
const MIN_DELAY_MS = 2500;

// ── SESSION PERSISTENCE (conversationHistory) ─────────
function loadHistory() {
  try {
    const raw = sessionStorage.getItem('hjbank_history');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveHistory(history) {
  try { sessionStorage.setItem('hjbank_history', JSON.stringify(history.slice(-40))); } catch {}
}

let conversationHistory = loadHistory();

// ── BANK CONTEXT (system prompt sent to backend) ──────
function getBankContext() {
  return `You are "Fatima", HJ Bank's multilingual AI banking assistant.
Customer name: Sara Khan. Address her warmly and always by name.

LANGUAGE RULE: Detect user language (English / Urdu / Roman Urdu) and reply in the SAME language.

DATABASE:
${JSON.stringify(DB, null, 2)}

CAPABILITIES v11:
- Balance, transactions, cheque status/clearing
- Fund transfers (RAAST/IBFT) with limit checks (single tx limit: Rs 5 Lakh, must check available_balance)
- EMI calculations for loans
- Card services (block, limits, international toggle)
- PIN change flow
- Scheduled payments
- Spending analysis from transactions
- Security alerts (NEVER process OTPs shared by user — warn them)
- Bill payments, ATM locator, rates, loan options
- REFUSE any illegal/hack/bypass requests firmly

TRANSFER LIMITS:
- RAAST: up to Rs 2.5L instant
- IBFT: up to Rs 5L per tx
- OTP required for > Rs 25,000
- Daily limit: Rs 5L

SAVED PAYEES: Ali, Ahmed, Mom, Savings (own account)

Always respond in this JSON format:
{
  "language": "en|ur|roman_ur",
  "intent": "balance_inquiry|transfer|emi|card_service|spending|cheque_status|schedule|security|general",
  "reply": "Your human-readable reply with HTML formatting",
  "data": {
    "type": "balance_card|txn_table|cheque_card|emi_card|transfer_confirm|card_service|spending_analysis|security_alert|none",
    ... relevant fields
  }
}

Be professional, empathetic, precise. Use emojis naturally. Never invent data.`;
}

// ── CALL BACKEND /api/chat OR direct Gemini API ──────
async function callGemini(userText) {
  let hist = [...conversationHistory];
  while (hist.length > 0 && hist[0].role !== 'user') hist.shift();
  if (hist.length === 0) hist = [{ role: 'user', parts: [{ text: userText }] }];

  // If user set a direct API key, call Gemini directly from browser
  const directKey = (typeof getGeminiApiKey === 'function') ? getGeminiApiKey() : '';
  if (directKey) {
    const MODELS = [
      { model: 'gemini-2.5-flash',      api: 'v1beta' },
      { model: 'gemini-2.0-flash',      api: 'v1beta' },
      { model: 'gemini-2.0-flash-lite', api: 'v1beta' },
      { model: 'gemini-1.5-flash',      api: 'v1beta' },
    ];
    let lastErr = null;
    for (const { model, api } of MODELS) {
      try {
        const url = 'https://generativelanguage.googleapis.com/' + api + '/models/' + model + ':generateContent?key=' + directKey;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: getBankContext() }] },
            contents: hist,
            generationConfig: { maxOutputTokens: 800, temperature: 0.4 }
          })
        });
        if (!res.ok) {
          const eb = await res.json().catch(() => ({}));
          const msg = (eb && eb.error && eb.error.message) || ('HTTP ' + res.status);
          if (res.status === 404 || res.status === 429) { lastErr = new Error(msg); continue; }
          throw new Error(msg);
        }
        const data = await res.json();
        const text = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
        if (!text) throw new Error('Empty response from model');
        return text;
      } catch(e) { lastErr = e; }
    }
    throw lastErr || new Error('All Gemini models failed');
  }

  // Backend proxy call (key in server/.env)
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt: getBankContext(), history: hist, userText })
  });
  if (response.status === 429) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Rate limit reached. Please wait a moment.');
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || ('Server error ' + response.status));
  }
  const data = await response.json();
  if (!data.reply) throw new Error('Empty response from server.');
  return data.reply;
}

// ── INTENT SCORING ────────────────────────────────────
function scoreIntents(rawText) {
  const cleaned = expandSynonyms(rawText.toLowerCase()).replace(/[^\w\s]/g, ' ');
  let best = null, bestScore = 0;
  for (const intent of INTENTS) {
    let score = 0;
    for (const kw of intent.keywords) { if (cleaned.includes(kw)) score += intent.weight; }
    for (const ph of intent.phrases)  { if (cleaned.includes(ph)) score += intent.weight * 2; }
    if (score > bestScore) { bestScore = score; best = intent; }
  }
  return bestScore >= 1 ? best : null;
}

// ── LOCAL DEMO FALLBACK ───────────────────────────────
function getDemoReply(text) {
  if (/transfer\s+-|\bsend\s+-|negative\s+amount/i.test(text)) {
    return { text: `⚠️ <strong>Invalid amount.</strong> Amount positive hona chahiye.<br>Sahi amount ke saath dobara try karein.`, data: { type: 'none' } };
  }
  if (text.length > 3 && /^[a-z]+$/i.test(text) && !/[aeiou]/i.test(text.substring(0, 5))) {
    return { text: `Sara, main samajh nahi saki. 😊<br><br>Kuch poochh sakti hain jaise:<br>• <em>"Mera balance kya hai?"</em><br>• <em>"5000 PKR Ali ko transfer karo"</em><br>• <em>"EMI calculate karo 500,000 ka"</em>`, data: { type: 'none' } };
  }
  const matched = scoreIntents(text);
  if (matched) return matched.getReply(text);
  return {
    text: `Sara, main samajh nahi saki — main HJ Bank ke liye help karna chahti hoon! 😊<br><br>
      Yeh pooch sakti hain:<br>
      • 💰 <em>"Mera balance kya hai?"</em><br>
      • ↗️ <em>"5000 Ali ko transfer karo"</em><br>
      • 🧮 <em>"500,000 PKR ka EMI calculate karo"</em><br>
      • 📊 <em>"Is mahine mujhne kitna kharch kiya?"</em><br>
      • 💳 <em>"Mera card block karo"</em>`,
    data: { type: 'none' }
  };
}

// ── INPUT HANDLERS ────────────────────────────────────
function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'; // 160px max per requirement
}

function sendQuick(text) {
  if (isLoading) return;
  const input = document.getElementById('userInput');
  input.value = text;
  sendMessage();
}

// ── NEW CHAT ───────────────────────────────────────────
function startNewChat() {
  // Clear conversation history
  conversationHistory = [];
  saveHistory(conversationHistory);

  // Reset flow context
  if (typeof ctx !== 'undefined') { ctx.flow = null; ctx.step = 0; ctx.data = {}; }

  // Clear chat messages UI
  const chatMessages = document.getElementById('chatMessages');
  if (chatMessages) chatMessages.innerHTML = '';

  // Show welcome message again
  var _cards = [['💰','Balance & Statement'],['↗️','Fund Transfer'],['🧮','EMI Calculator'],['📊','Spending Analysis'],
         ['💳','Card Services'],['🔐','Security & PIN'],['📅','Schedule Payment'],['🏷️','Cheque Status'],
         ['🏧','ATM Locator'],['📋','Transactions'],['🏠','Loans & Finance'],['📈','Rates & FD']
        ].map(function(item){ return '<div style="background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:6px 10px;font-size:12px">'+item[0]+' '+item[1]+'</div>'; }).join('');
  renderStructuredResponse(
    '<strong>Hello Sara! 👋 Welcome back to HJ Bank.</strong><br><br>' +
    'Main <strong>Fatima</strong> hoon — aapka AI banking assistant!<br><br>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px">' + _cards + '</div><br>' +
    '<em style="color:var(--text-dim)">English, Urdu, ya Roman Urdu — jis mein chahein baat karein! 🇵🇰</em>',
    { type: 'none' }
  );

  showToast('✦ New chat started', 'info');

  // Focus input
  const input = document.getElementById('userInput');
  if (input) input.focus();
}

// ── MOBILE SIDEBAR ────────────────────────────────────
function toggleSidebar() {
  const sidebar  = document.querySelector('.sidebar');
  const overlay  = document.getElementById('sidebarOverlay');
  const isOpen   = sidebar.classList.contains('open');
  sidebar.classList.toggle('open', !isOpen);
  overlay.classList.toggle('active', !isOpen);
  document.body.style.overflow = isOpen ? '' : 'hidden';
}

function closeSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.remove('open');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

// ── MAIN SEND ─────────────────────────────────────────
async function sendMessage() {
  if (isLoading) return;
  const input = document.getElementById('userInput');
  const text  = input.value.trim();
  if (!text) return;

  const now = Date.now();
  if (now - lastCallTime < MIN_DELAY_MS) {
    showToast(`⏳ Please wait ${Math.ceil((MIN_DELAY_MS - (now - lastCallTime)) / 1000)}s`, 'warn');
    return;
  }

  isLoading = true;
  setLoadingUI(true);
  appendMessage('user', text, getTime());
  input.value = '';
  input.style.height = 'auto';
  _pendingUserText = text;
  showTyping();

  // Check for active multi-step flow FIRST (fully local, no API)
  const flowReply = handleFlow(text);
  if (flowReply) {
    removeTyping();
    renderStructuredResponse(flowReply.text, flowReply.data);
    isLoading = false;
    setLoadingUI(false);
    lastCallTime = Date.now();
    return;
  }

  // Fall through to Gemini AI via backend
  try {
    conversationHistory.push({ role: 'user', parts: [{ text }] });
    const rawText = await callGemini(text);
    removeTyping();
    conversationHistory.push({ role: 'model', parts: [{ text: rawText }] });
    saveHistory(conversationHistory);

    let parsed = null;
    try {
      const m = rawText.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    } catch (e) {}

    if (parsed) {
      // Handle flow-starting intents from Gemini response
      if (parsed.data?.type === 'transfer_confirm' && parsed.data?.amount) {
        ctx.flow = 'transfer'; ctx.step = 3;
        ctx.data = { amount: parsed.data.amount, payeeRaw: parsed.data.to, payee: null };
      }
      renderStructuredResponse(parsed.reply || rawText, parsed.data || { type: 'none' });
    } else {
      appendMessage('bot', formatResponse(rawText), getTime());
    }
    lastCallTime = Date.now();
  } catch (err) {
    removeTyping();
    console.warn('API error (demo fallback):', err.message);
    // Show error as toast if rate limited; otherwise use local fallback
    if (err.message.includes('Rate limit') || err.message.includes('wait')) {
      showToast(`⏳ ${err.message}`, 'warn');
    }
    const fallback = getDemoReply(text);
    renderStructuredResponse(fallback.text, fallback.data);
  } finally {
    isLoading = false;
    setLoadingUI(false);
  }
}

// ── WINDOW ONLOAD ─────────────────────────────────────
window.onload = () => {
  // Apply saved theme
  var savedTheme = localStorage.getItem('hjbank_theme') || 'dark';
  applyTheme(savedTheme);

  // Update API badge after DOM ready
  setTimeout(updateApiBadge, 150);

  // Initialise localStorage-persisted DB data
  initPersisted();

  // Set correct SVG on send button
  const sendIcon = document.getElementById('sendIcon');
  if (sendIcon) sendIcon.innerHTML = SVG_SEND;

  // Restore sidebar stat numbers from localStorage
  const acc = dbGetAccount();
  const incEl  = document.getElementById('stat-incoming');
  const outEl  = document.getElementById('stat-outgoing');
  const holdEl = document.getElementById('stat-hold');
  const availEl= document.getElementById('stat-available');
  const balEl  = document.getElementById('sidebar-balance');

  if (balEl)  balEl.textContent  = acc.balance.toLocaleString('en-IN');
  if (incEl)  incEl.textContent  = '+' + (85000).toLocaleString('en-IN');
  if (outEl)  outEl.textContent  = '−' + (18550).toLocaleString('en-IN');
  if (holdEl) holdEl.textContent = acc.hold_amount.toLocaleString('en-IN');
  if (availEl)availEl.textContent= acc.available_balance.toLocaleString('en-IN');

  // Welcome message
  var _cards2 = [['💰','Balance & Statement'],['↗️','Fund Transfer'],['🧮','EMI Calculator'],['📊','Spending Analysis'],
         ['💳','Card Services'],['🔐','Security & PIN'],['📅','Schedule Payment'],['🏷️','Cheque Status'],
         ['🏧','ATM Locator'],['📋','Transactions'],['🏠','Loans & Finance'],['📈','Rates & FD']
        ].map(function(item){ return '<div style="background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:6px 10px;font-size:12px">'+item[0]+' '+item[1]+'</div>'; }).join('');
  renderStructuredResponse(
    '<strong>Hello Sara! 👋 Welcome back to HJ Bank.</strong><br><br>' +
    'Main <strong>Fatima</strong> hoon — aapka AI banking assistant!<br><br>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px">' + _cards2 + '</div><br>' +
    '<em style="color:var(--text-dim)">English, Urdu, ya Roman Urdu — jis mein chahein baat karein! 🇵🇰</em>',
    { type: 'none' }
  );
};

// ── THEME TOGGLE ──────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('hjbank_theme', theme);
  var btn = document.getElementById('themeToggleBtn');
  if (btn) btn.textContent = theme === 'light' ? '\uD83C\uDF19' : '\u2600\uFE0F';
  var label = document.getElementById('themeLabel');
  if (label) label.textContent = theme === 'light' ? 'Light' : 'Dark';
}

function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// ── GEMINI API KEY (direct browser mode) ─────────────
function getGeminiApiKey() {
  return sessionStorage.getItem('hjbank_gemini_key') || '';
}

function saveGeminiApiKey(key) {
  if (key) {
    sessionStorage.setItem('hjbank_gemini_key', key.trim());
    showToast('AI Key saved! Chatbot active.', 'info');
  } else {
    sessionStorage.removeItem('hjbank_gemini_key');
    showToast('API Key removed. Demo mode.', 'warn');
  }
  updateApiBadge();
}

function updateApiBadge() {
  var badge = document.getElementById('apiKeyBadge');
  if (!badge) return;
  var key = getGeminiApiKey();
  badge.textContent = key ? 'AI Active' : 'Demo Mode';
  badge.style.color = key ? 'var(--green)' : 'var(--orange)';
}

function openApiKeyModal() {
  var modal = document.getElementById('apiKeyModal');
  if (modal) {
    var inp = document.getElementById('apiKeyInput');
    if (inp) inp.value = getGeminiApiKey();
    modal.style.display = 'flex';
    setTimeout(function(){ if (inp) inp.focus(); }, 100);
  }
}

function closeApiKeyModal() {
  var modal = document.getElementById('apiKeyModal');
  if (modal) modal.style.display = 'none';
}

function confirmApiKey() {
  var inp = document.getElementById('apiKeyInput');
  if (inp) saveGeminiApiKey(inp.value.trim());
  closeApiKeyModal();
}
