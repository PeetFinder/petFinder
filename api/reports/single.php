<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'];
$id = trim((string) ($_GET['id'] ?? ''));

if ($id === '') {
    json_error('Report id is required.');
}

if ($method === 'GET') {
    $stmt = db()->prepare('SELECT * FROM lost_pet_reports WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        json_error('Report not found.', 404);
    }
    json_response(['success' => true, 'report' => report_to_array($row)]);
}

if ($method === 'PUT' || $method === 'PATCH') {
    $user = require_login();
    $data = read_json_body();

    $stmt = db()->prepare('SELECT * FROM lost_pet_reports WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $existing = $stmt->fetch();
    if (!$existing) {
        json_error('Report not found.', 404);
    }

    $isOwner = normalize_email((string) $existing['owner_email']) === normalize_email((string) $user['email']);
    $isAdmin = ($user['role'] ?? '') === 'admin';
    if (!$isOwner && !$isAdmin) {
        json_error('You can only edit your own reports.', 403);
    }

    $name = trim((string) ($data['name'] ?? $existing['name']));
    $species = trim((string) ($data['species'] ?? $existing['species']));
    $breed = trim((string) ($data['breed'] ?? $existing['breed']));
    $location = trim((string) ($data['location'] ?? $existing['location']));
    $dateLostISO = trim((string) ($data['dateLostISO'] ?? $existing['date_lost']));
    $dateLost = trim((string) ($data['dateLost'] ?? $existing['date_lost_display']));
    $details = trim((string) ($data['details'] ?? $existing['details']));
    if ($isAdmin && array_key_exists('returned', $data)) {
        $returned = (int) (bool) $data['returned'];
        $status = $returned ? 'Found' : 'Lost';
        $returnedAt = $returned ? date('Y-m-d H:i:s') : null;
    } else {
        $status = report_status_from_row($existing);
        $returned = (int) $existing['returned'];
        $returnedAt = $existing['returned_at'] ?: null;
    }

    $update = db()->prepare(
        'UPDATE lost_pet_reports
         SET name = ?, species = ?, breed = ?, location = ?, date_lost = ?, date_lost_display = ?, details = ?, status = ?, returned = ?, returned_at = ?
         WHERE id = ?'
    );
    $update->execute([
        $name,
        $species,
        $breed,
        $location,
        $dateLostISO !== '' ? $dateLostISO : null,
        $dateLost,
        $details,
        $status,
        $returned,
        $returnedAt,
        $id,
    ]);

    $fetch = db()->prepare('SELECT * FROM lost_pet_reports WHERE id = ? LIMIT 1');
    $fetch->execute([$id]);
    json_response(['success' => true, 'report' => report_to_array($fetch->fetch())]);
}

if ($method === 'DELETE') {
    $user = require_login();
    $stmt = db()->prepare('SELECT * FROM lost_pet_reports WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $existing = $stmt->fetch();
    if (!$existing) {
        json_error('Report not found.', 404);
    }

    $isOwner = normalize_email((string) $existing['owner_email']) === normalize_email((string) $user['email']);
    $isAdmin = ($user['role'] ?? '') === 'admin';
    if (!$isOwner && !$isAdmin) {
        json_error('You can only delete your own reports.', 403);
    }

    $del = db()->prepare('DELETE FROM lost_pet_reports WHERE id = ?');
    $del->execute([$id]);
    json_response(['success' => true, 'message' => 'Report deleted.']);
}

json_error('Method not allowed.', 405);
