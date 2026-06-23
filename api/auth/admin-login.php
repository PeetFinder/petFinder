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
if (!$user || !is_embedded_admin_email($email)) {
    json_error('Invalid admin credentials. Please check your admin email and password.');
}

if (!password_verify($password, user_db_password($user))) {
    json_error('Invalid admin credentials. Please check your admin email and password.');
}

set_session_user($user);

json_response([
    'success' => true,
    'message' => 'Admin login successful.',
    'user' => user_to_array($user),
]);
