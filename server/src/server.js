// server/src/server.js
require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// ── Route mounts ─────────────────────────────────────────────────────────────
// Each teammate appends ONE line here; never rewrite this file.
app.use('/api/receipts', require('./routes/receipts'));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`StockSense server running on :${PORT}`));
