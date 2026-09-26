// server/src/routes/products.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const c = require('../controllers/productsController');

// Categories (before /:id to avoid param collision)
router.get('/categories',  authenticateToken, c.listCategories);
router.post('/categories', authenticateToken, c.createCategory);

// Products CRUD
router.get('/',        authenticateToken, c.list);
router.get('/:id',    authenticateToken, c.getById);
router.post('/',      authenticateToken, c.create);
router.put('/:id',    authenticateToken, c.update);
router.delete('/:id', authenticateToken, c.remove);

// Inline stock edit from table view (PRD §5.1)
router.patch('/:id/stock', authenticateToken, c.updateStock);
router.put('/:id/stock',   authenticateToken, c.updateStock);

module.exports = router;
