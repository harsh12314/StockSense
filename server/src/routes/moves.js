// server/src/routes/moves.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const c = require('../controllers/movesController');

// Aggregate statistics
router.get('/stats', authenticateToken, c.getStats);

// List moves / stock ledger feed
router.get('/',      authenticateToken, c.list);

// Get single ledger record
router.get('/:id',   authenticateToken, c.getById);

module.exports = router;
