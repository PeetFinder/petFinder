<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

$config = require dirname(__DIR__) . '/config.php';

json_response([
    'success' => true,
    'pbixFile' => 'pbi/' . (string) ($config['pbi_pbix_file'] ?? 'petfinderfinalpbi.pbix'),
    'embedUrl' => (string) ($config['powerbi_embed_url'] ?? ''),
]);
