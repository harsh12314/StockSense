CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  login_id VARCHAR(12) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('inventory_manager', 'warehouse_staff') DEFAULT 'warehouse_staff',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
