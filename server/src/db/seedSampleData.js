// server/src/db/seedSampleData.js
// Seeds the database with rich, professional demo data for demo/presentation.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./connection');

async function seed() {
  const conn = await pool.getConnection();
  try {
    console.log('--- Initializing StockSense Database Tables & Demo Data ---');

    // 1. Ensure all tables exist with full constraints
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
        category_id INT,
        unit_of_measure VARCHAR(50) DEFAULT 'Units',
        per_unit_cost DECIMAL(10,2) DEFAULT 0,
        reordering_rule VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
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
        out_of_stock BOOLEAN DEFAULT FALSE,
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

    console.log('✓ All database schemas verified.');

    // 2. Seed Users
    const defaultPasswordHash = await bcrypt.hash('Password1!', 10);
    const demoUsers = [
      { loginId: 'admin1', email: 'admin@stocksense.io', role: 'inventory_manager' },
      { loginId: 'operator1', email: 'operator@stocksense.io', role: 'warehouse_staff' },
      { loginId: 'staff1', email: 'staff@stocksense.io', role: 'warehouse_staff' },
      { loginId: 'sarah_ops', email: 'sarah.ops@stocksense.io', role: 'inventory_manager' },
    ];

    let adminId = null;
    for (const u of demoUsers) {
      await conn.query(
        `INSERT INTO users (login_id, email, password_hash, role)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE email = VALUES(email), role = VALUES(role)`,
        [u.loginId, u.email, defaultPasswordHash, u.role]
      );
      const [[userRow]] = await conn.query('SELECT id FROM users WHERE login_id = ?', [u.loginId]);
      if (u.loginId === 'admin1') adminId = userRow.id;
    }
    console.log('✓ Demo users seeded (admin1 / Password1!, operator1 / Password1!)');

    // 3. Seed Categories
    const categories = [
      'Industrial Hardware',
      'Electronics & Sensors',
      'Packaging Materials',
      'Robotics & Automation',
      'Safety & Protective Equipment',
      'Material Handling Gear',
    ];
    const catMap = {};
    for (const cat of categories) {
      await conn.query('INSERT IGNORE INTO categories (name) VALUES (?)', [cat]);
      const [[cRow]] = await conn.query('SELECT id FROM categories WHERE name = ?', [cat]);
      if (cRow) catMap[cat] = cRow.id;
    }
    console.log('✓ Product categories seeded.');

    // 4. Seed Warehouses & Multi-zone Locations
    const warehousesData = [
      {
        name: 'Central Logistics Hub',
        short_code: 'WH',
        address: 'Plot 42, Gachibowli Logistics Park, Hyderabad',
        locations: [
          { name: 'Stock Room', short_code: 'WH/STOCK' },
          { name: 'Receiving Dock A', short_code: 'WH/IN-A' },
          { name: 'Bulk Storage Aisle 01', short_code: 'WH/STOCK-A1' },
          { name: 'High-Rack Storage 02', short_code: 'WH/STOCK-A2' },
          { name: 'Cold Storage Vault', short_code: 'WH/COLD-01' },
          { name: 'Staging & Packing Area', short_code: 'WH/PACK-01' },
          { name: 'Dispatch Bay 1', short_code: 'WH/OUT-01' },
        ],
      },
      {
        name: 'Coastal Gateway Facility',
        short_code: 'CGF',
        address: 'Terminal 4, JNPT Port Logistics Zone, Navi Mumbai',
        locations: [
          { name: 'Inbound Container Yard', short_code: 'CGF/YARD-IN' },
          { name: 'Main Warehouse Floor', short_code: 'CGF/STOCK' },
          { name: 'Export Dispatch Dock', short_code: 'CGF/OUT-EXP' },
        ],
      },
      {
        name: 'North Distribution Depot',
        short_code: 'NDD',
        address: 'Sector 18, IMT Manesar, Gurugram, Haryana',
        locations: [
          { name: 'North Central Storage', short_code: 'NDD/STOCK' },
          { name: 'Rapid Fulfillment Line', short_code: 'NDD/PICK-01' },
          { name: 'Cross-Dock Shipping Area', short_code: 'NDD/SHIP-01' },
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
    console.log('✓ 3 Warehouses & 13 Locations verified.');

    // 5. Seed Comprehensive Catalog of Products (healthy, low-stock alerts, out-of-stock)
    const productsData = [
      // 1. Healthy stock items
      { name: 'Industrial Corrugated Box (Pack of 50)', sku: 'PKG-BOX-50', category: 'Packaging Materials', unit_of_measure: 'packs', cost: 1250.00, reorder: '50', qty: 350 },
      { name: 'High-Tensile Stretch Wrap Roll 500m', sku: 'PKG-WRP-500', category: 'Packaging Materials', unit_of_measure: 'rolls', cost: 850.00, reorder: '30', qty: 180 },
      { name: 'Thermal Shipping Label Rolls (4x6")', sku: 'PKG-LBL-4X6', category: 'Packaging Materials', unit_of_measure: 'rolls', cost: 480.00, reorder: '40', qty: 240 },
      { name: 'Anti-Static ESD Protective Bubble Pouch', sku: 'PKG-ESD-100', category: 'Packaging Materials', unit_of_measure: 'packs', cost: 650.00, reorder: '25', qty: 310 },
      { name: 'IoT Environmental Gateway Sensor Node', sku: 'ELEC-IOT-GW', category: 'Electronics & Sensors', unit_of_measure: 'units', cost: 6800.00, reorder: '15', qty: 64 },
      { name: 'Heavy Duty Steel Pallet Jack (2.5T)', sku: 'MAT-PLT-25T', category: 'Material Handling Gear', unit_of_measure: 'units', cost: 18500.00, reorder: '5', qty: 14 },
      { name: 'Reinforced Steel Toe Safety Boots', sku: 'SFT-BOT-42', category: 'Safety & Protective Equipment', unit_of_measure: 'pairs', cost: 3200.00, reorder: '15', qty: 48 },
      { name: 'Class 2 Hi-Vis Reflective Safety Vest', sku: 'SFT-VST-01', category: 'Safety & Protective Equipment', unit_of_measure: 'units', cost: 420.00, reorder: '20', qty: 95 },
      { name: 'Industrial Grade M8 Fastener & Bolt Assortment', sku: 'HDW-BLT-M8', category: 'Industrial Hardware', unit_of_measure: 'boxes', cost: 1800.00, reorder: '30', qty: 140 },

      // 2. Critical Low-Stock items (Trigger Low Stock Warning in dashboard)
      { name: 'Precision Wireless Barcode Ring Scanner', sku: 'ELEC-SCN-2D', category: 'Electronics & Sensors', unit_of_measure: 'units', cost: 9500.00, reorder: '10', qty: 3 },
      { name: 'Lithium-Ion Forklift Battery Module 48V', sku: 'ELEC-BAT-48V', category: 'Electronics & Sensors', unit_of_measure: 'units', cost: 85000.00, reorder: '4', qty: 2 },
      { name: 'Heavy Duty Modular Steel Shelving 4-Tier', sku: 'HDW-SHL-4T', category: 'Industrial Hardware', unit_of_measure: 'units', cost: 14500.00, reorder: '8', qty: 4 },
      { name: 'Hydraulic Scissor Lift Work Table (500kg)', sku: 'MAT-LFT-500', category: 'Material Handling Gear', unit_of_measure: 'units', cost: 42000.00, reorder: '3', qty: 1 },

      // 3. Out of stock item (Triggers Out of Stock stat)
      { name: 'Autonomous Mobile Warehouse Robot (AMR-500)', sku: 'ROB-AMR-500', category: 'Robotics & Automation', unit_of_measure: 'units', cost: 340000.00, reorder: '2', qty: 0 },
    ];

    const prodMap = {};
    const primaryStockLoc = locMap['WH/STOCK'] || 1;
    const secondaryStockLoc = locMap['CGF/STOCK'] || 2;

    for (const p of productsData) {
      let [existingProd] = await conn.query('SELECT id FROM products WHERE sku = ?', [p.sku]);
      let prodId;
      const catId = catMap[p.category] || null;

      if (existingProd.length > 0) {
        prodId = existingProd[0].id;
        await conn.query(
          `UPDATE products
           SET name = ?, category_id = ?, unit_of_measure = ?, per_unit_cost = ?, reordering_rule = ?
           WHERE id = ?`,
          [p.name, catId, p.unit_of_measure, p.cost, p.reorder, prodId]
        );
      } else {
        const [res] = await conn.query(
          `INSERT INTO products (name, sku, category_id, unit_of_measure, per_unit_cost, reordering_rule)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [p.name, p.sku, catId, p.unit_of_measure, p.cost, p.reorder]
        );
        prodId = res.insertId;
      }
      prodMap[p.sku] = prodId;

      // Seed Stock
      const freeQty = p.qty > 0 ? Math.max(0, p.qty - 2) : 0;
      await conn.query(
        `INSERT INTO stock (product_id, location_id, on_hand_qty, free_to_use_qty)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE on_hand_qty = VALUES(on_hand_qty), free_to_use_qty = VALUES(free_to_use_qty)`,
        [prodId, primaryStockLoc, p.qty, freeQty]
      );

      // Distribute a portion to Coastal facility
      if (p.qty > 20) {
        const coastalQty = Math.floor(p.qty * 0.25);
        await conn.query(
          `INSERT INTO stock (product_id, location_id, on_hand_qty, free_to_use_qty)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE on_hand_qty = VALUES(on_hand_qty), free_to_use_qty = VALUES(free_to_use_qty)`,
          [prodId, secondaryStockLoc, coastalQty, coastalQty]
        );
      }
    }
    console.log('✓ 14 Diverse Products & Multi-location Stock seeded.');

    // 6. Seed Deliveries across all operational stages: Done, Ready, Waiting, Draft
    const deliveriesSeed = [
      {
        reference: 'WH/OUT/00001',
        from_location_id: primaryStockLoc,
        to_contact: 'Tesla Gigafactory Energy Systems',
        delivery_address: 'Gigafactory Phase 2, Industrial Corridor, Pune',
        schedule_date: '2026-09-24',
        operation_type: 'Express Freight Dispatch',
        status: 'done',
        lines: [
          { sku: 'ELEC-BAT-48V', qty: 2 },
          { sku: 'MAT-PLT-25T', qty: 4 },
        ],
      },
      {
        reference: 'WH/OUT/00002',
        from_location_id: primaryStockLoc,
        to_contact: 'Amazon Fulfillment Logistics BLR1',
        delivery_address: 'Building 12, Devanahalli Logistics Park, Bangalore',
        schedule_date: '2026-09-25',
        operation_type: 'Bulk Fulfillment Order',
        status: 'done',
        lines: [
          { sku: 'PKG-BOX-50', qty: 80 },
          { sku: 'PKG-WRP-500', qty: 35 },
          { sku: 'PKG-LBL-4X6', qty: 50 },
        ],
      },
      {
        reference: 'WH/OUT/00003',
        from_location_id: primaryStockLoc,
        to_contact: 'Siemens Smart Infrastructure Ltd',
        delivery_address: 'Sector 29, Cyber City Technology Hub, Gurugram',
        schedule_date: '2026-09-26',
        operation_type: 'Direct Customer Delivery',
        status: 'ready',
        lines: [
          { sku: 'ELEC-IOT-GW', qty: 15 },
          { sku: 'MAT-PLT-25T', qty: 2 },
        ],
      },
      {
        reference: 'WH/OUT/00004',
        from_location_id: primaryStockLoc,
        to_contact: 'DHL Express Supply Chain Depot',
        delivery_address: 'Shamshabad Air Cargo Complex, Gate 5, Hyderabad',
        schedule_date: '2026-09-26',
        operation_type: 'Scheduled Air Freight',
        status: 'ready',
        lines: [
          { sku: 'PKG-BOX-50', qty: 100 },
          { sku: 'PKG-ESD-100', qty: 50 },
        ],
      },
      {
        reference: 'WH/OUT/00005',
        from_location_id: primaryStockLoc,
        to_contact: 'Larsen & Toubro Heavy Engineering',
        delivery_address: 'EPC Project Site 9B, Hazira Marine Port, Gujarat',
        schedule_date: '2026-09-28',
        operation_type: 'Site Cargo Delivery',
        status: 'waiting',
        lines: [
          { sku: 'HDW-SHL-4T', qty: 6 },
          { sku: 'MAT-LFT-500', qty: 2 },
        ],
      },
      {
        reference: 'WH/OUT/00006',
        from_location_id: primaryStockLoc,
        to_contact: 'Tata Motors Assembly Plant',
        delivery_address: 'Plot A-1, Sanand Industrial Area, Ahmedabad',
        schedule_date: '2026-09-29',
        operation_type: 'OEM Line Delivery',
        status: 'waiting',
        lines: [
          { sku: 'ELEC-BAT-48V', qty: 4 },
          { sku: 'ELEC-SCN-2D', qty: 6 },
        ],
      },
      {
        reference: 'WH/OUT/00007',
        from_location_id: primaryStockLoc,
        to_contact: 'Reliance Retail Logistics Center',
        delivery_address: 'State Highway 17, Bhiwandi Logistics Cluster, Maharashtra',
        schedule_date: '2026-09-30',
        operation_type: 'Standard Road Transport',
        status: 'draft',
        lines: [
          { sku: 'SFT-BOT-42', qty: 20 },
          { sku: 'SFT-VST-01', qty: 30 },
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
           SET from_location_id = ?, to_contact = ?, delivery_address = ?, schedule_date = ?, operation_type = ?, status = ?
           WHERE id = ?`,
          [del.from_location_id, del.to_contact, del.delivery_address, del.schedule_date, del.operation_type, del.status, delId]
        );
      } else {
        const [res] = await conn.query(
          `INSERT INTO deliveries (reference, from_location_id, to_contact, delivery_address, schedule_date, operation_type, status, responsible_user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [del.reference, del.from_location_id, del.to_contact, del.delivery_address, del.schedule_date, del.operation_type, del.status, adminId]
        );
        delId = res.insertId;
      }

      await conn.query('DELETE FROM delivery_lines WHERE delivery_id = ?', [delId]);
      for (const line of del.lines) {
        const pId = prodMap[line.sku];
        if (pId) {
          await conn.query('INSERT INTO delivery_lines (delivery_id, product_id, quantity) VALUES (?, ?, ?)', [delId, pId, line.qty]);
        }
      }

      // Record in move_history if completed
      if (del.status === 'done') {
        for (const line of del.lines) {
          const pId = prodMap[line.sku];
          if (pId) {
            await conn.query(
              `INSERT IGNORE INTO move_history (reference, move_date, contact, from_location, to_location, product_id, quantity, direction, status)
               VALUES (?, ?, ?, 'WH/STOCK', 'Customer Consignee', ?, ?, 'out', 'DONE')`,
              [del.reference, `${del.schedule_date} 15:45:00`, del.to_contact, pId, line.qty]
            );
          }
        }
      }
    }
    console.log('✓ 7 Delivery Orders (Done, Ready, Waiting, Draft) seeded.');

    // 7. Seed Receipts across all operational stages: Done, Ready, Draft, Canceled
    const receiptsSeed = [
      {
        reference: 'WH/IN/00001',
        from_contact: 'Tata Steel Global Operations',
        to_location_id: primaryStockLoc,
        schedule_date: '2026-09-22',
        status: 'done',
        lines: [
          { sku: 'HDW-SHL-4T', qty: 12 },
          { sku: 'HDW-BLT-M8', qty: 100 },
        ],
      },
      {
        reference: 'WH/IN/00002',
        from_contact: 'Mondi Industrial Packaging Group',
        to_location_id: primaryStockLoc,
        schedule_date: '2026-09-23',
        status: 'done',
        lines: [
          { sku: 'PKG-BOX-50', qty: 250 },
          { sku: 'PKG-WRP-500', qty: 100 },
        ],
      },
      {
        reference: 'WH/IN/00003',
        from_contact: 'Foxconn Semiconductor Electronics',
        to_location_id: primaryStockLoc,
        schedule_date: '2026-09-26',
        status: 'ready',
        lines: [
          { sku: 'ELEC-IOT-GW', qty: 35 },
          { sku: 'ELEC-SCN-2D', qty: 15 },
        ],
      },
      {
        reference: 'WH/IN/00004',
        from_location_id: primaryStockLoc,
        from_contact: 'SafeGuard International Protective Gear',
        to_location_id: primaryStockLoc,
        schedule_date: '2026-09-26',
        status: 'ready',
        lines: [
          { sku: 'SFT-BOT-42', qty: 30 },
          { sku: 'SFT-VST-01', qty: 60 },
        ],
      },
      {
        reference: 'WH/IN/00005',
        from_contact: 'Omron Advanced Automation Systems',
        to_location_id: primaryStockLoc,
        schedule_date: '2026-09-28',
        status: 'draft',
        lines: [
          { sku: 'ROB-AMR-500', qty: 2 },
          { sku: 'ELEC-BAT-48V', qty: 4 },
        ],
      },
      {
        reference: 'WH/IN/00006',
        from_contact: 'Apex Heavy Logistics Equipment',
        to_location_id: primaryStockLoc,
        schedule_date: '2026-09-20',
        status: 'canceled',
        lines: [
          { sku: 'MAT-LFT-500', qty: 3 },
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
              [rec.reference, `${rec.schedule_date} 10:20:00`, rec.from_contact, pId, line.qty]
            );
          }
        }
      }
    }
    console.log('✓ 6 Inbound Receipts (Done, Ready, Draft, Canceled) seeded.');

    // 8. Seed Internal Transfers between warehouse locations
    const transfersSeed = [
      {
        reference: 'WH/TRANS/00001',
        from_location_id: locMap['WH/STOCK-A1'] || primaryStockLoc,
        to_location_id: locMap['WH/PACK-01'] || 3,
        transfer_date: '2026-09-24',
        status: 'done',
        lines: [
          { sku: 'PKG-BOX-50', qty: 40 },
          { sku: 'PKG-WRP-500', qty: 15 },
        ],
      },
      {
        reference: 'WH/TRANS/00002',
        from_location_id: locMap['WH/STOCK'] || primaryStockLoc,
        to_location_id: locMap['CGF/STOCK'] || secondaryStockLoc,
        transfer_date: '2026-09-25',
        status: 'done',
        lines: [
          { sku: 'ELEC-IOT-GW', qty: 10 },
          { sku: 'HDW-BLT-M8', qty: 25 },
        ],
      },
      {
        reference: 'WH/TRANS/00003',
        from_location_id: locMap['WH/IN-A'] || primaryStockLoc,
        to_location_id: locMap['WH/STOCK-A2'] || primaryStockLoc,
        transfer_date: '2026-09-26',
        status: 'ready',
        lines: [
          { sku: 'SFT-BOT-42', qty: 15 },
          { sku: 'SFT-VST-01', qty: 30 },
        ],
      },
      {
        reference: 'WH/TRANS/00004',
        from_location_id: locMap['WH/STOCK'] || primaryStockLoc,
        to_location_id: locMap['NDD/STOCK'] || secondaryStockLoc,
        transfer_date: '2026-09-28',
        status: 'draft',
        lines: [
          { sku: 'MAT-PLT-25T', qty: 2 },
          { sku: 'ELEC-SCN-2D', qty: 4 },
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

      if (tr.status === 'done') {
        for (const line of tr.lines) {
          const pId = prodMap[line.sku];
          if (pId) {
            await conn.query(
              `INSERT IGNORE INTO move_history (reference, move_date, contact, from_location, to_location, product_id, quantity, direction, status)
               VALUES (?, ?, 'Internal Transfer', 'WH/STOCK', 'CGF/STOCK', ?, ?, 'out', 'DONE')`,
              [tr.reference, `${tr.transfer_date} 11:30:00`, pId, line.qty]
            );
          }
        }
      }
    }
    console.log('✓ 4 Internal Stock Transfers seeded.');

    // 9. Seed Stock Adjustments (Cycle Counts, Surplus, Shrinkage)
    const adjustmentsSeed = [
      { sku: 'PKG-WRP-500', recorded: 182, counted: 180, delta: -2, notes: 'Damaged roll discarded during morning inspection' },
      { sku: 'ELEC-IOT-GW', recorded: 63, counted: 64, delta: 1, notes: 'Surplus unlogged unit found in staging bin' },
      { sku: 'HDW-BLT-M8', recorded: 140, counted: 140, delta: 0, notes: 'Quarterly hardware inventory audit - 100% variance match' },
      { sku: 'SFT-VST-01', recorded: 97, counted: 95, delta: -2, notes: 'Sample units issued for client demonstration' },
      { sku: 'PKG-BOX-50', recorded: 345, counted: 350, delta: 5, notes: 'Extra bundle accounted for during pallet restack' },
    ];

    for (const adj of adjustmentsSeed) {
      const pId = prodMap[adj.sku];
      if (pId) {
        await conn.query(
          `INSERT INTO stock_adjustments (product_id, location_id, recorded_qty, counted_qty, delta, logged_by, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [pId, primaryStockLoc, adj.recorded, adj.counted, adj.delta, adminId, adj.notes]
        );

        // Record adjustment in move_history
        const adjRef = `ADJ/2026/000${pId}`;
        await conn.query(
          `INSERT IGNORE INTO move_history (reference, move_date, contact, from_location, to_location, product_id, quantity, direction, status)
           VALUES (?, NOW() - INTERVAL ? DAY, 'Stock Adjustment', 'WH/STOCK', 'WH/STOCK', ?, ?, ?, 'DONE')`,
          [adjRef, Math.floor(Math.random() * 5) + 1, pId, Math.abs(adj.delta) || 1, adj.delta >= 0 ? 'in' : 'out']
        );
      }
    }
    console.log('✓ 5 Physical Count Adjustments seeded.');

    console.log('\n======================================================');
    console.log('🎉 Demo Database Population Completed Successfully!');
    console.log('======================================================');
    console.log('Credentials:');
    console.log('  Manager:  admin1    / Password1!');
    console.log('  Operator: operator1 / Password1!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('Error during demo seeding:', err);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
}

seed();
