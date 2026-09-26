# DATABASE & MIGRATIONS — StockSense

Stack: MySQL (native local server install, not Docker), raw SQL via the
`mysql2` driver (no ORM). Every teammate runs their own local MySQL
instance; hand-written numbered migration files keep schemas in sync.

## Schema (StockSense entities)

```sql
-- 001_create_users.sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  login_id VARCHAR(12) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('inventory_manager', 'warehouse_staff') DEFAULT 'warehouse_staff',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 002_create_warehouses_locations.sql
CREATE TABLE warehouses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  short_code VARCHAR(20) UNIQUE NOT NULL,
  address VARCHAR(500)
);

CREATE TABLE locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  short_code VARCHAR(20) NOT NULL,
  warehouse_id INT NOT NULL,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  INDEX idx_warehouse (warehouse_id)
);

-- 003_create_products_stock.sql
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(50) UNIQUE NOT NULL,
  category_id INT,
  unit_of_measure VARCHAR(50),
  per_unit_cost DECIMAL(10,2) DEFAULT 0,
  reordering_rule VARCHAR(255),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  INDEX idx_category (category_id)
);

CREATE TABLE stock (
  product_id INT NOT NULL,
  location_id INT NOT NULL,
  on_hand_qty INT DEFAULT 0,
  free_to_use_qty INT DEFAULT 0,
  PRIMARY KEY (product_id, location_id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- 004_create_receipts.sql
CREATE TABLE receipts (
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
  INDEX idx_status (status)
);

CREATE TABLE receipt_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  receipt_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  FOREIGN KEY (receipt_id) REFERENCES receipts(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 005_create_deliveries.sql
CREATE TABLE deliveries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(50) UNIQUE NOT NULL,
  from_location_id INT NOT NULL,
  to_contact VARCHAR(255),
  delivery_address VARCHAR(500),
  schedule_date DATE,
  operation_type VARCHAR(100),
  responsible_user_id INT NOT NULL,
  status ENUM('draft','waiting','ready','done','canceled') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_location_id) REFERENCES locations(id),
  FOREIGN KEY (responsible_user_id) REFERENCES users(id),
  INDEX idx_status (status)
);

CREATE TABLE delivery_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  delivery_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  out_of_stock BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (delivery_id) REFERENCES deliveries(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 006_create_transfers.sql
CREATE TABLE internal_transfers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_location_id INT NOT NULL,
  to_location_id INT NOT NULL,
  transfer_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_location_id) REFERENCES locations(id),
  FOREIGN KEY (to_location_id) REFERENCES locations(id)
);

CREATE TABLE transfer_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transfer_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  FOREIGN KEY (transfer_id) REFERENCES internal_transfers(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 007_create_adjustments.sql
CREATE TABLE stock_adjustments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  location_id INT NOT NULL,
  recorded_qty INT NOT NULL,
  counted_qty INT NOT NULL,
  delta INT NOT NULL,
  logged_by INT NOT NULL,
  adjustment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (location_id) REFERENCES locations(id),
  FOREIGN KEY (logged_by) REFERENCES users(id)
);

-- 008_create_move_history.sql
CREATE TABLE move_history (
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
);
```

## One-time setup (each person, once)
1. Install MySQL Server natively:
   - Windows: MySQL Installer → "Server only"
   - Mac: `brew install mysql && brew services start mysql`
   - Linux/WSL: `sudo apt install mysql-server && sudo service mysql start`
2. `CREATE DATABASE stocksense_dev;`
3. `.env` in `server/`:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=yourpassword
   DB_NAME=stocksense_dev
   DB_PORT=3306
   JWT_SECRET=<generate a random string>
   ```
4. `npm install mysql2 bcrypt jsonwebtoken`

## Connection pool
```javascript
// server/src/db/connection.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
```

## Migration workflow
- Location: `server/database/migrations/`, numbered sequentially
  (`001_create_users.sql`, `002_create_warehouses_locations.sql`, ...
  matching the order above).
- **Creating one:** write the SQL, run it against your own local DB
  (`mysql -u root -p stocksense_dev < server/database/migrations/00X_name.sql`),
  commit, push, tell the team the number you used.
- **Applying someone else's:** after pulling, run their file the same way
  against your own local DB. Manual — no automated runner.
- **Never edit a pushed migration.** A fix is a new numbered file (e.g.
  `009_fix_stock_default.sql`).
- **Never reuse a number** another teammate has claimed — check the
  folder or ask before naming yours.

## Querying — always parameterized
```javascript
const pool = require('../db/connection');

const [rows] = await pool.query(
  'SELECT * FROM users WHERE login_id = ?',
  [loginId]
);
```
Never build queries with string concatenation or template literals
containing user input — this is the primary SQL-injection defense since
there's no ORM handling it automatically.

## Stock mutation + ledger pattern (use in every controller that touches stock)
```javascript
async function applyStockChange(conn, { productId, locationId, delta }) {
  await conn.query(
    `INSERT INTO stock (product_id, location_id, on_hand_qty, free_to_use_qty)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       on_hand_qty = on_hand_qty + VALUES(on_hand_qty),
       free_to_use_qty = free_to_use_qty + VALUES(free_to_use_qty)`,
    [productId, locationId, delta, delta]
  );
}
```
Wrap the stock update + move_history insert in a single MySQL transaction
(`conn.beginTransaction()` / `commit()` / `rollback()`) so a failure never
leaves stock updated without a matching ledger row, or vice versa.

## Resetting your own local database
```sql
DROP DATABASE stocksense_dev;
CREATE DATABASE stocksense_dev;
```
Then re-run every migration file in order. Only affects your own machine.

## Ownership per feature
Each person's migration file and the table(s) it creates belong to their
feature slice (see `PHASES.md` for the mapping). Cross-feature schema
changes (e.g. adding a column to `products` from the Transfers slice)
need a quick heads-up to that table's owner before pushing.
