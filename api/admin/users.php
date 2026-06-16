<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

require_admin();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method not allowed.', 405);
}

$search = strtolower(trim((string) ($_GET['search'] ?? '')));

try {
    $clients = fetch_registered_clients($search);

    json_response([
        'success' => true,
        'count' => count($clients),
        'users' => $clients,
    ]);
} catch (Throwable $e) {
    json_error('Failed to load users: ' . $e->getMessage(), 500);
}
