<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Table;
use PhpOffice\PhpSpreadsheet\Worksheet\Table\TableStyle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReceiptExportController extends Controller
{
    public function __invoke(Request $request): StreamedResponse
    {
        $receipts = Expense::query()
            ->where('user_id', $request->user()->id)
            ->whereNotNull('receipt_path')
            ->orderByDesc('purchase_date')
            ->orderByDesc('id')
            ->get();

        $spreadsheet = $this->workbook($receipts);
        $filename = 'receipt-ocr-export-'.now()->format('Y-m-d').'.xlsx';

        return response()->streamDownload(function () use ($spreadsheet): void {
            (new Xlsx($spreadsheet))->save('php://output');
            $spreadsheet->disconnectWorksheets();
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    private function workbook(Collection $receipts): Spreadsheet
    {
        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()
            ->setCreator(config('app.name'))
            ->setTitle('Receipt OCR export')
            ->setDescription('Structured receipt data extracted by OCR');

        $summary = $spreadsheet->getActiveSheet();
        $summary->setTitle('Receipts');
        $summaryHeaders = [
            'Receipt ID', 'Purchase Date', 'Vendor', 'Receipt Number', 'Currency',
            'Subtotal', 'Tax', 'Total', 'Payment Method', 'OCR Confidence %',
            'File Name', 'Entry Type', 'OCR Text',
        ];
        $summary->fromArray($summaryHeaders, null, 'A1');

        $summaryRow = 2;
        foreach ($receipts as $receipt) {
            $summary->fromArray([
                $receipt->id,
                $receipt->purchase_date ? ExcelDate::dateTimeToExcel($receipt->purchase_date) : null,
                $receipt->vendor,
                $receipt->receipt_number,
                $receipt->receipt_currency,
                $receipt->receipt_subtotal !== null ? (float) $receipt->receipt_subtotal : null,
                $receipt->receipt_tax_amount !== null ? (float) $receipt->receipt_tax_amount : null,
                (float) $receipt->total_amount,
                $receipt->payment_method === 'Not provided' ? null : $receipt->payment_method,
                $receipt->receipt_confidence !== null ? (float) $receipt->receipt_confidence : null,
                $receipt->receipt_original_name,
                $receipt->entry_type === 'receipt' ? 'Receipt only' : 'Full expense',
                $receipt->receipt_text,
            ], null, "A{$summaryRow}");
            $summaryRow++;
        }

        $this->formatSummarySheet($summary, $summaryRow - 1);

        $itemsSheet = $spreadsheet->createSheet();
        $itemsSheet->setTitle('Line Items');
        $itemHeaders = [
            'Receipt ID', 'Purchase Date', 'Vendor', 'Receipt Number', 'Description',
            'Quantity', 'Unit Price', 'Line Total', 'Currency', 'File Name',
        ];
        $itemsSheet->fromArray($itemHeaders, null, 'A1');

        $itemRow = 2;
        foreach ($receipts as $receipt) {
            foreach ($receipt->receipt_items ?? [] as $item) {
                $itemsSheet->fromArray([
                    $receipt->id,
                    $receipt->purchase_date ? ExcelDate::dateTimeToExcel($receipt->purchase_date) : null,
                    $receipt->vendor,
                    $receipt->receipt_number,
                    $item['description'] ?? null,
                    $item['quantity'] ?? null,
                    $item['unit_price'] ?? null,
                    $item['total'] ?? null,
                    $receipt->receipt_currency,
                    $receipt->receipt_original_name,
                ], null, "A{$itemRow}");
                $itemRow++;
            }
        }

        $this->formatItemsSheet($itemsSheet, $itemRow - 1);
        $spreadsheet->setActiveSheetIndex(0);

        return $spreadsheet;
    }

    private function formatSummarySheet(Worksheet $sheet, int $lastDataRow): void
    {
        $lastRow = max(2, $lastDataRow);
        $this->formatHeader($sheet, 'A1:M1');
        $sheet->freezePane('A2');
        $sheet->getStyle("B2:B{$lastRow}")->getNumberFormat()->setFormatCode('yyyy-mm-dd');
        $sheet->getStyle("F2:H{$lastRow}")->getNumberFormat()->setFormatCode('#,##0.00');
        $sheet->getStyle("J2:J{$lastRow}")->getNumberFormat()->setFormatCode('0.00');
        $sheet->getStyle("A2:M{$lastRow}")->getAlignment()->setVertical(Alignment::VERTICAL_TOP);
        $sheet->getStyle("M2:M{$lastRow}")->getAlignment()->setWrapText(true);

        $widths = [
            'A' => 12, 'B' => 14, 'C' => 26, 'D' => 20, 'E' => 11,
            'F' => 15, 'G' => 15, 'H' => 15, 'I' => 19, 'J' => 18,
            'K' => 30, 'L' => 16, 'M' => 70,
        ];
        $this->setWidths($sheet, $widths);
        $this->addTable($sheet, "A1:M{$lastRow}", 'ReceiptsTable');
    }

    private function formatItemsSheet(Worksheet $sheet, int $lastDataRow): void
    {
        $lastRow = max(2, $lastDataRow);
        $this->formatHeader($sheet, 'A1:J1');
        $sheet->freezePane('A2');
        $sheet->getStyle("B2:B{$lastRow}")->getNumberFormat()->setFormatCode('yyyy-mm-dd');
        $sheet->getStyle("F2:H{$lastRow}")->getNumberFormat()->setFormatCode('#,##0.00');
        $sheet->getStyle("A2:J{$lastRow}")->getAlignment()->setVertical(Alignment::VERTICAL_TOP);
        $sheet->getStyle("E2:E{$lastRow}")->getAlignment()->setWrapText(true);

        $widths = [
            'A' => 12, 'B' => 14, 'C' => 26, 'D' => 20, 'E' => 42,
            'F' => 12, 'G' => 15, 'H' => 15, 'I' => 11, 'J' => 30,
        ];
        $this->setWidths($sheet, $widths);
        $this->addTable($sheet, "A1:J{$lastRow}", 'ReceiptItemsTable');
    }

    private function formatHeader(Worksheet $sheet, string $range): void
    {
        $sheet->getStyle($range)->getFont()->setBold(true)->getColor()->setARGB('FFFFFFFF');
        $sheet->getStyle($range)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF047857');
        $sheet->getStyle($range)->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getRowDimension(1)->setRowHeight(24);
    }

    private function setWidths(Worksheet $sheet, array $widths): void
    {
        foreach ($widths as $column => $width) {
            $sheet->getColumnDimension($column)->setWidth($width);
        }
    }

    private function addTable(Worksheet $sheet, string $range, string $name): void
    {
        $style = new TableStyle(TableStyle::TABLE_STYLE_MEDIUM4);
        $style->setShowRowStripes(true);
        $table = new Table($range, $name);
        $table->setStyle($style);
        $sheet->addTable($table);
    }
}
