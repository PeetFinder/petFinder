-- ============================================================
-- PetFinder — I-RUN SA phpMyAdmin (sunod-sunod)
-- Database mo: petfinder_db
-- Tables: users, lost_pet_reports
-- ============================================================
-- Paano:
-- 1. Buksan http://localhost/phpmyadmin
-- 2. I-click ang petfinder_db sa left sidebar
-- 3. Tab na "SQL"
-- 4. I-copy ang STEP 1, i-paste, click Go
-- 5. Ulitin para sa STEP 2, STEP 3, atbp.
-- ============================================================


-- =====================
-- STEP 1: Piliin ang database
-- =====================
USE petfinder_db;


-- =====================
-- STEP 2: Admin account
-- Email: eriane_admin@petfinder.com
-- Password: Kape!26
-- =====================
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


-- =====================
-- STEP 3: Sample Lost Pet Reports
-- (pareho sa hardcoded sa website)
-- =====================
DELETE FROM lost_pet_reports
WHERE id IN ('report_buddy', 'report_luna', 'report_max', 'report_coco');

INSERT INTO lost_pet_reports
  (id, user_id, name, species, breed, location, date_lost, date_lost_display, details, photo, map_key, owner_email, owner_name, status, returned)
VALUES
  ('report_buddy', NULL, 'Buddy', 'Dog', 'Golden Retriever', 'Barangay San Miguel', '2023-10-20', 'Oct 20, 2023', 'Sample report for PetFinder demo.', '', 'SanMiguel', '', '', 'Lost', 0),
  ('report_luna', NULL, 'Luna', 'Cat', 'Siamese Mix', 'Poblacion Area', '2026-05-12', 'May 12, 2026', 'Sample report for PetFinder demo.', '', 'Poblacion', '', '', 'Lost', 0),
  ('report_max', NULL, 'Max', 'Dog', 'Aspin', 'Barangay San Juan', '2026-04-28', 'Apr 28, 2026', 'Sample report for PetFinder demo.', '', 'SanJuan', '', '', 'Lost', 0),
  ('report_coco', NULL, 'Coco', 'Bird', 'Cockatiel', 'Bagumbayan', '2026-05-30', 'May 30, 2026', 'Sample report for PetFinder demo.', '', 'Bagumbayan', '', '', 'Lost', 0);


-- =====================
-- STEP 4: I-check kung tama ang data
-- =====================

-- Dapat may 1 admin:
SELECT id, name, email, role, created_at
FROM users
WHERE role = 'admin';

-- Dapat may 4 lost pet reports:
SELECT id, name AS pet_name, species, breed, location, date_lost_display AS date_lost, status, returned, created_at
FROM lost_pet_reports
ORDER BY created_at DESC;

-- Lahat ng registered clients (hindi kasama admin):
SELECT id, name, email, contact, location, created_at
FROM users
WHERE role = 'user'
  AND email NOT LIKE '%_admin@petfinder.com'
ORDER BY created_at DESC;
