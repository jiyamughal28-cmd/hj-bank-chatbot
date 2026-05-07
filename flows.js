// ════════════════════════════════════════════════════
// HJ BANK CHATBOT v11 — js/flows.js
// Multi-step flow engine: ctx state + handleFlow()
// Depends on: db.js
// ════════════════════════════════════════════════════

// ── CONVERSATION CONTEXT (multi-step flows) ───────────
let ctx = {
  flow: null,   // 'transfer' | 'card_block' | 'pin_change' | 'schedule_payment'
  step: 0,
  data: {}      // accumulated data across steps
};

// ── MULTI-STEP FLOW ENGINE ────────────────────────────
function handleFlow(text) {
  const t = text.trim().toLowerCase();

  // ── TRANSFER FLOW ──────────────────────────────────
  if (ctx.flow === 'transfer') {

    if (ctx.step === 1) {
      // Collect recipient
      let payeeRaw = text.trim();
      let payee    = dbFindPayee(payeeRaw) || dbFindPayee(payeeRaw.replace(/^(to\s+|send\s+to\s+)/i, '').trim());
      ctx.data.payeeRaw = payeeRaw.replace(/^(to\s+|send\s+to\s+)/i, '').trim();
      ctx.data.payee    = payee;
      ctx.step = 2;
      return {
        text: payee
          ? `Got it! <strong>${payee.name}</strong> (${payee.bank}) — <em>saved payee ✅</em><br><br>Kitna amount transfer karein? (e.g. <em>5000</em>)`
          : `<strong>${ctx.data.payeeRaw}</strong> — main account details verify karoon gi.<br><br>Kitna amount transfer karein? (e.g. <em>5000</em>)`,
        data: { type: 'flow_steps', steps: 3, done: 1, active: 1 }
      };
    }

    if (ctx.step === 2) {
      // Collect amount
      const amtMatch = text.match(/[\d,]+/);
      const amount   = amtMatch ? parseInt(amtMatch[0].replace(/,/g, '')) : NaN;
      if (isNaN(amount) || amount <= 0) {
        return { text: `⚠️ Valid amount enter karein (e.g. <em>5000</em>)`, data: { type: 'none' } };
      }
      const check = checkTransferLimit(amount);
      if (!check.ok) {
        ctx.flow = null; ctx.step = 0; ctx.data = {};
        return { text: `❌ <strong>Transfer nahi ho sakti:</strong><br>${check.reason}<br><br>Kya aur help chahiye?`, data: { type: 'none' } };
      }
      ctx.data.amount = amount;
      const otp = amount > 25000 ? '<br>⚠️ <em>OTP required (amount > Rs. 25,000)</em>' : '';
      ctx.step = 3;
      return {
        text: `Transfer summary check karein:${otp}`,
        data: {
          type: 'transfer_confirm',
          to:     ctx.data.payee ? ctx.data.payee.name : ctx.data.payeeRaw,
          bank:   ctx.data.payee ? ctx.data.payee.bank : 'Inter-bank IBFT',
          amount: ctx.data.amount,
          fee:    amount > 25000 ? 200 : 0,
          method: amount <= 250000 ? 'RAAST (Instant)' : 'IBFT'
        }
      };
    }

    if (ctx.step === 3) {
      if (/confirm|yes|haan|ok|proceed|yes please|bilkul/i.test(t)) {
        const amt = ctx.data.amount;
        const to  = ctx.data.payee ? ctx.data.payee.name : ctx.data.payeeRaw;
        DB.accounts['ACC-001'].balance            -= amt;
        DB.accounts['ACC-001'].available_balance  -= amt;
        persistAccount();
        DB.transactions.unshift({
          ref: 'TXN-LIVE-' + Date.now(),
          type: 'transfer_out',
          amount: amt,
          date: new Date().toISOString().split('T')[0],
          desc: `Transfer to ${to}`,
          channel: 'raast'
        });
        persistAccount();
        ctx.flow = null; ctx.step = 0; ctx.data = {};
        return {
          text: `✅ <strong>Transfer successful!</strong><br><br>Rs. <strong>${amt.toLocaleString('en-IN')}</strong> → <strong>${to}</strong><br>New available balance: <strong style="color:var(--green)">Rs. ${DB.accounts['ACC-001'].available_balance.toLocaleString('en-IN')}</strong><br><br><em>Transaction ID: TXN-LIVE-${Date.now().toString().slice(-6)}</em>`,
          data: { type: 'none' }
        };
      } else if (/cancel|no|nahi|band|rok/i.test(t)) {
        ctx.flow = null; ctx.step = 0; ctx.data = {};
        return { text: `✅ Transfer cancel kar di gayi. Kya aur koi kaam hai?`, data: { type: 'none' } };
      } else if (/change|edit|modify|actually|badal/i.test(t)) {
        const amtMatch = t.match(/[\d,]+/);
        if (amtMatch) {
          const newAmt = parseInt(amtMatch[0].replace(/,/g, ''));
          const check  = checkTransferLimit(newAmt);
          if (!check.ok) { ctx.flow = null; ctx.step = 0; ctx.data = {}; return { text: `❌ ${check.reason}`, data: { type: 'none' } }; }
          ctx.data.amount = newAmt;
          const otp2 = newAmt > 25000 ? '<br>⚠️ <em>OTP required</em>' : '';
          return {
            text: `Updated! New summary:${otp2}`,
            data: { type: 'transfer_confirm', to: ctx.data.payee ? ctx.data.payee.name : ctx.data.payeeRaw, bank: ctx.data.payee ? ctx.data.payee.bank : 'IBFT', amount: newAmt, fee: newAmt > 25000 ? 200 : 0, method: newAmt <= 250000 ? 'RAAST' : 'IBFT' }
          };
        }
        return { text: `Kaunsa amount chahiye? Sirf number likhein:`, data: { type: 'none' } };
      } else {
        return { text: `"Confirm" ya "Cancel" likhein please.`, data: { type: 'none' } };
      }
    }
  }

  // ── CARD BLOCK FLOW ────────────────────────────────
  if (ctx.flow === 'card_block') {
    if (ctx.step === 1) {
      if (/yes|haan|block|confirm|ok/i.test(t)) {
        DB.accounts['ACC-001'].card_status = 'blocked';
        ctx.flow = null; ctx.step = 0; ctx.data = {};
        return {
          text: `🚫 <strong>Aapka debit card block kar diya gaya hai.</strong><br><br>✅ Card immediately disabled<br>✅ Emergency number: <strong>0800-00426</strong> (24/7)<br><br>Naya card order karna chahti hain?`,
          data: { type: 'card_service', card_status: 'blocked', international: false, atm_limit: 50000, pos_limit: 200000 }
        };
      } else {
        ctx.flow = null; ctx.step = 0;
        return { text: `Card block cancel kar di. Card abhi bhi active hai. Kya aur koi kaam hai?`, data: { type: 'none' } };
      }
    }
  }

  // ── PIN CHANGE FLOW ────────────────────────────────
  if (ctx.flow === 'pin_change') {
    if (ctx.step === 1) {
      ctx.step = 2;
      return { text: `🔐 Apna naya 4-digit PIN enter karein:<br><em style="color:var(--text-dim)">(Note: Main yeh store nahi karti — yeh sirf ek demo flow hai)</em>`, data: { type: 'none' } };
    }
    if (ctx.step === 2) {
      if (/^\d{4}$/.test(t)) {
        ctx.flow = null; ctx.step = 0;
        return { text: `✅ <strong>PIN successfully changed!</strong><br><br>🔒 Naya PIN active hai.<br>⚠️ Yeh PIN kisi ko share na karein — bank staff ko bhi nahi.`, data: { type: 'none' } };
      }
      return { text: `Sirf 4 digits enter karein (e.g. <em>1234</em>):`, data: { type: 'none' } };
    }
  }

  // ── SCHEDULED PAYMENT FLOW ─────────────────────────
  if (ctx.flow === 'schedule_payment') {
    if (ctx.step === 1) {
      ctx.data.payeeRaw = text.trim();
      ctx.step = 2;
      return { text: `Amount kitna schedule karein?`, data: { type: 'none' } };
    }
    if (ctx.step === 2) {
      const m = text.match(/[\d,]+/);
      ctx.data.amount = m ? parseInt(m[0].replace(/,/g, '')) : null;
      if (!ctx.data.amount) { return { text: `Valid amount likhein:`, data: { type: 'none' } }; }
      ctx.step = 3;
      return { text: `Konsi date pe transfer ho? (e.g. <em>next Monday</em> ya <em>15 May</em>)`, data: { type: 'none' } };
    }
    if (ctx.step === 3) {
      ctx.data.date = text.trim();
      DB.scheduledPayments.push({ ...ctx.data, created: new Date().toISOString() });
      const sp = DB.scheduledPayments[DB.scheduledPayments.length - 1];
      ctx.flow = null; ctx.step = 0; ctx.data = {};
      return {
        text: `✅ <strong>Payment scheduled!</strong><br><br>📅 <strong>${sp.date}</strong> ko Rs. <strong>${sp.amount.toLocaleString('en-IN')}</strong> → <strong>${sp.payeeRaw}</strong><br><br>Aapko reminder notification milegi.`,
        data: { type: 'none' }
      };
    }
  }

  return null; // no active flow
}
