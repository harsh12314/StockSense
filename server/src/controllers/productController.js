// server/src/controllers/productController.js
const pool = require('../db/connection');

// ─── Helpers ────────────────────────────────────────────────────────────────

function ok(res, data) {
  return res.json({ success: true, data });
}

function fail(res, message, status = 400) {
  return res.status(status).json({ success: false, error: { message } });
}

// ─── Categories ─────────────────────────────────────────────────────────────

// GET /api/categories
async function getCategories(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    return ok(res, rows);
  } catch (err) {
    console.error(err);
    return fail(res, 'Failed to fetch categories', 500);
  }
}

// POST /api/categories
async function createCategory(req, res) {
  const { name } = req.body;
  if (!name || !name.trim()) return fail(res, 'Category name is required');

  try {
    const [result] = await pool.query(
      'INSERT INTO categories (name) VALUES (?)',
      [name.trim()]
    );
    const [rows] = await pool.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
    return ok(res, rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return fail(res, 'Category already exists');
    console.error(err);
    return fail(res, 'Failed to create category', 500);
  }
}

// ─── Products ────────────────────────────────────────────────────────────────

// GET /api/products  — list with category name joined
async function getProducts(req, res) {
  try {
    const { search, category_id } = req.query;
    let sql = `
      SELECT
        p.id, p.name, p.sku, p.unit_of_measure, p.per_unit_cost,
        p.reordering_rule, p.created_at,
        c.id AS category_id, c.name AS category_name,
        COALESCE(SUM(s.on_hand_qty), 0) AS on_hand_qty,
        COALESCE(SUM(s.free_to_use_qty), 0) AS free_to_use_qty
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
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' GROUP BY p.id ORDER BY p.name ASC';

    const [rows] = await pool.query(sql, params);
    return ok(res, rows);
  } catch (err) {
    console.error(err);
    return fail(res, 'Failed to fetch products', 500);
  }
}

// GET /api/products/:id
async function getProduct(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT
        p.id, p.name, p.sku, p.unit_of_measure, p.per_unit_cost,
        p.reordering_rule, p.created_at,
        c.id AS category_id, c.name AS category_name,
        COALESCE(SUM(s.on_hand_qty), 0) AS on_hand_qty,
        COALESCE(SUM(s.free_to_use_qty), 0) AS free_to_use_qty
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN stock s ON p.id = s.product_id
      WHERE p.id = ?
      GROUP BY p.id`,
      [req.params.id]
    );
    if (!rows.length) return fail(res, 'Product not found', 404);
    return ok(res, rows[0]);
  } catch (err) {
    console.error(err);
    return fail(res, 'Failed to fetch product', 500);
  }
}

// POST /api/products
async function createProduct(req, res) {
  const { name, sku, category_id, unit_of_measure, per_unit_cost, initial_stock, location_id } = req.body;

  if (!name || !name.trim()) return fail(res, 'Product name is required');
  if (!sku || !sku.trim()) return fail(res, 'SKU is required');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Insert product
    const [result] = await conn.query(
      `INSERT INTO products (name, sku, category_id, unit_of_measure, per_unit_cost)
       VALUES (?, ?, ?, ?, ?)`,
      [
        name.trim(),
        sku.trim().toUpperCase(),
        category_id || null,
        unit_of_measure || null,
        per_unit_cost || 0,
      ]
    );
    const productId = result.insertId;

    // Handle initial stock — requires a location
    if (initial_stock && initial_stock > 0 && location_id) {
      // Upsert stock row
      await conn.query(
        `INSERT INTO stock (product_id, location_id, on_hand_qty, free_to_use_qty)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           on_hand_qty = on_hand_qty + VALUES(on_hand_qty),
           free_to_use_qty = free_to_use_qty + VALUES(free_to_use_qty)`,
        [productId, location_id, initial_stock, initial_stock]
      );

      // Write move history ledger row
      await conn.query(
        `INSERT INTO move_history
           (reference, contact, from_location, to_location, product_id, quantity, direction, status)
         VALUES (?, ?, ?, ?, ?, ?, 'in', 'done')`,
        [
          `INIT/${productId}`,
          'Initial Stock',
          'Supplier',
          'Stock',
          productId,
          initial_stock,
        ]
      );
    }

    await conn.commit();

    // Return full product
    const [rows] = await pool.query(
      `SELECT p.*, c.name AS category_name,
         COALESCE(SUM(s.on_hand_qty), 0) AS on_hand_qty,
         COALESCE(SUM(s.free_to_use_qty), 0) AS free_to_use_qty
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN stock s ON p.id = s.product_id
       WHERE p.id = ?
       GROUP BY p.id`,
      [productId]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') return fail(res, 'A product with this SKU already exists');
    console.error(err);
    return fail(res, 'Failed to create product', 500);
  } finally {
    conn.release();
  }
}

// PUT /api/products/:id
async function updateProduct(req, res) {
  const { name, sku, category_id, unit_of_measure, per_unit_cost } = req.body;
  if (!name || !name.trim()) return fail(res, 'Product name is required');
  if (!sku || !sku.trim()) return fail(res, 'SKU is required');

  try {
    const [check] = await pool.query('SELECT id FROM products WHERE id = ?', [req.params.id]);
    if (!check.length) return fail(res, 'Product not found', 404);

    await pool.query(
      `UPDATE products SET name=?, sku=?, category_id=?, unit_of_measure=?, per_unit_cost=?
       WHERE id=?`,
      [
        name.trim(),
        sku.trim().toUpperCase(),
        category_id || null,
        unit_of_measure || null,
        per_unit_cost || 0,
        req.params.id,
      ]
    );

    const [rows] = await pool.query(
      `SELECT p.*, c.name AS category_name,
         COALESCE(SUM(s.on_hand_qty), 0) AS on_hand_qty,
         COALESCE(SUM(s.free_to_use_qty), 0) AS free_to_use_qty
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN stock s ON p.id = s.product_id
       WHERE p.id = ?
       GROUP BY p.id`,
      [req.params.id]
    );
    return ok(res, rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return fail(res, 'A product with this SKU already exists');
    console.error(err);
    return fail(res, 'Failed to update product', 500);
  }
}

// DELETE /api/products/:id
async function deleteProduct(req, res) {
  try {
    const [check] = await pool.query('SELECT id FROM products WHERE id = ?', [req.params.id]);
    if (!check.length) return fail(res, 'Product not found', 404);

    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    return ok(res, { message: 'Product deleted' });
  } catch (err) {
    console.error(err);
    return fail(res, 'Failed to delete product', 500);
  }
}

// PATCH /api/products/:id/stock  — inline stock update from table view
async function updateStock(req, res) {
  const { location_id, on_hand_qty, free_to_use_qty } = req.body;
  if (!location_id) return fail(res, 'location_id is required');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Get current stock to calculate delta for ledger
    const [current] = await conn.query(
      'SELECT on_hand_qty FROM stock WHERE product_id=? AND location_id=?',
      [req.params.id, location_id]
    );
    const prevQty = current.length ? current[0].on_hand_qty : 0;
    const newQty = on_hand_qty ?? prevQty;
    const delta = newQty - prevQty;

    // Upsert stock
    await conn.query(
      `INSERT INTO stock (product_id, location_id, on_hand_qty, free_to_use_qty)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         on_hand_qty = VALUES(on_hand_qty),
         free_to_use_qty = VALUES(free_to_use_qty)`,
      [req.params.id, location_id, newQty, free_to_use_qty ?? newQty]
    );

    // Write ledger row if stock changed
    if (delta !== 0) {
      await conn.query(
        `INSERT INTO move_history
           (reference, contact, from_location, to_location, product_id, quantity, direction, status)
         VALUES (?, 'Stock Adjustment', ?, ?, ?, ?, ?, 'done')`,
        [
          `ADJ/${req.params.id}`,
          delta < 0 ? 'Stock' : 'Supplier',
          delta < 0 ? 'Removed' : 'Stock',
          req.params.id,
          Math.abs(delta),
          delta > 0 ? 'in' : 'out',
        ]
      );
    }

    await conn.commit();
    return ok(res, { message: 'Stock updated' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return fail(res, 'Failed to update stock', 500);
  } finally {
    conn.release();
  }
}

module.exports = { getCategories, createCategory, getProducts, getProduct, createProduct, updateProduct, deleteProduct, updateStock };
