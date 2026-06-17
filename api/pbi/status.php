<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/pbi_export.php';

$paths = pbi_paths();
$statusPath = dirname($paths['output']) . DIRECTORY_SEPARATOR . 'last_sync.json';
$status = [];

if (is_file($statusPath)) {
    $decoded = json_decode((string) file_get_contents($statusPath), true);
    if (is_array($decoded)) {
        $status = $decoded;
    }
}

json_response([
    'success' => true,
    'excelFile' => $paths['public_file'],
    'fallbackExcelFile' => 'pbi/PetFinder_Tanauan_Batangas_Cleaned_LATEST.xlsx',
    'sheet' => $paths['sheet_name'],
    'lastSync' => $status,
    'tip' => 'Auto-sync runs after every Lost Pet Report. If charts look stale, close the Excel file and wait for the next sync.',
]);
