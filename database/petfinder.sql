CREATE DATABASE IF NOT EXISTS petfinder_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE petfinder_db;

CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS species (
  species_id   INT          NOT NULL AUTO_INCREMENT,
  species_name VARCHAR(50)  NOT NULL,
  PRIMARY KEY (species_id),
  UNIQUE KEY uk_species_name (species_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS breeds (
  breed_id   INT          NOT NULL AUTO_INCREMENT,
  species_id INT          NOT NULL,
  breed_name VARCHAR(100) NOT NULL,
  PRIMARY KEY (breed_id),
  KEY idx_breeds_species (species_id),
  CONSTRAINT fk_breeds_species
    FOREIGN KEY (species_id) REFERENCES species (species_id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pet_reports (
  id                VARCHAR(64)   NOT NULL,
  user_id           INT           DEFAULT NULL,
  breed_id          INT           DEFAULT NULL,
  name              VARCHAR(255)  NOT NULL,
  location          VARCHAR(255)  DEFAULT NULL,
  date_lost         DATE          DEFAULT NULL,
  date_lost_display VARCHAR(50)   DEFAULT NULL,
  details           TEXT          DEFAULT NULL,
  photo             LONGTEXT      DEFAULT NULL,
  map_key           VARCHAR(50)   DEFAULT NULL,
  owner_email       VARCHAR(255)  DEFAULT NULL,
  owner_name        VARCHAR(255)  DEFAULT NULL,
  status            ENUM('Lost','Found') NOT NULL DEFAULT 'Lost',
  returned          TINYINT(1)    NOT NULL DEFAULT 0,
  returned_at       DATETIME      DEFAULT NULL,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reports_user    (user_id),
  KEY idx_reports_breed   (breed_id),
  KEY idx_reports_owner   (owner_email),
  KEY idx_reports_status  (status),
  KEY idx_reports_returned (returned),
  CONSTRAINT fk_pet_reports_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_pet_reports_breed
    FOREIGN KEY (breed_id) REFERENCES breeds (breed_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sighting_feed (
  sighting_id      INT          NOT NULL AUTO_INCREMENT,
  user_id          INT          DEFAULT NULL,
  report_id        VARCHAR(64)  DEFAULT NULL,
  sighting_message TEXT         DEFAULT NULL,
  is_verified      TINYINT(1)   NOT NULL DEFAULT 0,
  created_at       DATETIME     DEFAULT NULL,
  PRIMARY KEY (sighting_id),
  KEY idx_sighting_user   (user_id),
  KEY idx_sighting_report (report_id),
  CONSTRAINT fk_sighting_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_sighting_report
    FOREIGN KEY (report_id) REFERENCES pet_reports (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
