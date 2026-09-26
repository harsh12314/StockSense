// server/src/controllers/settingsController.js
// Warehouse & Internal Location Settings Management Controller
// Parameterized SQL via mysql2/promise, { success, data } envelope

const pool = require('../db/connection');

/**
 * GET /api/settings/warehouses
 * Returns warehouses with location count, internal locations array, and total stock summary.
 */
exports.listWarehouses = async (req, res, next) => {
  try {
    const [warehouses] = await pool.query(`
      SELECT
        w.id,
        w.name,
        w.short_code,
        w.address,
        COUNT(DISTINCT l.id) AS location_count,
        COALESCE(SUM(s.on_hand_qty), 0) AS total_stock_qty,
        COALESCE(SUM(s.free_to_use_qty), 0) AS total_free_qty
      FROM warehouses w
      LEFT JOIN locations l ON l.warehouse_id = w.id
      LEFT JOIN stock s ON s.location_id = l.id
      GROUP BY w.id, w.name, w.short_code, w.address
      ORDER BY w.id ASC
    `);

    // Fetch all locations to attach to respective warehouses
    const [locations] = await pool.query(`
      SELECT
        l.id,
        l.name,
        l.short_code,
        l.warehouse_id,
        COALESCE(SUM(s.on_hand_qty), 0) AS on_hand_qty
      FROM locations l
      LEFT JOIN stock s ON s.location_id = l.id
      GROUP BY l.id, l.name, l.short_code, l.warehouse_id
      ORDER BY l.id ASC
    `);

    // Group locations by warehouse_id
    const locMap = {};
    locations.forEach((loc) => {
      if (!locMap[loc.warehouse_id]) locMap[loc.warehouse_id] = [];
      locMap[loc.warehouse_id].push(loc);
    });

    const enriched = warehouses.map((wh) => ({
      ...wh,
      code: wh.short_code,
      location: wh.address || 'Standard Storage Facility',
      locations: locMap[wh.id] || [],
    }));

    res.json({
      success: true,
      data: enriched,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/settings/warehouses/:id
 */
exports.getWarehouse = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        w.id,
        w.name,
        w.short_code,
        w.address,
        COUNT(DISTINCT l.id) AS location_count,
        COALESCE(SUM(s.on_hand_qty), 0) AS total_stock_qty
      FROM warehouses w
      LEFT JOIN locations l ON l.warehouse_id = w.id
      LEFT JOIN stock s ON s.location_id = l.id
      WHERE w.id = ?
      GROUP BY w.id, w.name, w.short_code, w.address`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: { message: 'Warehouse not found' } });
    }

    const [locs] = await pool.query(
      `SELECT
        l.id,
        l.name,
        l.short_code,
        l.warehouse_id,
        COALESCE(SUM(s.on_hand_qty), 0) AS on_hand_qty
      FROM locations l
      LEFT JOIN stock s ON s.location_id = l.id
      WHERE l.warehouse_id = ?
      GROUP BY l.id, l.name, l.short_code, l.warehouse_id
      ORDER BY l.id ASC`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...rows[0],
        code: rows[0].short_code,
        locations: locs,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/settings/warehouses
 * Body: { name, short_code, address }
 */
exports.createWarehouse = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { name, short_code, address, default_location_name } = req.body;

    if (!name || !name.trim()) {
      await conn.rollback();
      return res.status(400).json({ success: false, error: { message: 'Warehouse name is required.' } });
    }

    const cleanCode = (short_code || '').trim().toUpperCase();
    if (!cleanCode) {
      await conn.rollback();
      return res.status(400).json({ success: false, error: { message: 'Warehouse short code is required.' } });
    }

    // Check duplicate short_code
    const [existing] = await conn.query('SELECT id FROM warehouses WHERE UPPER(short_code) = ?', [cleanCode]);
    if (existing.length) {
      await conn.rollback();
      return res.status(409).json({ success: false, error: { message: `Warehouse short code "${cleanCode}" is already in use.` } });
    }

    const [result] = await conn.query(
      'INSERT INTO warehouses (name, short_code, address) VALUES (?, ?, ?)',
      [name.trim(), cleanCode, (address || '').trim()]
    );

    const warehouseId = result.insertId;

    // Automatically create standard primary bin location for this warehouse
    const locName = default_location_name?.trim() || `${name.trim()} Stock`;
    const locCode = `${cleanCode}/STOCK`;
    const [locResult] = await conn.query(
      'INSERT INTO locations (name, short_code, warehouse_id) VALUES (?, ?, ?)',
      [locName, locCode, warehouseId]
    );

    await conn.commit();

    res.status(201).json({
      success: true,
      data: {
        id: warehouseId,
        name: name.trim(),
        short_code: cleanCode,
        code: cleanCode,
        address: (address || '').trim(),
        location: (address || '').trim() || 'Standard Storage Facility',
        locations: [
          {
            id: locResult.insertId,
            name: locName,
            short_code: locCode,
            warehouse_id: warehouseId,
            on_hand_qty: 0,
          },
        ],
      },
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
};

/**
 * PUT /api/settings/warehouses/:id
 * Body: { name, short_code, address }
 */
exports.updateWarehouse = async (req, res, next) => {
  try {
    const { name, short_code, address } = req.body;
    const warehouseId = parseInt(req.params.id, 10);

    const [exists] = await pool.query('SELECT id FROM warehouses WHERE id = ?', [warehouseId]);
    if (!exists.length) {
      return res.status(404).json({ success: false, error: { message: 'Warehouse not found.' } });
    }

    let cleanCode;
    if (short_code) {
      cleanCode = short_code.trim().toUpperCase();
      const [dup] = await pool.query(
        'SELECT id FROM warehouses WHERE UPPER(short_code) = ? AND id != ?',
        [cleanCode, warehouseId]
      );
      if (dup.length) {
        return res.status(409).json({ success: false, error: { message: `Warehouse short code "${cleanCode}" is already in use.` } });
      }
    }

    await pool.query(
      `UPDATE warehouses
       SET name = COALESCE(?, name),
           short_code = COALESCE(?, short_code),
           address = COALESCE(?, address)
       WHERE id = ?`,
      [name ? name.trim() : null, cleanCode || null, address !== undefined ? address.trim() : null, warehouseId]
    );

    const [updated] = await pool.query('SELECT * FROM warehouses WHERE id = ?', [warehouseId]);

    res.json({
      success: true,
      data: {
        ...updated[0],
        code: updated[0].short_code,
        location: updated[0].address,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/settings/locations
 * Query: ?warehouse_id=...
 */
exports.listLocations = async (req, res, next) => {
  try {
    const { warehouse_id } = req.query;

    let whereSql = 'WHERE 1=1';
    const params = [];

    if (warehouse_id) {
      whereSql += ' AND l.warehouse_id = ?';
      params.push(parseInt(warehouse_id, 10));
    }

    const [rows] = await pool.query(
      `SELECT
        l.id,
        l.name,
        l.short_code,
        l.warehouse_id,
        w.name       AS warehouse_name,
        w.short_code AS warehouse_code,
        COALESCE(SUM(s.on_hand_qty), 0)     AS total_on_hand_qty,
        COALESCE(SUM(s.free_to_use_qty), 0) AS total_free_qty,
        COUNT(DISTINCT s.product_id)         AS distinct_products_count
      FROM locations l
      LEFT JOIN warehouses w ON l.warehouse_id = w.id
      LEFT JOIN stock s ON s.location_id = l.id
      ${whereSql}
      GROUP BY l.id, l.name, l.short_code, l.warehouse_id, w.name, w.short_code
      ORDER BY l.warehouse_id ASC, l.id ASC`,
      params
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/settings/locations
 * Body: { name, short_code, warehouse_id }
 */
exports.createLocation = async (req, res, next) => {
  try {
    const { name, short_code, warehouse_id } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Location name is required.' } });
    }
    if (!warehouse_id) {
      return res.status(400).json({ success: false, error: { message: 'Warehouse ID is required.' } });
    }

    const [wh] = await pool.query('SELECT * FROM warehouses WHERE id = ?', [warehouse_id]);
    if (!wh.length) {
      return res.status(404).json({ success: false, error: { message: 'Specified warehouse does not exist.' } });
    }

    const cleanShortCode = (short_code || '').trim() || `${wh[0].short_code}/${name.trim().toUpperCase().replace(/\s+/g, '_')}`;

    const [result] = await pool.query(
      'INSERT INTO locations (name, short_code, warehouse_id) VALUES (?, ?, ?)',
      [name.trim(), cleanShortCode, parseInt(warehouse_id, 10)]
    );

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        name: name.trim(),
        short_code: cleanShortCode,
        warehouse_id: parseInt(warehouse_id, 10),
        warehouse_name: wh[0].name,
        warehouse_code: wh[0].short_code,
        total_on_hand_qty: 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/settings/locations/:id
 * Body: { name, short_code, warehouse_id }
 */
exports.updateLocation = async (req, res, next) => {
  try {
    const { name, short_code, warehouse_id } = req.body;
    const locationId = parseInt(req.params.id, 10);

    const [exists] = await pool.query('SELECT id FROM locations WHERE id = ?', [locationId]);
    if (!exists.length) {
      return res.status(404).json({ success: false, error: { message: 'Location not found.' } });
    }

    if (warehouse_id) {
      const [wh] = await pool.query('SELECT id FROM warehouses WHERE id = ?', [warehouse_id]);
      if (!wh.length) {
        return res.status(404).json({ success: false, error: { message: 'Specified warehouse does not exist.' } });
      }
    }

    await pool.query(
      `UPDATE locations
       SET name = COALESCE(?, name),
           short_code = COALESCE(?, short_code),
           warehouse_id = COALESCE(?, warehouse_id)
       WHERE id = ?`,
      [name ? name.trim() : null, short_code ? short_code.trim() : null, warehouse_id || null, locationId]
    );

    const [updated] = await pool.query(
      `SELECT l.*, w.name AS warehouse_name, w.short_code AS warehouse_code
       FROM locations l
       LEFT JOIN warehouses w ON l.warehouse_id = w.id
       WHERE l.id = ?`,
      [locationId]
    );

    res.json({
      success: true,
      data: updated[0],
    });
  } catch (err) {
    next(err);
  }
};
