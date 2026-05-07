// ════════════════════════════════════════════════════
// HJ BANK CHATBOT v11 — /api/chat route
// server/routes/chat.js
// Proxies all Gemini API calls — key never touches client
// ════════════════════════════════════════════════════

import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();

// Models to try in fallback order
const GEMINI_MODELS = [
  { model: 'gemini-2.5-flash',    api: 'v1beta' },
  { model: 'gemini-2.0-flash',    api: 'v1beta' },
  { model: 'gemini-2.0-flash-lite', api: 'v1beta' },
];

// ── POST /api/chat ────────────────────────────────────
router.post('/', async (req, res) => {
  const { systemPrompt, history, userText } = req.body;

  // Validate inputs
  if (!userText || typeof userText !== 'string') {
    return res.status(400).json({ error: 'userText is required.' });
  }
  if (userText.length > 2000) {
    return res.status(400).json({ error: 'Message too long (max 2000 chars).' });
  }
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API key not configured on server.' });
  }

  // Sanitise history — only keep valid role/parts structure
  let safeHistory = [];
  if (Array.isArray(history)) {
    safeHistory = history
      .filter(h => h && (h.role === 'user' || h.role === 'model') && Array.isArray(h.parts))
      .map(h => ({
        role: h.role,
        parts: h.parts
          .filter(p => p && typeof p.text === 'string')
          .map(p => ({ text: p.text.slice(0, 4000) }))
      }))
      .slice(-20); // keep last 20 turns max

    // Gemini requires history to start with a user turn
    while (safeHistory.length > 0 && safeHistory[0].role !== 'user') {
      safeHistory.shift();
    }
  }

  if (safeHistory.length === 0) {
    safeHistory = [{ role: 'user', parts: [{ text: userText }] }];
  }

  // Try each model in sequence
  let lastError = null;
  for (const { model, api } of GEMINI_MODELS) {
    try {
      const result = await callGemini(model, api, systemPrompt, safeHistory);
      return res.json({ reply: result, model });
    } catch (err) {
      lastError = err;
      const msg = err.message || '';
      const isRetryable = msg.includes('not found') || msg.includes('404') ||
                          msg.includes('429') || msg.includes('not supported');
      if (isRetryable) {
        console.warn(`[chat] ${model} failed: ${msg} — trying next model…`);
        continue;
      }
      // Non-retryable error — bail immediately
      console.error(`[chat] Non-retryable Gemini error:`, err.message);
      break;
    }
  }

  // All models failed
  console.error('[chat] All Gemini models failed:', lastError?.message);
  return res.status(502).json({
    error: 'AI service temporarily unavailable.',
    details: lastError?.message || 'Unknown error'
  });
});

// ── Gemini call helper ────────────────────────────────
async function callGemini(model, apiVersion, systemPrompt, history) {
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const body = {
    ...(systemPrompt ? { system_instruction: { parts: [{ text: systemPrompt }] } } : {}),
    contents: history,
    generationConfig: {
      maxOutputTokens: 800,
      temperature: 0.4
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000) // 30s timeout
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from model');
  return text;
}

export default router;
