'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const chatRouter = require('./chat.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET','POST'], allowedHeaders: ['Content-Type'] }));
app.use(express.json({ limit: '50kb' }));

const limiter = rateLimit({ windowMs: 60000, max: 30, standardHeaders: true, legacyHeaders: false });
const chatLimiter = rateLimit({ windowMs: 60000, max: 15, standardHeaders: true, legacyHeaders: false });

app.use('/api/', limiter);
app.use('/api/chat', chatLimiter);
app.use('/api/chat', chatRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', gemini: !!process.env.GEMINI_API_KEY });
});

const frontendPath = path.join(__dirname);
app.use(express.static(frontendPath));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log('HJ Bank running on port ' + PORT);
});
