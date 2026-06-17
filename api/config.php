<?php

return [
    'db_host' => '127.0.0.1',
    // Must match the MySQL port shown in XAMPP (often 3308 in this project).
    'db_port' => 3308,
    'db_name' => 'petfinder_db',
    'db_user' => 'root',
    'db_pass' => '',
    'db_charset' => 'utf8mb4',
    'session_name' => 'petfinder_session',
    'default_admin' => [
        'name' => 'Eriane Admin',
        'email' => 'eriane_admin@petfinder.com',
        'password' => 'Kape!26',
        'location' => 'Tanauan City, Batangas',
    ],
    // Excel export for Power BI:
    // - database_only = website/MySQL reports only
    // - with_sample  = sample rows + website reports
    'pbi_export_mode' => 'with_sample',
    'pbi_sample_row_limit' => 50,
    // Set enabled => true and fill in IDs from Power BI Service.
    'powerbi' => [
        'enabled' => false,
        'tenant_id' => '',
        'client_id' => '',
        'client_secret' => '',
        'workspace_id' => '',
        'dataset_id' => '',
    ],
];
