<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/pbi_export.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method not allowed.', 405);
}

$info = pbi_connection_info();
$rowCount = 0;
$tableCounts = [];

try {
    pbi_verify_normalized_schema();
    $tableCounts = pbi_normalized_table_counts();
    $rowCount = $tableCounts['pet_reports'] ?? 0;
} catch (Throwable $e) {
    json_response([
        'success' => false,
        'message' => 'MySQL connection failed: ' . $e->getMessage(),
        'connection' => $info,
    ], 500);
}

json_response([
    'success' => true,
    'message' => 'Power BI connects to normalized 3NF MySQL tables.',
    'connection' => $info,
    'rowCount' => $rowCount,
    'tableCounts' => $tableCounts,
    'dataModel' => [
        'normalForm' => '3NF',
        'factTable' => 'pet_reports',
        'dimensions' => ['users', 'species', 'breeds', 'sighting_feed'],
        'relationships' => [
            'species[species_id] 1 → * breeds[species_id]',
            'breeds[breed_id] 1 → * pet_reports[breed_id]',
            'users[id] 1 → * pet_reports[user_id]',
            'users[id] 1 → * sighting_feed[user_id]',
            'pet_reports[id] 1 → * sighting_feed[report_id]',
        ],
        'primaryKeys' => [
            'users' => 'id',
            'species' => 'species_id',
            'breeds' => 'breed_id',
            'pet_reports' => 'id',
            'sighting_feed' => 'sighting_id',
        ],
    ],
    'setupSteps' => [
        'Get Data → MySQL → Server ' . $info['server'] . ':' . $info['port'] . ' → Database ' . $info['database'] . '.',
        'Load tables: users, species, breeds, pet_reports, sighting_feed (do NOT use flat views or Excel).',
        'Model view: set primary keys, then create the 5 relationships in dataModel above.',
        'Charts: use pet_reports as fact; species_name via breeds→species; breed_name via breeds.',
        'Home → Refresh after posting reports on the website.',
    ],
    'sqlSetupFile' => 'database/PBI_3NF_SETUP.sql',
]);
