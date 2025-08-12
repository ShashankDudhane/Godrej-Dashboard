--created users table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- defualt data for admin
INSERT INTO users (name, email, password_hash, role, created_at) 
VALUES (
  'Admin',
  'admin@example.com',
  '$2a$12$omZmNS8rtPAAZWY8WgR1SuuZSbNhFfkZZf4S87gmI9XklTUPhKm5q',
  'admin',
  '2025-08-11 22:59:07'
);
