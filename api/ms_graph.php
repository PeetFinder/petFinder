<?php

declare(strict_types=1);

function ms_graph_http_request(string $method, string $url, $body = null, array $headers = []): array
{
    if (!function_exists('curl_init')) {
        throw new RuntimeException('PHP cURL extension is required for Microsoft Graph.');
    }

    $ch = curl_init($url);
    $options = [
        CURLOPT_CUSTOMREQUEST => strtoupper($method),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 120,
    ];

    if ($body !== null) {
        if (is_array($body)) {
            $options[CURLOPT_POSTFIELDS] = json_encode($body);
            $headers[] = 'Content-Type: application/json';
            $options[CURLOPT_HTTPHEADER] = $headers;
        } else {
            $options[CURLOPT_POSTFIELDS] = $body;
        }
    }

    curl_setopt_array($ch, $options);

    $response = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        throw new RuntimeException('Microsoft Graph request failed: ' . $error);
    }

    $decoded = json_decode($response, true);

    return [
        'status' => $status,
        'body' => is_array($decoded) ? $decoded : ['raw' => $response],
        'raw' => $response,
    ];
}

function ms_graph_get_access_token(string $tenantId, string $clientId, string $clientSecret): string
{
    $tokenUrl = 'https://login.microsoftonline.com/' . rawurlencode($tenantId) . '/oauth2/v2.0/token';

    $ch = curl_init($tokenUrl);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
        CURLOPT_POSTFIELDS => http_build_query([
            'grant_type' => 'client_credentials',
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'scope' => 'https://graph.microsoft.com/.default',
        ]),
        CURLOPT_TIMEOUT => 30,
    ]);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($raw === false) {
        throw new RuntimeException('Microsoft Graph token request failed: ' . $error);
    }

    $decoded = json_decode($raw, true);
    if ($status !== 200 || empty($decoded['access_token'])) {
        $message = $decoded['error_description'] ?? $decoded['error'] ?? 'Unknown token error';
        throw new RuntimeException('Could not authenticate with Microsoft Graph: ' . $message);
    }

    return (string) $decoded['access_token'];
}
