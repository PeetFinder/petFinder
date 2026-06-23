

USE petfinder_db;

DROP VIEW IF EXISTS pbi_pet_data;
DROP VIEW IF EXISTS pbi_sighting_data;

SHOW TABLES;

SELECT 'users' AS tbl, COUNT(*) AS rows FROM users
UNION ALL SELECT 'species', COUNT(*) FROM species
UNION ALL SELECT 'breeds', COUNT(*) FROM breeds
UNION ALL SELECT 'pet_reports', COUNT(*) FROM pet_reports
UNION ALL SELECT 'sighting_feed', COUNT(*) FROM sighting_feed;
