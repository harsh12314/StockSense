// server/src/controllers/productsController.js
// Products & Categories — vertical slice controller
// Pattern: parameterised queries, transaction for stock mutations, { success, data } envelope

const pool = require('../db/connection');

/* ─── helper: stock upsert (from DATABASE.md pattern) ─────────────────────── */
async function applyStockChange(conn, { productId, locationId, delta }) {
  await conn.query(
    `INSERT INTO stock (product_id, location_id, on_hand_qty, free_to_use_qty)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       on_hand_qty     = on_hand_qty     + VALUES(on_hand_qty),
       free_to_use_qty = free_to_use_qty + VALUES(free_to_use_qty)`,
    [productId, locationId, delta, delta]
  );
}

/* ─── GET /api/products ─────────────────────────────────────────────────────
   Returns products joined with their category and aggregated stock totals.
   Optional: ?search=sku_or_name  ?category_id=N  ?low_stock=1            */
exports.list = async (req, res, next) => {
  try {
    const { search, category_id, low_stock } = req.query;

    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      where += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category_id) {
      where += ' AND p.category_id = ?';
      params.push(category_id);
    }

    const sql = `
      SELECT
        p.id,
        p.name,
        p.sku,
        p.unit_of_measure,
        p.per_unit_cost,
        p.reordering_rule,
        c.id   AS category_id,
        c.name AS category_name,
        COALESCE(SUM(s.on_hand_qty),     0) AS on_hand_qty,
        COALESCE(SUM(s.free_to_use_qty), 0) AS free_to_use_qty
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN stock      s ON s.product_id = p.id
      ${where}
      GROUP BY p.id, p.name, p.sku, p.unit_of_measure,
               p.per_unit_cost, p.reordering_rule,
               c.id, c.name
      ${low_stock === '1' ? 'HAVING on_hand_qty <= 5' : ''}
      ORDER BY p.name ASC
    `;

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

/* ─── GET /api/products/:id ─────────────────────────────────────────────── */
exports.getById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         p.*,
         c.name AS category_name,
         COALESCE(SUM(s.on_hand_qty),     0) AS on_hand_qty,
         COALESCE(SUM(s.free_to_use_qty), 0) AS free_to_use_qty
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN stock      s ON s.product_id = p.id
       WHERE p.id = ?
       GROUP BY p.id`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

/* ─── POST /api/products ────────────────────────────────────────────────────
   Body: { name, sku, category_id?, unit_of_measure?, per_unit_cost?,
           initial_stock?, initial_location_id? }                           */
exports.create = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      name,
      sku,
      category_id,
      unit_of_measure,
      per_unit_cost,
      initial_stock,
      initial_location_id,
    } = req.body;

    if (!name || !sku) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        error: { message: 'Name and SKU are required' },
      });
    }

    // Duplicate SKU guard
    const [existing] = await conn.query(
      'SELECT id FROM products WHERE sku = ?',
      [sku]
    );
    if (existing.length) {
      await conn.rollback();
      return res.status(409).json({
        success: false,
        error: { message: `SKU "${sku}" is already in use` },
      });
    }

    const [result] = await conn.query(
      `INSERT INTO products (name, sku, category_id, unit_of_measure, per_unit_cost)
       VALUES (?, ?, ?, ?, ?)`,
      [
        name,
        sku,
        category_id || null,
        unit_of_measure || null,
        per_unit_cost != null ? per_unit_cost : 0,
      ]
    );

    const productId = result.insertId;

    // Seed initial stock if provided
    const initialQty = parseInt(initial_stock, 10);
    if (initialQty > 0) {
      // Use provided location or fall back to the first available location
      let locationId = initial_location_id ? parseInt(initial_location_id, 10) : null;
      if (!locationId) {
        const [locs] = await conn.query(
          'SELECT id FROM locations ORDER BY id ASC LIMIT 1'
        );
        locationId = locs.length ? locs[0].id : null;
      }

      if (locationId) {
        await applyStockChange(conn, {
          productId,
          locationId,
          delta: initialQty,
        });

        // Log to move_history per ledger pattern
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
            initialQty,
          ]
        );
      }
    }

    await conn.commit();

    // Return newly created product with stock
    const [created] = await pool.query(
      `SELECT p.*, c.name AS category_name,
              COALESCE(SUM(s.on_hand_qty), 0) AS on_hand_qty,
              COALESCE(SUM(s.free_to_use_qty), 0) AS free_to_use_qty
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN stock s ON s.product_id = p.id
       WHERE p.id = ?
       GROUP BY p.id`,
      [productId]
    );

    res.status(201).json({ success: true, data: created[0] });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

/* ─── PUT /api/products/:id ─────────────────────────────────────────────── */
exports.update = async (req, res, next) => {
  try {
    const { name, sku, category_id, unit_of_measure, per_unit_cost } = req.body;

    // Duplicate SKU guard (excluding self)
    if (sku) {
      const [dup] = await pool.query(
        'SELECT id FROM products WHERE sku = ? AND id != ?',
        [sku, req.params.id]
      );
      if (dup.length) {
        return res.status(409).json({
          success: false,
          error: { message: `SKU "${sku}" is already in use` },
        });
      }
    }

    await pool.query(
      `UPDATE products
       SET name = COALESCE(?, name),
           sku  = COALESCE(?, sku),
           category_id     = COALESCE(?, category_id),
           unit_of_measure = COALESCE(?, unit_of_measure),
           per_unit_cost   = COALESCE(?, per_unit_cost)
       WHERE id = ?`,
      [name, sku, category_id, unit_of_measure, per_unit_cost, req.params.id]
    );

    const [updated] = await pool.query(
      `SELECT p.*, c.name AS category_name,
              COALESCE(SUM(s.on_hand_qty), 0) AS on_hand_qty,
              COALESCE(SUM(s.free_to_use_qty), 0) AS free_to_use_qty
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN stock s ON s.product_id = p.id
       WHERE p.id = ?
       GROUP BY p.id`,
      [req.params.id]
    );

    if (!updated.length) {
      return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    }

    res.json({ success: true, data: updated[0] });
  } catch (err) {
    next(err);
  }
};

/* ─── PATCH /api/products/:id/stock ─────────────────────────────────────────
   Inline stock edit from the table view (PRD §5.1).
   Body: { on_hand_qty, location_id? }                                      */
exports.updateStock = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const productId = parseInt(req.params.id, 10);
    const { on_hand_qty, location_id } = req.body;

    if (on_hand_qty == null) {
      await conn.rollback();
      return res.status(400).json({ success: false, error: { message: 'on_hand_qty is required' } });
    }

    // Resolve location
    let locId = location_id ? parseInt(location_id, 10) : null;
    if (!locId) {
      const [locs] = await conn.query('SELECT id FROM locations ORDER BY id LIMIT 1');
      locId = locs.length ? locs[0].id : null;
    }
    if (!locId) {
      await conn.rollback();
      return res.status(422).json({ success: false, error: { message: 'No warehouse locations found. Add a location first.' } });
    }

    // Current stock
    const [cur] = await conn.query(
      'SELECT on_hand_qty FROM stock WHERE product_id = ? AND location_id = ?',
      [productId, locId]
    );
    const currentQty = cur.length ? cur[0].on_hand_qty : 0;
    const delta = parseInt(on_hand_qty, 10) - currentQty;

    if (delta !== 0) {
      await applyStockChange(conn, { productId, locationId: locId, delta });

      // Ledger entry
      await conn.query(
        `INSERT INTO move_history
           (reference, contact, from_location, to_location, product_id, quantity, direction, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'done')`,
        [
          `ADJ/${productId}`,
          'Stock Adjustment',
          delta < 0 ? 'Stock' : 'Supplier',
          delta < 0 ? 'Outbound' : 'Stock',
          productId,
          Math.abs(delta),
          delta < 0 ? 'out' : 'in',
        ]
      );
    }

    await conn.commit();
    res.json({ success: true, data: { product_id: productId, on_hand_qty: parseInt(on_hand_qty, 10) } });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

/* ─── DELETE /api/products/:id ──────────────────────────────────────────── */
exports.remove = async (req, res, next) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM products WHERE id = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    }
    res.json({ success: true, data: { id: parseInt(req.params.id, 10) } });
  } catch (err) {
    next(err);
  }
};

/* ─── GET /api/products/categories ─────────────────────────────────────── */
exports.listCategories = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM categories ORDER BY name ASC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

/* ─── POST /api/products/categories ────────────────────────────────────── */
exports.createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: { message: 'Category name is required' } });
    }
    const [result] = await pool.query(
      'INSERT INTO categories (name) VALUES (?)',
      [name]
    );
    res.status(201).json({ success: true, data: { id: result.insertId, name } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: { message: `Category "${req.body.name}" already exists` } });
    }
    next(err);
  }
};
