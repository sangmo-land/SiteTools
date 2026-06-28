<?php

namespace App\Http\Controllers;

use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Turns a table produced by the receipt assistant (a title, column headers, and
 * string rows) into a downloadable Excel workbook or PDF document. The payload
 * comes straight from the chat answer, so everything is validated and capped
 * before it is rendered.
 */
class ReceiptReportExportController extends Controller
{
    private const MAX_COLUMNS = 8;

    private const MAX_ROWS = 500;

    public function __invoke(Request $request): Response
    {
        $data = $request->validate([
            'format' => ['required', 'in:xlsx,pdf'],
            'title' => ['nullable', 'string', 'max:120'],
            'columns' => ['required', 'array', 'min:1', 'max:'.self::MAX_COLUMNS],
            'columns.*' => ['nullable', 'string', 'max:120'],
            'rows' => ['required', 'array', 'min:1', 'max:'.self::MAX_ROWS],
            'rows.*' => ['array', 'max:'.self::MAX_COLUMNS],
            'rows.*.*' => ['nullable', 'string', 'max:500'],
        ]);

        $title = trim((string) ($data['title'] ?? '')) ?: 'Receipt report';
        $columns = array_values(array_map(static fn ($column): string => (string) ($column ?? ''), $data['columns']));
        $columnCount = count($columns);

        $rows = array_map(static function ($row) use ($columnCount): array {
            $cells = array_map(static fn ($value): string => (string) ($value ?? ''), array_values((array) $row));

            return array_pad(array_slice($cells, 0, $columnCount), $columnCount, '');
        }, $data['rows']);

        $filename = (Str::slug($title) ?: 'receipt-report').'-'.now()->format('Y-m-d');

        return $data['format'] === 'pdf'
            ? $this->pdf($title, $columns, $rows, $filename.'.pdf')
            : $this->xlsx($title, $columns, $rows, $filename.'.xlsx');
    }

    /**
     * @param  list<string>  $columns
     * @param  list<list<string>>  $rows
     */
    private function xlsx(string $title, array $columns, array $rows, string $filename): StreamedResponse
    {
        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()
            ->setCreator((string) config('app.name'))
            ->setTitle($title);

        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle(Str::limit(Str::ascii($title), 28, ''));

        $lastColumn = Coordinate::stringFromColumnIndex(count($columns));

        $sheet->fromArray($columns, null, 'A1');
        $sheet->fromArray($rows, null, 'A2');

        $headerRange = "A1:{$lastColumn}1";
        $sheet->getStyle($headerRange)->getFont()->setBold(true)->getColor()->setARGB('FFFFFFFF');
        $sheet->getStyle($headerRange)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF047857');
        $sheet->getStyle($headerRange)->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getRowDimension(1)->setRowHeight(24);
        $sheet->freezePane('A2');

        $lastRow = count($rows) + 1;
        $sheet->getStyle("A2:{$lastColumn}{$lastRow}")->getAlignment()
            ->setVertical(Alignment::VERTICAL_TOP)
            ->setWrapText(true);

        foreach (range(1, count($columns)) as $index) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($index))->setWidth(24);
        }

        return response()->streamDownload(function () use ($spreadsheet): void {
            (new Xlsx($spreadsheet))->save('php://output');
            $spreadsheet->disconnectWorksheets();
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * @param  list<string>  $columns
     * @param  list<list<string>>  $rows
     */
    private function pdf(string $title, array $columns, array $rows, string $filename): Response
    {
        $options = new Options;
        $options->set('defaultFont', 'DejaVu Sans');
        $options->set('isRemoteEnabled', false);

        $dompdf = new Dompdf($options);
        $dompdf->setPaper('a4', count($columns) > 4 ? 'landscape' : 'portrait');
        $dompdf->loadHtml($this->html($title, $columns, $rows));
        $dompdf->render();

        return response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    /**
     * @param  list<string>  $columns
     * @param  list<list<string>>  $rows
     */
    private function html(string $title, array $columns, array $rows): string
    {
        $head = '';
        foreach ($columns as $column) {
            $head .= '<th>'.e($column).'</th>';
        }

        $body = '';
        foreach ($rows as $row) {
            $body .= '<tr>';
            foreach ($row as $cell) {
                $body .= '<td>'.e($cell).'</td>';
            }
            $body .= '</tr>';
        }

        $appName = e((string) config('app.name'));
        $title = e($title);
        $generated = e(now()->format('j M Y, H:i'));

        return <<<HTML
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                * { font-family: "DejaVu Sans", sans-serif; }
                body { margin: 0; color: #18181b; }
                .meta { font-size: 10px; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; }
                h1 { font-size: 18px; margin: 2px 0 2px; }
                .sub { font-size: 10px; color: #71717a; margin-bottom: 14px; }
                table { width: 100%; border-collapse: collapse; font-size: 10px; }
                th { background: #047857; color: #ffffff; text-align: left; padding: 7px 8px; }
                td { padding: 6px 8px; border-bottom: 1px solid #e4e4e7; vertical-align: top; }
                tr:nth-child(even) td { background: #f4f4f5; }
            </style>
        </head>
        <body>
            <p class="meta">{$appName}</p>
            <h1>{$title}</h1>
            <p class="sub">Generated {$generated} &middot; {$this->rowCountLabel($rows)}</p>
            <table>
                <thead><tr>{$head}</tr></thead>
                <tbody>{$body}</tbody>
            </table>
        </body>
        </html>
        HTML;
    }

    /**
     * @param  list<list<string>>  $rows
     */
    private function rowCountLabel(array $rows): string
    {
        $count = count($rows);

        return $count.' '.Str::plural('row', $count);
    }
}
