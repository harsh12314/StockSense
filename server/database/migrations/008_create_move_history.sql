-- 008_create_move_history.sql
CREATE TABLE IF NOT EXISTS move_history (
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
