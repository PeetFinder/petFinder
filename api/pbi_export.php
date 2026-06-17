<?php

declare(strict_types=1);

/**
 * Exports lost_pet_reports from MySQL into the Power BI Excel file in /pbi.
 */

function pbi_export_mode(): string
{
    $config = require __DIR__ . '/config.php';
    $mode = strtolower(trim((string) ($config['pbi_export_mode'] ?? 'database_only')));

    return $mode === 'with_sample' ? 'with_sample' : 'database_only';
}

function pbi_sample_row_limit(): int
{
    $config = require __DIR__ . '/config.php';

    return max(0, (int) ($config['pbi_sample_row_limit'] ?? 50));
}

function pbi_fetch_export_rows(): array
{
    if (pbi_export_mode() === 'with_sample') {
        return pbi_merge_export_rows();
    }

    $rows = pbi_fetch_db_data_rows();
    foreach ($rows as $index => $row) {
        $rows[$index][0] = (string) ($index + 1);
    }

    return $rows;
}

function pbi_resolve_cleaned_file(string $pbiDir): string
{
    $candidates = [
        'PetFinder_Tanauan_Batangas_Cleaned (1).xlsx',
        'PetFinder_Tanauan_Batangas_Cleaned.xlsx',
    ];

    foreach ($candidates as $name) {
        $path = $pbiDir . DIRECTORY_SEPARATOR . $name;
        if (is_file($path)) {
            return $path;
        }
    }

    return $pbiDir . DIRECTORY_SEPARATOR . 'PetFinder_Tanauan_Batangas_Cleaned.xlsx';
}

function pbi_paths(): array
{
    $root = dirname(__DIR__);
    $pbiDir = $root . DIRECTORY_SEPARATOR . 'pbi';
    $cleaned = pbi_resolve_cleaned_file($pbiDir);
    $fileName = basename($cleaned);

    return [
        'output' => $cleaned,
        'backup' => $pbiDir . DIRECTORY_SEPARATOR . 'PetFinder_Tanauan_Batangas_Original_Backup.xlsx',
        'sheet_data' => 'xl/worksheets/sheet1.xml',
        'sheet_summary' => 'xl/worksheets/sheet2.xml',
        'sheet_name' => 'PetFinder Data',
        'public_file' => 'pbi/' . $fileName,
    ];
}

function pbi_ensure_backup(): void
{
    $paths = pbi_paths();
    if (!is_file($paths['backup']) && is_file($paths['output'])) {
        @copy($paths['output'], $paths['backup']);
    }
}

function pbi_xml_text(string $value): string
{
    return htmlspecialchars($value, ENT_XML1 | ENT_COMPAT, 'UTF-8');
}

function pbi_column_letter(int $index): string
{
    $letter = '';
    while ($index > 0) {
        $index--;
        $letter = chr(65 + ($index % 26)) . $letter;
        $index = intdiv($index, 26);
    }
    return $letter;
}

function pbi_column_index(string $letters): int
{
    $index = 0;
    $len = strlen($letters);
    for ($i = 0; $i < $len; $i++) {
        $index = $index * 26 + (ord($letters[$i]) - 64);
    }
    return $index - 1;
}

function pbi_row_key(array $row): string
{
    return strtolower(
        trim((string) ($row[1] ?? '')) . '|'
        . trim((string) ($row[2] ?? '')) . '|'
        . trim((string) ($row[3] ?? '')) . '|'
        . trim((string) ($row[8] ?? ''))
    );
}

function pbi_normalize_data_row(array $cells): array
{
    $row = [];
    for ($i = 0; $i < 9; $i++) {
        $row[] = (string) ($cells[$i] ?? '');
    }

    if (trim($row[1]) === '' && trim($row[2]) === '') {
        return [];
    }

    return $row;
}

function pbi_read_data_rows(string $xlsxPath): array
{
    if (!is_file($xlsxPath) || !class_exists('ZipArchive')) {
        return [];
    }

    $zip = new ZipArchive();
    if ($zip->open($xlsxPath) !== true) {
        return [];
    }

    $xml = $zip->getFromName('xl/worksheets/sheet1.xml');
    $zip->close();
    if ($xml === false || $xml === '') {
        return [];
    }

    $rows = [];
    if (!preg_match_all('/<row r="(\d+)"[^>]*>(.*?)<\/row>/s', $xml, $rowMatches, PREG_SET_ORDER)) {
        return [];
    }

    foreach ($rowMatches as $rowMatch) {
        $rowNumber = (int) $rowMatch[1];
        if ($rowNumber === 1) {
            continue;
        }

        $cells = [];
        if (preg_match_all(
            '/<c r="([A-Z]+)\d+"[^>]*>(?:<v>([^<]*)<\/v>|<is><t>([^<]*)<\/t><\/is>)/',
            $rowMatch[2],
            $cellMatches,
            PREG_SET_ORDER
        )) {
            foreach ($cellMatches as $cellMatch) {
                $textValue = $cellMatch[3] ?? '';
                $numberValue = $cellMatch[2] ?? '';
                $cells[pbi_column_index($cellMatch[1])] = $textValue !== '' ? $textValue : $numberValue;
            }
        }

        $row = pbi_normalize_data_row($cells);
        if ($row !== []) {
            $rows[] = $row;
        }
    }

    return $rows;
}

function pbi_fetch_db_data_rows(): array
{
    $rows = [];

    foreach (fetch_lost_pet_reports() as $report) {
        $row = pbi_normalize_data_row([
            '',
            (string) ($report['name'] ?? ''),
            (string) ($report['species'] ?? ''),
            (string) ($report['breed'] ?? ''),
            'Unknown',
            'Unknown',
            'Unknown',
            (string) ($report['status'] ?? 'Lost'),
            (string) ($report['location'] ?? ''),
        ]);

        if ($row !== []) {
            $rows[] = $row;
        }
    }

    return $rows;
}

function pbi_merge_export_rows(): array
{
    pbi_ensure_backup();
    $paths = pbi_paths();
    $seedRows = is_file($paths['backup']) ? pbi_read_data_rows($paths['backup']) : pbi_read_data_rows($paths['output']);
    $sampleLimit = pbi_sample_row_limit();
    if ($sampleLimit > 0) {
        $seedRows = array_slice($seedRows, 0, $sampleLimit);
    }
    $dbRows = pbi_fetch_db_data_rows();
    $merged = [];
    $keys = [];

    foreach ($seedRows as $row) {
        $key = pbi_row_key($row);
        if ($key === '||' || isset($keys[$key])) {
            continue;
        }
        $merged[] = $row;
        $keys[$key] = count($merged) - 1;
    }

    foreach ($dbRows as $row) {
        $key = pbi_row_key($row);
        if ($key === '||') {
            continue;
        }

        if (isset($keys[$key])) {
            $index = $keys[$key];
            $merged[$index][3] = $row[3];
            $merged[$index][7] = $row[7];
            continue;
        }

        $merged[] = $row;
        $keys[$key] = count($merged) - 1;
    }

    foreach ($merged as $index => $row) {
        $merged[$index][0] = (string) ($index + 1);
    }

    return $merged;
}

function pbi_build_data_sheet_xml(array $rows): string
{
    $headers = ['PetID', 'PetName', 'Type', 'Breed', 'Gender', 'Color', 'Size', 'Status', 'Location'];
    $lastRow = max(1, count($rows) + 1);
    $dimension = 'A1:I' . $lastRow;

    $xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        . '<sheetPr><outlinePr summaryBelow="1" summaryRight="1"/><pageSetUpPr/></sheetPr>'
        . '<dimension ref="' . $dimension . '"/>'
        . '<sheetViews><sheetView workbookViewId="0">'
        . '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>'
        . '<selection pane="bottomLeft" activeCell="A1" sqref="A1"/></sheetView></sheetViews>'
        . '<sheetFormatPr baseColWidth="8" defaultRowHeight="15"/>'
        . '<cols>'
        . '<col width="12" customWidth="1" min="1" max="1"/>'
        . '<col width="12" customWidth="1" min="2" max="2"/>'
        . '<col width="12" customWidth="1" min="3" max="3"/>'
        . '<col width="22" customWidth="1" min="4" max="4"/>'
        . '<col width="12" customWidth="1" min="5" max="5"/>'
        . '<col width="18" customWidth="1" min="6" max="6"/>'
        . '<col width="14" customWidth="1" min="7" max="7"/>'
        . '<col width="12" customWidth="1" min="8" max="8"/>'
        . '<col width="23" customWidth="1" min="9" max="9"/>'
        . '</cols><sheetData>';

    $allRows = array_merge([$headers], $rows);
    foreach ($allRows as $rowIndex => $cells) {
        $rowNumber = $rowIndex + 1;
        $style = ($rowNumber === 1) ? '1' : (($rowNumber % 2 === 0) ? '2' : '4');
        $xml .= '<row r="' . $rowNumber . '">';
        foreach ($cells as $colIndex => $value) {
            $colLetter = pbi_column_letter($colIndex + 1);
            $cellRef = $colLetter . $rowNumber;
            $cellStyle = ($rowNumber === 1) ? '1' : (($colIndex === 0 || in_array($colIndex, [4, 6, 7], true)) ? $style : (string) ((int) $style + 1));
            if ($rowNumber > 1 && $colIndex === 0 && ctype_digit((string) $value)) {
                $xml .= '<c r="' . $cellRef . '" s="' . $cellStyle . '" t="n"><v>' . (int) $value . '</v></c>';
            } else {
                $xml .= '<c r="' . $cellRef . '" s="' . $cellStyle . '" t="inlineStr"><is><t>' . pbi_xml_text((string) $value) . '</t></is></c>';
            }
        }
        $xml .= '</row>';
    }

    $xml .= '</sheetData>'
        . '<pageMargins left="0.75" right="0.75" top="1" bottom="1" header="0.5" footer="0.5"/>'
        . '</worksheet>';

    return $xml;
}

function pbi_build_summary_sheet_xml(): string
{
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        . '<sheetPr><outlinePr summaryBelow="1" summaryRight="1"/><pageSetUpPr/></sheetPr>'
        . '<dimension ref="A1:B5"/>'
        . '<sheetViews><sheetView workbookViewId="0"><selection activeCell="A1" sqref="A1"/></sheetView></sheetViews>'
        . '<sheetFormatPr baseColWidth="8" defaultRowHeight="15"/>'
        . '<cols><col width="22" customWidth="1" min="1" max="1"/><col width="12" customWidth="1" min="2" max="2"/></cols>'
        . '<sheetData>'
        . '<row r="1"><c r="A1" s="6" t="inlineStr"><is><t>PetFinder Dataset Summary Profile</t></is></c></row>'
        . '<row r="3"><c r="A3" s="7" t="inlineStr"><is><t>Total Row Count</t></is></c>'
        . '<c r="B3" s="8"><f>COUNTA(\'PetFinder Data\'!A2:A5000)</f><v>0</v></c></row>'
        . '<row r="4"><c r="A4" s="7" t="inlineStr"><is><t>Lost Pets</t></is></c>'
        . '<c r="B4" s="8"><f>COUNTIF(\'PetFinder Data\'!H2:H5000, "Lost")</f><v>0</v></c></row>'
        . '<row r="5"><c r="A5" s="7" t="inlineStr"><is><t>Found Pets</t></is></c>'
        . '<c r="B5" s="8"><f>COUNTIF(\'PetFinder Data\'!H2:H5000, "Found")</f><v>0</v></c></row>'
        . '</sheetData>'
        . '<pageMargins left="0.75" right="0.75" top="1" bottom="1" header="0.5" footer="0.5"/>'
        . '</worksheet>';
}

function sync_pbi_csv(array $rows): array
{
    $paths = pbi_paths();
    $csvPath = dirname($paths['output']) . DIRECTORY_SEPARATOR . 'PetFinder_Tanauan_Batangas_Cleaned.csv';
    $handle = fopen($csvPath, 'wb');
    if ($handle === false) {
        return ['success' => false, 'message' => 'Could not write Power BI CSV export file.'];
    }

    fputcsv($handle, ['PetID', 'PetName', 'Type', 'Breed', 'Gender', 'Color', 'Size', 'Status', 'Location']);
    foreach ($rows as $row) {
        fputcsv($handle, $row);
    }
    fclose($handle);

    return [
        'success' => true,
        'message' => 'Power BI CSV file updated.',
        'file' => 'pbi/PetFinder_Tanauan_Batangas_Cleaned.csv',
        'rowCount' => count($rows),
        'syncedAt' => date('c'),
    ];
}

function pbi_write_sync_status(array $result): void
{
    $paths = pbi_paths();
    $statusPath = dirname($paths['output']) . DIRECTORY_SEPARATOR . 'last_sync.json';
    @file_put_contents($statusPath, json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function pbi_commit_xlsx(string $tempFile, string $outputPath, array $paths): array
{
    $fallbackName = 'PetFinder_Tanauan_Batangas_Cleaned_LATEST.xlsx';
    $fallbackPath = dirname($outputPath) . DIRECTORY_SEPARATOR . $fallbackName;

    if (is_file($outputPath)) {
        @unlink($outputPath);
    }
    if (@rename($tempFile, $outputPath)) {
        @copy($outputPath, $fallbackPath);
        return [
            'success' => true,
            'file' => $paths['public_file'],
            'locked' => false,
            'message' => 'Power BI Excel file updated.',
        ];
    }

    if (@copy($tempFile, $outputPath)) {
        @unlink($tempFile);
        @copy($outputPath, $fallbackPath);
        return [
            'success' => true,
            'file' => $paths['public_file'],
            'locked' => false,
            'message' => 'Power BI Excel file updated.',
        ];
    }

    if (is_file($tempFile)) {
        if (@copy($tempFile, $fallbackPath) || @rename($tempFile, $fallbackPath)) {
            @unlink($tempFile);
            return [
                'success' => true,
                'file' => 'pbi/' . $fallbackName,
                'locked' => true,
                'message' => 'Ang Excel file ay nakabukas kaya hindi ma-overwrite. Naka-save ang data sa '
                    . $fallbackName . '. Isara muna ang Excel, tapos buksan ang sync URL ulit.',
            ];
        }
        @unlink($tempFile);
    }

    return [
        'success' => false,
        'file' => '',
        'locked' => true,
        'message' => 'Hindi ma-save ang Excel file. Isara muna ang PetFinder_Tanauan_Batangas_Cleaned.xlsx sa Microsoft Excel, tapos buksan: /api/pbi/sync.php',
    ];
}

function sync_pbi_excel(): array
{
    try {
        $rows = pbi_fetch_export_rows();
    } catch (Throwable $e) {
        return ['success' => false, 'message' => 'Could not load reports for Power BI export: ' . $e->getMessage()];
    }

    if (!class_exists('ZipArchive')) {
        return sync_pbi_csv($rows);
    }

    $paths = pbi_paths();
    pbi_ensure_backup();

    $source = is_file($paths['backup']) ? $paths['backup'] : $paths['output'];
    if (!is_file($source)) {
        return sync_pbi_csv($rows);
    }

    try {
        $dataSheet = pbi_build_data_sheet_xml($rows);
        $summarySheet = pbi_build_summary_sheet_xml();
        $tempFile = $paths['output'] . '.tmp';

        if (is_file($tempFile)) {
            @unlink($tempFile);
        }

        if (!copy($source, $tempFile)) {
            return ['success' => false, 'message' => 'Could not prepare temporary Excel export file.'];
        }

        $zip = new ZipArchive();
        if ($zip->open($tempFile) !== true) {
            return ['success' => false, 'message' => 'Could not open temporary Excel export file.'];
        }

        $zip->deleteName($paths['sheet_data']);
        $zip->addFromString($paths['sheet_data'], $dataSheet);
        $zip->deleteName($paths['sheet_summary']);
        $zip->addFromString($paths['sheet_summary'], $summarySheet);
        $zip->close();

        $commit = pbi_commit_xlsx($tempFile, $paths['output'], $paths);
        if (!$commit['success']) {
            $result = [
                'success' => false,
                'message' => $commit['message'],
                'rowCount' => count($rows),
                'syncedAt' => date('c'),
            ];
            pbi_write_sync_status($result);
            return $result;
        }

        $result = [
            'success' => true,
            'message' => $commit['message'],
            'file' => $commit['file'],
            'sheet' => $paths['sheet_name'],
            'exportMode' => pbi_export_mode(),
            'rowCount' => count($rows),
            'syncedAt' => date('c'),
            'excelLocked' => $commit['locked'],
        ];
        pbi_write_sync_status($result);
        return $result;
    } catch (Throwable $e) {
        $result = ['success' => false, 'message' => 'Power BI export failed: ' . $e->getMessage()];
        pbi_write_sync_status($result);
        return $result;
    }
}

function sync_pbi_excel_quietly(): void
{
    try {
        sync_pbi_excel();
    } catch (Throwable $e) {
        pbi_write_sync_status([
            'success' => false,
            'message' => 'Power BI export failed: ' . $e->getMessage(),
            'syncedAt' => date('c'),
        ]);
    }
}
