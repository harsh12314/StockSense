// server/src/db/seed-db.js
// Inserts minimal dev seed data required to test the Receipts feature.
// Uses bcrypt to hash the dev password programmatically — no plaintext
// secrets in SQL files.
//
// Run via:  npm run db:seed
//
// What it seeds:
//   users       → id=1, login_id='dev_user'  (matches DEV_BYPASS_USER in authMiddleware)
//   warehouses  → id=1, 'Main Warehouse'
//   locations   → id=1, 'Main Warehouse'     (frontend hardcodes to_location_id=1)
//   categories  → id=1, 'Raw Materials'
//   products    → id=1 Steel Rods, id=2 Bolts, id=3 Chairs
//
// All INSERTs use ON DUPLICATE KEY UPDATE id=id (no-op) so it is safe
// to run multiple times without creating duplicates.

'use strict';
const path   = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DB_CONFIG = {
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'stocksense_dev',
  port:     Number(process.env.DB_PORT) || 3306,
};

// Dev credentials — plaintext only exists here in this script, never in SQL.
// Login ID must match DEV_BYPASS_USER.login_id in authMiddleware.js exactly.
const DEV_LOGIN_ID = 'dev_user';
const DEV_PASSWORD = 'DevPass@1';   // ← use this to log in once auth is built
const DEV_EMAIL    = 'dev@stocksense.local';

async function seed() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('✅ Connected to', DB_CONFIG.database);

  try {
    // Hash password with bcrypt (10 rounds matches project standard)
    const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);
    console.log('🔐 Password hashed');

    // ── 1. User (id=1) ──────────────────────────────────────────────────────
    // id=1 matches DEV_BYPASS_USER injected by authMiddleware in dev mode.
    // receipts.responsible_user_id FK points here.
    await conn.query(
      `INSERT INTO users (id, login_id, email, password_hash, role)
       VALUES (?, ?, ?, ?, 'inventory_manager')
       ON DUPLICATE KEY UPDATE id = id`,
      [1, DEV_LOGIN_ID, DEV_EMAIL, passwordHash]
    );
    console.log('👤 Seeded: users  (id=1, login_id=dev_user)');

    // ── 2. Warehouse (id=1) ─────────────────────────────────────────────────
    // FK parent required by locations.warehouse_id.
    await conn.query(
      `INSERT INTO warehouses (id, name, short_code, address)
       VALUES (1, 'Main Warehouse', 'WH', '123 Industrial Estate, Hyderabad')
       ON DUPLICATE KEY UPDATE id = id`
    );
    console.log('🏭 Seeded: warehouses (id=1)');

    // ── 3. Location (id=1) ──────────────────────────────────────────────────
    // CRITICAL: frontend ReceiptsList.jsx handleNew() hardcodes to_location_id=1.
    // If this row is missing, every POST /api/receipts fails with FK error.
    await conn.query(
      `INSERT INTO locations (id, name, short_code, warehouse_id)
       VALUES (1, 'Main Warehouse', 'WH/STOCK', 1)
       ON DUPLICATE KEY UPDATE id = id`
    );
    console.log('📍 Seeded: locations (id=1, name=Main Warehouse)');

    // ── 4. Category (id=1) ──────────────────────────────────────────────────
    await conn.query(
      `INSERT INTO categories (id, name)
       VALUES (1, 'Raw Materials')
       ON DUPLICATE KEY UPDATE id = id`
    );
    console.log('🏷️  Seeded: categories (id=1)');

    // ── 5. Products ─────────────────────────────────────────────────────────
    // getReceipt queries: p.name AS product_name, p.sku
    // Use these product IDs in the Add Product modal when testing.
    await conn.query(
      `INSERT INTO products (id, name, sku, category_id, unit_of_measure, per_unit_cost)
       VALUES
         (1, 'Steel Rods', 'SKU-SR-001', 1, 'piece', 125.00),
         (2, 'Bolts',      'SKU-BT-002', 1, 'piece',   2.50),
         (3, 'Chairs',     'SKU-CH-003', 1, 'piece', 850.00)
       ON DUPLICATE KEY UPDATE id = id`
    );
    // ── 6. Initial Stock & Move History ────────────────────────────────────
    await conn.query(
      `INSERT INTO stock (product_id, location_id, on_hand_qty, free_to_use_qty)
       VALUES
         (1, 1, 150, 150),
         (2, 1, 500, 500),
         (3, 1, 80, 80)
       ON DUPLICATE KEY UPDATE on_hand_qty = VALUES(on_hand_qty)`
    );

    await conn.query(
      `INSERT INTO move_history (id, reference, contact, from_location, to_location, product_id, quantity, direction, status)
       VALUES
         (1, 'WH/IN/0001', 'Tata Steel Ltd', 'Vendor Dock', 'WH/STOCK', 1, 150, 'in', 'done'),
         (2, 'WH/IN/0002', 'Fastener Hub', 'Vendor Dock', 'WH/STOCK', 2, 500, 'in', 'done'),
         (3, 'WH/IN/0003', 'Nilkamal Furnishings', 'Vendor Dock', 'WH/STOCK', 3, 100, 'in', 'done'),
         (4, 'WH/OUT/0001', 'Acme Corporation', 'WH/STOCK', 'Customer Site', 3, 20, 'out', 'done')
       ON DUPLICATE KEY UPDATE id = id`
    );
    console.log('📜 Seeded: move_history & stock records');

    console.log('\n✅ Seed complete. You can now test the StockSense features.');
    console.log('   Product IDs to use in Add Product modal:');
    console.log('     1 → Steel Rods  (SKU-SR-001)');
    console.log('     2 → Bolts       (SKU-BT-002)');
    console.log('     3 → Chairs      (SKU-CH-003)');
  } catch (e) {
    console.error('❌ Seed failed:', e.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

seed();
