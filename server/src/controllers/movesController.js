// server/src/controllers/movesController.js
// Stock Ledger & Move History Feed Controller
// Parameterized SQL via mysql2/promise, { success, data } envelope

const pool = require('../db/connection');

/**
 * GET /api/moves or /api/ledger
 * Query parameters:
 *  - direction: 'in' | 'out' | 'ALL'
 *  - product_id: number
 *  - search: string (matches reference, contact, locations, product name, sku)
 *  - limit: number (default 100)
 *  - offset: number (default 0)
 */
exports.list = async (req, res, next) => {
  try {
    const { direction, product_id, search, limit = 100, offset = 0 } = req.query;

    let whereSql = 'WHERE 1=1';
    const params = [];

    // Direction filter ('in' or 'out')
    if (direction && direction !== 'ALL' && direction !== 'all') {
      whereSql += ' AND LOWER(m.direction) = LOWER(?)';
      params.push(direction);
    }

    // Product ID filter
    if (product_id) {
      whereSql += ' AND m.product_id = ?';
      params.push(parseInt(product_id, 10));
    }

    // Search filter across reference, contact, locations, and product details
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      whereSql += ` AND (
        m.reference LIKE ? OR
        m.contact LIKE ? OR
        m.from_location LIKE ? OR
        m.to_location LIKE ? OR
        p.name LIKE ? OR
        p.sku LIKE ?
      )`;
      params.push(term, term, term, term, term, term);
    }

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 500);
    const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

    const query = `
      SELECT
        m.id,
        m.reference,
        m.move_date,
        m.contact,
        m.from_location,
        m.to_location,
        m.product_id,
        m.quantity,
        m.direction,
        m.status,
        COALESCE(p.name, 'Unknown Product') AS product_name,
        COALESCE(p.sku, '—')                AS product_sku,
        COALESCE(p.unit_of_measure, 'pcs')  AS unit_of_measure,
        COALESCE(p.per_unit_cost, 0)        AS per_unit_cost,
        c.name                              AS category_name
      FROM move_history m
      LEFT JOIN products p ON m.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereSql}
      ORDER BY m.move_date DESC, m.id DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parsedLimit, parsedOffset);

    const [rows] = await pool.query(query, params);

    res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/moves/stats or /api/ledger/stats
 * Aggregate metrics for KPI cards
 */
exports.getStats = async (req, res, next) => {
  try {
    const [summaryRows] = await pool.query(`
      SELECT
        COUNT(*) AS total_moves,
        COALESCE(SUM(CASE WHEN LOWER(direction) = 'in' THEN quantity ELSE 0 END), 0) AS total_in_qty,
        COALESCE(SUM(CASE WHEN LOWER(direction) = 'out' THEN quantity ELSE 0 END), 0) AS total_out_qty,
        COALESCE(SUM(CASE WHEN LOWER(direction) = 'in' THEN 1 ELSE 0 END), 0) AS in_count,
        COALESCE(SUM(CASE WHEN LOWER(direction) = 'out' THEN 1 ELSE 0 END), 0) AS out_count
      FROM move_history
    `);

    const stats = summaryRows[0] || {
      total_moves: 0,
      total_in_qty: 0,
      total_out_qty: 0,
      in_count: 0,
      out_count: 0,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/moves/:id
 */
exports.getById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        m.*,
        p.name AS product_name,
        p.sku  AS product_sku,
        p.unit_of_measure,
        p.per_unit_cost,
        c.name AS category_name
      FROM move_history m
      LEFT JOIN products p ON m.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE m.id = ?`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        error: { message: 'Stock ledger entry not found' },
      });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (err) {
    next(err);
  }
};
