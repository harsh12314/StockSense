// server/src/server.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors    = require('cors');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'healthy', timestamp: new Date().toISOString() } });
});

// ── Route mounts ─────────────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/deliveries',  require('./routes/deliveries'));
app.use('/api/receipts',    require('./routes/receipts'));
app.use('/api/ref',         require('./routes/reference'));
app.use('/api/products',    require('./routes/products'));
app.use('/api/transfers',   require('./routes/transfers'));
app.use('/api/adjustments', require('./routes/adjustments'));
app.use('/api/ledger',      require('./routes/moves'));
app.use('/api/moves',       require('./routes/moves'));
app.use('/api/settings',    require('./routes/settings'));

// ── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
});

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: { message: err.message || 'Internal server error.' },
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 StockSense server running on http://localhost:${PORT}`));
