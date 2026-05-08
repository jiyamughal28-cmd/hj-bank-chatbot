'use strict';
const { Router } = require('express');
const https = require('https');

const router = Router();

const MODELS = [
  { model: 'gemini-2.5-flash', api: 'v1beta' },
  { model: 'gemini-2.0-flash', api: 'v1beta' },
  { model: 'gemini-1.5-flash', api: 'v1beta' },
];

function httpsPost(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search,
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
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

router.post('/', async (req, res) => {
  const { systemPrompt, history, userText } = req.body;
  if (!userText) return res.status(400).json({ error: 'userText required.' });
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'API key missing.' });

  let hist = Array.isArray(history) ? history.filter(h => h.role && h.parts).slice(-20) : [];
  if (!hist.length || hist[0].role !== 'user') hist = [{ role: 'user', parts: [{ text: userText }] }];

  for (const { model, api } of MODELS) {
    try {
      const url = https://generativelanguage.googleapis.com/${api}/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY};
      const result = await httpsPost(url, {
        system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefi
