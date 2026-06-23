<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/pbi_export.php';

$paths = pbi_paths();
$statusPath = $paths['status'];
$status = [];

if (is_file($statusPath)) {
    $decoded = json_decode((string) file_get_contents($statusPath), true);
    if (is_array($decoded)) {
        $status = $decoded;
    }
}

$connection = pbi_connection_info();
$tableCounts = null;

try {
    pbi_verify_normalized_schema();
    $tableCounts = pbi_normalized_table_counts();
} catch (Throwable $e) {
    $tableCounts = null;
}

json_response([
    'success' => true,
    'source' => pbi_source_mode(),
    'model' => pbi_model_mode(),
    'connection' => $connection,
    'tableCounts' => $tableCounts,
    'liveRowCount' => $tableCounts['pet_reports'] ?? null,
    'lastSync' => $status,
    'tip' => 'Power BI uses 3NF tables only. Refresh .pbix after new website reports.',
]);
