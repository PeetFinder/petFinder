<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/pbi_export.php';
require dirname(__DIR__) . '/pbi_refresh.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed.', 405);
}

try {
    $excelResult = sync_pbi_excel();
    $powerBiResult = ['success' => false, 'skipped' => true, 'message' => 'Excel sync failed.'];

    if ($excelResult['success']) {
        $powerBiResult = trigger_powerbi_dataset_refresh();
    }

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
        'powerBiSteps' => powerbi_refresh_steps(),
    ]);
} catch (Throwable $e) {
    json_error('Power BI sync failed: ' . $e->getMessage(), 500);
}
