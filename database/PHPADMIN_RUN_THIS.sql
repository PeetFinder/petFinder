USE petfinder_db;

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

DELETE FROM lost_pet_reports
WHERE id IN ('report_buddy', 'report_luna', 'report_max', 'report_coco');

INSERT INTO lost_pet_reports
  (id, user_id, name, species, breed, location, date_lost, date_lost_display, details, photo, map_key, owner_email, owner_name, status, returned)
VALUES
  ('report_buddy', NULL, 'Buddy', 'Dog', 'Golden Retriever', 'Barangay San Miguel', '2023-10-20', 'Oct 20, 2023', 'Sample report for PetFinder demo.', '', 'SanMiguel', '', '', 'Lost', 0),
  ('report_luna', NULL, 'Luna', 'Cat', 'Siamese Mix', 'Poblacion Area', '2026-05-12', 'May 12, 2026', 'Sample report for PetFinder demo.', '', 'Poblacion', '', '', 'Lost', 0),
  ('report_max', NULL, 'Max', 'Dog', 'Aspin', 'Barangay San Juan', '2026-04-28', 'Apr 28, 2026', 'Sample report for PetFinder demo.', '', 'SanJuan', '', '', 'Lost', 0),
  ('report_coco', NULL, 'Coco', 'Bird', 'Cockatiel', 'Bagumbayan', '2026-05-30', 'May 30, 2026', 'Sample report for PetFinder demo.', '', 'Bagumbayan', '', '', 'Lost', 0);

SELECT id, name, email, role, created_at
FROM users
WHERE role = 'admin';

SELECT id, name AS pet_name, species, breed, location, date_lost_display AS date_lost, status, returned, created_at
FROM lost_pet_reports
ORDER BY created_at DESC;

SELECT id, name, email, contact, location, created_at
FROM users
WHERE role = 'user'
  AND email NOT LIKE '%_admin@petfinder.com'
ORDER BY created_at DESC;
