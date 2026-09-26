/**
 * server/database/seed.js
 * Seeds the database with test data: user, warehouse, locations, products, stock.
 * Run: npm run seed (after running all migration SQL files)
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    multipleStatements: true,
  });

  try {
    console.log('Seeding database...\n');

    // 1. Test user  (login: admin1 / password: Password1!)
    const hash = await bcrypt.hash('Password1!', 10);
    await conn.query(
      `INSERT IGNORE INTO users (login_id, email, password_hash, role)
       VALUES (?, ?, ?, ?)`,
      ['admin1', 'admin@stocksense.com', hash, 'inventory_manager']
    );
    console.log('✓ User created: admin1 / Password1!');

    // 2. Warehouse
    await conn.query(
      `INSERT IGNORE INTO warehouses (name, short_code, address)
       VALUES (?, ?, ?)`,
      ['Main Warehouse', 'WH', '123 Industrial Ave, Hyderabad']
    );
    console.log('✓ Warehouse: Main Warehouse (WH)');

    // 3. Locations
    const locations = [
      ['Stock Room',        'STOCK1', 1],
      ['Shipping Bay',      'SHIP1',  1],
      ['Production Floor',  'PROD1',  1],
    ];
    for (const [name, code, whId] of locations) {
      await conn.query(
        `INSERT IGNORE INTO locations (name, short_code, warehouse_id)
         VALUES (?, ?, ?)`,
        [name, code, whId]
      );
    }
    console.log('✓ Locations: Stock Room, Shipping Bay, Production Floor');

    // 4. Categories
    const categories = ['Furniture', 'Electronics', 'Office Supplies'];
    for (const name of categories) {
      await conn.query(
        'INSERT IGNORE INTO categories (name) VALUES (?)',
        [name]
      );
    }
    console.log('✓ Categories: Furniture, Electronics, Office Supplies');

    // 5. Products
    const products = [
      ['Office Chair',   'CHAIR-001', 1, 'units',  150.00],
      ['Standing Desk',  'DESK-001',  1, 'units',  450.00],
      ['Desk Lamp',      'LAMP-001',  2, 'units',   35.00],
      ['Monitor Stand',  'MNTR-001',  2, 'units',   75.00],
      ['Notebook Pack',  'NOTE-001',  3, 'packs',   12.00],
    ];
    for (const [name, sku, catId, uom, cost] of products) {
      await conn.query(
        `INSERT IGNORE INTO products (name, sku, category_id, unit_of_measure, per_unit_cost)
         VALUES (?, ?, ?, ?, ?)`,
        [name, sku, catId, uom, cost]
      );
    }
    console.log('✓ Products: 5 items seeded');

    // 6. Stock (at Stock Room, location_id = 1)
    const stock = [
      [1, 1, 50,  50],
      [2, 1, 20,  20],
      [3, 1, 100, 100],
      [4, 1, 30,  30],
      [5, 1, 200, 200],
    ];
    for (const [pid, lid, onHand, free] of stock) {
      await conn.query(
        `INSERT INTO stock (product_id, location_id, on_hand_qty, free_to_use_qty)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE on_hand_qty = ?, free_to_use_qty = ?`,
        [pid, lid, onHand, free, onHand, free]
      );
    }
    console.log('✓ Stock seeded at Stock Room');

    console.log('\n✅ Seed complete!');
    console.log('   Login with:  admin1 / Password1!');
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

seed();
