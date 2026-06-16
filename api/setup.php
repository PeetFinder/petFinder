<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$config = require __DIR__ . '/config.php';

try {
    $db = db();
    $admin = $config['default_admin'];
    $existing = find_user_by_email($admin['email']);

    $passwordHash = password_hash($admin['password'], PASSWORD_DEFAULT);
    $adminEmail = normalize_email($admin['email']);

    if (!$existing) {
        $stmt = $db->prepare(
            'INSERT INTO users (name, email, contact, location, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $admin['name'],
            $adminEmail,
            '',
            $admin['location'],
            $passwordHash,
            'admin',
        ]);
        $adminCreated = true;
        $adminUpdated = false;
    } else {
        $stmt = $db->prepare(
            'UPDATE users SET name = ?, contact = ?, location = ?, password_hash = ?, role = ? WHERE email = ?'
        );
        $stmt->execute([
            $admin['name'],
            $existing['contact'] ?? '',
            $admin['location'],
            $passwordHash,
            'admin',
            $adminEmail,
        ]);
        $adminCreated = false;
        $adminUpdated = true;
    }

    json_response([
        'success' => true,
        'message' => 'Setup complete. Default admin is ready.',
        'database' => $config['db_name'],
        'adminEmail' => $admin['email'],
        'adminCreated' => $adminCreated,
        'adminUpdated' => $adminUpdated,
    ]);
} catch (Throwable $e) {
    json_error(
        'Setup failed. Import database/petfinder.sql in phpMyAdmin first, then open this page again. Details: ' . $e->getMessage(),
        500
    );
}
