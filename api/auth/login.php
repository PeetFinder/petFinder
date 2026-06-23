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
if (!$user || is_embedded_admin_email($email)) {
    json_error('Invalid login credentials.');
}

if (strcasecmp(user_display_name($user), $name) !== 0) {
    json_error('Full name does not match your registered account.');
}

if (!password_verify($password, user_db_password($user))) {
    json_error('Incorrect password. Please try again.');
}

set_session_user($user);

json_response([
    'success' => true,
    'message' => 'Login successful.',
    'user' => user_to_array($user),
]);
