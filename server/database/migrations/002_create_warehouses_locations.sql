-- 002_create_warehouses_locations.sql
CREATE TABLE IF NOT EXISTS warehouses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  short_code VARCHAR(20) UNIQUE NOT NULL,
  address VARCHAR(500)
);

CREATE TABLE IF NOT EXISTS locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  short_code VARCHAR(20) NOT NULL,
  warehouse_id INT NOT NULL,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  INDEX idx_warehouse (warehouse_id)
);
