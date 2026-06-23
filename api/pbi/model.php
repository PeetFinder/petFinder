<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/pbi_export.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method not allowed.', 405);
}

$config = db_config();
$info = pbi_connection_info();

try {
    pbi_verify_normalized_schema();
    $counts = pbi_normalized_table_counts();
} catch (Throwable $e) {
    json_response([
        'success' => false,
        'message' => $e->getMessage(),
        'connection' => $info,
    ], 503);
}

$columns = [];
foreach (db_pbi_normalized_tables() as $table) {
    $fields = [];
    foreach (db()->query('DESCRIBE `' . $table . '`') as $col) {
        $fields[] = [
            'name' => $col['Field'],
            'type' => $col['Type'],
            'key' => $col['Key'],
        ];
    }
    $columns[$table] = $fields;
}

$sampleReports = [];
$stmt = db()->query(
    'SELECT pr.id, pr.name, pr.status, pr.location, pr.created_at,
            sp.species_name, br.breed_name
     FROM pet_reports pr
     LEFT JOIN breeds br ON pr.breed_id = br.breed_id
     LEFT JOIN species sp ON br.species_id = sp.species_id
     ORDER BY pr.created_at DESC
     LIMIT 5'
);
foreach ($stmt->fetchAll() as $row) {
    $sampleReports[] = $row;
}

json_response([
    'success' => true,
    'model' => '3NF',
    'message' => 'Data from the website goes directly into these MySQL tables. Refresh Power BI to see new rows.',
    'connection' => $info,
    'tableCounts' => $counts,
    'columns' => $columns,
    'sampleReports' => $sampleReports,
    'relationships' => [
        ['from' => 'species.species_id', 'to' => 'breeds.species_id', 'cardinality' => '1:*'],
        ['from' => 'breeds.breed_id', 'to' => 'pet_reports.breed_id', 'cardinality' => '1:*'],
        ['from' => 'users.id', 'to' => 'pet_reports.user_id', 'cardinality' => '1:*'],
        ['from' => 'users.id', 'to' => 'sighting_feed.user_id', 'cardinality' => '1:*'],
        ['from' => 'pet_reports.id', 'to' => 'sighting_feed.report_id', 'cardinality' => '1:*'],
    ],
    'primaryKeys' => [
        'users' => 'id',
        'species' => 'species_id',
        'breeds' => 'breed_id',
        'pet_reports' => 'id',
        'sighting_feed' => 'sighting_id',
    ],
    'powerBiReconnectSteps' => [
        'Open petfinderfinalpbi.pbix → Home → Transform data.',
        'DELETE queries: petfinder_db pbi_pet_data, pbi_sighting_data, Summary, and any Excel source.',
        'If users/breeds/species query shows error: right-click → Delete, then reload from MySQL.',
        'Get Data → MySQL database → Server ' . $info['server'] . ':' . $info['port'] . ' → Database ' . $info['database'] . '.',
        'Select exactly 5 tables: users, species, breeds, pet_reports, sighting_feed → Load.',
        'Model view: delete old relationships. Create 5 links listed in relationships above.',
        'Set primary keys: breeds.breed_id (NOT species_id), species.species_id, pet_reports.id, users.id, sighting_feed.sighting_id.',
        'Close & Apply → Home → Refresh. New website reports appear after each Refresh.',
        'Optional for near-live data: change storage mode to DirectQuery on pet_reports (requires MySQL running).',
    ],
    'dataFlow' => [
        'Website form submit',
        '→ pet_reports + breeds + species (3NF)',
        '→ MySQL petfinder_db (instant)',
        '→ Power BI Refresh (manual or scheduled)',
        '→ Charts update',
    ],
    'verifyUrl' => '/petfinder/api/pbi/model.php',
    'syncUrl' => '/petfinder/api/pbi/sync.php',
]);
