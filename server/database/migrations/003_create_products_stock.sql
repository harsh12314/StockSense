CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
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

CREATE TABLE IF NOT EXISTS stock (
  product_id INT NOT NULL,
  location_id INT NOT NULL,
  on_hand_qty INT DEFAULT 0,
  free_to_use_qty INT DEFAULT 0,
  PRIMARY KEY (product_id, location_id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (location_id) REFERENCES locations(id)
);
