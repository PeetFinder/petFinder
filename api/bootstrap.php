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

function db_config(): array
{
    return require __DIR__ . '/config.php';
}

function db_required_tables(): array
{
    return ['users', 'species', 'breeds', 'pet_reports', 'sighting_feed'];
}

function db_reports_table(): string
{
    return 'pet_reports';
}

function db_pbi_normalized_tables(): array
{
    return db_required_tables();
}

function db_missing_tables(): array
{
    $required = db_required_tables();
    $stmt = db()->query('SHOW TABLES');
    $existing = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $existing = array_map('strtolower', $existing);

    $missing = [];
    foreach ($required as $table) {
        if (!in_array(strtolower($table), $existing, true)) {
            $missing[] = $table;
        }
    }

    return $missing;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = db_config();
    $port = isset($config['db_port']) ? (int) $config['db_port'] : 3306;
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $config['db_host'],
        $port,
        $config['db_name'],
        $config['db_charset']
    );

    try {
        $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (PDOException $e) {
        throw new RuntimeException(
            'MySQL connection failed. Check that MySQL is running in XAMPP (port '
            . $port
            . ') and that database "'
            . $config['db_name']
            . '" exists in phpMyAdmin.',
            0,
            $e
        );
    }

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

function user_display_name(array $row): string
{
    return (string) ($row['username'] ?? $row['name'] ?? '');
}

function user_db_password(array $row): string
{
    return (string) ($row['password'] ?? $row['password_hash'] ?? '');
}

function user_role(array $row): string
{
    if (isset($row['role']) && (string) $row['role'] !== '') {
        return (string) $row['role'];
    }

    return is_embedded_admin_email((string) ($row['email'] ?? '')) ? 'admin' : 'user';
}

function username_from_registration(string $name, string $email): string
{
    $username = trim($name);
    if ($username === '') {
        $username = (string) strstr(normalize_email($email), '@', true);
    }

    if (function_exists('mb_substr')) {
        return mb_substr($username, 0, 50);
    }

    return substr($username, 0, 50);
}

function user_to_array(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'name' => user_display_name($row),
        'username' => user_display_name($row),
        'email' => $row['email'],
        'contact' => $row['contact'] ?? '',
        'location' => $row['location'] ?? '',
        'role' => user_role($row),
        'registeredAt' => $row['created_at'],
        'lastLoginAt' => $row['last_login_at'] ?? null,
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
        'species' => (string) ($row['species'] ?? ''),
        'breed' => (string) ($row['breed'] ?? ''),
        'breedId' => isset($row['breed_id']) ? (int) $row['breed_id'] : null,
        'location' => $row['location'] ?? '',
        'dateLost' => $row['date_lost_display'] ?: ($row['date_lost'] ?? ''),
        'dateLostISO' => $row['date_lost'] ?? '',
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

function pet_reports_base_sql(): string
{
    return 'SELECT pr.id, pr.user_id, pr.breed_id, pr.name, pr.location,
                   pr.date_lost_display, pr.date_lost, pr.details, pr.photo,
                   pr.map_key, pr.owner_email, pr.owner_name, pr.status, pr.returned,
                   pr.returned_at, pr.created_at,
                   COALESCE(sp.species_name, \'\') AS species,
                   COALESCE(br.breed_name, \'\') AS breed
            FROM pet_reports pr
            LEFT JOIN breeds br ON pr.breed_id = br.breed_id
            LEFT JOIN species sp ON br.species_id = sp.species_id';
}

function fetch_pet_report_row(string $id): ?array
{
    $stmt = db()->prepare(pet_reports_base_sql() . ' WHERE pr.id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();

    return $row ?: null;
}

function resolve_breed_id(string $speciesName, string $breedName = ''): ?int
{
    $speciesName = trim($speciesName);
    $breedName = trim($breedName);
    if ($speciesName === '') {
        return null;
    }

    $stmt = db()->prepare('SELECT species_id FROM species WHERE species_name = ? LIMIT 1');
    $stmt->execute([$speciesName]);
    $species = $stmt->fetch();

    if (!$species) {
        $insert = db()->prepare('INSERT INTO species (species_name) VALUES (?)');
        $insert->execute([$speciesName]);
        $speciesId = (int) db()->lastInsertId();
    } else {
        $speciesId = (int) $species['species_id'];
    }

    if ($breedName === '') {
        return null;
    }

    $stmt = db()->prepare('SELECT breed_id FROM breeds WHERE species_id = ? AND breed_name = ? LIMIT 1');
    $stmt->execute([$speciesId, $breedName]);
    $breed = $stmt->fetch();

    if (!$breed) {
        $insert = db()->prepare('INSERT INTO breeds (species_id, breed_name) VALUES (?, ?)');
        $insert->execute([$speciesId, $breedName]);
        return (int) db()->lastInsertId();
    }

    return (int) $breed['breed_id'];
}

function set_session_user(array $user): void
{
    $profile = user_to_array($user);
    $_SESSION['user'] = [
        'id' => $profile['id'],
        'name' => $profile['name'],
        'username' => $profile['username'],
        'email' => $profile['email'],
        'contact' => $profile['contact'],
        'location' => $profile['location'],
        'role' => $profile['role'],
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

function fetch_registered_clients(?string $search = ''): array
{
    $sql = "SELECT id, username, email, created_at
            FROM users
            WHERE email NOT IN (
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

function fetch_lost_pet_reports(): array
{
    $stmt = db()->query(pet_reports_base_sql() . ' ORDER BY pr.created_at DESC');

    return array_map('report_to_array', $stmt->fetchAll());
}
