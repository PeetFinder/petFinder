<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/pbi_export.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method not allowed.', 405);
}

$config = db_config();
$embedUrl = trim((string) ($config['powerbi_embed_url'] ?? ''));

try {
    pbi_verify_normalized_schema();
    $counts = pbi_normalized_table_counts();
    $totalPets = $counts['pet_reports'] ?? 0;
} catch (Throwable $e) {
    json_response([
        'success' => false,
        'message' => $e->getMessage(),
        'embedUrl' => $embedUrl,
    ], 503);
}

$issues = [];
$steps = [];

if ($embedUrl === '') {
    $issues[] = 'Missing powerbi_embed_url in api/config.php.';
    $steps[] = 'In Power BI Service: open the report → File → Embed report → Publish to web → copy the link → set it in api/config.php.';
}

if ($totalPets === 0) {
    $issues[] = 'pet_reports is empty in MySQL.';
    $steps[] = 'Submit reports on the website first or insert rows in phpMyAdmin.';
}

$issues[] = 'The published embed (app.powerbi.com) is a separate cloud copy — it does not automatically read localhost MySQL after publish.';
$steps[] = 'BEFORE Publish: in Power BI Desktop → Home → Refresh → verify the count matches MySQL (' . $totalPets . ' pets).';
$steps[] = 'AFTER Publish: in Power BI Service (app.powerbi.com) → Workspace → Semantic model / Dataset → Refresh now.';
$steps[] = 'If Refresh failed or MySQL is unreachable: install On-premises Data Gateway on the PC running XAMPP, add the MySQL source (127.0.0.1:3308), then schedule refresh.';
$steps[] = 'If you published a NEW report: copy the NEW embed link and update powerbi_embed_url in api/config.php — the old link still points to the previous report.';
$steps[] = 'On the website: click Reload Dashboard or hard-refresh the browser (Ctrl+F5).';

json_response([
    'success' => true,
    'mysql' => [
        'totalPets' => $totalPets,
        'tableCounts' => $counts,
        'expectedInPowerBi' => 'Expect ' . $totalPets . ' total pets if refreshed and published from MySQL 3NF tables.',
    ],
    'embed' => [
        'url' => $embedUrl,
        'note' => 'Publish ≠ auto-sync to MySQL. Refresh the dataset in Service (via Gateway) or republish from Desktop when there is new data.',
    ],
    'issues' => $issues,
    'fixSteps' => $steps,
    'configFile' => 'api/config.php → powerbi_embed_url',
]);
