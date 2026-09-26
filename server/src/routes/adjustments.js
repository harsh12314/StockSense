// server/src/routes/adjustments.js
const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const ctrl = require('../controllers/adjustmentsController');

// All endpoints require authentication
router.get('/',      auth, ctrl.listAdjustments);
router.get('/stats', auth, ctrl.getStats);
router.post('/',     auth, ctrl.createAdjustment);

module.exports = router;
