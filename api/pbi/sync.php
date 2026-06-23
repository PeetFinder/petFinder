<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/pbi_export.php';
require dirname(__DIR__) . '/pbi_refresh.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed.', 405);
}

try {
    $pipeline = sync_pbi_pipeline();
    $dbResult = $pipeline['database'] ?? [];

    if (!$dbResult['success']) {
        json_error($dbResult['message'] ?? 'Database sync failed.', 500);
    }

    json_response([
        'success' => true,
        'source' => 'mysql',
        'model' => $pipeline['model'] ?? '3nf',
        'database' => $dbResult,
        'connection' => pbi_connection_info(),
        'powerBi' => $pipeline['powerBi'],
        'powerBiSteps' => powerbi_refresh_steps(),
    ]);
} catch (Throwable $e) {
    json_error('Power BI sync failed: ' . $e->getMessage(), 500);
}
