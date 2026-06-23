<?php

declare(strict_types=1);

$_SERVER['REQUEST_METHOD'] = 'GET';
require __DIR__ . '/bootstrap.php';

try {
    db()->query('SELECT 1');
    $missing = db_missing_tables();
    if ($missing !== []) {
        json_response([
            'success' => false,
            'backend' => false,
            'message' => 'Database connected but required tables are missing.',
            'missingTables' => $missing,
        ], 503);
    }

    json_response([
        'success' => true,
        'backend' => true,
        'database' => db_config()['db_name'],
        'tables' => db_required_tables(),
        'message' => 'PetFinder API is connected to MySQL.',
    ]);
} catch (Throwable $e) {
    json_response([
        'success' => false,
        'backend' => false,
        'message' => 'Database not connected. Start MySQL in XAMPP and check api/config.php.',
        'error' => $e->getMessage(),
    ], 503);
}
