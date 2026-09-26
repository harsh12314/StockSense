// server/src/controllers/receiptsController.js
const pool = require('../db/connection');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate the next WH/IN/XXX reference.
 * Finds the current MAX id in receipts and pads (id+1).
 */
async function generateReference(conn) {
  const [[{ maxId }]] = await conn.query('SELECT COALESCE(MAX(id), 0) AS maxId FROM receipts');
  const next = String(maxId + 1).padStart(3, '0');
  return `WH/IN/${next}`;
}

/**
 * Standard success response.
 */
const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

/**
 * Standard error response.
 */
const err = (res, message, status = 500) =>
  res.status(status).json({ success: false, error: { message } });

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/receipts/meta/products
 * Returns all products for the Add Product dropdown.
 * Lives in the receipts controller until the Products feature is merged.
 */
async function listProducts(_req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, sku, unit_of_measure, per_unit_cost FROM products ORDER BY name ASC'
    );
    return ok(res, rows);
  } catch (e) {
    return err(res, e.message);
  }
}

/**
 * GET /api/receipts
 * List all receipts (with optional ?status= and ?search= filters).
 */
async function listReceipts(req, res) {
  try {
    const { status, search } = req.query;
    let sql = `
      SELECT
        r.id, r.reference, r.from_contact, r.schedule_date,
        r.status, r.created_at,
        l.name AS to_location,
        CONCAT(u.login_id) AS responsible
      FROM receipts r
      JOIN locations l ON l.id = r.to_location_id
      JOIN users u ON u.id = r.responsible_user_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND r.status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (r.reference LIKE ? OR r.from_contact LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY r.created_at DESC';

    const [rows] = await pool.query(sql, params);
    return ok(res, rows);
  } catch (e) {
    return err(res, e.message);
  }
}

/**
 * POST /api/receipts
 * Create a new receipt in Draft status.
 * Body: { to_location_id, from_contact?, schedule_date? }
 */
async function createReceipt(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { to_location_id, from_contact, schedule_date } = req.body;
    if (!to_location_id) {
      await conn.rollback();
      conn.release();
      return err(res, 'to_location_id is required', 400);
    }

    const reference = await generateReference(conn);

    const [result] = await conn.query(
      `INSERT INTO receipts (reference, from_contact, to_location_id, schedule_date, responsible_user_id, status)
       VALUES (?, ?, ?, ?, ?, 'draft')`,
      [reference, from_contact || null, to_location_id, schedule_date || null, req.user.id]
    );

    await conn.commit();
    return ok(res, { id: result.insertId, reference }, 201);
  } catch (e) {
    await conn.rollback();
    return err(res, e.message);
  } finally {
    conn.release();
  }
}

/**
 * GET /api/receipts/:id
 * Get a single receipt with its product lines.
 */
async function getReceipt(req, res) {
  try {
    const { id } = req.params;

    const [[receipt]] = await pool.query(
      `SELECT
         r.id, r.reference, r.from_contact, r.schedule_date,
         r.status, r.created_at,
         l.name AS to_location, l.id AS to_location_id,
         u.login_id AS responsible
       FROM receipts r
       JOIN locations l ON l.id = r.to_location_id
       JOIN users u ON u.id = r.responsible_user_id
       WHERE r.id = ?`,
      [id]
    );

    if (!receipt) return err(res, 'Receipt not found', 404);

    const [lines] = await pool.query(
      `SELECT rl.id, rl.quantity, p.id AS product_id, p.name AS product_name, p.sku
       FROM receipt_lines rl
       JOIN products p ON p.id = rl.product_id
       WHERE rl.receipt_id = ?`,
      [id]
    );

    return ok(res, { ...receipt, lines });
  } catch (e) {
    return err(res, e.message);
  }
}

/**
 * PUT /api/receipts/:id/header
 * Update editable header fields: from_contact, schedule_date.
 * Only allowed while not done/canceled.
 * Body: { from_contact?, schedule_date? }
 */
async function updateHeader(req, res) {
  try {
    const { id } = req.params;
    const { from_contact, schedule_date } = req.body;

    const [[receipt]] = await pool.query(
      'SELECT status FROM receipts WHERE id = ?', [id]
    );
    if (!receipt) return err(res, 'Receipt not found', 404);
    if (['done', 'canceled'].includes(receipt.status)) {
      return err(res, `Cannot edit a ${receipt.status} receipt`, 400);
    }

    await pool.query(
      'UPDATE receipts SET from_contact = ?, schedule_date = ? WHERE id = ?',
      [from_contact || null, schedule_date || null, id]
    );
    return ok(res, { id, from_contact, schedule_date });
  } catch (e) {
    return err(res, e.message);
  }
}

/**
 * POST /api/receipts/:id/lines
 * Add a product line to a receipt (only if not done/canceled).
 * Body: { product_id, quantity }
 */
async function addLine(req, res) {
  try {
    const { id } = req.params;
    const { product_id, quantity } = req.body;

    if (!product_id || !quantity || quantity <= 0) {
      return err(res, 'product_id and a positive quantity are required', 400);
    }

    const [[receipt]] = await pool.query(
      'SELECT status FROM receipts WHERE id = ?', [id]
    );
    if (!receipt) return err(res, 'Receipt not found', 404);
    if (['done', 'canceled'].includes(receipt.status)) {
      return err(res, `Cannot add lines to a ${receipt.status} receipt`, 400);
    }

    const [result] = await pool.query(
      'INSERT INTO receipt_lines (receipt_id, product_id, quantity) VALUES (?, ?, ?)',
      [id, product_id, quantity]
    );

    return ok(res, { id: result.insertId, product_id, quantity }, 201);
  } catch (e) {
    // MySQL FK error 1452 = product_id does not exist in products table
    if (e.errno === 1452) {
      return err(res, `Product ID ${req.body.product_id} does not exist. Use the dropdown to pick a valid product.`, 400);
    }
    return err(res, e.message);
  }
}

/**
 * DELETE /api/receipts/:id/lines/:lineId
 * Remove a product line.
 */
async function removeLine(req, res) {
  try {
    const { id, lineId } = req.params;

    const [[receipt]] = await pool.query(
      'SELECT status FROM receipts WHERE id = ?', [id]
    );
    if (!receipt) return err(res, 'Receipt not found', 404);
    if (['done', 'canceled'].includes(receipt.status)) {
      return err(res, `Cannot remove lines from a ${receipt.status} receipt`, 400);
    }

    await pool.query(
      'DELETE FROM receipt_lines WHERE id = ? AND receipt_id = ?', [lineId, id]
    );
    return ok(res, { deleted: true });
  } catch (e) {
    return err(res, e.message);
  }
}

/**
 * PUT /api/receipts/:id/todo
 * Draft → Ready.
 */
async function markReady(req, res) {
  try {
    const { id } = req.params;

    const [[receipt]] = await pool.query(
      'SELECT status FROM receipts WHERE id = ?', [id]
    );
    if (!receipt) return err(res, 'Receipt not found', 404);
    if (receipt.status !== 'draft') {
      return err(res, `Receipt is already ${receipt.status}`, 400);
    }

    // Must have at least one line
    const [[{ lineCount }]] = await pool.query(
      'SELECT COUNT(*) AS lineCount FROM receipt_lines WHERE receipt_id = ?', [id]
    );
    if (lineCount === 0) {
      return err(res, 'Add at least one product before marking Ready', 400);
    }

    await pool.query("UPDATE receipts SET status = 'ready' WHERE id = ?", [id]);
    return ok(res, { id, status: 'ready' });
  } catch (e) {
    return err(res, e.message);
  }
}

/**
 * PUT /api/receipts/:id/validate
 * Ready → Done  +  mutate stock  +  write move_history ledger.
 * All three in one transaction.
 */
async function validateReceipt(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;

    const [[receipt]] = await conn.query(
      `SELECT r.*, l.name AS to_location_name
       FROM receipts r
       JOIN locations l ON l.id = r.to_location_id
       WHERE r.id = ?`,
      [id]
    );
    if (!receipt) {
      await conn.rollback();
      conn.release();
      return err(res, 'Receipt not found', 404);
    }
    if (receipt.status !== 'ready') {
      await conn.rollback();
      conn.release();
      return err(res, `Receipt must be in Ready status to validate (current: ${receipt.status})`, 400);
    }

    const [lines] = await conn.query(
      'SELECT * FROM receipt_lines WHERE receipt_id = ?', [id]
    );
    if (lines.length === 0) {
      await conn.rollback();
      conn.release();
      return err(res, 'No product lines to validate', 400);
    }

    for (const line of lines) {
      // 1. Upsert stock
      await conn.query(
        `INSERT INTO stock (product_id, location_id, on_hand_qty, free_to_use_qty)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           on_hand_qty     = on_hand_qty     + VALUES(on_hand_qty),
           free_to_use_qty = free_to_use_qty + VALUES(free_to_use_qty)`,
        [line.product_id, receipt.to_location_id, line.quantity, line.quantity]
      );

      // 2. Write move_history ledger row
      await conn.query(
        `INSERT INTO move_history
           (reference, contact, from_location, to_location, product_id, quantity, direction, status)
         VALUES (?, ?, 'Supplier', ?, ?, ?, 'in', 'done')`,
        [receipt.reference, receipt.from_contact || 'Unknown', receipt.to_location_name,
         line.product_id, line.quantity]
      );
    }

    // 3. Mark receipt done
    await conn.query("UPDATE receipts SET status = 'done' WHERE id = ?", [id]);

    await conn.commit();
    return ok(res, { id, status: 'done' });
  } catch (e) {
    await conn.rollback();
    return err(res, e.message);
  } finally {
    conn.release();
  }
}

/**
 * PUT /api/receipts/:id/cancel
 * Set status = canceled (no stock reversal in MVP).
 */
async function cancelReceipt(req, res) {
  try {
    const { id } = req.params;

    const [[receipt]] = await pool.query(
      'SELECT status FROM receipts WHERE id = ?', [id]
    );
    if (!receipt) return err(res, 'Receipt not found', 404);
    if (receipt.status === 'done') {
      return err(res, 'Cannot cancel a validated receipt', 400);
    }

    await pool.query("UPDATE receipts SET status = 'canceled' WHERE id = ?", [id]);
    return ok(res, { id, status: 'canceled' });
  } catch (e) {
    return err(res, e.message);
  }
}

module.exports = {
  listProducts,
  listReceipts,
  createReceipt,
  getReceipt,
  updateHeader,
  addLine,
  removeLine,
  markReady,
  validateReceipt,
  cancelReceipt,
};
