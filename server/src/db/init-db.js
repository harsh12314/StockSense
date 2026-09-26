// server/src/db/init-db.js
// Reads schema.sql and executes it against stocksense_dev.
// Run via:  npm run db:init
//
// Prerequisites:
//   1. MySQL is running locally
//   2. You have run:  CREATE DATABASE stocksense_dev;  in MySQL
//   3. server/.env is configured with correct credentials

'use strict';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mysql = require('mysql2/promise');
const fs    = require('fs');

const DB_CONFIG = {
  host:             process.env.DB_HOST     || 'localhost',
  user:             process.env.DB_USER     || 'root',
  password:         process.env.DB_PASSWORD || '',
  database:         process.env.DB_NAME     || 'stocksense_dev',
  port:             Number(process.env.DB_PORT) || 3306,
  multipleStatements: true,   // required to execute the full schema in one call
};

async function init() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('✅ Connected to', DB_CONFIG.database);

  try {
    await conn.query(sql);
    console.log('✅ Schema applied successfully.');
    console.log('   Tables created (if they did not already exist):');
    console.log('     users, warehouses, locations, categories, products,');
    console.log('     stock, receipts, receipt_lines, move_history');
    console.log('\n   Next step:  npm run db:seed');
  } catch (e) {
    console.error('❌ Schema init failed:', e.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

init();
