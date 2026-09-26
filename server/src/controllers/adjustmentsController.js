// server/src/controllers/adjustmentsController.js
// Handles physical inventory counts, theoretical vs counted delta calculation,
// atomic stock table updates, and move_history ledger logging.
const pool = require('../db/connection');

/**
 * GET /api/adjustments
 * List all stock adjustment audit records with product, location, and user info.
 */
exports.listAdjustments = async (req, res) => {
  try {
    const { search, product_id, location_id } = req.query;
    let sql = `
      SELECT a.*,
             p.name        AS product_name,
             p.sku         AS product_sku,
             p.unit_of_measure,
             l.name        AS location_name,
             l.short_code  AS location_code,
             w.name        AS warehouse_name,
             w.short_code  AS warehouse_code,
             COALESCE(u.login_id, 'System') AS logged_by_name
      FROM stock_adjustments a
      JOIN products p ON a.product_id = p.id
      JOIN locations l ON a.location_id = l.id
      LEFT JOIN warehouses w ON l.warehouse_id = w.id
      LEFT JOIN users u ON a.logged_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (product_id) {
      sql += ' AND a.product_id = ?';
      params.push(product_id);
    }
    if (location_id) {
      sql += ' AND a.location_id = ?';
      params.push(location_id);
    }
    if (search) {
      sql += ' AND (p.name LIKE ? OR p.sku LIKE ? OR l.name LIKE ? OR a.notes LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY a.adjustment_date DESC';

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * GET /api/adjustments/stats
 * Summary stats for inventory audits.
 */
exports.getStats = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        COUNT(*) AS total_adjustments,
        COALESCE(SUM(CASE WHEN delta > 0 THEN 1 ELSE 0 END), 0) AS positive_adjustments,
        COALESCE(SUM(CASE WHEN delta < 0 THEN 1 ELSE 0 END), 0) AS negative_adjustments,
        COALESCE(SUM(CASE WHEN delta = 0 THEN 1 ELSE 0 END), 0) AS matched_counts,
        COALESCE(SUM(delta), 0) AS net_delta
      FROM stock_adjustments
    `);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * POST /api/adjustments
 * Record a physical stock count, calculate delta, update stock, and log to move_history.
 * Body: { product_id, location_id, counted_qty, notes }
 */
exports.createAdjustment = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { product_id, location_id, counted_qty, notes } = req.body;

    if (!product_id || !location_id || counted_qty === undefined || counted_qty === null) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        error: { message: 'product_id, location_id, and counted_qty are required' },
      });
    }

    const counted = Number(counted_qty);
    if (!Number.isInteger(counted) || counted < 0) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        error: { message: 'counted_qty must be a non-negative whole integer' },
      });
    }

    // Verify product exists
    const [products] = await conn.query('SELECT id, name, sku FROM products WHERE id = ?', [product_id]);
    if (products.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    }
    const product = products[0];

    // Verify location exists
    const [locations] = await conn.query(
      `SELECT l.id, l.name, w.short_code AS warehouse_code
       FROM locations l
       LEFT JOIN warehouses w ON l.warehouse_id = w.id
       WHERE l.id = ?`,
      [location_id]
    );
    if (locations.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: { message: 'Location not found' } });
    }
    const location = locations[0];

    // Lock existing stock row
    const [stockRows] = await conn.query(
      'SELECT on_hand_qty, free_to_use_qty FROM stock WHERE product_id = ? AND location_id = ? FOR UPDATE',
      [product_id, location_id]
    );

    const recordedQty = stockRows.length > 0 ? stockRows[0].on_hand_qty : 0;
    const delta = counted - recordedQty;
    const userId = req.user?.id || 1;

    // 1. Insert into stock_adjustments
    const [adjResult] = await conn.query(
      `INSERT INTO stock_adjustments (product_id, location_id, recorded_qty, counted_qty, delta, logged_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [product_id, location_id, recordedQty, counted, delta, userId, notes || 'Physical inventory count']
    );

    const adjId = adjResult.insertId;
    const reference = `ADJ/${String(adjId).padStart(5, '0')}`;

    // 2. Update or insert stock table
    await conn.query(
      `INSERT INTO stock (product_id, location_id, on_hand_qty, free_to_use_qty)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         on_hand_qty = VALUES(on_hand_qty),
         free_to_use_qty = free_to_use_qty + ?`,
      [product_id, location_id, counted, counted, delta]
    );

    // 3. Append to move_history ledger if there is any quantity change
    if (delta !== 0) {
      const direction = delta > 0 ? 'in' : 'out';
      const fromLoc = delta < 0 ? location.name : 'Physical Audit (Adjustment)';
      const toLoc = delta > 0 ? location.name : 'Inventory Shrinkage (Adjustment)';

      await conn.query(
        `INSERT INTO move_history
           (reference, contact, from_location, to_location, product_id, quantity, direction, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'done')`,
        [
          reference,
          `Audit Adjustment: ${notes || 'Cycle Count'}`,
          fromLoc,
          toLoc,
          product_id,
          Math.abs(delta),
          direction,
        ]
      );
    }

    await conn.commit();

    res.status(201).json({
      success: true,
      data: {
        id: adjId,
        reference,
        product_id,
        product_name: product.name,
        product_sku: product.sku,
        location_id,
        location_name: location.name,
        recorded_qty: recordedQty,
        counted_qty: counted,
        delta,
        notes: notes || 'Physical inventory count',
        adjustment_date: new Date().toISOString(),
      },
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, error: { message: err.message } });
  } finally {
    conn.release();
  }
};
