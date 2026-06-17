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
    'pbi_pbix_file' => 'petfinderfinalpbi.pbix',
    // Update this URL after publishing petfinderfinalpbi.pbix to Power BI Service.
    'powerbi_embed_url' => 'https://app.powerbi.com/view?r=eyJrIjoiMDNjZDAxOTMtMzU0YS00NzM2LThjM2YtNzY2N2FhZTkxZWM2IiwidCI6IjRkYTk4NTcxLWRjZWEtNDgzOS04ZmIxLTBiZGQ1ZGM5NjlmOSIsImMiOjEwfQ%3D%3D',
    // Auto-sync Excel after every report change; background task uses pbi_cron_key.
    'pbi_auto_sync' => true,
    'pbi_auto_refresh' => true,
    'pbi_cron_key' => 'petfinder-local-sync',
    'pbi_background_sync_minutes' => 5,
    // OneDrive upload after Excel sync (no local file lock; Power BI can refresh from cloud).
    // Uses the same Azure App as powerbi if tenant_id/client_id/client_secret are left blank.
    'onedrive' => [
        'enabled' => false,
        'tenant_id' => '',
        'client_id' => '',
        'client_secret' => '',
        'user_email' => '',  // Microsoft account that owns the OneDrive file
        'file_path' => '/PetFinder/PetFinder_Tanauan_Batangas_Cleaned.xlsx',
        'item_id' => '',     // optional — use instead of file_path if you have the drive item ID
    ],
    // Set enabled => true and fill in IDs from Power BI Service for instant online refresh.
    'powerbi' => [
        'enabled' => false,
        'tenant_id' => '',
        'client_id' => '',
        'client_secret' => '',
        'workspace_id' => '',
        'dataset_id' => '',
    ],
];
