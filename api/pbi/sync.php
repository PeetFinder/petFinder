<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/pbi_export.php';
require dirname(__DIR__) . '/pbi_onedrive.php';
require dirname(__DIR__) . '/pbi_refresh.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed.', 405);
}

try {
    $pipeline = sync_pbi_pipeline();
    $excelResult = $pipeline['excel'];
    $powerBiResult = $pipeline['powerBi'];

    if (!$excelResult['success']) {
        json_error($excelResult['message'], 500);
    }

    json_response([
        'success' => true,
        'excel' => [
            'message' => $excelResult['message'],
            'file' => $excelResult['file'],
            'sheet' => $excelResult['sheet'] ?? 'PetFinder Data',
            'rowCount' => $excelResult['rowCount'],
            'syncedAt' => $excelResult['syncedAt'],
            'excelLocked' => $excelResult['excelLocked'] ?? false,
        ],
        'powerBi' => $powerBiResult,
        'oneDrive' => $pipeline['oneDrive'] ?? ['skipped' => true],
        'powerBiSteps' => powerbi_refresh_steps(),
        'oneDriveSteps' => onedrive_setup_steps(),
    ]);
} catch (Throwable $e) {
    json_error('Power BI sync failed: ' . $e->getMessage(), 500);
}
