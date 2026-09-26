-- 007_create_adjustments.sql
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  location_id INT NOT NULL,
  recorded_qty INT NOT NULL,
  counted_qty INT NOT NULL,
  delta INT NOT NULL,
  logged_by INT NOT NULL,
  notes VARCHAR(500),
  adjustment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (location_id) REFERENCES locations(id),
  FOREIGN KEY (logged_by) REFERENCES users(id),
  INDEX idx_adjustment_date (adjustment_date)
);
