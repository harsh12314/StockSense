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

CREATE TABLE IF NOT EXISTS delivery_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  delivery_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  out_of_stock BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (delivery_id) REFERENCES deliveries(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
