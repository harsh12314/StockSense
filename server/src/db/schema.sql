-- ================================================================
-- StockSense — schema.sql
-- File: server/src/db/schema.sql
--
-- Creates every table required by the existing Receipts controller.
-- Run via:  npm run db:init
--           (which calls node src/db/init-db.js)
--
-- Prerequisites:
--   CREATE DATABASE stocksense_dev;   ← do this once in MySQL first
--
-- Safe to re-run on an EMPTY database (IF NOT EXISTS guards).
-- Never edit a pushed schema; add a new numbered migration instead.
-- ================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ── 1. users ────────────────────────────────────────────────────
-- Columns confirmed from code inspection:
--   u.id        → receipts.responsible_user_id FK
--                 req.user.id used in createReceipt INSERT
--   u.login_id  → CONCAT(u.login_id) AS responsible
--                 in listReceipts & getReceipt JOINs
--   role        → decoded JWT payload shape { id, login_id, role }
--                 in authMiddleware.js line 25
--   email, password_hash → required by future auth feature (auth
--                           feature owner's migration will own these;
--                           included here so the table is complete)
CREATE TABLE IF NOT EXISTS users (
  id            INT           AUTO_INCREMENT PRIMARY KEY,
  login_id      VARCHAR(12)   NOT NULL,
  email         VARCHAR(255)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  role          ENUM('inventory_manager','warehouse_staff')
                              NOT NULL DEFAULT 'warehouse_staff',
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_users_login_id UNIQUE (login_id),
  CONSTRAINT uq_users_email    UNIQUE (email)
);

-- ── 2. warehouses ───────────────────────────────────────────────
-- Required as FK parent for locations.warehouse_id.
-- Not directly queried by receipts controller.
CREATE TABLE IF NOT EXISTS warehouses (
  id         INT          AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  short_code VARCHAR(20)  NOT NULL,
  address    VARCHAR(500),
  CONSTRAINT uq_warehouses_short_code UNIQUE (short_code)
);

-- ── 3. locations ────────────────────────────────────────────────
-- Columns confirmed from code inspection:
--   l.id    → receipts.to_location_id FK
--              receipt.to_location_id in validateReceipt stock UPSERT
--   l.name  → l.name AS to_location  (listReceipts, getReceipt)
--              l.name AS to_location_name  (validateReceipt move_history INSERT)
-- Frontend hardcodes to_location_id = 1 in handleNew() — seed MUST
-- have id = 1.
CREATE TABLE IF NOT EXISTS locations (
  id           INT          AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  short_code   VARCHAR(20)  NOT NULL,
  warehouse_id INT          NOT NULL,
  CONSTRAINT fk_locations_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  INDEX idx_locations_warehouse (warehouse_id)
);

-- ── 4. categories ───────────────────────────────────────────────
-- Required as FK parent for products.category_id (nullable FK, so
-- products can exist without a category, but table must exist).
CREATE TABLE IF NOT EXISTS categories (
  id   INT          AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  CONSTRAINT uq_categories_name UNIQUE (name)
);

-- ── 5. products ─────────────────────────────────────────────────
-- Columns confirmed from code inspection:
--   p.id    → receipt_lines.product_id FK
--              stock.product_id FK
--              move_history.product_id FK
--   p.name  → p.name AS product_name  (getReceipt lines SELECT)
--   p.sku   → p.sku                   (getReceipt lines SELECT)
CREATE TABLE IF NOT EXISTS products (
  id              INT            AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(255)   NOT NULL,
  sku             VARCHAR(50)    NOT NULL,
  category_id     INT            DEFAULT NULL,
  unit_of_measure VARCHAR(50),
  per_unit_cost   DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  reordering_rule VARCHAR(255),
  CONSTRAINT uq_products_sku UNIQUE (sku),
  CONSTRAINT fk_products_category
    FOREIGN KEY (category_id) REFERENCES categories(id),
  INDEX idx_products_category (category_id)
);

-- ── 6. stock ────────────────────────────────────────────────────
-- Columns confirmed from code inspection (validateReceipt):
--   INSERT INTO stock (product_id, location_id, on_hand_qty, free_to_use_qty)
--   VALUES (?, ?, ?, ?)
--   ON DUPLICATE KEY UPDATE
--     on_hand_qty     = on_hand_qty     + VALUES(on_hand_qty),
--     free_to_use_qty = free_to_use_qty + VALUES(free_to_use_qty)
--
-- The composite PRIMARY KEY (product_id, location_id) is what makes
-- ON DUPLICATE KEY UPDATE detect the existing row. This is NOT a
-- UNIQUE constraint — it IS the PRIMARY KEY.
CREATE TABLE IF NOT EXISTS stock (
  product_id      INT NOT NULL,
  location_id     INT NOT NULL,
  on_hand_qty     INT NOT NULL DEFAULT 0,
  free_to_use_qty INT NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, location_id),          -- required for ON DUPLICATE KEY UPDATE
  CONSTRAINT fk_stock_product
    FOREIGN KEY (product_id)  REFERENCES products(id),
  CONSTRAINT fk_stock_location
    FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- ── 7. receipts ─────────────────────────────────────────────────
-- Columns confirmed from code inspection:
--   INSERT: reference, from_contact, to_location_id,
--           schedule_date, responsible_user_id, status
--   SELECT: r.id, r.reference, r.from_contact, r.schedule_date,
--           r.status, r.created_at, r.to_location_id (via r.*)
--   UPDATE: status
CREATE TABLE IF NOT EXISTS receipts (
  id                  INT           AUTO_INCREMENT PRIMARY KEY,
  reference           VARCHAR(50)   NOT NULL,
  from_contact        VARCHAR(255)  DEFAULT NULL,
  to_location_id      INT           NOT NULL,
  schedule_date       DATE          DEFAULT NULL,
  responsible_user_id INT           NOT NULL,
  status              ENUM('draft','ready','done','canceled')
                                    NOT NULL DEFAULT 'draft',
  created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_receipts_reference UNIQUE (reference),
  CONSTRAINT fk_receipts_location
    FOREIGN KEY (to_location_id)      REFERENCES locations(id),
  CONSTRAINT fk_receipts_user
    FOREIGN KEY (responsible_user_id) REFERENCES users(id),
  INDEX idx_receipts_status (status)
);

-- ── 8. receipt_lines ────────────────────────────────────────────
-- Columns confirmed from code inspection:
--   INSERT: receipt_id, product_id, quantity
--   SELECT: rl.id, rl.quantity, rl.product_id (via SELECT *)
--   DELETE: WHERE id = ? AND receipt_id = ?
--   COUNT:  COUNT(*) AS lineCount WHERE receipt_id = ?
CREATE TABLE IF NOT EXISTS receipt_lines (
  id         INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  receipt_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity   INT NOT NULL,
  CONSTRAINT fk_receipt_lines_receipt
    FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE,
  CONSTRAINT fk_receipt_lines_product
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ── 9. deliveries ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deliveries (
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

-- ── 10. delivery_lines ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  delivery_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  out_of_stock BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ── 11. move_history ─────────────────────────────────────────────
-- Columns confirmed from validateReceipt INSERT (exact column list):
--   INSERT INTO move_history
--     (reference, contact, from_location, to_location,
--      product_id, quantity, direction, status)
--   VALUES (?, ?, 'Supplier', ?, ?, ?, 'in', 'done')
--
-- move_date is NOT passed by the controller — it defaults to NOW().
-- direction is always 'in' for receipts; 'out' used by deliveries.
CREATE TABLE IF NOT EXISTS move_history (
  id            INT           AUTO_INCREMENT PRIMARY KEY,
  reference     VARCHAR(50)   NOT NULL,
  move_date     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  contact       VARCHAR(255)  DEFAULT NULL,
  from_location VARCHAR(255)  DEFAULT NULL,
  to_location   VARCHAR(255)  DEFAULT NULL,
  product_id    INT           NOT NULL,
  quantity      INT           NOT NULL,
  direction     ENUM('in','out') NOT NULL,
  status        VARCHAR(50)   DEFAULT NULL,
  CONSTRAINT fk_move_history_product
    FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_move_direction (direction),
  INDEX idx_move_date      (move_date)
);

-- ── 12. internal_transfers ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS internal_transfers (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  reference           VARCHAR(50) UNIQUE NOT NULL,
  from_location_id    INT NOT NULL,
  to_location_id      INT NOT NULL,
  transfer_date       DATE DEFAULT NULL,
  responsible_user_id INT NOT NULL,
  status              ENUM('draft', 'ready', 'done', 'canceled') NOT NULL DEFAULT 'draft',
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_location_id) REFERENCES locations(id),
  FOREIGN KEY (to_location_id) REFERENCES locations(id),
  FOREIGN KEY (responsible_user_id) REFERENCES users(id),
  INDEX idx_transfers_status (status),
  INDEX idx_transfers_from_location (from_location_id),
  INDEX idx_transfers_to_location (to_location_id)
);

-- ── 13. transfer_lines ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transfer_lines (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  transfer_id INT NOT NULL,
  product_id  INT NOT NULL,
  quantity    INT NOT NULL,
  FOREIGN KEY (transfer_id) REFERENCES internal_transfers(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

SET FOREIGN_KEY_CHECKS = 1;
