<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed.', 405);
}

$data = read_json_body();
$name = trim((string) ($data['name'] ?? ''));
$email = normalize_email((string) ($data['email'] ?? ''));
$password = (string) ($data['password'] ?? '');

if ($name === '' || $email === '' || $password === '') {
    json_error('Please enter your full name, email, and password.');
}

if (!is_valid_gmail($email)) {
    json_error('Please use a valid Gmail address (e.g. name@gmail.com).');
}

$user = find_user_by_email($email);
if (!$user || ($user['role'] ?? '') === 'admin') {
    json_error('Invalid login credentials.');
}

if (strcasecmp(trim((string) $user['name']), $name) !== 0) {
    json_error('Full name does not match your registered account.');
}

if (!password_verify($password, (string) $user['password_hash'])) {
    json_error('Incorrect password. Please try again.');
}

$stmt = db()->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?');
$stmt->execute([(int) $user['id']]);

set_session_user($user);

json_response([
    'success' => true,
    'message' => 'Login successful.',
    'user' => [
        'id' => (int) $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'contact' => $user['contact'] ?? '',
        'location' => $user['location'] ?? '',
        'role' => $user['role'],
    ],
]);
