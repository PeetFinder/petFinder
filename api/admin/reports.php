<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

require_admin();

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $species = trim((string) ($_GET['species'] ?? ''));
    $location = strtolower(trim((string) ($_GET['location'] ?? '')));
    $status = strtolower(trim((string) ($_GET['status'] ?? '')));

    try {
        $reports = [];

        foreach (fetch_lost_pet_reports() as $report) {

            if ($species !== '') {
                if ($species === 'Others') {
                    if (in_array($report['species'], ['Dog', 'Cat', 'Bird'], true)) {
                        continue;
                    }
                } elseif ($report['species'] !== $species) {
                    continue;
                }
            }

            if ($location !== '' && strpos(strtolower((string) $report['location']), $location) === false) {
                continue;
            }

            if ($status === 'lost' && !empty($report['returned'])) {
                continue;
            }
            if ($status === 'found' && empty($report['returned'])) {
                continue;
            }

            $reports[] = $report;
        }

        $foundCount = count(array_filter($reports, static function ($r) {
            return !empty($r['returned']);
        }));

        json_response([
            'success' => true,
            'count' => count($reports),
            'foundCount' => $foundCount,
            'lostCount' => count($reports) - $foundCount,
            'returnedCount' => $foundCount,
            'reports' => $reports,
        ]);
    } catch (Throwable $e) {
        json_error('Failed to load reports: ' . $e->getMessage(), 500);
    }
}

if ($method === 'PATCH') {
    $id = trim((string) ($_GET['id'] ?? ''));
    if ($id === '') {
        json_error('Report id is required.');
    }

    $data = read_json_body();
    if (!array_key_exists('returned', $data)) {
        json_error('Status is required (returned: true for Found, false for Lost).');
    }

    $returned = (int) (bool) $data['returned'];
    $status = $returned ? 'Found' : 'Lost';
    $returnedAt = $returned ? date('Y-m-d H:i:s') : null;

    try {
        $stmt = db()->prepare('SELECT id FROM lost_pet_reports WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            json_error('Report not found.', 404);
        }

        try {
            $update = db()->prepare(
                'UPDATE lost_pet_reports SET status = ?, returned = ?, returned_at = ? WHERE id = ?'
            );
            $update->execute([$status, $returned, $returnedAt, $id]);
        } catch (Throwable $statusColumnError) {
            $update = db()->prepare(
                'UPDATE lost_pet_reports SET returned = ?, returned_at = ? WHERE id = ?'
            );
            $update->execute([$returned, $returnedAt, $id]);
        }

        $fetch = db()->prepare('SELECT * FROM lost_pet_reports WHERE id = ? LIMIT 1');
        $fetch->execute([$id]);
        $row = $fetch->fetch();
        if (!$row) {
            json_error('Report not found after update.', 404);
        }

        $report = report_to_array($row);
        if ($report['status'] !== $status) {
            json_error('Report status was not updated in the database.', 500);
        }

        json_response(['success' => true, 'report' => $report]);
    } catch (Throwable $e) {
        json_error('Failed to update status: ' . $e->getMessage(), 500);
    }
}

if ($method === 'DELETE') {
    $id = trim((string) ($_GET['id'] ?? ''));
    if ($id === '') {
        json_error('Report id is required.');
    }

    try {
        $stmt = db()->prepare('DELETE FROM lost_pet_reports WHERE id = ?');
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            json_error('Report not found.', 404);
        }

        json_response(['success' => true, 'message' => 'Report deleted.']);
    } catch (Throwable $e) {
        json_error('Failed to delete report: ' . $e->getMessage(), 500);
    }
}

json_error('Method not allowed.', 405);
