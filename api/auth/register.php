<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed.', 405);
}

$data = read_json_body();
$name = trim((string) ($data['name'] ?? ''));
$email = normalize_email((string) ($data['email'] ?? ''));
$contact = trim((string) ($data['contact'] ?? ''));
$password = (string) ($data['password'] ?? '');

if ($name === '' || $email === '' || $contact === '' || $password === '') {
    json_error('Please fill in your full name, email, contact number, and password.');
}

if (!is_valid_gmail($email)) {
    json_error('Please use a valid Gmail address (e.g. name@gmail.com).');
}

if (is_embedded_admin_email($email)) {
    json_error('This email cannot be used for client registration.');
}

$contactError = get_contact_error($contact);
if ($contactError) {
    json_error($contactError);
}

$passwordError = get_password_error($password);
if ($passwordError) {
    json_error($passwordError);
}

if (find_user_by_email($email)) {
    json_error('This email is already registered.');
}

try {
    $username = username_from_registration($name, $email);
    $stmt = db()->prepare(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)'
    );
    $stmt->execute([
        $username,
        $email,
        password_hash($password, PASSWORD_DEFAULT),
    ]);

    $user = find_user_by_email($email);

    json_response([
        'success' => true,
        'message' => 'Account registered successfully.',
        'user' => user_to_array($user),
    ], 201);
} catch (Throwable $e) {
    json_error('Registration failed: ' . $e->getMessage(), 500);
}
