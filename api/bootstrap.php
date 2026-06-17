<?php

declare(strict_types=1);

$config = require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

session_name($config['session_name']);
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = require __DIR__ . '/config.php';
    $port = isset($config['db_port']) ? (int) $config['db_port'] : 3306;
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $config['db_host'],
        $port,
        $config['db_name'],
        $config['db_charset']
    );

    $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    return $pdo;
}

function json_response(array $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function json_error(string $message, int $status = 400): void
{
    json_response(['success' => false, 'message' => $message], $status);
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }

    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function normalize_email(string $email): string
{
    return strtolower(trim($email));
}

function is_embedded_admin_email(string $email): bool
{
    $key = normalize_email($email);
    if ($key === '') {
        return true;
    }

    $blocked = [
        'eriane_admin@gmail.com',
        'eriane_admin@petfinder.com',
        'ethan_admin@petfinder.com',
        'ram_admin@petfinder.com',
        'tristan_admin@petfinder.com',
        'joycee_admin@petfinder.com',
        'admin@petfinder.com',
    ];

    if (in_array($key, $blocked, true)) {
        return true;
    }

    return (bool) preg_match('/_admin@petfinder\.com$/', $key);
}

function is_valid_gmail(string $email): bool
{
    return (bool) preg_match('/^[a-z0-9._%+-]+@gmail\.com$/', normalize_email($email));
}

function get_password_error(string $password): ?string
{
    if ($password === '') {
        return 'Please enter a password.';
    }
    if (strlen($password) < 8 || strlen($password) > 12) {
        return 'Password must be 8 to 12 characters long.';
    }
    if (!preg_match('/[A-Z]/', $password)) {
        return 'Password must include at least one capital letter.';
    }
    if (!preg_match('/[0-9]/', $password)) {
        return 'Password must include at least one number.';
    }
    if (!preg_match('/[^A-Za-z0-9]/', $password)) {
        return 'Password must include at least one symbol.';
    }
    return null;
}

function get_contact_error(string $contact): ?string
{
    $contact = trim($contact);
    if ($contact === '') {
        return 'Please enter your contact number.';
    }
    if (!preg_match('/^\d+$/', $contact)) {
        return 'Contact number must contain numbers only.';
    }
    $len = strlen($contact);
    if ($len < 10 || $len > 13) {
        return 'Please enter a valid contact number (e.g. 09123456789).';
    }
    return null;
}

function user_to_array(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'name' => $row['name'],
        'email' => $row['email'],
        'contact' => $row['contact'] ?? '',
        'location' => $row['location'] ?? '',
        'role' => $row['role'],
        'registeredAt' => $row['created_at'],
        'lastLoginAt' => $row['last_login_at'],
    ];
}

function report_status_from_row(array $row): string
{
    $status = trim((string) ($row['status'] ?? ''));
    if ($status === 'Found' || $status === 'Lost') {
        return $status;
    }

    if (!empty($row['returned'])) {
        return 'Found';
    }

    return 'Lost';
}

function report_status_to_returned(string $status): int
{
    return $status === 'Found' ? 1 : 0;
}

function report_to_array(array $row): array
{
    $status = report_status_from_row($row);

    return [
        'id' => $row['id'],
        'name' => $row['name'],
        'species' => $row['species'],
        'breed' => $row['breed'],
        'location' => $row['location'],
        'dateLost' => $row['date_lost_display'] ?: $row['date_lost'],
        'dateLostISO' => $row['date_lost'],
        'details' => $row['details'] ?? '',
        'photo' => $row['photo'] ?? '',
        'mapKey' => $row['map_key'] ?? '',
        'ownerEmail' => $row['owner_email'] ?? '',
        'ownerName' => $row['owner_name'] ?? '',
        'status' => $status,
        'returned' => $status === 'Found',
        'returnedAt' => $row['returned_at'] ?? '',
        'emoji' => '',
    ];
}

function set_session_user(array $user): void
{
    $_SESSION['user'] = [
        'id' => (int) $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'contact' => $user['contact'] ?? '',
        'location' => $user['location'] ?? '',
        'role' => $user['role'],
    ];
}

function current_session_user(): ?array
{
    return isset($_SESSION['user']) && is_array($_SESSION['user']) ? $_SESSION['user'] : null;
}

function require_login(): array
{
    $user = current_session_user();
    if (!$user) {
        json_error('Login required.', 401);
    }
    return $user;
}

function require_admin(): array
{
    $user = require_login();
    if (($user['role'] ?? '') !== 'admin') {
        json_error('Admin access required.', 403);
    }
    return $user;
}

function find_user_by_email(string $email): ?array
{
    $stmt = db()->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([normalize_email($email)]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/** Same filters as VIEW 1 in database/phpmyadmin_queries.sql */
function fetch_registered_clients(?string $search = ''): array
{
    $sql = "SELECT id, name, email, contact, location, role, created_at, last_login_at
            FROM users
            WHERE role = 'user'
              AND email NOT IN (
                'eriane_admin@petfinder.com',
                'eriane_admin@gmail.com',
                'ethan_admin@petfinder.com',
                'ram_admin@petfinder.com',
                'tristan_admin@petfinder.com',
                'joycee_admin@petfinder.com',
                'admin@petfinder.com'
              )
              AND email NOT LIKE '%_admin@petfinder.com'
            ORDER BY created_at DESC";

    $stmt = db()->query($sql);
    $rows = $stmt->fetchAll();
    $clients = [];

    foreach ($rows as $row) {
        $client = user_to_array($row);
        if ($search !== '') {
            $haystack = strtolower($client['name'] . ' ' . $client['email']);
            if (strpos($haystack, strtolower($search)) === false) {
                continue;
            }
        }
        $clients[] = $client;
    }

    return $clients;
}

/** Same data as VIEW 4 in database/phpmyadmin_queries.sql */
function fetch_lost_pet_reports(): array
{
    $sqlWithStatus = 'SELECT id, name, species, breed, location, date_lost_display, date_lost, details, photo,
                map_key, owner_email, owner_name, status, returned, returned_at, created_at
         FROM lost_pet_reports
         ORDER BY created_at DESC';

    $sqlLegacy = 'SELECT id, name, species, breed, location, date_lost_display, date_lost, details, photo,
                map_key, owner_email, owner_name, returned, returned_at, created_at
         FROM lost_pet_reports
         ORDER BY created_at DESC';

    try {
        $stmt = db()->query($sqlWithStatus);
    } catch (Throwable $e) {
        $stmt = db()->query($sqlLegacy);
    }

    return array_map('report_to_array', $stmt->fetchAll());
}
