// server/src/routes/products.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getCategories,
  createCategory,
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
} = require('../controllers/productController');

// Categories
router.get('/categories', authenticateToken, getCategories);
router.post('/categories', authenticateToken, createCategory);

// Products
router.get('/', authenticateToken, getProducts);
router.get('/:id', authenticateToken, getProduct);
router.post('/', authenticateToken, createProduct);
router.put('/:id', authenticateToken, updateProduct);
router.delete('/:id', authenticateToken, deleteProduct);

// Inline stock update (from Products table view)
router.patch('/:id/stock', authenticateToken, updateStock);

module.exports = router;
