// server/src/controllers/deliveriesController.js
// Full delivery lifecycle: Create → Check Availability → Validate → Done
const pool = require('../db/connection');

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Applies a stock delta (positive = increase, negative = decrease)
 * Uses INSERT ... ON DUPLICATE KEY UPDATE for upsert behavior.
 * Must be called inside an active transaction (conn, not pool).
 */
async function applyStockChange(conn, { productId, locationId, delta }) {
  await conn.query(
    `INSERT INTO stock (product_id, location_id, on_hand_qty, free_to_use_qty)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       on_hand_qty = on_hand_qty + VALUES(on_hand_qty),
       free_to_use_qty = free_to_use_qty + VALUES(free_to_use_qty)`,
    [productId, locationId, delta, delta]
  );
}

/**
 * Generates the next reference for a delivery: <WarehouseCode>/OUT/<padded_id>
 */
async function generateReference(conn, warehouseCode, deliveryId) {
  const padded = String(deliveryId).padStart(5, '0');
  return `${warehouseCode}/OUT/${padded}`;
}

// ── Controllers ──────────────────────────────────────────────────────

/**
 * GET /api/deliveries
 * List deliveries with optional filters: status, search (reference/contact), warehouse_id
 */
exports.list = async (req, res) => {
  try {
    const { status, search, warehouse_id } = req.query;
    let sql = `
      SELECT d.*,
             l.name        AS from_location_name,
             l.short_code  AS from_location_code,
             w.name        AS warehouse_name,
             w.short_code  AS warehouse_code,
             u.login_id    AS responsible_name,
             (SELECT COUNT(*) FROM delivery_lines WHERE delivery_id = d.id) AS line_count
      FROM deliveries d
      LEFT JOIN locations  l ON d.from_location_id = l.id
      LEFT JOIN warehouses w ON l.warehouse_id = w.id
      LEFT JOIN users      u ON d.responsible_user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND d.status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (d.reference LIKE ? OR d.to_contact LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (warehouse_id) {
      sql += ' AND w.id = ?';
      params.push(warehouse_id);
    }

    sql += ' ORDER BY d.created_at DESC';

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * GET /api/deliveries/stats
 * Dashboard-style KPI stats for deliveries
 */
exports.stats = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        COUNT(CASE WHEN status IN ('draft','waiting','ready') AND schedule_date < CURDATE() THEN 1 END) AS late_count,
        COUNT(CASE WHEN status = 'waiting' THEN 1 END) AS waiting_count,
        COUNT(CASE WHEN status IN ('draft','waiting','ready') AND schedule_date >= CURDATE() THEN 1 END) AS operations_count,
        COUNT(CASE WHEN status IN ('draft','waiting','ready') THEN 1 END) AS to_deliver_count,
        COUNT(CASE WHEN status = 'done' THEN 1 END) AS done_count,
        COUNT(*) AS total_count
      FROM deliveries
    `);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * GET /api/deliveries/:id
 * Get single delivery with all product lines and stock info
 */
exports.getById = async (req, res) => {
  try {
    const [deliveries] = await pool.query(
      `SELECT d.*,
              l.name        AS from_location_name,
              l.short_code  AS from_location_code,
              w.name        AS warehouse_name,
              w.short_code  AS warehouse_code,
              w.id          AS warehouse_id,
              u.login_id    AS responsible_name
       FROM deliveries d
       LEFT JOIN locations  l ON d.from_location_id = l.id
       LEFT JOIN warehouses w ON l.warehouse_id = w.id
       LEFT JOIN users      u ON d.responsible_user_id = u.id
       WHERE d.id = ?`,
      [req.params.id]
    );

    if (deliveries.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Delivery not found' },
      });
    }

    const delivery = deliveries[0];

    // Fetch product lines with stock at the from_location
    const [lines] = await pool.query(
      `SELECT dl.*,
              p.name          AS product_name,
              p.sku           AS product_sku,
              p.per_unit_cost AS product_cost,
              COALESCE(s.on_hand_qty, 0) AS stock_on_hand
       FROM delivery_lines dl
       JOIN products p ON dl.product_id = p.id
       LEFT JOIN stock s ON s.product_id = p.id
                        AND s.location_id = ?
       WHERE dl.delivery_id = ?
       ORDER BY dl.id`,
      [delivery.from_location_id, delivery.id]
    );

    delivery.lines = lines;
    res.json({ success: true, data: delivery });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * POST /api/deliveries
 * Create a new delivery order.
 * Body: { from_location_id, to_contact?, delivery_address?, schedule_date?, operation_type? }
 * Responsible is auto-filled from the JWT user.
 * Reference is auto-generated: <WarehouseCode>/OUT/<id>
 */
exports.create = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      from_location_id,
      to_contact,
      delivery_address,
      schedule_date,
      operation_type,
    } = req.body;

    if (!from_location_id) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        error: { message: 'Source location (from_location_id) is required' },
      });
    }

    // Look up warehouse short code for reference generation
    const [locs] = await conn.query(
      `SELECT l.id, w.short_code AS warehouse_code
       FROM locations l
       JOIN warehouses w ON l.warehouse_id = w.id
       WHERE l.id = ?`,
      [from_location_id]
    );

    if (locs.length === 0) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid source location' },
      });
    }

    const warehouseCode = locs[0].warehouse_code;

    // Insert with a placeholder reference — we'll update it after getting the ID
    const [result] = await conn.query(
      `INSERT INTO deliveries
         (reference, from_location_id, to_contact, delivery_address,
          schedule_date, operation_type, responsible_user_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [
        'TEMP', // placeholder
        from_location_id,
        to_contact || null,
        delivery_address || null,
        schedule_date || null,
        operation_type || 'Delivery Orders',
        req.user.id,
      ]
    );

    const reference = await generateReference(conn, warehouseCode, result.insertId);
    await conn.query('UPDATE deliveries SET reference = ? WHERE id = ?', [
      reference,
      result.insertId,
    ]);

    await conn.commit();

    // Fetch the full delivery to return
    const [created] = await pool.query(
      `SELECT d.*,
              l.name        AS from_location_name,
              l.short_code  AS from_location_code,
              w.name        AS warehouse_name,
              u.login_id    AS responsible_name
       FROM deliveries d
       LEFT JOIN locations  l ON d.from_location_id = l.id
       LEFT JOIN warehouses w ON l.warehouse_id = w.id
       LEFT JOIN users      u ON d.responsible_user_id = u.id
       WHERE d.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ success: true, data: { ...created[0], lines: [] } });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, error: { message: err.message } });
  } finally {
    conn.release();
  }
};

/**
 * PUT /api/deliveries/:id
 * Update delivery header fields. Only allowed in draft/waiting status.
 */
exports.update = async (req, res) => {
  try {
    const { to_contact, delivery_address, schedule_date, operation_type, from_location_id } = req.body;

    const [existing] = await pool.query('SELECT status FROM deliveries WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Delivery not found' } });
    }
    if (!['draft', 'waiting'].includes(existing[0].status)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Can only edit deliveries in Draft or Waiting status' },
      });
    }

    const fields = [];
    const params = [];

    if (to_contact !== undefined) { fields.push('to_contact = ?'); params.push(to_contact); }
    if (delivery_address !== undefined) { fields.push('delivery_address = ?'); params.push(delivery_address); }
    if (schedule_date !== undefined) { fields.push('schedule_date = ?'); params.push(schedule_date); }
    if (operation_type !== undefined) { fields.push('operation_type = ?'); params.push(operation_type); }
    if (from_location_id !== undefined) { fields.push('from_location_id = ?'); params.push(from_location_id); }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: { message: 'No fields to update' } });
    }

    params.push(req.params.id);
    await pool.query(`UPDATE deliveries SET ${fields.join(', ')} WHERE id = ?`, params);

    res.json({ success: true, data: { message: 'Delivery updated' } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * POST /api/deliveries/:id/lines
 * Add a product line to the delivery. Checks out-of-stock status.
 * Body: { product_id, quantity }
 */
exports.addLine = async (req, res) => {
  try {
    const { product_id, quantity } = req.body;

    if (!product_id || !quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'product_id and a positive quantity are required' },
      });
    }

    // Verify delivery exists and is editable
    const [deliveries] = await pool.query(
      'SELECT id, from_location_id, status FROM deliveries WHERE id = ?',
      [req.params.id]
    );
    if (deliveries.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Delivery not found' },
      });
    }
    if (!['draft', 'waiting'].includes(deliveries[0].status)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Can only add lines to deliveries in Draft or Waiting status' },
      });
    }

    // Check stock at the from_location
    const [stockRows] = await pool.query(
      'SELECT on_hand_qty FROM stock WHERE product_id = ? AND location_id = ?',
      [product_id, deliveries[0].from_location_id]
    );
    const currentStock = stockRows.length > 0 ? stockRows[0].on_hand_qty : 0;
    const isOutOfStock = currentStock < quantity;

    const [result] = await pool.query(
      'INSERT INTO delivery_lines (delivery_id, product_id, quantity, out_of_stock) VALUES (?, ?, ?, ?)',
      [req.params.id, product_id, quantity, isOutOfStock]
    );

    // Fetch the created line with product info
    const [line] = await pool.query(
      `SELECT dl.*,
              p.name          AS product_name,
              p.sku           AS product_sku,
              p.per_unit_cost AS product_cost,
              COALESCE(s.on_hand_qty, 0) AS stock_on_hand
       FROM delivery_lines dl
       JOIN products p ON dl.product_id = p.id
       LEFT JOIN stock s ON s.product_id = p.id
                        AND s.location_id = ?
       WHERE dl.id = ?`,
      [deliveries[0].from_location_id, result.insertId]
    );

    res.status(201).json({ success: true, data: line[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * DELETE /api/deliveries/:id/lines/:lineId
 */
exports.removeLine = async (req, res) => {
  try {
    const [deliveries] = await pool.query(
      'SELECT status FROM deliveries WHERE id = ?',
      [req.params.id]
    );
    if (deliveries.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Delivery not found' } });
    }
    if (!['draft', 'waiting'].includes(deliveries[0].status)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Can only remove lines from Draft or Waiting deliveries' },
      });
    }

    const [result] = await pool.query(
      'DELETE FROM delivery_lines WHERE id = ? AND delivery_id = ?',
      [req.params.lineId, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: { message: 'Line not found' } });
    }

    res.json({ success: true, data: { message: 'Line removed' } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};

/**
 * POST /api/deliveries/:id/check-availability
 * Check stock for all lines, update out_of_stock flags.
 * If all lines have stock → set status to 'ready'.
 * If any line lacks stock → set status to 'waiting'.
 */
exports.checkAvailability = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [deliveries] = await conn.query(
      'SELECT * FROM deliveries WHERE id = ?',
      [req.params.id]
    );
    if (deliveries.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: { message: 'Delivery not found' } });
    }

    const delivery = deliveries[0];
    if (!['draft', 'waiting'].includes(delivery.status)) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        error: { message: 'Can only check availability for Draft or Waiting deliveries' },
      });
    }

    const [lines] = await conn.query(
      `SELECT dl.*, COALESCE(s.on_hand_qty, 0) AS stock_on_hand
       FROM delivery_lines dl
       LEFT JOIN stock s ON s.product_id = dl.product_id
                        AND s.location_id = ?
       WHERE dl.delivery_id = ?`,
      [delivery.from_location_id, delivery.id]
    );

    if (lines.length === 0) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        error: { message: 'No product lines to check' },
      });
    }

    let allAvailable = true;
    for (const line of lines) {
      const isOut = line.stock_on_hand < line.quantity;
      if (isOut) allAvailable = false;
      await conn.query(
        'UPDATE delivery_lines SET out_of_stock = ? WHERE id = ?',
        [isOut, line.id]
      );
    }

    // Transition: draft/waiting → ready (all OK) or → waiting (some missing)
    const newStatus = allAvailable ? 'ready' : 'waiting';
    await conn.query('UPDATE deliveries SET status = ? WHERE id = ?', [newStatus, delivery.id]);

    await conn.commit();

    res.json({
      success: true,
      data: {
        status: newStatus,
        all_available: allAvailable,
        message: allAvailable
          ? 'All items are in stock. Delivery is Ready.'
          : 'Some items are out of stock. Delivery is Waiting.',
      },
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, error: { message: err.message } });
  } finally {
    conn.release();
  }
};

/**
 * POST /api/deliveries/:id/validate
 * Ready → Done. Decreases stock and logs every line to move_history.
 * Wrapped in a single MySQL transaction.
 */
exports.validate = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock the delivery row
    const [deliveries] = await conn.query(
      `SELECT d.*,
              l.name        AS from_location_name,
              l.short_code  AS from_location_code
       FROM deliveries d
       JOIN locations l ON d.from_location_id = l.id
       WHERE d.id = ? FOR UPDATE`,
      [req.params.id]
    );

    if (deliveries.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: { message: 'Delivery not found' } });
    }

    const delivery = deliveries[0];

    if (delivery.status !== 'ready') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        error: { message: 'Delivery must be in Ready status to validate. Run Check Availability first.' },
      });
    }

    // Get all lines
    const [lines] = await conn.query(
      `SELECT dl.*, p.name AS product_name
       FROM delivery_lines dl
       JOIN products p ON dl.product_id = p.id
       WHERE dl.delivery_id = ?`,
      [delivery.id]
    );

    if (lines.length === 0) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot validate delivery with no product lines' },
      });
    }

    // For each line: verify stock, decrease it, log to move_history
    for (const line of lines) {
      // Final stock check
      const [stockRows] = await conn.query(
        'SELECT on_hand_qty FROM stock WHERE product_id = ? AND location_id = ? FOR UPDATE',
        [line.product_id, delivery.from_location_id]
      );
      const currentStock = stockRows.length > 0 ? stockRows[0].on_hand_qty : 0;

      if (currentStock < line.quantity) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          error: {
            message: `Insufficient stock for ${line.product_name}. Available: ${currentStock}, Required: ${line.quantity}`,
          },
        });
      }

      // Decrease stock
      await applyStockChange(conn, {
        productId: line.product_id,
        locationId: delivery.from_location_id,
        delta: -line.quantity,
      });

      // Log move_history entry
      await conn.query(
        `INSERT INTO move_history
           (reference, contact, from_location, to_location, product_id, quantity, direction, status)
         VALUES (?, ?, ?, ?, ?, ?, 'out', 'done')`,
        [
          delivery.reference,
          delivery.to_contact,
          delivery.from_location_name,
          delivery.delivery_address || delivery.to_contact || 'Customer',
          line.product_id,
          line.quantity,
        ]
      );
    }

    // Update delivery status
    await conn.query('UPDATE deliveries SET status = ? WHERE id = ?', ['done', delivery.id]);

    await conn.commit();

    res.json({
      success: true,
      data: { message: 'Delivery validated. Stock has been decreased and move history recorded.' },
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, error: { message: err.message } });
  } finally {
    conn.release();
  }
};

/**
 * POST /api/deliveries/:id/cancel
 * Sets status to 'canceled'. No stock reversal for MVP.
 */
exports.cancel = async (req, res) => {
  try {
    const [deliveries] = await pool.query(
      'SELECT status FROM deliveries WHERE id = ?',
      [req.params.id]
    );

    if (deliveries.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Delivery not found' } });
    }

    if (deliveries[0].status === 'done') {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot cancel a completed delivery' },
      });
    }
    if (deliveries[0].status === 'canceled') {
      return res.status(400).json({
        success: false,
        error: { message: 'Delivery is already canceled' },
      });
    }

    await pool.query('UPDATE deliveries SET status = ? WHERE id = ?', ['canceled', req.params.id]);
    res.json({ success: true, data: { message: 'Delivery canceled' } });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};
