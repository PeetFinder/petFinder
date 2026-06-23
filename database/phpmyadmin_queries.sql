CREATE DATABASE IF NOT EXISTS petfinder_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE petfinder_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  contact VARCHAR(20) DEFAULT '',
  location VARCHAR(255) DEFAULT '',
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME NULL,
  INDEX idx_users_role (role),
  INDEX idx_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lost_pet_reports (
  id VARCHAR(64) PRIMARY KEY,
  user_id INT NULL,
  name VARCHAR(255) NOT NULL,
  species VARCHAR(50) NOT NULL DEFAULT '',
  breed VARCHAR(100) DEFAULT '',
  location VARCHAR(255) DEFAULT '',
  date_lost DATE NULL,
  date_lost_display VARCHAR(50) DEFAULT '',
  details TEXT,
  photo LONGTEXT,
  map_key VARCHAR(50) DEFAULT '',
  owner_email VARCHAR(255) DEFAULT '',
  owner_name VARCHAR(255) DEFAULT '',
  status ENUM('Lost', 'Found') NOT NULL DEFAULT 'Lost',
  returned TINYINT(1) NOT NULL DEFAULT 0,
  returned_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reports_species (species),
  INDEX idx_reports_status (status),
  INDEX idx_reports_returned (returned),
  INDEX idx_reports_owner_email (owner_email),
  CONSTRAINT fk_reports_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

SELECT
  id,
  name AS client_name,
  email,
  contact,
  location,
  role,
  created_at AS registered_at,
  last_login_at
FROM users
WHERE role = 'user'
  AND email NOT IN (
    'eriane_admin@petfinder.com',
    'eriane_admin@gmail.com',
    'ethan_admin@petfinder.com',
    'ram_admin@petfinder.com',
    'tristan_admin@petfinder.com',
    'joycee_admin@petfinder.com',
    'admin@petfinder.com'
  )
  AND email NOT LIKE '%_admin@petfinder.com'
ORDER BY created_at DESC;

SELECT
  id,
  name,
  email,
  contact,
  location,
  role,
  created_at,
  last_login_at
FROM users
ORDER BY created_at DESC;

SELECT id, name, email, role, created_at
FROM users
WHERE role = 'admin';

SELECT
  id,
  name AS pet_name,
  species,
  breed,
  location,
  date_lost_display AS date_lost,
  owner_name,
  owner_email,
  status,
  returned AS is_found,
  returned_at AS found_at,
  created_at
FROM lost_pet_reports
ORDER BY created_at DESC;

SELECT
  id,
  name AS pet_name,
  species,
  breed,
  location,
  owner_name,
  owner_email,
  date_lost_display AS date_lost,
  created_at
FROM lost_pet_reports
WHERE status = 'Lost'
ORDER BY created_at DESC;

SELECT
  id,
  name AS pet_name,
  species,
  breed,
  location,
  owner_name,
  owner_email,
  date_lost_display AS date_lost,
  status,
  returned_at AS found_at,
  created_at
FROM lost_pet_reports
WHERE status = 'Found'
ORDER BY returned_at DESC;

SELECT
  id,
  name AS pet_name,
  species,
  breed,
  location,
  status,
  returned_at AS found_at,
  created_at AS reported_at
FROM lost_pet_reports
WHERE owner_email = 'juan@gmail.com'
ORDER BY created_at DESC;

SELECT *
FROM lost_pet_reports
ORDER BY created_at DESC;

SELECT *
FROM users
WHERE email = 'juan@gmail.com';

SELECT COUNT(*) AS total_registered_clients
FROM users
WHERE role = 'user'
  AND email NOT LIKE '%_admin@petfinder.com'
  AND email NOT IN ('eriane_admin@petfinder.com', 'eriane_admin@gmail.com');

SELECT
  COUNT(*) AS total_reports,
  SUM(CASE WHEN status = 'Found' THEN 1 ELSE 0 END) AS found_count,
  SUM(CASE WHEN status = 'Lost' THEN 1 ELSE 0 END) AS lost_count
FROM lost_pet_reports;
