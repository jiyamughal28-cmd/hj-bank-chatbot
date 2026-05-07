// ════════════════════════════════════════════════════
// HJ BANK CHATBOT v11 — js/db.js
// Mock database + DB helper functions
// Uses localStorage to persist balance & transactions
// ════════════════════════════════════════════════════

// ── INITIALISE PERSISTED DATA ────────────────────────
function initPersisted() {
  // Load account balance from localStorage (or use defaults)
  const savedBalance = localStorage.getItem('hjbank_balance');
  const savedAvailable = localStorage.getItem('hjbank_available');
  const savedTxns = localStorage.getItem('hjbank_transactions');

  if (savedBalance !== null) {
    DB.accounts['ACC-001'].balance = parseFloat(savedBalance);
  }
  if (savedAvailable !== null) {
    DB.accounts['ACC-001'].available_balance = parseFloat(savedAvailable);
  }
  if (savedTxns !== null) {
    try {
      DB.transactions = JSON.parse(savedTxns);
    } catch (e) { /* keep defaults */ }
  }
}

function persistAccount() {
  const acc = DB.accounts['ACC-001'];
  localStorage.setItem('hjbank_balance', acc.balance);
  localStorage.setItem('hjbank_available', acc.available_balance);
  localStorage.setItem('hjbank_transactions', JSON.stringify(DB.transactions));
}

// ── MOCK DATABASE ────────────────────────────────────
const DB = {
  users: {
    'USR-001': {
      full_name: 'Sara Khan',
      cnic: '35201-1234567-8',
      phone: '+92-300-1234567',
      kyc_status: 'verified',
      preferred_lang: 'roman_ur'
    }
  },
  accounts: {
    'ACC-001': {
      account_number: 'PK36HABB0000123456789012',
      display: '•••• •••• 4829',
      account_type: 'savings',
      balance: 124500.00,
      hold_amount: 50000.00,
      available_balance: 74500.00,
      currency: 'PKR',
      status: 'active',
      branch_code: 'LHR-001',
      user_id: 'USR-001',
      daily_transfer_limit: 500000,
      single_transfer_limit: 500000,
      card_status: 'active',
      international_txn: false,
      atm_limit: 50000,
      pos_limit: 200000
    }
  },
  cheques: {
    '000123': {
      cheque_number: '000123',
      payee_name: 'Ali Brothers Pvt Ltd',
      amount: 50000,
      cheque_date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
      status: 'in_clearing',
      presented_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      clearing_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      expected_credit_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      actual_cleared_date: null,
      can_withdraw_after: new Date(Date.now() + 86400000).toISOString(),
      bounce_reason: null,
      bounce_charges: 0,
      account_id: 'ACC-001'
    },
    '000456': {
      cheque_number: '000456',
      payee_name: 'Karachi Suppliers Ltd',
      amount: 25000,
      cheque_date: '2026-03-10',
      status: 'cleared',
      presented_date: '2026-03-10',
      clearing_date: '2026-03-12',
      expected_credit_date: '2026-03-12',
      actual_cleared_date: '2026-03-12T09:00:00Z',
      can_withdraw_after: null,
      bounce_reason: null,
      bounce_charges: 0,
      account_id: 'ACC-001'
    },
    '000789': {
      cheque_number: '000789',
      payee_name: 'Hassan Traders',
      amount: 15000,
      cheque_date: '2026-03-08',
      status: 'bounced',
      presented_date: '2026-03-08',
      clearing_date: null,
      expected_credit_date: null,
      actual_cleared_date: null,
      can_withdraw_after: null,
      bounce_reason: 'INSUFFICIENT_FUNDS',
      bounce_charges: 500,
      account_id: 'ACC-001'
    },
    '000999': {
      cheque_number: '000999',
      payee_name: 'Lahore Builders',
      amount: 80000,
      cheque_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'post_dated',
      presented_date: null,
      clearing_date: null,
      expected_credit_date: null,
      actual_cleared_date: null,
      can_withdraw_after: null,
      bounce_reason: null,
      bounce_charges: 0,
      account_id: 'ACC-001'
    },
    '001111': {
      cheque_number: '001111',
      payee_name: 'DHA Housing',
      amount: 120000,
      cheque_date: '2026-01-15',
      status: 'stopped',
      presented_date: '2026-01-15',
      clearing_date: null,
      expected_credit_date: null,
      actual_cleared_date: null,
      can_withdraw_after: null,
      bounce_reason: null,
      bounce_charges: 0,
      account_id: 'ACC-001'
    }
  },
  transactions: [
    { ref: 'TXN-2026-0401', type: 'credit',        amount: 85000, date: '2026-04-01', desc: 'Salary Credit — April 2026',      channel: 'online' },
    { ref: 'TXN-2026-0402', type: 'debit',          amount: 850,   date: '2026-04-02', desc: 'Foodpanda',                        channel: 'pos' },
    { ref: 'TXN-2026-0330', type: 'debit',          amount: 3200,  date: '2026-03-30', desc: 'LESCO Electricity Bill',           channel: 'online' },
    { ref: 'TXN-2026-0329', type: 'debit',          amount: 4500,  date: '2026-03-29', desc: 'Daraz.pk — Shopping',             channel: 'online' },
    { ref: 'TXN-2026-0328', type: 'debit',          amount: 10000, date: '2026-03-28', desc: 'ATM Withdrawal — Gulberg',         channel: 'atm' },
    { ref: 'TXN-2026-0320', type: 'cheque_debit',   amount: 50000, date: '2026-03-20', desc: 'Cheque #000123 — Ali Brothers',   channel: 'cheque' },
    { ref: 'TXN-2026-0312', type: 'cheque_credit',  amount: 25000, date: '2026-03-12', desc: 'Cheque Cleared #000456',          channel: 'cheque' },
    { ref: 'TXN-2026-0315', type: 'transfer_out',   amount: 12000, date: '2026-03-15', desc: 'IBFT — Meezan Bank',             channel: 'ibft' },
    { ref: 'TXN-2026-0410', type: 'debit',          amount: 2200,  date: '2026-04-10', desc: 'Careem Ride',                     channel: 'pos' },
    { ref: 'TXN-2026-0412', type: 'debit',          amount: 6000,  date: '2026-04-12', desc: 'Groceries — Imtiaz',             channel: 'pos' },
  ],
  savedPayees: {
    'ali':     { name: 'Ali Khan',       account: 'PK29MEZN0001234567890123', bank: 'Meezan Bank',    ibft: true  },
    'ahmed':   { name: 'Ahmed Raza',     account: 'PK36HABB0000987654321098', bank: 'HJ Bank',        ibft: false },
    'mom':     { name: 'Ammi Jaan',      account: 'PK45UNIL0000112233445566', bank: 'UBL',            ibft: true  },
    'savings': { name: 'HJ Savings A/C', account: 'PK36HABB0000123456789099', bank: 'HJ Bank (Self)', ibft: false },
  },
  scheduledPayments: []
};

// ── DB HELPER FUNCTIONS ───────────────────────────────

function dbGetCheque(num) {
  return DB.cheques[num] || null;
}

function dbGetAccount() {
  return DB.accounts['ACC-001'];
}

function dbGetRecentTxns(days = 30) {
  const cutoff = new Date(Date.now() - days * 86400000);
  return DB.transactions.filter(t => new Date(t.date) >= cutoff);
}

function dbCanWithdraw(ch) {
  if (ch.status === 'cleared') return true;
  if (ch.status === 'in_clearing' && ch.can_withdraw_after) {
    return new Date() >= new Date(ch.can_withdraw_after);
  }
  return false;
}

function dbFindPayee(name) {
  const k = (name || '').toLowerCase().trim();
  return DB.savedPayees[k] || null;
}

function dbSpendingAnalysis() {
  const txns   = DB.transactions;
  const debits  = txns.filter(t => t.type === 'debit' || t.type === 'transfer_out' || t.type === 'cheque_debit');
  const credits = txns.filter(t => t.type === 'credit' || t.type === 'cheque_credit');
  const cats = { 'Food & Dining': 0, Shopping: 0, Utilities: 0, Transport: 0, ATM: 0, Transfers: 0, Other: 0 };
  debits.forEach(t => {
    const d = t.desc.toLowerCase();
    if (d.includes('food') || d.includes('careem') || d.includes('pandamart'))    cats['Food & Dining'] += t.amount;
    else if (d.includes('daraz') || d.includes('shopping') || d.includes('imtiaz')) cats['Shopping']     += t.amount;
    else if (d.includes('lesco') || d.includes('bill') || d.includes('electric') || d.includes('gas')) cats['Utilities'] += t.amount;
    else if (d.includes('ride') || d.includes('petrol') || d.includes('uber'))    cats['Transport']     += t.amount;
    else if (d.includes('atm'))                                                    cats['ATM']           += t.amount;
    else if (d.includes('ibft') || d.includes('transfer'))                         cats['Transfers']     += t.amount;
    else                                                                            cats['Other']         += t.amount;
  });
  const totalSpent = Object.values(cats).reduce((a, b) => a + b, 0);
  const totalIn    = credits.reduce((a, t) => a + t.amount, 0);
  return { cats, totalSpent, totalIn, netFlow: totalIn - totalSpent };
}

function calcEMI(principal, annualRate, months) {
  const r = annualRate / 12 / 100;
  if (r === 0) return principal / months;
  return principal * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
}

function checkTransferLimit(amount) {
  const acc = dbGetAccount();
  if (amount <= 0)                            return { ok: false, reason: 'Amount must be greater than zero.' };
  if (amount > acc.single_transfer_limit)      return { ok: false, reason: `Single transaction limit is Rs. ${acc.single_transfer_limit.toLocaleString('en-IN')}. For larger transfers, visit a branch.` };
  if (amount > acc.available_balance)          return { ok: false, reason: `Insufficient funds. Available balance: Rs. ${acc.available_balance.toLocaleString('en-IN')}.` };
  return { ok: true };
}
