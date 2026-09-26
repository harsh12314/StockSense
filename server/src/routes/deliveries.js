// server/src/routes/deliveries.js
const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const controller = require('../controllers/deliveriesController');

// List & stats
router.get('/',      auth, controller.list);
router.get('/stats', auth, controller.stats);

// Single delivery CRUD
router.get('/:id',  auth, controller.getById);
router.post('/',    auth, controller.create);
router.put('/:id',  auth, controller.update);

// Product lines
router.post('/:id/lines',            auth, controller.addLine);
router.delete('/:id/lines/:lineId',  auth, controller.removeLine);

// Lifecycle actions
router.post('/:id/check-availability', auth, controller.checkAvailability);
router.post('/:id/validate',           auth, controller.validate);
router.post('/:id/cancel',             auth, controller.cancel);

module.exports = router;
