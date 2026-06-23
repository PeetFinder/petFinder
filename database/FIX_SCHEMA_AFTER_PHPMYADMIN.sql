

USE petfinder_db;

ALTER TABLE users
  CHANGE COLUMN username name VARCHAR(255) NOT NULL;

ALTER TABLE users
  CHANGE COLUMN password password_hash VARCHAR(255) NOT NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS contact VARCHAR(20) NOT NULL DEFAULT '' AFTER email,
  ADD COLUMN IF NOT EXISTS location VARCHAR(255) NOT NULL DEFAULT '' AFTER contact,
  ADD COLUMN IF NOT EXISTS role ENUM('user', 'admin') NOT NULL DEFAULT 'user' AFTER password_hash,
  ADD COLUMN IF NOT EXISTS last_login_at DATETIME NULL AFTER created_at;

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

CREATE OR REPLACE VIEW pbi_pet_data AS
SELECT
  id AS PetID,
  name AS PetName,
  species AS Type,
  breed AS Breed,
  location AS Location,
  CAST(status AS CHAR(10)) AS Status,
  date_lost_display AS DateLost,
  date_lost AS DateLostISO,
  owner_name AS OwnerName,
  owner_email AS OwnerEmail,
  map_key AS MapKey,
  returned AS IsFound,
  returned_at AS FoundAt,
  created_at AS ReportedAt
FROM lost_pet_reports;

INSERT INTO users (name, email, contact, location, password_hash, role)
VALUES (
  'Eriane Admin',
  'eriane_admin@petfinder.com',
  '',
  'Tanauan City, Batangas',
  '$2y$10$ApCMGQbeltPBdXDKPlvvqOA0s.Y/TFRwgyQ8Lo7cz0q3d7bjklF0i',
  'admin'
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  contact = VALUES(contact),
  location = VALUES(location),
  password_hash = VALUES(password_hash),
  role = 'admin';
