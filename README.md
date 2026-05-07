# 🏦 HJ Bank AI Assistant v14

A professional, full-stack banking chatbot with a secure Express backend, multi-step flow engine, multilingual support (English / Urdu / Roman Urdu), and a rich card-based UI — now with **Dark/Light theme toggle** and **direct browser-side Gemini API support**.

---

## ✨ What's New in v14

| Feature | Details |
|---|---|
| 🌙☀️ **Dark / Light Theme** | Toggle button in header — preference saved to localStorage |
| 🔑 **Browser API Key Mode** | Enter Gemini key in 🔑 modal — no server needed, key stays in sessionStorage |
| 🤖 **Smart API Fallback** | If no backend key, direct Gemini call; if no key at all, local demo mode |
| 📋 **Settings in Sidebar** | Theme + API key controls accessible from mobile sidebar |

---

## 🔧 Gemini API Setup — Two Options

### Option 1: Server-side key (recommended for production)
```bash
# In server/.env:
GEMINI_API_KEY=AIza...your-key-here
```

### Option 2: Browser-side key (no server needed)
1. Open the chatbot
2. Click the 🔑 button in the header (or sidebar → Settings)
3. Paste your Gemini API key from [aistudio.google.com](https://aistudio.google.com/app/apikey)
4. Click **Save & Activate**

> Key is stored in `sessionStorage` only — it clears when you close the tab.

---

## 📁 Project Structure

```
hj-bank-chatbot/
├── index.html              ← HTML shell only (no inline JS or CSS)
├── css/
│   └── styles.css          ← All styles
├── js/
│   ├── db.js               ← Mock DB + helper functions (localStorage-persisted)
│   ├── intents.js          ← INTENTS array for local intent detection
│   ├── flows.js            ← ctx state object + handleFlow() multi-step engine
│   ├── ui.js               ← All DOM/render functions + card builders + SYNONYMS
│   └── app.js              ← Main logic: sendMessage, callGemini, scoreIntents, etc.
├── server/
│   ├── server.js           ← Express app: CORS, rate limiting, static serving
│   ├── routes/
│   │   └── chat.js         ← POST /api/chat — Gemini API proxy (key stays server-side)
│   └── .env                ← Your Gemini API key (never committed)
├── .gitignore
├── package.json
└── README.md
```

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
cd hj-bank-chatbot
npm install
```

### 2. Add your Gemini API key

Edit `server/.env`:

```env
GEMINI_API_KEY=AIza...your-key-here
PORT=3000
```

### 3. Start the server

```bash
npm start
```

Open **http://localhost:3000** in your browser.

---

## ✅ What's New in v11 Refactor

| Area | Change |
|---|---|
| **Backend** | Express server proxies all Gemini calls — API key never reaches the browser |
| **Security** | All AI-generated HTML is sanitised before `innerHTML` injection |
| **Rate Limiting** | 30 req/min global · 15 req/min chat (via `express-rate-limit`) |
| **Persistence** | `sessionStorage` saves conversation history across page refreshes |
| **Persistence** | `localStorage` persists account balance and transactions |
| **Mobile** | Hamburger ☰ button slides sidebar in as a full-height overlay |
| **UI** | SVG arrow icon replaces ➤ text on send button |
| **UI** | 👍 👎 feedback buttons under every bot message |
| **UI** | `aria-label` on all icon-only buttons |
| **UI** | All currency uses `toLocaleString('en-IN')` consistently |
| **UI** | Textarea `max-height` increased to 160px |
| **Files** | Fully split: HTML / CSS / db / intents / flows / ui / app |

---

## 🌐 API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/chat` | Proxies message to Gemini. Body: `{ systemPrompt, history, userText }` |
| `GET` | `/api/health` | Returns server/key status |

---

## 🔒 Security Notes

- The Gemini API key lives **only** in `server/.env` — never sent to the browser
- All AI text is sanitised (unknown tags stripped, `on*` handlers removed) before DOM injection
- User input is HTML-escaped via `escapeHtml()` before display
- `server/.env` is in `.gitignore` — never commit it

---

## 🧠 Architecture

```
Browser                        Express Server               Gemini API
  │                                  │                           │
  │  POST /api/chat                  │                           │
  │  { userText, history }  ──────►  │                           │
  │                                  │  POST generateContent     │
  │                                  │  (with API key)  ──────►  │
  │                                  │                           │
  │                                  │  ◄──────  { reply }       │
  │  ◄──────  { reply, model }       │                           │
```

### Local-first fallback order

1. **Active multi-step flow** (transfer wizard, card block, PIN change, schedule) — handled 100% locally
2. **Intent match** (balance, cheque, EMI, spending…) — handled locally, no API call
3. **Gemini AI** via `/api/chat` — for open-ended / complex queries
4. **Demo fallback** — if Gemini is unavailable, local `getDemoReply()` responds

---

## 🌍 Supported Languages

- English
- Urdu (اردو)
- Roman Urdu

---

## 💳 Features

- Real-time balance & transaction display
- Cheque status: cleared / in_clearing / bounced / stopped / post-dated
- Fund transfer wizard (RAAST / IBFT) with limit validation
- EMI calculator with full amortisation breakdown
- Card management: block, limits, international toggle
- PIN change flow (demo)
- Scheduled payment wizard
- Spending analysis with category breakdown
- Security alerts & OTP warnings
- Bill payments & ATM locator
- FD/profit rates

---

## 📦 Dependencies

```json
"express"            — HTTP server
"dotenv"             — .env loading
"cors"               — Cross-origin headers
"express-rate-limit" — Request throttling
"node-fetch"         — Server-side Gemini fetch (ESM)
```

Requires **Node.js ≥ 18**.
