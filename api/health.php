<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

try {
    db()->query('SELECT 1');
    json_response([
        'success' => true,
        'backend' => true,
        'message' => 'PetFinder API is running.',
    ]);
} catch (Throwable $e) {
    json_response([
        'success' => false,
        'backend' => false,
        'message' => 'Database not connected. Import database/petfinder.sql and check api/config.php.',
        'error' => $e->getMessage(),
    ], 503);
}
