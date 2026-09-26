// server/src/db/connection.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:             process.env.DB_HOST     || 'localhost',
  user:             process.env.DB_USER     || 'root',
  password:         process.env.DB_PASSWORD || '',
  database:         process.env.DB_NAME     || 'stocksense_dev',
  port:             process.env.DB_PORT     || 3306,
  waitForConnections: true,
  connectionLimit:  10,
});

module.exports = pool;
