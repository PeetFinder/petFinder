<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method not allowed.', 405);
}

$user = current_session_user();
if (!$user) {
    json_response(['success' => true, 'loggedIn' => false, 'user' => null]);
}

json_response([
    'success' => true,
    'loggedIn' => true,
    'user' => $user,
]);
