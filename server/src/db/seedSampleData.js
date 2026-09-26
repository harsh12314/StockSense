// server/src/db/seedSampleData.js
require('dotenv').config();
const pool = require('./connection');

async function seed() {
  const conn = await pool.getConnection();
  try {
    console.log('--- Initializing StockSense Database Tables & Sample Data ---');

    // 1. Ensure all tables exist
    await conn.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        login_id VARCHAR(12) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('inventory_manager', 'warehouse_staff') DEFAULT 'warehouse_staff',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        short_code VARCHAR(20) UNIQUE NOT NULL,
        address VARCHAR(255)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        short_code VARCHAR(50) NOT NULL,
        warehouse_id INT NOT NULL,
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(100) UNIQUE NOT NULL,
        category VARCHAR(100),
        unit_of_measure VARCHAR(50) DEFAULT 'Units',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS stock (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        location_id INT NOT NULL,
        on_hand_qty INT NOT NULL DEFAULT 0,
        free_to_use_qty INT NOT NULL DEFAULT 0,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
        UNIQUE KEY uq_product_location (product_id, location_id)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS receipts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        reference VARCHAR(50) UNIQUE NOT NULL,
        from_contact VARCHAR(255),
        to_location_id INT NOT NULL,
        schedule_date DATE,
        responsible_user_id INT NOT NULL,
        status ENUM('draft','ready','done','canceled') DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (to_location_id) REFERENCES locations(id),
        FOREIGN KEY (responsible_user_id) REFERENCES users(id),
        INDEX idx_receipts_status (status)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS receipt_lines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        receipt_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL CHECK (quantity > 0),
        FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS deliveries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        reference VARCHAR(50) UNIQUE NOT NULL,
        from_location_id INT NOT NULL,
        to_contact VARCHAR(255),
        delivery_address VARCHAR(255),
        schedule_date DATE,
        operation_type VARCHAR(100) DEFAULT 'Delivery Orders',
        status ENUM('draft','waiting','ready','done','canceled') DEFAULT 'draft',
        responsible_user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_location_id) REFERENCES locations(id),
        FOREIGN KEY (responsible_user_id) REFERENCES users(id),
        INDEX idx_deliveries_status (status)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS delivery_lines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        delivery_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL CHECK (quantity > 0),
        FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS internal_transfers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        reference VARCHAR(50) UNIQUE NOT NULL,
        from_location_id INT NOT NULL,
        to_location_id INT NOT NULL,
        transfer_date DATE DEFAULT NULL,
        responsible_user_id INT NOT NULL,
        status ENUM('draft', 'ready', 'done', 'canceled') NOT NULL DEFAULT 'draft',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_location_id) REFERENCES locations(id),
        FOREIGN KEY (to_location_id) REFERENCES locations(id),
        FOREIGN KEY (responsible_user_id) REFERENCES users(id),
        INDEX idx_transfers_status (status)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS transfer_lines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transfer_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        FOREIGN KEY (transfer_id) REFERENCES internal_transfers(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS stock_adjustments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        location_id INT NOT NULL,
        recorded_qty INT NOT NULL,
        counted_qty INT NOT NULL,
        delta INT NOT NULL,
        logged_by INT NOT NULL,
        notes VARCHAR(500),
        adjustment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (location_id) REFERENCES locations(id),
        FOREIGN KEY (logged_by) REFERENCES users(id),
        INDEX idx_adjustment_date (adjustment_date)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS move_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        reference VARCHAR(50) NOT NULL,
        move_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        contact VARCHAR(255),
        from_location VARCHAR(255),
        to_location VARCHAR(255),
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        direction ENUM('in','out') NOT NULL,
        status VARCHAR(50),
        FOREIGN KEY (product_id) REFERENCES products(id),
        INDEX idx_direction (direction),
        INDEX idx_move_date (move_date)
      )
    `);

    console.log('✓ All 11 tables verified.');

    // 2. Seed Users if not present
    const [[adminUser]] = await conn.query("SELECT id FROM users WHERE login_id = 'admin1'");
    let adminId = adminUser?.id;
    if (!adminId) {
      const [res] = await conn.query(
        "INSERT INTO users (login_id, email, password_hash, role) VALUES ('admin1', 'admin@stocksense.com', '$2a$10$w8T0M4G4dE0P4eS/8w4PbuN9h/YwL5.k9bA5B.eLzY7v9B7YwXk3G', 'inventory_manager')"
      );
      adminId = res.insertId;
    }

    // 3. Seed Categories
    const categories = ['Electronics', 'Warehouse Supplies', 'Industrial Hardware', 'Packaging Materials', 'Office Equipment'];
    const catMap = {};
    for (const cat of categories) {
      await conn.query('INSERT IGNORE INTO categories (name) VALUES (?)', [cat]);
      const [[cRow]] = await conn.query('SELECT id FROM categories WHERE name = ?', [cat]);
      if (cRow) catMap[cat] = cRow.id;
    }

    // 4. Seed Warehouses & Locations
    const warehousesData = [
      {
        name: 'Main Distribution Hub',
        short_code: 'WH',
        address: '100 Logistics Blvd, Hyderabad, Telangana',
        locations: [
          { name: 'Stock Room', short_code: 'WH/STOCK' },
          { name: 'Shipping Bay 1', short_code: 'WH/SHIP-01' },
          { name: 'Production Staging', short_code: 'WH/PROD-STAGE' },
          { name: 'Cold Storage Room A', short_code: 'WH/COLD-A' },
        ],
      },
      {
        name: 'South Region Facility',
        short_code: 'SRF',
        address: '45 Industrial Corridor, Bangalore, Karnataka',
        locations: [
          { name: 'General Inbound Stock', short_code: 'SRF/STOCK' },
          { name: 'High-Density Rack B1', short_code: 'SRF/RACK-B1' },
          { name: 'Dispatch Bay 2', short_code: 'SRF/DISPATCH-02' },
        ],
      },
      {
        name: 'North Logistics Depot',
        short_code: 'NLD',
        address: '88 Express Highway, Delhi NCR',
        locations: [
          { name: 'Central Pallet Storage', short_code: 'NLD/STOCK' },
          { name: 'Express Sort Line', short_code: 'NLD/SORT-01' },
        ],
      },
    ];

    const whMap = {};
    const locMap = {};

    for (const wh of warehousesData) {
      let [existingWh] = await conn.query('SELECT id FROM warehouses WHERE short_code = ?', [wh.short_code]);
      let whId;
      if (existingWh.length > 0) {
        whId = existingWh[0].id;
        await conn.query('UPDATE warehouses SET name = ?, address = ? WHERE id = ?', [wh.name, wh.address, whId]);
      } else {
        const [res] = await conn.query('INSERT INTO warehouses (name, short_code, address) VALUES (?, ?, ?)', [wh.name, wh.short_code, wh.address]);
        whId = res.insertId;
      }
      whMap[wh.short_code] = whId;

      for (const loc of wh.locations) {
        let [existingLoc] = await conn.query('SELECT id FROM locations WHERE short_code = ?', [loc.short_code]);
        let locId;
        if (existingLoc.length > 0) {
          locId = existingLoc[0].id;
          await conn.query('UPDATE locations SET name = ?, warehouse_id = ? WHERE id = ?', [loc.name, whId, locId]);
        } else {
          const [res] = await conn.query('INSERT INTO locations (name, short_code, warehouse_id) VALUES (?, ?, ?)', [loc.name, loc.short_code, whId]);
          locId = res.insertId;
        }
        locMap[loc.short_code] = locId;
      }
    }

    console.log('✓ Warehouses & Locations verified.');

    // 5. Seed Products
    const productsData = [
      { name: 'Rugged Handheld Barcode Scanner 2D', sku: 'ELEC-SCN-200', category: 'Electronics', unit_of_measure: 'Units', defaultQty: 180 },
      { name: 'Industrial Thermal Label Printer 300DPI', sku: 'ELEC-PRN-300', category: 'Electronics', unit_of_measure: 'Units', defaultQty: 45 },
      { name: 'Corrugated Shipping Box (Large 24x18x18)', sku: 'PKG-BOX-LRG', category: 'Packaging Materials', unit_of_measure: 'Pcs', defaultQty: 1200 },
      { name: 'Heavy-Duty Industrial Stretch Wrap 500m', sku: 'PKG-WRP-500', category: 'Packaging Materials', unit_of_measure: 'Rolls', defaultQty: 340 },
      { name: 'Steel Pallet Jack 2500kg Capacity', sku: 'HDW-PLT-250', category: 'Industrial Hardware', unit_of_measure: 'Units', defaultQty: 18 },
      { name: 'Heavy Duty Steel Bolt & Nut Assortment M8', sku: 'HDW-BLT-M08', category: 'Industrial Hardware', unit_of_measure: 'Boxes', defaultQty: 450 },
      { name: 'Wireless Ergonomic Logistics Keyboard', sku: 'OFF-KBD-WLS', category: 'Office Equipment', unit_of_measure: 'Units', defaultQty: 95 },
      { name: 'High-Speed Wi-Fi 6 Industrial Access Point', sku: 'ELEC-WIFI-AX', category: 'Electronics', unit_of_measure: 'Units', defaultQty: 60 },
      { name: 'Anti-Static ESD Protective Bubble Pouch', sku: 'PKG-ESD-100', category: 'Packaging Materials', unit_of_measure: 'Packs', defaultQty: 850 },
      { name: 'Digital Precision Crane Hanging Scale 500kg', sku: 'HDW-SCL-500', category: 'Industrial Hardware', unit_of_measure: 'Units', defaultQty: 25 },
    ];

    const prodMap = {};
    const stockLocId = locMap['WH/STOCK'] || 1;

    for (const p of productsData) {
      let [existingProd] = await conn.query('SELECT id FROM products WHERE sku = ?', [p.sku]);
      let prodId;
      const catId = catMap[p.category] || null;
      if (existingProd.length > 0) {
        prodId = existingProd[0].id;
        await conn.query('UPDATE products SET name = ?, category_id = ?, unit_of_measure = ? WHERE id = ?', [p.name, catId, p.unit_of_measure, prodId]);
      } else {
        const [res] = await conn.query('INSERT INTO products (name, sku, category_id, unit_of_measure) VALUES (?, ?, ?, ?)', [p.name, p.sku, catId, p.unit_of_measure]);
        prodId = res.insertId;
      }
      prodMap[p.sku] = prodId;

      // Seed Initial Stock in WH/STOCK
      await conn.query(
        `INSERT INTO stock (product_id, location_id, on_hand_qty, free_to_use_qty)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE on_hand_qty = GREATEST(on_hand_qty, VALUES(on_hand_qty)), free_to_use_qty = GREATEST(free_to_use_qty, VALUES(free_to_use_qty))`,
        [prodId, stockLocId, p.defaultQty, Math.floor(p.defaultQty * 0.9)]
      );
    }

    console.log('✓ Products & Stock inventory seeded.');

    // 6. Seed Deliveries (Rich variety: Done, Ready, Waiting, Draft)
    const deliveriesSeed = [
      {
        reference: 'WH/OUT/00001',
        from_location_id: stockLocId,
        to_contact: 'Acme Retail Solutions Ltd',
        delivery_address: 'Plot 42, Gachibowli Cyber Towers, Hyderabad',
        schedule_date: '2026-09-24',
        operation_type: 'Delivery Orders',
        status: 'done',
        lines: [
          { sku: 'ELEC-SCN-200', qty: 15 },
          { sku: 'ELEC-PRN-300', qty: 4 },
          { sku: 'PKG-BOX-LRG', qty: 100 },
        ],
      },
      {
        reference: 'WH/OUT/00002',
        from_location_id: stockLocId,
        to_contact: 'Global Tech Distribution Corp',
        delivery_address: 'Building 7, Electronics City Phase 1, Bangalore',
        schedule_date: '2026-09-25',
        operation_type: 'Delivery Orders',
        status: 'done',
        lines: [
          { sku: 'ELEC-WIFI-AX', qty: 10 },
          { sku: 'OFF-KBD-WLS', qty: 25 },
          { sku: 'PKG-WRP-500', qty: 20 },
        ],
      },
      {
        reference: 'WH/OUT/00003',
        from_location_id: stockLocId,
        to_contact: 'Apex Manufacturing & Logistics',
        delivery_address: 'Sector 18, Industrial Area, Gurgaon, Haryana',
        schedule_date: '2026-09-26',
        operation_type: 'Delivery Orders',
        status: 'ready',
        lines: [
          { sku: 'HDW-PLT-250', qty: 2 },
          { sku: 'HDW-BLT-M08', qty: 40 },
          { sku: 'PKG-BOX-LRG', qty: 200 },
        ],
      },
      {
        reference: 'WH/OUT/00004',
        from_location_id: stockLocId,
        to_contact: 'Zenith Logistics International',
        delivery_address: 'Warehouse Complex 12, Whitefield, Bangalore',
        schedule_date: '2026-09-27',
        operation_type: 'Delivery Orders',
        status: 'ready',
        lines: [
          { sku: 'ELEC-SCN-200', qty: 8 },
          { sku: 'PKG-ESD-100', qty: 150 },
        ],
      },
      {
        reference: 'WH/OUT/00005',
        from_location_id: stockLocId,
        to_contact: 'Nexus Supply Chain Partners',
        delivery_address: 'Cargo Bay 4, Shamshabad Airport Cargo Terminal, Hyderabad',
        schedule_date: '2026-09-28',
        operation_type: 'Delivery Orders',
        status: 'waiting',
        lines: [
          { sku: 'HDW-SCL-500', qty: 5 },
          { sku: 'ELEC-PRN-300', qty: 10 },
          { sku: 'PKG-WRP-500', qty: 50 },
        ],
      },
      {
        reference: 'WH/OUT/00006',
        from_location_id: stockLocId,
        to_contact: 'Vanguard Industrial Supplies',
        delivery_address: '77 Industrial Estate, Sanath Nagar, Hyderabad',
        schedule_date: '2026-09-30',
        operation_type: 'Delivery Orders',
        status: 'draft',
        lines: [
          { sku: 'ELEC-SCN-200', qty: 12 },
          { sku: 'OFF-KBD-WLS', qty: 30 },
        ],
      },
    ];

    for (const del of deliveriesSeed) {
      let [existingDel] = await conn.query('SELECT id FROM deliveries WHERE reference = ?', [del.reference]);
      let delId;
      if (existingDel.length > 0) {
        delId = existingDel[0].id;
        await conn.query(
          `UPDATE deliveries
           SET from_location_id = ?, to_contact = ?, delivery_address = ?, schedule_date = ?, status = ?
           WHERE id = ?`,
          [del.from_location_id, del.to_contact, del.delivery_address, del.schedule_date, del.status, delId]
        );
      } else {
        const [res] = await conn.query(
          `INSERT INTO deliveries (reference, from_location_id, to_contact, delivery_address, schedule_date, operation_type, status, responsible_user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [del.reference, del.from_location_id, del.to_contact, del.delivery_address, del.schedule_date, del.operation_type, del.status, adminId]
        );
        delId = res.insertId;
      }

      // Re-insert lines
      await conn.query('DELETE FROM delivery_lines WHERE delivery_id = ?', [delId]);
      for (const line of del.lines) {
        const pId = prodMap[line.sku];
        if (pId) {
          await conn.query('INSERT INTO delivery_lines (delivery_id, product_id, quantity) VALUES (?, ?, ?)', [delId, pId, line.qty]);
        }
      }

      // If done, add to move_history
      if (del.status === 'done') {
        for (const line of del.lines) {
          const pId = prodMap[line.sku];
          if (pId) {
            await conn.query(
              `INSERT IGNORE INTO move_history (reference, move_date, contact, from_location, to_location, product_id, quantity, direction, status)
               VALUES (?, ?, ?, 'WH/STOCK', 'Customer Consignee', ?, ?, 'out', 'DONE')`,
              [del.reference, `${del.schedule_date} 14:30:00`, del.to_contact, pId, line.qty]
            );
          }
        }
      }
    }

    console.log('✓ Deliveries and lines seeded.');

    // 7. Seed Receipts
    const receiptsSeed = [
      {
        reference: 'WH/IN/00001',
        from_contact: 'Foxconn Industrial Components',
        to_location_id: stockLocId,
        schedule_date: '2026-09-22',
        status: 'done',
        lines: [
          { sku: 'ELEC-SCN-200', qty: 50 },
          { sku: 'ELEC-PRN-300', qty: 20 },
        ],
      },
      {
        reference: 'WH/IN/00002',
        from_contact: 'Mondi Packaging Group',
        to_location_id: stockLocId,
        schedule_date: '2026-09-24',
        status: 'done',
        lines: [
          { sku: 'PKG-BOX-LRG', qty: 500 },
          { sku: 'PKG-WRP-500', qty: 150 },
        ],
      },
      {
        reference: 'WH/IN/00003',
        from_contact: 'Tata Steel Hardware Division',
        to_location_id: stockLocId,
        schedule_date: '2026-09-26',
        status: 'ready',
        lines: [
          { sku: 'HDW-PLT-250', qty: 5 },
          { sku: 'HDW-BLT-M08', qty: 200 },
        ],
      },
      {
        reference: 'WH/IN/00004',
        from_contact: 'Logitech Enterprise APAC',
        to_location_id: stockLocId,
        schedule_date: '2026-09-29',
        status: 'draft',
        lines: [
          { sku: 'OFF-KBD-WLS', qty: 80 },
          { sku: 'ELEC-WIFI-AX', qty: 30 },
        ],
      },
    ];

    for (const rec of receiptsSeed) {
      let [existingRec] = await conn.query('SELECT id FROM receipts WHERE reference = ?', [rec.reference]);
      let recId;
      if (existingRec.length > 0) {
        recId = existingRec[0].id;
        await conn.query(
          `UPDATE receipts
           SET from_contact = ?, to_location_id = ?, schedule_date = ?, status = ?
           WHERE id = ?`,
          [rec.from_contact, rec.to_location_id, rec.schedule_date, rec.status, recId]
        );
      } else {
        const [res] = await conn.query(
          `INSERT INTO receipts (reference, from_contact, to_location_id, schedule_date, status, responsible_user_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [rec.reference, rec.from_contact, rec.to_location_id, rec.schedule_date, rec.status, adminId]
        );
        recId = res.insertId;
      }

      await conn.query('DELETE FROM receipt_lines WHERE receipt_id = ?', [recId]);
      for (const line of rec.lines) {
        const pId = prodMap[line.sku];
        if (pId) {
          await conn.query('INSERT INTO receipt_lines (receipt_id, product_id, quantity) VALUES (?, ?, ?)', [recId, pId, line.qty]);
        }
      }

      if (rec.status === 'done') {
        for (const line of rec.lines) {
          const pId = prodMap[line.sku];
          if (pId) {
            await conn.query(
              `INSERT IGNORE INTO move_history (reference, move_date, contact, from_location, to_location, product_id, quantity, direction, status)
               VALUES (?, ?, ?, 'Vendor Supplier', 'WH/STOCK', ?, ?, 'in', 'DONE')`,
              [rec.reference, `${rec.schedule_date} 10:15:00`, rec.from_contact, pId, line.qty]
            );
          }
        }
      }
    }

    console.log('✓ Receipts and lines seeded.');

    // 8. Seed Internal Transfers
    const transfersSeed = [
      {
        reference: 'WH/TRANS/00001',
        from_location_id: locMap['WH/STOCK'] || 1,
        to_location_id: locMap['WH/PROD-STAGE'] || 3,
        transfer_date: '2026-09-24',
        status: 'done',
        lines: [
          { sku: 'HDW-BLT-M08', qty: 50 },
          { sku: 'PKG-ESD-100', qty: 100 },
        ],
      },
      {
        reference: 'WH/TRANS/00002',
        from_location_id: locMap['WH/STOCK'] || 1,
        to_location_id: locMap['SRF/STOCK'] || 2,
        transfer_date: '2026-09-26',
        status: 'ready',
        lines: [
          { sku: 'ELEC-SCN-200', qty: 20 },
          { sku: 'ELEC-PRN-300', qty: 5 },
        ],
      },
    ];

    for (const tr of transfersSeed) {
      let [existingTr] = await conn.query('SELECT id FROM internal_transfers WHERE reference = ?', [tr.reference]);
      let trId;
      if (existingTr.length > 0) {
        trId = existingTr[0].id;
        await conn.query(
          `UPDATE internal_transfers
           SET from_location_id = ?, to_location_id = ?, transfer_date = ?, status = ?
           WHERE id = ?`,
          [tr.from_location_id, tr.to_location_id, tr.transfer_date, tr.status, trId]
        );
      } else {
        const [res] = await conn.query(
          `INSERT INTO internal_transfers (reference, from_location_id, to_location_id, transfer_date, status, responsible_user_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [tr.reference, tr.from_location_id, tr.to_location_id, tr.transfer_date, tr.status, adminId]
        );
        trId = res.insertId;
      }

      await conn.query('DELETE FROM transfer_lines WHERE transfer_id = ?', [trId]);
      for (const line of tr.lines) {
        const pId = prodMap[line.sku];
        if (pId) {
          await conn.query('INSERT INTO transfer_lines (transfer_id, product_id, quantity) VALUES (?, ?, ?)', [trId, pId, line.qty]);
        }
      }
    }

    console.log('✓ Internal transfers seeded.');

    // 9. Seed Stock Adjustments
    const adjustmentsSeed = [
      { sku: 'ELEC-SCN-200', recorded: 185, counted: 180, delta: -5, notes: 'Annual physical barcode scanner cycle audit' },
      { sku: 'PKG-BOX-LRG', recorded: 1150, counted: 1200, delta: 50, notes: 'Surplus carton count found in overflow aisle' },
      { sku: 'HDW-PLT-250', recorded: 18, counted: 18, delta: 0, notes: 'Quarterly heavy hardware verification - 100% match' },
    ];

    for (const adj of adjustmentsSeed) {
      const pId = prodMap[adj.sku];
      if (pId) {
        await conn.query(
          `INSERT INTO stock_adjustments (product_id, location_id, recorded_qty, counted_qty, delta, logged_by, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [pId, stockLocId, adj.recorded, adj.counted, adj.delta, adminId, adj.notes]
        );
      }
    }

    console.log('✓ Stock adjustments audit records seeded.');
    console.log('🎉 Sample data seeding completed successfully!');
  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

seed();
