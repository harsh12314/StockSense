const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function migrate() {
  console.log('Connecting to MySQL at', process.env.DB_HOST || '127.0.0.1');

  try {
    // 1. Create database if not exists
    const rootConn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true,
    });

    const dbName = process.env.DB_NAME || 'stocksense_dev';
    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await rootConn.end();
    console.log(`✓ Database \`${dbName}\` verified/created.`);

    // 2. Connect to database
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: dbName,
      multipleStatements: true,
    });

    // 3. Read and run all migration files in order
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`Running migration: ${file}...`);
      await conn.query(sql);
      console.log(`✓ ${file} applied.`);
    }

    await conn.end();
    console.log('\nAll migrations completed successfully!');
  } catch (err) {
    console.error('Migration error:', err.message);
  }
}

migrate();
