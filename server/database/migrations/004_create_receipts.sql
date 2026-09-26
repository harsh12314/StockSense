-- 004_create_receipts.sql
-- Run: mysql -u root -p stocksense_dev < server/database/migrations/004_create_receipts.sql

CREATE TABLE IF NOT EXISTS receipts (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  reference           VARCHAR(50) UNIQUE NOT NULL,
  from_contact        VARCHAR(255),
  to_location_id      INT NOT NULL,
  schedule_date       DATE,
  responsible_user_id INT NOT NULL,
  status              ENUM('draft','ready','done','canceled') DEFAULT 'draft',
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (to_location_id)      REFERENCES locations(id),
  FOREIGN KEY (responsible_user_id) REFERENCES users(id),
  INDEX idx_receipts_status (status)
);

CREATE TABLE IF NOT EXISTS receipt_lines (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  receipt_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity   INT NOT NULL CHECK (quantity > 0),
  FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);
