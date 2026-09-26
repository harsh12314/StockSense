// server/src/routes/transfers.js
const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const ctrl = require('../controllers/transfersController');

// All transfers routes require authentication
router.use(auth);

// List, Stats & Detail
router.get('/stats', ctrl.stats);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);

// Creation
router.post('/', ctrl.create);

// Line items
router.post('/:id/lines', ctrl.addLine);
router.delete('/:id/lines/:lineId', ctrl.removeLine);

// Validation & Lifecycle
router.post('/:id/validate', ctrl.validate);
router.put('/:id/validate', ctrl.validate); // Support both POST and PUT
router.put('/:id/ready', ctrl.markReady);
router.post('/:id/ready', ctrl.markReady);
router.put('/:id/cancel', ctrl.cancel);
router.post('/:id/cancel', ctrl.cancel);

module.exports = router;
