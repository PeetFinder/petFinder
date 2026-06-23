<?php

declare(strict_types=1);

function pbi_source_mode(): string
{
    $config = require __DIR__ . '/config.php';
    $source = strtolower(trim((string) ($config['pbi_source'] ?? 'mysql')));

    return $source === 'excel' ? 'excel' : 'mysql';
}

function pbi_model_mode(): string
{
    return '3nf';
}

function pbi_mysql_table(): string
{
    return db_reports_table();
}

function pbi_connection_info(): array
{
    $config = require __DIR__ . '/config.php';
    $tables = db_pbi_normalized_tables();

    return [
        'source' => pbi_source_mode(),
        'model' => pbi_model_mode(),
        'server' => (string) ($config['db_host'] ?? '127.0.0.1'),
        'port' => (int) ($config['db_port'] ?? 3306),
        'database' => (string) ($config['db_name'] ?? 'petfinder_db'),
        'factTable' => 'pet_reports',
        'tables' => $tables,
        'table' => pbi_mysql_table(),
        'username' => (string) ($config['db_user'] ?? 'root'),
        'charset' => (string) ($config['db_charset'] ?? 'utf8mb4'),
        'connectionString' => sprintf(
            'Server=%s;Port=%d;Database=%s;',
            $config['db_host'] ?? '127.0.0.1',
            (int) ($config['db_port'] ?? 3306),
            $config['db_name'] ?? 'petfinder_db'
        ),
    ];
}

function pbi_normalized_table_counts(): array
{
    $counts = [];
    foreach (db_pbi_normalized_tables() as $table) {
        $counts[$table] = (int) db()->query('SELECT COUNT(*) FROM `' . $table . '`')->fetchColumn();
    }

    return $counts;
}

function pbi_drop_flat_views(): void
{
    if (pbi_source_mode() !== 'mysql') {
        return;
    }

    try {
        db()->exec('DROP VIEW IF EXISTS pbi_pet_data');
        db()->exec('DROP VIEW IF EXISTS pbi_sighting_data');
    } catch (Throwable $e) {

    }
}

function pbi_verify_normalized_schema(): void
{
    pbi_drop_flat_views();

    $missing = db_missing_tables();
    if ($missing !== []) {
        throw new RuntimeException(
            'Missing 3NF tables: ' . implode(', ', $missing)
            . '. Import database/petfinder.sql in phpMyAdmin.'
        );
    }
}

function pbi_auto_sync_enabled(): bool
{
    $config = require __DIR__ . '/config.php';

    return !empty($config['pbi_auto_sync']);
}

function pbi_auto_refresh_enabled(): bool
{
    $config = require __DIR__ . '/config.php';

    return !empty($config['pbi_auto_refresh']);
}

function pbi_paths(): array
{
    $root = dirname(__DIR__);
    $pbiDir = $root . DIRECTORY_SEPARATOR . 'pbi';

    return [
        'output' => $pbiDir . DIRECTORY_SEPARATOR . 'last_sync.json',
        'status' => $pbiDir . DIRECTORY_SEPARATOR . 'last_sync.json',
    ];
}

function pbi_write_sync_status(array $result): void
{
    $paths = pbi_paths();
    @file_put_contents($paths['status'], json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function sync_pbi_from_database(): array
{
    try {
        pbi_verify_normalized_schema();
        $counts = pbi_normalized_table_counts();
        $info = pbi_connection_info();

        $result = [
            'success' => true,
            'message' => 'MySQL 3NF tables ready for Power BI (' . $counts['pet_reports'] . ' reports).',
            'source' => 'mysql',
            'model' => pbi_model_mode(),
            'server' => $info['server'],
            'port' => $info['port'],
            'database' => $info['database'],
            'factTable' => $info['factTable'],
            'tables' => $info['tables'],
            'tableCounts' => $counts,
            'rowCount' => $counts['pet_reports'],
            'syncedAt' => date('c'),
        ];
        pbi_write_sync_status($result);

        return $result;
    } catch (Throwable $e) {
        $result = [
            'success' => false,
            'message' => 'Could not read MySQL 3NF data for Power BI: ' . $e->getMessage(),
            'source' => 'mysql',
            'model' => pbi_model_mode(),
            'syncedAt' => date('c'),
        ];
        pbi_write_sync_status($result);

        return $result;
    }
}

function sync_pbi_pipeline(): array
{
    require_once __DIR__ . '/pbi_refresh.php';

    if (pbi_source_mode() !== 'mysql') {
        return [
            'success' => false,
            'source' => pbi_source_mode(),
            'message' => 'Only mysql + 3NF mode is supported. Set pbi_source => mysql in api/config.php.',
        ];
    }

    $database = sync_pbi_from_database();
    $powerBi = [
        'success' => false,
        'skipped' => true,
        'message' => 'Skipped because database sync failed.',
    ];

    if ($database['success'] && pbi_auto_refresh_enabled()) {
        $powerBi = trigger_powerbi_dataset_refresh();
    }

    if ($database['success']) {
        pbi_write_sync_status(array_merge($database, ['powerBi' => $powerBi]));
    }

    return [
        'success' => $database['success'],
        'source' => 'mysql',
        'model' => pbi_model_mode(),
        'database' => $database,
        'powerBi' => $powerBi,
    ];
}

function sync_pbi_pipeline_quietly(): void
{
    try {
        sync_pbi_pipeline();
    } catch (Throwable $e) {
        pbi_write_sync_status([
            'success' => false,
            'message' => 'Power BI sync failed: ' . $e->getMessage(),
            'syncedAt' => date('c'),
        ]);
    }
}

function sync_pbi_excel_quietly(): void
{
    sync_pbi_pipeline_quietly();
}
