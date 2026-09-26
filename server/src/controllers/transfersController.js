// server/src/controllers/transfersController.js
const pool = require('../db/connection');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Standard success response envelope.
 */
const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

/**
 * Standard error response envelope.
 */
const err = (res, message, status = 500) =>
  res.status(status).json({ success: false, error: { message } });

/**
 * Generate reference in format: <WarehouseCode>/TRANS/<5-digit-id>
 * e.g., WH/TRANS/00001
 */
async function generateReference(conn, fromLocationId) {
  let warehouseCode = 'WH';
  if (fromLocationId) {
    const [[loc]] = await conn.query(
      `SELECT w.short_code 
       FROM locations l 
       JOIN warehouses w ON l.warehouse_id = w.id 
       WHERE l.id = ?`,
      [fromLocationId]
    );
    if (loc && loc.short_code) {
      warehouseCode = loc.short_code.toUpperCase().replace(/\s+/g, '');
    }
  }

  const [[{ maxId }]] = await conn.query(
    'SELECT COALESCE(MAX(id), 0) AS maxId FROM internal_transfers'
  );
  let next = maxId + 1;
  let reference = `${warehouseCode}/TRANS/${String(next).padStart(5, '0')}`;
  while (true) {
    const [[existing]] = await conn.query(
      'SELECT id FROM internal_transfers WHERE reference = ?',
      [reference]
    );
    if (!existing) break;
    next += 1;
    reference = `${warehouseCode}/TRANS/${String(next).padStart(5, '0')}`;
  }
  return reference;
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/transfers
 * List all transfers with from/to location names, warehouse info, and line counts.
 */
async function list(req, res) {
  try {
    const { status, search } = req.query;

    let sql = `
      SELECT
        t.id,
        t.reference,
        t.from_location_id,
        fl.name AS from_location,
        fw.short_code AS from_warehouse_code,
        fw.name AS from_warehouse_name,
        t.to_location_id,
        tl.name AS to_location,
        tw.short_code AS to_warehouse_code,
        tw.name AS to_warehouse_name,
        t.transfer_date,
        t.responsible_user_id,
        u.login_id AS responsible,
        t.status,
        t.created_at,
        COALESCE(lc.line_count, 0) AS line_count,
        COALESCE(lc.total_quantity, 0) AS total_quantity
      FROM internal_transfers t
      JOIN locations fl ON fl.id = t.from_location_id
      LEFT JOIN warehouses fw ON fw.id = fl.warehouse_id
      JOIN locations tl ON tl.id = t.to_location_id
      LEFT JOIN warehouses tw ON tw.id = tl.warehouse_id
      JOIN users u ON u.id = t.responsible_user_id
      LEFT JOIN (
        SELECT 
          transfer_id, 
          COUNT(*) AS line_count,
          SUM(quantity) AS total_quantity
        FROM transfer_lines 
        GROUP BY transfer_id
      ) lc ON lc.transfer_id = t.id
      WHERE 1=1
    `;

    const params = [];

    if (status && status !== 'ALL') {
      sql += ' AND t.status = ?';
      params.push(status);
    }

    if (search && search.trim()) {
      sql += ' AND (t.reference LIKE ? OR fl.name LIKE ? OR tl.name LIKE ? OR u.login_id LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    sql += ' ORDER BY t.created_at DESC, t.id DESC';

    const [rows] = await pool.query(sql, params);
    return ok(res, rows);
  } catch (e) {
    console.error('Error in list transfers:', e);
    return err(res, e.message);
  }
}

/**
 * GET /api/transfers/:id
 * Get transfer details with lines and current stock at source location.
 */
async function getById(req, res) {
  try {
    const { id } = req.params;

    const [[transfer]] = await pool.query(
      `SELECT
        t.id,
        t.reference,
        t.from_location_id,
        fl.name AS from_location,
        fw.short_code AS from_warehouse_code,
        fw.name AS from_warehouse_name,
        t.to_location_id,
        tl.name AS to_location,
        tw.short_code AS to_warehouse_code,
        tw.name AS to_warehouse_name,
        t.transfer_date,
        t.responsible_user_id,
        u.login_id AS responsible,
        t.status,
        t.created_at
      FROM internal_transfers t
      JOIN locations fl ON fl.id = t.from_location_id
      LEFT JOIN warehouses fw ON fw.id = fl.warehouse_id
      JOIN locations tl ON tl.id = t.to_location_id
      LEFT JOIN warehouses tw ON tw.id = tl.warehouse_id
      JOIN users u ON u.id = t.responsible_user_id
      WHERE t.id = ?`,
      [id]
    );

    if (!transfer) {
      return err(res, 'Transfer not found', 404);
    }

    // Lines joined with products and source location current stock
    const [lines] = await pool.query(
      `SELECT
        tl.id,
        tl.transfer_id,
        tl.product_id,
        tl.quantity,
        p.name AS product_name,
        p.sku,
        p.unit_of_measure,
        p.per_unit_cost,
        COALESCE(s.on_hand_qty, 0) AS source_on_hand_qty,
        COALESCE(s.free_to_use_qty, 0) AS source_free_to_use_qty,
        COALESCE(ds.on_hand_qty, 0) AS dest_on_hand_qty,
        COALESCE(ds.free_to_use_qty, 0) AS dest_free_to_use_qty
      FROM transfer_lines tl
      JOIN products p ON p.id = tl.product_id
      LEFT JOIN stock s ON s.product_id = tl.product_id AND s.location_id = ?
      LEFT JOIN stock ds ON ds.product_id = tl.product_id AND ds.location_id = ?
      WHERE tl.transfer_id = ?
      ORDER BY tl.id ASC`,
      [transfer.from_location_id, transfer.to_location_id, id]
    );

    return ok(res, { ...transfer, lines });
  } catch (e) {
    console.error('Error in getById transfer:', e);
    return err(res, e.message);
  }
}

/**
 * POST /api/transfers
 * Create transfer header and generate reference.
 * Body: { from_location_id, to_location_id, transfer_date, lines? }
 */
async function create(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { from_location_id, to_location_id, transfer_date, lines } = req.body;

    if (!from_location_id) {
      await conn.rollback();
      return err(res, 'Source location (from_location_id) is required', 400);
    }
    if (!to_location_id) {
      await conn.rollback();
      return err(res, 'Destination location (to_location_id) is required', 400);
    }
    if (Number(from_location_id) === Number(to_location_id)) {
      await conn.rollback();
      return err(res, 'Source and destination locations cannot be identical', 400);
    }

    // Validate location existence
    const [[fromLoc]] = await conn.query('SELECT id FROM locations WHERE id = ?', [from_location_id]);
    const [[toLoc]] = await conn.query('SELECT id FROM locations WHERE id = ?', [to_location_id]);

    if (!fromLoc) {
      await conn.rollback();
      return err(res, `Source location ID ${from_location_id} not found`, 404);
    }
    if (!toLoc) {
      await conn.rollback();
      return err(res, `Destination location ID ${to_location_id} not found`, 404);
    }

    const responsibleUserId = req.user?.id || 1;
    const reference = await generateReference(conn, from_location_id);
    const dateVal = transfer_date ? new Date(transfer_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

    const [result] = await conn.query(
      `INSERT INTO internal_transfers 
        (reference, from_location_id, to_location_id, transfer_date, responsible_user_id, status)
       VALUES (?, ?, ?, ?, ?, 'draft')`,
      [reference, from_location_id, to_location_id, dateVal, responsibleUserId]
    );

    const transferId = result.insertId;

    // If initial lines were supplied in the creation body
    if (Array.isArray(lines) && lines.length > 0) {
      for (const line of lines) {
        if (!line.product_id || !line.quantity || Number(line.quantity) <= 0) {
          continue;
        }
        await conn.query(
          `INSERT INTO transfer_lines (transfer_id, product_id, quantity)
           VALUES (?, ?, ?)`,
          [transferId, line.product_id, Math.floor(Number(line.quantity))]
        );
      }
    }

    await conn.commit();
    return ok(res, { id: transferId, reference, status: 'draft' }, 201);
  } catch (e) {
    await conn.rollback();
    console.error('Error creating transfer:', e);
    return err(res, e.message);
  } finally {
    conn.release();
  }
}

/**
 * POST /api/transfers/:id/lines
 * Add product line item.
 * Body: { product_id, quantity }
 */
async function addLine(req, res) {
  try {
    const { id } = req.params;
    const { product_id, quantity } = req.body;

    if (!product_id) {
      return err(res, 'product_id is required', 400);
    }
    const parsedQty = Number(quantity);
    if (!parsedQty || parsedQty <= 0) {
      return err(res, 'quantity must be a positive integer greater than 0', 400);
    }

    // Verify transfer
    const [[transfer]] = await pool.query(
      'SELECT id, status FROM internal_transfers WHERE id = ?',
      [id]
    );
    if (!transfer) {
      return err(res, 'Transfer not found', 404);
    }
    if (['done', 'canceled'].includes(transfer.status)) {
      return err(res, `Cannot add lines to a ${transfer.status} transfer`, 400);
    }

    // Verify product exists
    const [[product]] = await pool.query('SELECT id, name FROM products WHERE id = ?', [product_id]);
    if (!product) {
      return err(res, `Product ID ${product_id} does not exist`, 400);
    }

    const [result] = await pool.query(
      'INSERT INTO transfer_lines (transfer_id, product_id, quantity) VALUES (?, ?, ?)',
      [id, product_id, Math.floor(parsedQty)]
    );

    return ok(res, {
      id: result.insertId,
      transfer_id: Number(id),
      product_id: Number(product_id),
      quantity: Math.floor(parsedQty),
    }, 201);
  } catch (e) {
    console.error('Error in addLine:', e);
    return err(res, e.message);
  }
}

/**
 * DELETE /api/transfers/:id/lines/:lineId
 * Remove product line item.
 */
async function removeLine(req, res) {
  try {
    const { id, lineId } = req.params;

    const [[transfer]] = await pool.query(
      'SELECT id, status FROM internal_transfers WHERE id = ?',
      [id]
    );
    if (!transfer) {
      return err(res, 'Transfer not found', 404);
    }
    if (['done', 'canceled'].includes(transfer.status)) {
      return err(res, `Cannot remove lines from a ${transfer.status} transfer`, 400);
    }

    const [result] = await pool.query(
      'DELETE FROM transfer_lines WHERE id = ? AND transfer_id = ?',
      [lineId, id]
    );

    if (result.affectedRows === 0) {
      return err(res, 'Transfer line not found', 404);
    }

    return ok(res, { deleted: true, lineId: Number(lineId) });
  } catch (e) {
    console.error('Error in removeLine:', e);
    return err(res, e.message);
  }
}

/**
 * POST /api/transfers/:id/validate
 * Execute atomic transaction:
 *   - Verify source location has sufficient stock.
 *   - Decrease stock from from_location_id.
 *   - Increase stock at to_location_id.
 *   - Insert record in move_history.
 *   - Set status to done.
 */
async function validate(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;

    // Lock transfer record for update
    const [[transfer]] = await conn.query(
      `SELECT t.*, 
              fl.name AS from_location_name, 
              tl.name AS to_location_name
       FROM internal_transfers t
       JOIN locations fl ON fl.id = t.from_location_id
       JOIN locations tl ON tl.id = t.to_location_id
       WHERE t.id = ? FOR UPDATE`,
      [id]
    );

    if (!transfer) {
      await conn.rollback();
      return err(res, 'Transfer not found', 404);
    }

    if (transfer.status === 'done') {
      await conn.rollback();
      return err(res, 'Transfer is already validated and completed', 400);
    }

    if (transfer.status === 'canceled') {
      await conn.rollback();
      return err(res, 'Cannot validate a canceled transfer', 400);
    }

    // Lock and get transfer lines
    const [lines] = await conn.query(
      `SELECT tl.*, p.name AS product_name, p.sku
       FROM transfer_lines tl
       JOIN products p ON p.id = tl.product_id
       WHERE tl.transfer_id = ? FOR UPDATE`,
      [id]
    );

    if (lines.length === 0) {
      await conn.rollback();
      return err(res, 'Transfer has no product lines to move. Add at least one product before validating.', 400);
    }

    // 1. Verify stock availability at from_location_id for all lines with FOR UPDATE
    for (const line of lines) {
      const [[stockRow]] = await conn.query(
        `SELECT on_hand_qty, free_to_use_qty 
         FROM stock 
         WHERE product_id = ? AND location_id = ? FOR UPDATE`,
        [line.product_id, transfer.from_location_id]
      );

      const available = stockRow ? Number(stockRow.free_to_use_qty) : 0;
      if (available < Number(line.quantity)) {
        await conn.rollback();
        return err(
          res,
          `Insufficient stock for "${line.product_name}" (SKU: ${line.sku}) at ${transfer.from_location_name}. Available: ${available}, Required: ${line.quantity}`,
          400
        );
      }
    }

    // 2. Perform atomic updates: decrease source stock, increase dest stock, write move_history
    for (const line of lines) {
      const qty = Number(line.quantity);

      // Decrement from source location
      await conn.query(
        `UPDATE stock 
         SET on_hand_qty = on_hand_qty - ?,
             free_to_use_qty = free_to_use_qty - ?
         WHERE product_id = ? AND location_id = ?`,
        [qty, qty, line.product_id, transfer.from_location_id]
      );

      // Increment / Upsert at destination location
      await conn.query(
        `INSERT INTO stock (product_id, location_id, on_hand_qty, free_to_use_qty)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           on_hand_qty     = on_hand_qty     + VALUES(on_hand_qty),
           free_to_use_qty = free_to_use_qty + VALUES(free_to_use_qty)`,
        [line.product_id, transfer.to_location_id, qty, qty]
      );

      // Insert record into move_history ledger
      await conn.query(
        `INSERT INTO move_history 
          (reference, contact, from_location, to_location, product_id, quantity, direction, status)
         VALUES (?, ?, ?, ?, ?, ?, 'out', 'done')`,
        [
          transfer.reference,
          'Internal Transfer',
          transfer.from_location_name,
          transfer.to_location_name,
          line.product_id,
          qty,
        ]
      );
    }

    // 3. Update transfer status to 'done'
    await conn.query(
      "UPDATE internal_transfers SET status = 'done' WHERE id = ?",
      [id]
    );

    await conn.commit();
    return ok(res, {
      id: transfer.id,
      reference: transfer.reference,
      status: 'done',
      message: 'Transfer validated successfully and stock balances updated.',
    });
  } catch (e) {
    await conn.rollback();
    console.error('Error in validate transfer:', e);
    return err(res, e.message);
  } finally {
    conn.release();
  }
}

/**
 * PUT /api/transfers/:id/cancel
 * Cancel a draft or ready transfer.
 */
async function cancel(req, res) {
  try {
    const { id } = req.params;

    const [[transfer]] = await pool.query(
      'SELECT id, status FROM internal_transfers WHERE id = ?',
      [id]
    );

    if (!transfer) {
      return err(res, 'Transfer not found', 404);
    }
    if (transfer.status === 'done') {
      return err(res, 'Cannot cancel a completed transfer', 400);
    }

    await pool.query(
      "UPDATE internal_transfers SET status = 'canceled' WHERE id = ?",
      [id]
    );

    return ok(res, { id: Number(id), status: 'canceled' });
  } catch (e) {
    console.error('Error canceling transfer:', e);
    return err(res, e.message);
  }
}

/**
 * PUT /api/transfers/:id/ready
 * Mark transfer as ready.
 */
async function markReady(req, res) {
  try {
    const { id } = req.params;

    const [[transfer]] = await pool.query(
      'SELECT id, status FROM internal_transfers WHERE id = ?',
      [id]
    );

    if (!transfer) {
      return err(res, 'Transfer not found', 404);
    }
    if (transfer.status !== 'draft') {
      return err(res, `Transfer is already in ${transfer.status} state`, 400);
    }

    const [[{ count }]] = await pool.query(
      'SELECT COUNT(*) AS count FROM transfer_lines WHERE transfer_id = ?',
      [id]
    );

    if (count === 0) {
      return err(res, 'Add at least one product line before marking transfer ready', 400);
    }

    await pool.query(
      "UPDATE internal_transfers SET status = 'ready' WHERE id = ?",
      [id]
    );

    return ok(res, { id: Number(id), status: 'ready' });
  } catch (e) {
    console.error('Error marking transfer ready:', e);
    return err(res, e.message);
  }
}

/**
 * GET /api/transfers/stats
 * Aggregate metrics for internal transfers
 */
async function stats(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT
        COUNT(*) AS total_count,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft_count,
        SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) AS ready_count,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done_count,
        SUM(CASE WHEN status = 'canceled' THEN 1 ELSE 0 END) AS canceled_count
      FROM internal_transfers
    `);
    const r = rows[0] || {};
    return ok(res, {
      total_count: Number(r.total_count || 0),
      draft_count: Number(r.draft_count || 0),
      ready_count: Number(r.ready_count || 0),
      done_count: Number(r.done_count || 0),
      canceled_count: Number(r.canceled_count || 0),
    });
  } catch (e) {
    console.error('Error fetching transfer stats:', e);
    return err(res, e.message);
  }
}

module.exports = {
  list,
  getById,
  create,
  addLine,
  removeLine,
  validate,
  cancel,
  markReady,
  stats,
};
