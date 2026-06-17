<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/pbi_onedrive.php';

json_response([
    'success' => true,
    'configured' => onedrive_is_configured(),
    'config' => [
        'enabled' => onedrive_config()['enabled'],
        'user_email' => onedrive_config()['user_email'] !== '' ? onedrive_config()['user_email'] : '(not set)',
        'file_path' => onedrive_config()['file_path'],
    ],
    'steps' => onedrive_setup_steps(),
    'flow' => [
        'Website report saved → MySQL',
        'Auto-sync → local Excel file',
        'OneDrive upload → online Excel (if configured)',
        'Power BI scheduled refresh → updated charts',
    ],
]);
