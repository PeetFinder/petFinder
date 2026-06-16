-- ============================================================
-- PetFinder — GAMITIN LANG KUNG MALI ANG STRUCTURE NG TABLES
-- (hal. error sa column o foreign key)
-- WARNING: Buburahin ang lahat ng data sa users at lost_pet_reports
-- ============================================================

USE petfinder_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS lost_pet_reports;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
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

CREATE TABLE lost_pet_reports (
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

-- Pagkatapos mag-run nito, i-run ang PHPADMIN_RUN_THIS.sql (STEP 2 at STEP 3)
