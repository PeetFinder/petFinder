<?php

declare(strict_types=1);

function powerbi_config(): array
{
    $config = require __DIR__ . '/config.php';
    $pbi = $config['powerbi'] ?? [];

    return [
        'enabled' => !empty($pbi['enabled']),
        'tenant_id' => trim((string) ($pbi['tenant_id'] ?? '')),
        'client_id' => trim((string) ($pbi['client_id'] ?? '')),
        'client_secret' => trim((string) ($pbi['client_secret'] ?? '')),
        'workspace_id' => trim((string) ($pbi['workspace_id'] ?? '')),
        'dataset_id' => trim((string) ($pbi['dataset_id'] ?? '')),
    ];
}

function powerbi_is_configured(): bool
{
    $pbi = powerbi_config();
    if (!$pbi['enabled']) {
        return false;
    }

    foreach (['tenant_id', 'client_id', 'client_secret', 'workspace_id', 'dataset_id'] as $key) {
        if ($pbi[$key] === '') {
            return false;
        }
    }

    return true;
}

function powerbi_refresh_steps(): array
{
    $config = require __DIR__ . '/config.php';
    $isMysql = strtolower(trim((string) ($config['pbi_source'] ?? 'mysql'))) !== 'excel';

    if ($isMysql) {
        return [
            'Power BI reads normalized 3NF tables: users, species, breeds, pet_reports, sighting_feed.',
            'Desktop: Get Data → MySQL → 127.0.0.1:3308 → petfinder_db → load all 5 tables.',
            'Model: species→breeds→pet_reports; users→pet_reports; users→sighting_feed; pet_reports→sighting_feed.',
            'Remove pbi_pet_data, Excel, and Summary from the report if still present.',
            'Home → Refresh after posting reports on the website.',
            'Online: On-premises Data Gateway + schedule refresh.',
        ];
    }

    return [
        'Auto-sync is enabled: new Lost Pet Reports update Excel automatically.',
        'For instant online chart updates, set powerbi.enabled => true in api/config.php with your workspace and dataset IDs.',
        'Or in Power BI Service: open your semantic model → Schedule refresh → every 15 minutes (requires On-premises data gateway for the Excel file).',
        'Close PetFinder_Tanauan_Batangas_Cleaned.xlsx if sync fails (file locked).',
    ];
}

function powerbi_http_post_json(string $url, array $payload, array $headers = []): array
{
    $body = json_encode($payload);
    if (!function_exists('curl_init')) {
        throw new RuntimeException('PHP cURL extension is required for Power BI refresh.');
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers),
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_TIMEOUT => 30,
    ]);

    $response = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        throw new RuntimeException('Power BI request failed: ' . $error);
    }

    $decoded = json_decode($response, true);
    return [
        'status' => $status,
        'body' => is_array($decoded) ? $decoded : ['raw' => $response],
    ];
}

function powerbi_get_access_token(array $pbi): string
{
    $tokenUrl = 'https://login.microsoftonline.com/' . rawurlencode($pbi['tenant_id']) . '/oauth2/v2.0/token';
    $response = powerbi_http_post_json($tokenUrl, [
        'grant_type' => 'client_credentials',
        'client_id' => $pbi['client_id'],
        'client_secret' => $pbi['client_secret'],
        'scope' => 'https://analysis.windows.net/powerbi/api/.default',
    ]);

    if ($response['status'] !== 200 || empty($response['body']['access_token'])) {
        $message = $response['body']['error_description'] ?? $response['body']['error'] ?? 'Unknown token error';
        throw new RuntimeException('Could not authenticate with Power BI: ' . $message);
    }

    return (string) $response['body']['access_token'];
}

function trigger_powerbi_dataset_refresh(): array
{
    if (!powerbi_is_configured()) {
        return [
            'success' => false,
            'skipped' => true,
            'message' => 'Power BI online refresh is not configured. Follow the manual Desktop steps.',
            'steps' => powerbi_refresh_steps(),
        ];
    }

    try {
        $pbi = powerbi_config();
        $token = powerbi_get_access_token($pbi);
        $url = sprintf(
            'https://api.powerbi.com/v1.0/myorg/groups/%s/datasets/%s/refreshes',
            rawurlencode($pbi['workspace_id']),
            rawurlencode($pbi['dataset_id'])
        );

        $response = powerbi_http_post_json($url, [], [
            'Authorization: Bearer ' . $token,
        ]);

        if ($response['status'] !== 202 && $response['status'] !== 200) {
            $message = $response['body']['error']['message'] ?? json_encode($response['body']);
            throw new RuntimeException('Power BI refresh request failed: ' . $message);
        }

        return [
            'success' => true,
            'skipped' => false,
            'message' => 'Power BI online dataset refresh started.',
            'steps' => powerbi_refresh_steps(),
        ];
    } catch (Throwable $e) {
        return [
            'success' => false,
            'skipped' => false,
            'message' => $e->getMessage(),
            'steps' => powerbi_refresh_steps(),
        ];
    }
}
