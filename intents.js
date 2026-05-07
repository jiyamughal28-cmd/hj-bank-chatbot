// ════════════════════════════════════════════════════
// HJ BANK CHATBOT v11 — js/intents.js
// INTENTS array — local intent detection fallback
// Depends on: db.js (DB, dbGet*, calc*, check*)
//             flows.js (ctx)
// ════════════════════════════════════════════════════

const INTENTS = [
  {
    name: 'illegal',
    keywords: ['hack', 'illegal', 'fraud', 'cheat', 'steal', 'bypass', 'skip verification', 'do something illegal', 'unauthorized'],
    phrases: ['hack my account', 'bypass otp', 'skip verification', 'do illegal'],
    weight: 3,
    getReply: () => ({
      text: `🚫 <strong>Sara, yeh request process nahi ho sakti.</strong><br><br>Main kisi bhi unauthorized, illegal, ya fraudulent activity mein help nahi kar sakti.<br><br>If you suspect fraud on your account, please:<br>📞 Call <strong>0800-00426</strong> (24/7 Fraud Helpline) immediately.`,
      data: { type: 'security_alert', reason: 'Unauthorized/illegal activity detected' }
    })
  },
  {
    name: 'negative_amount',
    keywords: [],
    phrases: ['transfer -', 'send -500', 'transfer negative'],
    weight: 3,
    getReply: () => ({
      text: `⚠️ <strong>Invalid amount.</strong> Amount positive hona chahiye (zero se zyada).<br><br>Sahi amount ke saath dobara try karein.`,
      data: { type: 'none' }
    })
  },
  {
    name: 'balance',
    keywords: ['balance', 'bal', 'kitna', 'paisa', 'account', 'funds', 'how much', 'money', 'avail', 'remaining', 'bakaya', 'raqam', 'paise', 'broke', 'khaali', 'left', 'kitne'],
    phrases: ['check balance', 'my balance', 'account balance', 'mera balance', 'how broke', 'kitnay paise'],
    weight: 1,
    getReply: () => {
      const acc = dbGetAccount();
      return {
        text: `Sara, yahan aapka account summary hai:<br><br>
          💰 <strong>Total Balance:</strong> <strong style="color:var(--gold)">Rs. ${acc.balance.toLocaleString('en-IN')}</strong><br>
          🔒 <strong>On Hold:</strong> <span style="color:var(--orange)">Rs. ${acc.hold_amount.toLocaleString('en-IN')}</span><br>
          ✅ <strong>Available:</strong> <strong style="color:var(--green)">Rs. ${acc.available_balance.toLocaleString('en-IN')}</strong><br><br>
          <em style="color:var(--text-dim)">Daily transfer limit: Rs. ${acc.daily_transfer_limit.toLocaleString('en-IN')}</em>`,
        data: { type: 'balance_card', balance: acc.available_balance, hold_amount: acc.hold_amount }
      };
    }
  },
  {
    name: 'spending',
    keywords: ['spend', 'spent', 'too much', 'spending', 'kharcha', 'how much spent', 'expenses', 'budget', 'overbudget'],
    phrases: ['did i spend', 'spending this month', 'how much this month'],
    weight: 1,
    getReply: () => {
      const s = dbSpendingAnalysis();
      return {
        text: `Sara, aapka is mahine ka spending analysis:<br><br>
          💸 <strong>Total Spent:</strong> Rs. ${s.totalSpent.toLocaleString('en-IN')}<br>
          💰 <strong>Total In:</strong> Rs. ${s.totalIn.toLocaleString('en-IN')}<br>
          📊 <strong>Net Flow:</strong> <span style="color:${s.netFlow >= 0 ? 'var(--green)' : 'var(--red)'}">Rs. ${Math.abs(s.netFlow).toLocaleString('en-IN')} ${s.netFlow >= 0 ? 'surplus' : 'deficit'}</span>`,
        data: { type: 'spending_analysis', ...s }
      };
    }
  },
  {
    name: 'transfer_start',
    keywords: ['transfer', 'send', 'bhejna', 'ibft', 'raast', 'pay', 'move', 'wire', 'bhejo'],
    phrases: ['transfer money', 'send money', 'fund transfer', 'paise bhejo', 'money bhejna'],
    weight: 1,
    getReply: (text) => {
      const amtM = text.match(/(\d[\d,]*)\s*(pkr|rs|rupees|rupay)?/i);
      const toM  = text.match(/to\s+([a-zA-Z ]+?)(?:\s*,|\s*\d|$)/i) ||
                   text.match(/([a-zA-Z]+)\s+(ko|ke liye)/i);
      const amount    = amtM ? parseInt(amtM[1].replace(/,/g, '')) : null;
      const payeeName = toM  ? (toM[1] || toM[0]).trim() : null;

      if (amount && payeeName) {
        const check = checkTransferLimit(amount);
        if (!check.ok) return { text: `❌ <strong>Transfer limit exceeded:</strong><br>${check.reason}`, data: { type: 'none' } };
        const payee = dbFindPayee(payeeName);
        ctx.flow = 'transfer'; ctx.step = 3;
        ctx.data = { amount, payeeRaw: payeeName, payee };
        const otp = amount > 25000 ? '<br>⚠️ <em>OTP required</em>' : '';
        return {
          text: `Transfer summary confirm karein:${otp}`,
          data: { type: 'transfer_confirm', to: payee ? payee.name : payeeName, bank: payee ? payee.bank : 'IBFT', amount, fee: amount > 25000 ? 200 : 0, method: amount <= 250000 ? 'RAAST (Instant)' : 'IBFT' }
        };
      }
      ctx.flow = 'transfer'; ctx.step = 1; ctx.data = {};
      return {
        text: `↗️ <strong>Fund Transfer</strong><br><br>Kisko paisa bhejna hai? Naam ya account number likhein.<br><em style="color:var(--text-dim)">Saved payees: Ali, Ahmed, Mom, Savings</em>`,
        data: { type: 'flow_steps', steps: 3, done: 0, active: 0 }
      };
    }
  },
  {
    name: 'card_block',
    keywords: ['block', 'lost', 'stolen', 'freeze', 'cancel card', 'band karo card', 'card band'],
    phrases: ['block my card', 'lost my card', 'lost card', 'block debit', 'freeze card', 'stolen card'],
    weight: 1,
    getReply: () => {
      const acc = dbGetAccount();
      ctx.flow = 'card_block'; ctx.step = 1;
      return {
        text: `🚨 <strong>Card Block Request</strong><br><br>Aapka debit card (<strong>•••• 4829</strong>) block karna chahti hain?<br><br>⚠️ Yeh action immediate hoga. Confirm karein?`,
        data: { type: 'card_service', card_status: acc.card_status, international: acc.international_txn, atm_limit: acc.atm_limit, pos_limit: acc.pos_limit }
      };
    }
  },
  {
    name: 'card_limit',
    keywords: ['card limit', 'atm limit', 'pos limit', 'card limit kya', 'how much card'],
    phrases: ['what is my card limit', 'card limit batao', 'international transactions'],
    weight: 1,
    getReply: () => {
      const acc = dbGetAccount();
      return {
        text: `💳 <strong>Sara, aapka card status:</strong>`,
        data: { type: 'card_service', card_status: acc.card_status, international: acc.international_txn, atm_limit: acc.atm_limit, pos_limit: acc.pos_limit }
      };
    }
  },
  {
    name: 'international',
    keywords: ['international', 'abroad', 'foreign', 'overseas', 'enable international', 'global'],
    phrases: ['enable international', 'international transactions', 'use card abroad'],
    weight: 1,
    getReply: () => {
      DB.accounts['ACC-001'].international_txn = true;
      persistAccount();
      const acc = dbGetAccount();
      return {
        text: `✅ <strong>International transactions enabled!</strong><br><br>Aapka card ab globally use ho sakta hai.<br><em style="color:var(--text-dim)">Daily limit: Rs. 1,00,000 abroad. Additional charges may apply.</em>`,
        data: { type: 'card_service', card_status: acc.card_status, international: true, atm_limit: acc.atm_limit, pos_limit: acc.pos_limit }
      };
    }
  },
  {
    name: 'emi',
    keywords: ['emi', 'calculate', 'installment', 'monthly', 'payment loan', 'kitna emi', 'loan calculate'],
    phrases: ['calculate emi', 'emi kya hoga', 'loan emi', 'emi calculator', 'how much emi'],
    weight: 1,
    getReply: (text) => {
      const numMatches = text.match(/[\d,]+/g) || [];
      const nums = numMatches.map(n => parseInt(n.replace(/,/g, ''))).filter(n => n > 0);
      let principal = 500000, rate = 22, months = 36;
      if (nums.length >= 1) principal = nums[0];
      if (nums.length >= 2) { if (nums[1] < 100) rate = nums[1]; else months = nums[1]; }
      if (nums.length >= 3) months = nums[2];
      const yrMatch = text.match(/\b(\d+)\s*(year|yr|sal)/i);
      if (yrMatch) months = parseInt(yrMatch[1]) * 12;
      const emi      = calcEMI(principal, rate, months);
      const total    = emi * months;
      const interest = total - principal;
      return {
        text: `🧮 <strong>EMI Calculation Result:</strong>`,
        data: { type: 'emi_card', principal, rate, months, emi: Math.round(emi), total: Math.round(total), interest: Math.round(interest) }
      };
    }
  },
  {
    name: 'pin_change',
    keywords: ['pin', 'change pin', 'reset pin', 'new pin', 'bhool gaya', 'forgot pin', 'password'],
    phrases: ['change my pin', 'forgot my pin', 'reset my pin', 'pin change'],
    weight: 1,
    getReply: () => {
      ctx.flow = 'pin_change'; ctx.step = 1;
      return { text: `🔐 <strong>PIN Change</strong><br><br>Security ke liye, pehle apna current PIN confirm karein (demo: <em>koi bhi 4 digits</em>):`, data: { type: 'none' } };
    }
  },
  {
    name: 'schedule',
    keywords: ['schedule', 'next', 'monday', 'tuesday', 'next week', 'baad mein', 'later', 'schedule payment', 'future transfer'],
    phrases: ['schedule a payment', 'pay next', 'transfer next week', 'schedule transfer'],
    weight: 1,
    getReply: () => {
      ctx.flow = 'schedule_payment'; ctx.step = 1;
      return { text: `📅 <strong>Schedule a Payment</strong><br><br>Kisko payment schedule karni hai?`, data: { type: 'none' } };
    }
  },
  {
    name: 'cancel_last',
    keywords: ['cancel', 'last transaction', 'cancel transfer', 'undo', 'wapas'],
    phrases: ['cancel that', 'cancel last', 'undo transaction', 'cancel my last'],
    weight: 1,
    getReply: () => {
      if (ctx.flow) { ctx.flow = null; ctx.step = 0; ctx.data = {}; return { text: `✅ Current action cancel kar di gayi.`, data: { type: 'none' } }; }
      const last = DB.transactions[0];
      return {
        text: `Sara, aapki last transaction thi:<br><br><strong>${last.desc}</strong> — Rs. ${last.amount.toLocaleString('en-IN')}<br><em style="color:var(--text-dim)">Processed transactions ko cancel karna branch mein ja ke possible hai. Helpline: 0800-00426</em>`,
        data: { type: 'none' }
      };
    }
  },
  {
    name: 'transactions',
    keywords: ['transaction', 'history', 'recent', 'statement', 'activity', 'last', 'payments', 'spent', 'debit', 'credit', 'dikhao', 'entries', 'pichle'],
    phrases: ['show transactions', 'recent activity', 'last 5', 'transaction list', 'payment history'],
    weight: 1,
    getReply: () => ({
      text: `Sara, yahan aapki recent transactions hain:`,
      data: { type: 'txn_table', transactions: DB.transactions.slice(0, 7).map(t => ({ ...t, isCr: t.type.includes('credit') })) }
    })
  },
  {
    name: 'cheque_status',
    keywords: ['cheque', 'check', 'chequebook', 'clear', 'clearing', 'bounce', 'bounced', 'stop', 'presented', 'nift'],
    phrases: ['cheque status', 'cheque clear', 'kya clear', 'cheque number'],
    weight: 1,
    getReply: (text) => {
      const numMatch = text.match(/\b(\d{5,6})\b/);
      const num    = numMatch ? numMatch[1].padStart(6, '0') : null;
      const cheque = num ? dbGetCheque(num) : dbGetCheque('000123');
      if (!cheque) return { text: `Sara, cheque number provide karein. Example: <em>"Cheque 000123 ka status"</em>`, data: { type: 'none' } };
      return { text: `Sara, aapke cheque ka status:`, data: { type: 'cheque_card', ...cheque, can_withdraw: dbCanWithdraw(cheque) } };
    }
  },
  {
    name: 'bills',
    keywords: ['bill', 'electricity', 'gas', 'recharge', 'mobile', 'jazz', 'easypaisa', 'top', 'bijli', 'lesco', 'internet', 'water'],
    phrases: ['pay bill', 'electricity bill', 'gas bill', 'mobile recharge', 'top up'],
    weight: 1,
    getReply: () => ({
      text: `Sara, HJ Bank bill payment services:<br><br>
        ⚡ <strong>Electricity:</strong> LESCO, KESC<br>
        🔥 <strong>Gas:</strong> SNGPL, SSGC<br>
        💧 <strong>Water</strong><br>
        📱 <strong>Mobile Recharge:</strong> Jazz, Telenor, Zong, Ufone<br>
        💸 <strong>Digital Wallets:</strong> EasyPaisa, JazzCash<br><br>
        Kaunsa bill pay karna hai?`,
      data: { type: 'none' }
    })
  },
  {
    name: 'location',
    keywords: ['atm', 'branch', 'nearest', 'nearby', 'location', 'where', 'find', 'kahan', 'close', 'address', 'map'],
    phrases: ['find atm', 'nearest atm', 'near me', 'closest branch', 'branch location'],
    weight: 1,
    getReply: () => ({
      text: `Sara, HJ Bank ke qareeb locations:<br><br>
        🏧 <strong>ATMs:</strong><br>&nbsp;&nbsp;• Gulberg Main Blvd — <em>0.3 km</em><br>
        &nbsp;&nbsp;• DHA Phase 5 — <em>0.7 km</em><br>&nbsp;&nbsp;• Packages Mall — <em>1.1 km</em><br><br>
        🏦 <strong>Branches:</strong><br>&nbsp;&nbsp;• MM Alam Road (Main) — <em>1.2 km</em><br>
        &nbsp;&nbsp;• Johar Town Branch — <em>2.0 km</em><br><br>
        🕐 <strong>Branch Hours:</strong> Mon–Fri 9am–5pm · Sat 9am–1pm`,
      data: { type: 'none' }
    })
  },
  {
    name: 'loans',
    keywords: ['loan', 'finance', 'home', 'car', 'personal', 'education', 'qarz', 'installment', 'borrow', 'financing'],
    phrases: ['home loan', 'car loan', 'personal loan', 'loan options', 'apply for loan'],
    weight: 1,
    getReply: () => ({
      text: `Sara, HJ Bank Islamic Finance options:<br><br>
        🏠 <strong>Home Finance:</strong> 18% p.a. · Up to Rs. 1 Crore · 20 yr<br>
        🚗 <strong>Car Finance:</strong> 20% p.a. · Up to Rs. 30 Lakh · 7 yr<br>
        💼 <strong>Personal Finance:</strong> 22–26% p.a. · Up to Rs. 20 Lakh · 5 yr<br>
        🎓 <strong>Education Finance:</strong> 18% p.a.<br><br>
        ✅ All products are <strong>Shariah-compliant</strong>.<br><br>
        EMI calculate karna chahti hain?`,
      data: { type: 'none' }
    })
  },
  {
    name: 'cards',
    keywords: ['card', 'credit', 'debit', 'visa', 'platinum', 'cashback', 'benefits'],
    phrases: ['credit card', 'debit card', 'card benefits', 'card info', 'what card'],
    weight: 1,
    getReply: () => ({
      text: `Sara, HJ Bank Cards:<br><br>
        💳 <strong>HJ Platinum Credit:</strong> 5% cashback fuel &amp; dining · Rs. 2,000/yr<br>
        ✈️ <strong>HJ Travel Card:</strong> Airport lounge · 2x miles · Rs. 3,500/yr<br>
        💵 <strong>Debit Visa Gold:</strong> ATM limit Rs. 50,000/day · POS Rs. 2,00,000<br><br>
        🚨 <strong>Lost/Stolen card?</strong> Call <strong>0800-00426</strong> (24/7) immediately.`,
      data: { type: 'none' }
    })
  },
  {
    name: 'rates',
    keywords: ['rate', 'interest', 'profit', 'fd', 'fixed', 'deposit', 'return', 'yield', 'munafa', 'saving', 'term', 'annual'],
    phrases: ['interest rate', 'profit rate', 'fd rate', 'fixed deposit', 'savings rate'],
    weight: 1,
    getReply: () => ({
      text: `Sara, HJ Bank current profit rates:<br><br>
        💰 <strong>Savings Account:</strong> 10.5% p.a.<br>
        📈 <strong>Term Deposit (1 yr):</strong> 12% p.a.<br>
        📊 <strong>Term Deposit (3 yr):</strong> 12.5% p.a.<br>
        🏠 <strong>Home Finance:</strong> 18% p.a.<br>
        🚗 <strong>Car Finance:</strong> 20% p.a.<br><br>
        ✅ All rates are <strong>Shariah-compliant</strong> (profit, not interest).`,
      data: { type: 'none' }
    })
  },
  {
    name: 'security',
    keywords: ['otp', 'security', 'fraud', 'suspicious', 'hack', 'password', 'reset', 'biometric', 'safe', 'alert', 'verify', 'login history', 'show login'],
    phrases: ['forgot pin', 'security alert', 'account hacked', 'suspicious activity', 'login history', 'show my login'],
    weight: 1,
    getReply: (text) => {
      if (/otp.*\d{4,6}/i.test(text) || /\d{6}.*otp/i.test(text)) {
        return { text: `🔒 <strong>Sara, OTP kabhi bhi share na karein — chatbot mein bhi nahi!</strong><br><br>Main aapka OTP process nahi kar sakti. Yeh ek security reminder hai:<br>⚠️ Koi bhi aapka OTP maange, samjhein yeh fraud hai.<br><br>Call <strong>0800-00426</strong> if suspicious.`, data: { type: 'none' } };
      }
      if (/login history|show login|activity log/i.test(text)) {
        return {
          text: `🔍 <strong>Recent Login History:</strong><br><br>
            ✅ Today, 09:12 AM — Lahore, PK (Current session)<br>
            ✅ Yesterday, 11:45 PM — Lahore, PK (Mobile App)<br>
            ✅ 3 days ago, 2:30 PM — Lahore, PK (Web Browser)<br><br>
            Koi suspicious login nahi mili. ✅`,
          data: { type: 'none' }
        };
      }
      return {
        text: `Sara, HJ Bank Security features:<br><br>
          🔐 <strong>OTP:</strong> Required for transfers > Rs. 25,000<br>
          🖐️ <strong>Biometric Login:</strong> Fingerprint &amp; Face ID<br>
          🛡️ <strong>24/7 Fraud Monitoring</strong><br>
          🔑 <strong>PIN Reset:</strong> Via app or nearest branch<br><br>
          ⚠️ <em>PIN, CVV, ya OTP kabhi share na karein.</em><br><br>
          Kuch suspicious laga? Call <strong>0800-00426</strong> immediately.`,
        data: { type: 'none' }
      };
    }
  },
  {
    name: 'greeting',
    keywords: ['hi', 'hello', 'hey', 'morning', 'evening', 'assalam', 'salam', 'salaam', 'helo', 'sup', 'yo', 'hii'],
    phrases: ['good morning', 'good evening', 'how are you', 'assalam alaikum', 'as salam'],
    weight: 0.8,
    getReply: () => ({
      text: `Hello Sara! 👋 Main <strong>Fatima</strong> hoon, aapka HJ Bank AI assistant.<br><br>
        💰 Balance · 📋 Transactions · ↗️ Transfer · 🧮 EMI · 💳 Cards · 🏧 ATM<br>
        📅 Schedule Payments · 📊 Spending Analysis · 🔐 Security<br><br>
        <em>English, Urdu, ya Roman Urdu — jis mein chahein!</em>`,
      data: { type: 'none' }
    })
  }
];
