// server/src/routes/settings.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const c = require('../controllers/settingsController');

// Warehouses
router.get('/warehouses',      authenticateToken, c.listWarehouses);
router.get('/warehouses/:id',  authenticateToken, c.getWarehouse);
router.post('/warehouses',     authenticateToken, c.createWarehouse);
router.put('/warehouses/:id',  authenticateToken, c.updateWarehouse);

// Internal Bin Locations
router.get('/locations',       authenticateToken, c.listLocations);
router.post('/locations',      authenticateToken, c.createLocation);
router.put('/locations/:id',   authenticateToken, c.updateLocation);

module.exports = router;
