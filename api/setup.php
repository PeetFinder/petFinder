<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$config = db_config();

try {
    $db = db();
    $missing = db_missing_tables();
    if ($missing !== []) {
        json_error(
            'Required tables are missing: ' . implode(', ', $missing)
            . '. Import database/petfinder.sql in phpMyAdmin first.',
            503
        );
    }

    $admin = $config['default_admin'];
    $existing = find_user_by_email($admin['email']);
    $username = trim((string) ($admin['username'] ?? ''));
    if ($username === '') {
        $username = strstr(normalize_email($admin['email']), '@', true) ?: 'admin';
    }

    $passwordHash = password_hash($admin['password'], PASSWORD_DEFAULT);
    $adminEmail = normalize_email($admin['email']);

    if (!$existing) {
        $stmt = $db->prepare(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)'
        );
        $stmt->execute([$username, $adminEmail, $passwordHash]);
        $adminCreated = true;
        $adminUpdated = false;
    } else {
        $stmt = $db->prepare(
            'UPDATE users SET username = ?, password = ? WHERE email = ?'
        );
        $stmt->execute([$username, $passwordHash, $adminEmail]);
        $adminCreated = false;
        $adminUpdated = true;
    }

    json_response([
        'success' => true,
        'message' => 'Setup complete. Default admin is ready.',
        'database' => $config['db_name'],
        'adminEmail' => $admin['email'],
        'adminUsername' => $username,
        'adminCreated' => $adminCreated,
        'adminUpdated' => $adminUpdated,
    ]);
} catch (Throwable $e) {
    json_error(
        'Setup failed. Import database/petfinder.sql in phpMyAdmin first, then open this page again. Details: ' . $e->getMessage(),
        500
    );
}
