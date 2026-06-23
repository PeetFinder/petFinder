<?php

return [
    'db_host' => '127.0.0.1',

    'db_port' => 3308,
    'db_name' => 'petfinder_db',
    'db_user' => 'root',
    'db_pass' => '',
    'db_charset' => 'utf8mb4',
    'session_name' => 'petfinder_session',
    'default_admin' => [
        'username' => 'eriane_admin',
        'name' => 'Eriane Admin',
        'email' => 'eriane_admin@petfinder.com',
        'password' => 'Kape!26',
        'location' => 'Tanauan City, Batangas',
    ],

    'pbi_source' => 'mysql',
    'pbi_model' => '3nf',

    'pbi_export_mode' => 'database_only',
    'pbi_sample_row_limit' => 50,
    'pbi_pbix_file' => 'petfinderfinalpbi.pbix',

    'powerbi_embed_url' => 'https://app.powerbi.com/view?r=eyJrIjoiMDNjZDAxOTMtMzU0YS00NzM2LThjM2YtNzY2N2FhZTkxZWM2IiwidCI6IjRkYTk4NTcxLWRjZWEtNDgzOS04ZmIxLTBiZGQ1ZGM5NjlmOSIsImMiOjEwfQ%3D%3D',

    'pbi_auto_sync' => true,
    'pbi_auto_refresh' => true,
    'pbi_cron_key' => 'petfinder-local-sync',
    'pbi_background_sync_minutes' => 5,

    'pbi_directquery_hint' => true,

    'onedrive' => [
        'enabled' => false,
        'tenant_id' => '',
        'client_id' => '',
        'client_secret' => '',
        'user_email' => '',
        'file_path' => '/PetFinder/PetFinder_Tanauan_Batangas_Cleaned.xlsx',
        'item_id' => '',
    ],

    'powerbi' => [
        'enabled' => false,
        'tenant_id' => '',
        'client_id' => '',
        'client_secret' => '',
        'workspace_id' => '',
        'dataset_id' => '',
    ],
];
