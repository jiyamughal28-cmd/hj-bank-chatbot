'use strict';
const { Router } = require('express');
const fetch = require('node-fetch');
const router = Router();

const MODELS = [
  { model: 'gemini-2.5-flash', api: 'v1beta' },
  { model: 'gemini-2.0-flash', api: 'v1beta' },
  { model: 'gemini-1.5-flash', api: 'v1beta' },
];

router.post('/', async (req, res) => {
  const { systemPrompt, history, userText } = req.body;
  if (!userText) return res.status(400).json({ error: 'userText is required.' });
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'API key missing.' });

  let hist = Array.isArray(history) ? history.filter(h => h.role && h.parts).slice(-20) : [];
  if (hist.length === 0 || hist[0].role !== 'user') hist = [{ role: 'user', parts: [{ text: userText }] }];

  for (const { model, api } of MODELS) {
    try {
      const url = `https://generativelanguage.googleapi
