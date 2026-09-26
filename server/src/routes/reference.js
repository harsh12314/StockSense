// server/src/routes/reference.js
// Read-only endpoints for reference data used in delivery forms
const express = require('express');
const router = express.Router();
const pool = require('../db/connection');
const auth = require('../middleware/auth');

// GET /api/ref/products — list products for dropdown/search
router.get('/products', auth, async (req, res) => {
  try {
    const { search, category_id } = req.query;
    let sql = `
      SELECT p.*, c.name as category_name,
             COALESCE(SUM(s.on_hand_qty), 0) as total_on_hand,
             COALESCE(SUM(s.free_to_use_qty), 0) as total_free_to_use
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN stock s ON p.id = s.product_id
    `;
    const params = [];
    const conditions = [];

    if (search) {
      conditions.push('(p.name LIKE ? OR p.sku LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category_id) {
      conditions.push('p.category_id = ?');
      params.push(category_id);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' GROUP BY p.id ORDER BY p.name';

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// GET /api/ref/products/:id/stock — stock at a specific location
router.get('/products/:id/stock', auth, async (req, res) => {
  try {
    const { location_id } = req.query;
    let sql = `
      SELECT s.*, l.name as location_name, l.short_code as location_code
      FROM stock s
      JOIN locations l ON s.location_id = l.id
      WHERE s.product_id = ?
    `;
    const params = [req.params.id];

    if (location_id) {
      sql += ' AND s.location_id = ?';
      params.push(location_id);
    }

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// GET /api/ref/locations
router.get('/locations', auth, async (req, res) => {
  try {
    const { warehouse_id } = req.query;
    let sql = `
      SELECT l.*, w.name as warehouse_name, w.short_code as warehouse_code
      FROM locations l
      JOIN warehouses w ON l.warehouse_id = w.id
    `;
    const params = [];

    if (warehouse_id) {
      sql += ' WHERE l.warehouse_id = ?';
      params.push(warehouse_id);
    }

    sql += ' ORDER BY w.name, l.name';

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// GET /api/ref/warehouses
router.get('/warehouses', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM warehouses ORDER BY name'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// GET /api/ref/categories
router.get('/categories', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM categories ORDER BY name'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

module.exports = router;
