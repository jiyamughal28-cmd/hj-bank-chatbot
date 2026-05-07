// ════════════════════════════════════════════════════
// HJ BANK CHATBOT v11 — Express Backend
// server/server.js
// ════════════════════════════════════════════════════

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import chatRouter from './routes/chat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS ─────────────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['http://localhost:3000']      // Update with actual domain in production
    : '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// ── BODY PARSING ─────────────────────────────────────
app.use(express.json({ limit: '50kb' }));

// ── RATE LIMITING ─────────────────────────────────────
const limiter = rateLimit({
  windowMs: 60 * 1000,        // 1-minute window
  max: 30,                     // max 30 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please wait a moment before trying again.',
    code: 'RATE_LIMITED'
  }
});

// Stricter limiter for AI chat endpoint
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,                     // max 15 AI calls per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Chat rate limit exceeded. Please wait before sending another message.',
    code: 'CHAT_RATE_LIMITED'
  }
});

app.use('/api/', limiter);
app.use('/api/chat', chatLimiter);

// ── API ROUTES ────────────────────────────────────────
app.use('/api/chat', chatRouter);

// ── HEALTH CHECK ─────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '11.0.0',
    gemini: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// ── SERVE STATIC FRONTEND ────────────────────────────
const frontendPath = path.join(__dirname, '..'); // project root
app.use(express.static(frontendPath));

// SPA fallback — serve index.html for any non-API route
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  }
});

// ── START ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🏦 HJ Bank Chatbot v11`);
  console.log(`   ✅ Server running at http://localhost:${PORT}`);
  console.log(`   🔐 Gemini API key: ${process.env.GEMINI_API_KEY ? 'Loaded ✅' : 'MISSING ❌'}`);
  console.log(`   🛡️  Rate limiting: 30 req/min global, 15 req/min chat`);
  console.log(`   📂 Serving frontend from: ${frontendPath}\n`);
});
