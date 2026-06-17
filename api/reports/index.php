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
        $stmt = db()->prepare(
            'INSERT INTO lost_pet_reports
            (id, user_id, name, species, breed, location, date_lost, date_lost_display, details, photo, map_key, owner_email, owner_name, status, returned)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $id,
            (int) $user['id'],
            $name,
            $species,
            $breed,
            $location,
            $dateLostISO !== '' ? $dateLostISO : null,
            $dateLost,
            $details,
            $photo,
            $mapKey,
            normalize_email((string) $user['email']),
            (string) $user['name'],
            'Lost',
            0,
        ]);

        $fetch = db()->prepare('SELECT * FROM lost_pet_reports WHERE id = ? LIMIT 1');
        $fetch->execute([$id]);
        $row = $fetch->fetch();
        $excelSync = sync_pbi_excel();

        json_response([
            'success' => true,
            'message' => 'Report created.',
            'report' => report_to_array($row),
            'excelSync' => $excelSync,
        ], 201);
    } catch (Throwable $e) {
        json_error('Failed to create report: ' . $e->getMessage(), 500);
    }
}

json_error('Method not allowed.', 405);
