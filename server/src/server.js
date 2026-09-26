// server/src/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes      = require('./routes/auth');
const deliveryRoutes  = require('./routes/deliveries');
const referenceRoutes = require('./routes/reference');

const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth',       authRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/ref',        referenceRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: { message: 'Internal server error' },
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`StockSense server running on http://localhost:${PORT}`);
});
