<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require_once dirname(__DIR__) . '/pbi_export.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');

    try {
        $reports = fetch_lost_pet_reports();

        json_response([
            'success' => true,
            'count' => count($reports),
            'reports' => $reports,
        ]);
    } catch (Throwable $e) {
        json_error('Failed to load reports: ' . $e->getMessage(), 500);
    }
}

if ($method === 'POST') {
    $user = require_login();
    $data = read_json_body();

    $name = trim((string) ($data['name'] ?? ''));
    $species = trim((string) ($data['species'] ?? ''));
    $breed = trim((string) ($data['breed'] ?? ''));
    $location = trim((string) ($data['location'] ?? ''));
    $dateLostISO = trim((string) ($data['dateLostISO'] ?? ''));
    $dateLost = trim((string) ($data['dateLost'] ?? ''));
    $details = trim((string) ($data['details'] ?? ''));
    $photo = (string) ($data['photo'] ?? '');
    $mapKey = trim((string) ($data['mapKey'] ?? ''));
    $id = trim((string) ($data['id'] ?? ('report_' . time() . '_' . bin2hex(random_bytes(4)))));

    if ($name === '' || $species === '') {
        json_error('Pet name and species are required.');
    }

    if (strlen($details) > 1500) {
        json_error('Details must be 1500 characters or less.');
    }

    try {
        $breedId = resolve_breed_id($species, $breed);
        $ownerName = trim((string) ($user['name'] ?? $user['username'] ?? ''));

        $stmt = db()->prepare(
            'INSERT INTO pet_reports
            (id, user_id, breed_id, name, location, date_lost, date_lost_display, details, photo, map_key, owner_email, owner_name, status, returned)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $id,
            (int) $user['id'],
            $breedId,
            $name,
            $location,
            $dateLostISO !== '' ? $dateLostISO : null,
            $dateLost,
            $details,
            $photo,
            $mapKey,
            normalize_email((string) $user['email']),
            $ownerName,
            'Lost',
            0,
        ]);

        $row = fetch_pet_report_row($id);
        if (!$row) {
            json_error('Report created but could not be loaded.', 500);
        }
        $pipeline = pbi_auto_sync_enabled() ? sync_pbi_pipeline() : [
            'success' => true,
            'source' => 'mysql',
            'model' => '3nf',
            'database' => ['success' => true, 'skipped' => true],
            'powerBi' => ['skipped' => true],
        ];

        json_response([
            'success' => true,
            'message' => 'Report saved to MySQL (3NF). Refresh Power BI Desktop to see it in charts.',
            'report' => report_to_array($row),
            'pbiSync' => $pipeline['database'] ?? null,
            'powerBiSync' => $pipeline['powerBi'] ?? null,
            'tableCounts' => $pipeline['database']['tableCounts'] ?? null,
            'powerBiHint' => 'Home → Refresh in Power BI. Setup guide: /api/pbi/model.php',
        ], 201);
    } catch (Throwable $e) {
        json_error('Failed to create report: ' . $e->getMessage(), 500);
    }
}

json_error('Method not allowed.', 405);
