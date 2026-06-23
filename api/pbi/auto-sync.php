<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/pbi_export.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method not allowed.', 405);
}

$config = require dirname(__DIR__) . '/config.php';
$expectedKey = trim((string) ($config['pbi_cron_key'] ?? ''));
$providedKey = trim((string) ($_GET['key'] ?? $_SERVER['HTTP_X_PBI_SYNC_KEY'] ?? ''));

if ($expectedKey === '' || !hash_equals($expectedKey, $providedKey)) {
    json_error('Forbidden.', 403);
}

if (!pbi_auto_sync_enabled()) {
    json_response([
        'success' => true,
        'skipped' => true,
        'message' => 'Auto-sync is disabled in config.',
    ]);
}

try {
    $pipeline = sync_pbi_pipeline();
    $db = $pipeline['database'] ?? [];

    if (!$db['success']) {
        json_error($db['message'] ?? 'Database sync failed.', 500);
    }

    json_response([
        'success' => true,
        'source' => 'mysql',
        'model' => $pipeline['model'] ?? '3nf',
        'database' => $db,
        'powerBi' => $pipeline['powerBi'],
    ]);
} catch (Throwable $e) {
    json_error('Auto-sync failed: ' . $e->getMessage(), 500);
}
