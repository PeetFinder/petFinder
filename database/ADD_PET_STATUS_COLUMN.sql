USE petfinder_db;

ALTER TABLE lost_pet_reports
  ADD COLUMN status ENUM('Lost', 'Found') NOT NULL DEFAULT 'Lost' AFTER owner_name;

UPDATE lost_pet_reports
SET status = IF(returned = 1, 'Found', 'Lost');

UPDATE lost_pet_reports
SET
  returned = IF(status = 'Found', 1, 0),
  returned_at = IF(status = 'Found', IFNULL(returned_at, NOW()), NULL);

ALTER TABLE lost_pet_reports
  ADD INDEX idx_reports_status (status);

SELECT id, name, species, status, returned, returned_at, created_at
FROM lost_pet_reports
ORDER BY created_at DESC;
