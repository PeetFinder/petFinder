<?php

declare(strict_types=1);

/**
 * Upload synced Excel file to OneDrive via Microsoft Graph API.
 * Configure api/config.php -> onedrive section.
 */

require_once __DIR__ . '/ms_graph.php';

function onedrive_config(): array
{
    $config = require __DIR__ . '/config.php';
    $od = $config['onedrive'] ?? [];
    $pbi = $config['powerbi'] ?? [];

    return [
        'enabled' => !empty($od['enabled']),
        'tenant_id' => trim((string) ($od['tenant_id'] ?? $pbi['tenant_id'] ?? '')),
        'client_id' => trim((string) ($od['client_id'] ?? $pbi['client_id'] ?? '')),
        'client_secret' => trim((string) ($od['client_secret'] ?? $pbi['client_secret'] ?? '')),
        'user_email' => trim((string) ($od['user_email'] ?? '')),
        'file_path' => trim((string) ($od['file_path'] ?? '/PetFinder/PetFinder_Tanauan_Batangas_Cleaned.xlsx')),
        'item_id' => trim((string) ($od['item_id'] ?? '')),
    ];
}

function onedrive_is_configured(): bool
{
    $od = onedrive_config();
    if (!$od['enabled']) {
        return false;
    }

    foreach (['tenant_id', 'client_id', 'client_secret', 'user_email'] as $key) {
        if ($od[$key] === '') {
            return false;
        }
    }

    return $od['item_id'] !== '' || $od['file_path'] !== '';
}

function onedrive_setup_steps(): array
{
    return [
        'Upload PetFinder_Tanauan_Batangas_Cleaned.xlsx to your OneDrive (create a PetFinder folder).',
        'Go to portal.azure.com → App registrations → New registration (e.g. PetFinder-Sync).',
        'API permissions → Microsoft Graph → Application → Files.ReadWrite.All → Grant admin consent.',
        'Certificates & secrets → New client secret → copy the value.',
        'Copy Tenant ID and Client ID from the app Overview page.',
        'In api/config.php set onedrive.enabled => true and fill tenant_id, client_id, client_secret, user_email.',
        'Set file_path to your OneDrive path, e.g. /PetFinder/PetFinder_Tanauan_Batangas_Cleaned.xlsx',
        'In Power BI Desktop: change data source from local file to your OneDrive Excel file → Publish.',
        'In Power BI Service: semantic model → Schedule refresh → every 15 minutes (no gateway needed).',
    ];
}

function onedrive_resolve_local_file(array $excelResult): ?string
{
    $root = dirname(__DIR__);
    $relative = trim((string) ($excelResult['file'] ?? ''));
    if ($relative === '') {
        return null;
    }

    $path = $root . DIRECTORY_SEPARATOR . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $relative);
    if (is_file($path)) {
        return $path;
    }

    $latest = $root . DIRECTORY_SEPARATOR . 'pbi' . DIRECTORY_SEPARATOR . 'PetFinder_Tanauan_Batangas_Cleaned_LATEST.xlsx';
    if (is_file($latest)) {
        return $latest;
    }

    return null;
}

function onedrive_normalize_path(string $path): string
{
    $path = str_replace('\\', '/', $path);
    if ($path === '') {
        return '/PetFinder/PetFinder_Tanauan_Batangas_Cleaned.xlsx';
    }
    if ($path[0] !== '/') {
        $path = '/' . $path;
    }

    return $path;
}

function onedrive_upload_file(string $localPath): array
{
    if (!onedrive_is_configured()) {
        return [
            'success' => false,
            'skipped' => true,
            'message' => 'OneDrive upload is not configured. See setup steps on the Analytics page.',
            'steps' => onedrive_setup_steps(),
        ];
    }

    if (!is_file($localPath)) {
        return [
            'success' => false,
            'skipped' => false,
            'message' => 'Local Excel file not found for OneDrive upload.',
        ];
    }

    $od = onedrive_config();
    $fileSize = filesize($localPath);
    if ($fileSize === false || $fileSize > 4 * 1024 * 1024) {
        return [
            'success' => false,
            'skipped' => false,
            'message' => 'Excel file is too large for simple upload (max 4 MB). Use a smaller export or upload manually.',
        ];
    }

    try {
        $token = ms_graph_get_access_token($od['tenant_id'], $od['client_id'], $od['client_secret']);
        $content = file_get_contents($localPath);
        if ($content === false) {
            throw new RuntimeException('Could not read local Excel file.');
        }

        $user = rawurlencode($od['user_email']);
        if ($od['item_id'] !== '') {
            $url = 'https://graph.microsoft.com/v1.0/users/' . $user . '/drive/items/' . rawurlencode($od['item_id']) . '/content';
        } else {
            $path = onedrive_normalize_path($od['file_path']);
            $encodedPath = implode('/', array_map('rawurlencode', explode('/', ltrim($path, '/'))));
            $url = 'https://graph.microsoft.com/v1.0/users/' . $user . '/drive/root:/' . $encodedPath . ':/content';
        }

        $response = ms_graph_http_request('PUT', $url, $content, [
            'Authorization: Bearer ' . $token,
            'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);

        if ($response['status'] !== 200 && $response['status'] !== 201) {
            $message = $response['body']['error']['message'] ?? json_encode($response['body']);
            throw new RuntimeException('OneDrive upload failed: ' . $message);
        }

        $webUrl = $response['body']['webUrl'] ?? '';

        return [
            'success' => true,
            'skipped' => false,
            'message' => 'Excel uploaded to OneDrive.',
            'webUrl' => $webUrl,
            'uploadedAt' => date('c'),
        ];
    } catch (Throwable $e) {
        return [
            'success' => false,
            'skipped' => false,
            'message' => $e->getMessage(),
            'steps' => onedrive_setup_steps(),
        ];
    }
}

function onedrive_upload_after_excel_sync(array $excelResult): array
{
    if (!$excelResult['success']) {
        return [
            'success' => false,
            'skipped' => true,
            'message' => 'Skipped because Excel sync failed.',
        ];
    }

    $localPath = onedrive_resolve_local_file($excelResult);
    if ($localPath === null) {
        return [
            'success' => false,
            'skipped' => false,
            'message' => 'Could not find local Excel file to upload.',
        ];
    }

    return onedrive_upload_file($localPath);
}
