-- ================================================================
-- StockSense — Migration 006: Internal Transfers
-- File: server/database/migrations/006_create_transfers.sql
-- ================================================================

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

CREATE TABLE IF NOT EXISTS transfer_lines (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  transfer_id INT NOT NULL,
  product_id  INT NOT NULL,
  quantity    INT NOT NULL,
  FOREIGN KEY (transfer_id) REFERENCES internal_transfers(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);
