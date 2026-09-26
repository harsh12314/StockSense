-- =============================================================
-- StockSense — Development Seed Data
-- File: server/src/db/seed.sql
--
-- Run AFTER schema.sql on an empty stocksense_dev:
--   mysql -u root -p stocksense_dev < src/db/seed.sql
--
-- Passwords are bcrypt hashes. The plaintext for the dev user is:
--   Login ID : devuser
--   Password : DevPass@1
--   Hash below is bcrypt(rounds=10) of "DevPass@1"
-- =============================================================

-- ── 1. Seed user (id = 1) ────────────────────────────────────────────────────
-- req.user.id = 1 is injected by the dev bypass in authMiddleware.js
-- This row makes receipts.responsible_user_id = 1 satisfy the FK.
INSERT INTO users (id, login_id, email, password_hash, role)
VALUES (
  1,
  'devuser',
  'dev@stocksense.local',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',  -- placeholder hash
  'inventory_manager'
)
ON DUPLICATE KEY UPDATE login_id = login_id;   -- no-op if already seeded

-- ── 2. Seed warehouse ────────────────────────────────────────────────────────
INSERT INTO warehouses (id, name, short_code, address)
VALUES (1, 'Main Warehouse', 'WH', '123 Industrial Estate, Hyderabad')
ON DUPLICATE KEY UPDATE name = name;

-- ── 3. Seed location (id = 1) ────────────────────────────────────────────────
-- Frontend hardcodes to_location_id = 1 in handleNew().
-- This must exist or every "New Receipt" will FK-fail.
INSERT INTO locations (id, name, short_code, warehouse_id)
VALUES (1, 'Main Warehouse', 'WH/STOCK', 1)
ON DUPLICATE KEY UPDATE name = name;

-- ── 4. Seed category ────────────────────────────────────────────────────────
INSERT INTO categories (id, name)
VALUES (1, 'Raw Materials')
ON DUPLICATE KEY UPDATE name = name;

-- ── 5. Seed products ────────────────────────────────────────────────────────
-- getReceipt queries: SELECT p.name AS product_name, p.sku FROM receipt_lines JOIN products
-- SKUs are realistic and unique.
INSERT INTO products (id, name, sku, category_id, unit_of_measure, per_unit_cost)
VALUES
  (1, 'Steel Rods',  'SKU-SR-001', 1, 'piece', 125.00),
  (2, 'Bolts',       'SKU-BT-002', 1, 'piece',   2.50),
  (3, 'Chairs',      'SKU-CH-003', 1, 'piece', 850.00)
ON DUPLICATE KEY UPDATE name = name;
