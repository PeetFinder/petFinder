<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed.', 405);
}

$data = read_json_body();
$email = normalize_email((string) ($data['email'] ?? ''));
$password = (string) ($data['password'] ?? '');

if ($email === '' || $password === '') {
    json_error('Please enter admin email and password.');
}

$user = find_user_by_email($email);
if (!$user || ($user['role'] ?? '') !== 'admin') {
    json_error('Invalid admin credentials. Please check your admin email and password.');
}

if (!password_verify($password, (string) $user['password_hash'])) {
    json_error('Invalid admin credentials. Please check your admin email and password.');
}

$stmt = db()->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?');
$stmt->execute([(int) $user['id']]);

set_session_user($user);

json_response([
    'success' => true,
    'message' => 'Admin login successful.',
    'user' => [
        'id' => (int) $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'contact' => $user['contact'] ?? '',
        'location' => $user['location'] ?? '',
        'role' => $user['role'],
    ],
]);
