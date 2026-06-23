<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/pbi_export.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method not allowed.', 405);
}

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

try {
    pbi_verify_normalized_schema();
    $db = db();

    $totalPets = (int) $db->query('SELECT COUNT(*) FROM pet_reports')->fetchColumn();
    $lostPets = (int) $db->query("SELECT COUNT(*) FROM pet_reports WHERE status = 'Lost'")->fetchColumn();
    $foundPets = (int) $db->query("SELECT COUNT(*) FROM pet_reports WHERE status = 'Found' OR returned = 1")->fetchColumn();

    $dogs = (int) $db->query(
        "SELECT COUNT(*)
         FROM pet_reports pr
         INNER JOIN breeds br ON pr.breed_id = br.breed_id
         INNER JOIN species sp ON br.species_id = sp.species_id
         WHERE sp.species_name = 'Dog'"
    )->fetchColumn();

    $cats = (int) $db->query(
        "SELECT COUNT(*)
         FROM pet_reports pr
         INNER JOIN breeds br ON pr.breed_id = br.breed_id
         INNER JOIN species sp ON br.species_id = sp.species_id
         WHERE sp.species_name = 'Cat'"
    )->fetchColumn();

    $tableCounts = pbi_normalized_table_counts();

    $recentReports = [];
    $stmt = $db->query(
        'SELECT pr.id, pr.name, pr.status, pr.location, pr.created_at,
                COALESCE(sp.species_name, \'\') AS species,
                COALESCE(br.breed_name, \'\') AS breed
         FROM pet_reports pr
         LEFT JOIN breeds br ON pr.breed_id = br.breed_id
         LEFT JOIN species sp ON br.species_id = sp.species_id
         ORDER BY pr.created_at DESC
         LIMIT 20'
    );
    foreach ($stmt->fetchAll() as $row) {
        $recentReports[] = [
            'id' => $row['id'],
            'name' => $row['name'],
            'species' => $row['species'],
            'breed' => $row['breed'],
            'status' => $row['status'],
            'location' => $row['location'] ?? '',
            'createdAt' => $row['created_at'],
        ];
    }

    json_response([
        'success' => true,
        'source' => 'mysql',
        'model' => '3nf',
        'updatedAt' => date('c'),
        'totalPets' => $totalPets,
        'lostPets' => $lostPets,
        'foundPets' => $foundPets,
        'totalDogs' => $dogs,
        'totalCats' => $cats,
        'tableCounts' => $tableCounts,
        'recentReports' => $recentReports,
        'powerBiNote' => $totalPets > 0
            ? 'The table below is live from the system. Refresh the Power BI dataset in Service when there is new data.'
            : 'No pet reports yet. Submit reports on the website to populate data.',
    ]);
} catch (Throwable $e) {
    json_error('Could not load live stats: ' . $e->getMessage(), 500);
}
