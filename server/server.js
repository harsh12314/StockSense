const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');

const authRoutes      = require('./src/routes/auth');
const deliveryRoutes  = require('./src/routes/deliveries');
const receiptRoutes   = require('./src/routes/receipts');
const referenceRoutes = require('./src/routes/reference');
const productRoutes   = require('./src/routes/products');
const transferRoutes  = require('./src/routes/transfers');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'healthy', timestamp: new Date().toISOString() } });
});

// Routes — each feature mounts its own router here
app.use('/api/auth',       authRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/receipts',   receiptRoutes);
app.use('/api/ref',        referenceRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/transfers',  transferRoutes);

// 404 Handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: { message: err.message || 'Internal server error.' },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
