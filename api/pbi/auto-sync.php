<?php

declare(strict_types=1);

/**
 * Background sync endpoint for Windows Task Scheduler / browser auto-sync.
 * GET /api/pbi/auto-sync.php?key=<pbi_cron_key from config.php>
 */

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
    $excel = $pipeline['excel'];

    if (!$excel['success']) {
        json_error($excel['message'], 500);
    }

    json_response([
        'success' => true,
        'excel' => [
            'message' => $excel['message'],
            'file' => $excel['file'],
            'sheet' => $excel['sheet'] ?? 'PetFinder Data',
            'rowCount' => $excel['rowCount'],
            'syncedAt' => $excel['syncedAt'],
            'excelLocked' => $excel['excelLocked'] ?? false,
        ],
        'powerBi' => $pipeline['powerBi'],
        'oneDrive' => $pipeline['oneDrive'],
    ]);
} catch (Throwable $e) {
    json_error('Auto-sync failed: ' . $e->getMessage(), 500);
}
