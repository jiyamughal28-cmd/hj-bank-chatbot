'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET','POST'], allowedHeaders: ['Content-Type'] }));
app.use(express.json({ limit: '50kb' }));

const limiter = rateLimit({ windowMs: 60000, max: 30, standardHeaders: true, legacyHeaders: false });
app.use('/api/', limiter);

function httpsPost(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

app.post('/api/chat', async (req, res) => {
  const { systemPrompt, history, userText } = req.body;
  if (!userText) return res.status(400).json({ error: 'userText required.' });
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'API key missing.' });

  let hist = Array.isArray(history) ? history.filter(h => h.role && h.parts).slice(-20) : [];
  if (!hist.length || hist[0].role !== 'user') hist = [{ role: 'user', parts: [{ text: userText }] }];

  const models = [
    { model: 'gemini-2.5-flash', api: 'v1beta' },
    { model: 'gemini-2.0-flash', api: 'v1beta' },
    { model: 'gemini-1.5-flash', api: 'v1beta' },
  ];

  for (const { model, api } of models) {
    try {
      const url = 'https://generativelanguage.googleapis.com/' + api + '/models/' + model + ':generateContent?key=' + process.env.GEMINI_API_KEY;
      const result = await httpsPost(url, {
        system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
        contents: hist,
        generationConfig: { maxOutputTokens: 800, temperature: 0.4 }
      });
      const data = JSON.parse(result.body);
      const text = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
      if (!text) continue;
      return res.json({ reply: text, model });
    } catch(e) { continue; }
  }
  return res.status(502).json({ error: 'AI unavailable.' });
});

app.get('/api/health', function(_req, res) {
  res.json({ status: 'ok', gemini: !!process.env.GEMINI_API_KEY });
});

const frontendPath = path.join(__dirname);
app.use(express.static(frontendPath));
app.get('*', function(req, res) {
  if (!req.path.startsWith('/api')) res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, function() {
  console.log('HJ Bank running on port ' + PORT);
});
