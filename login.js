// ════════════════════════════════════════════════════
// HJ BANK CHATBOT v13 — js/login.js
// Login overlay logic (does NOT touch existing code)
// ════════════════════════════════════════════════════

// ── DEMO CREDENTIALS ──────────────────────────────────
const DEMO_ACCOUNTS = {
  customer: {
    accNum: 'PK36HABB0000123456789012',  // matches DB
    pin: '1234',
    name: 'Sara',
    role: 'customer',
    shortAcc: '4829'
  },
  admin: {
    accNum: 'ADMIN-001',
    pin: '0000',
    name: 'Admin',
    role: 'admin',
    shortAcc: 'STAFF'
  }
};

// ── DISMISS LOGIN & SHOW CHAT ─────────────────────────
function dismissLogin(userName, role) {
  const overlay = document.getElementById('loginOverlay');
  if (!overlay) return;

  // Animate out
  overlay.style.animation = 'loginFadeOut 0.35s ease forwards';
  setTimeout(() => {
    overlay.classList.add('hidden');

    // If admin, show an extra badge in header
    if (role === 'admin') {
      const headerRight = document.querySelector('.header-right');
      if (headerRight) {
        const badge = document.createElement('div');
        badge.className = 'pill';
        badge.style.cssText = 'background:rgba(201,168,76,0.15);color:var(--gold);border:1px solid rgba(201,168,76,0.3);font-size:11px;padding:3px 10px;border-radius:20px;font-weight:600';
        badge.textContent = '🛡️ Admin';
        headerRight.prepend(badge);
      }
    }

    // Update user badge name
    const userSpan = document.querySelector('.user-badge span');
    if (userSpan) userSpan.textContent = userName;

    const avatarEl = document.querySelector('.user-avatar');
    if (avatarEl) avatarEl.textContent = userName.charAt(0).toUpperCase();

  }, 350);
}

// ── HANDLE MANUAL LOGIN ───────────────────────────────
function handleLogin() {
  const accNum = (document.getElementById('loginAccNum')?.value || '').trim();
  const pin    = (document.getElementById('loginPin')?.value || '').trim();
  const errEl  = document.getElementById('loginError');

  if (!accNum || !pin) {
    if (errEl) { errEl.textContent = '⚠️ Please enter account number and PIN'; errEl.style.display = 'block'; }
    return;
  }

  // Check against demo accounts
  const match = Object.values(DEMO_ACCOUNTS).find(
    acc => (acc.accNum === accNum || acc.shortAcc === accNum) && acc.pin === pin
  );

  if (match) {
    if (errEl) errEl.style.display = 'none';
    dismissLogin(match.name, match.role);
  } else {
    if (errEl) { errEl.textContent = '❌ Invalid account number or PIN'; errEl.style.display = 'block'; }
    const pinInput = document.getElementById('loginPin');
    if (pinInput) { pinInput.value = ''; pinInput.focus(); }
  }
}

// ── DEMO ACCOUNT LOGIN ────────────────────────────────
function loginAsDemo(type) {
  const acc = DEMO_ACCOUNTS[type];
  if (!acc) return;
  dismissLogin(acc.name, acc.role);
}

// ── ENTER KEY SUPPORT ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const pinInput = document.getElementById('loginPin');
  if (pinInput) {
    pinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
  }
  const accInput = document.getElementById('loginAccNum');
  if (accInput) {
    accInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('loginPin')?.focus();
    });
  }
});
