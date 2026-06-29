<?php

namespace Tests\Feature;

use App\Models\Expense;
use App\Models\Material;
use App\Models\SiteProject;
use App\Models\User;
use App\Services\AmazonTextractReceiptScanner;
use Aws\MockHandler;
use Aws\Result;
use Aws\Textract\TextractClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Tests\TestCase;

class SiteToolsTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_renders_site_tool_summary(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->has('stats')
                ->has('recentExpenses')
                ->has('categoryTotals')
                ->has('monthlyTrend')
                ->has('projects'));
    }

    public function test_user_can_create_project_and_expense(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('tools.projects.store'), [
                'name' => 'Warehouse fit-out',
                'location' => 'Ikeja',
                'budget' => 2500000,
                'start_date' => now()->toDateString(),
                'status' => 'active',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $project = SiteProject::where('user_id', $user->id)->firstOrFail();
        $material = Material::create([
            'name' => 'Cement 42.5R 50kg',
            'category' => 'Cement & Concrete',
            'unit' => 'bag',
            'default_unit_price' => 5800,
            'is_active' => true,
        ]);

        $this->actingAs($user)
            ->post(route('tools.expenses.store'), [
                'site_project_id' => $project->id,
                'material_id' => $material->id,
                'vendor' => 'Depot 12',
                'purchase_date' => now()->toDateString(),
                'quantity' => 10.5,
                'unit' => 'bag',
                'unit_cost' => 5800,
                'payment_method' => 'POS',
                'status' => 'paid',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $this->assertDatabaseHas('expenses', [
            'user_id' => $user->id,
            'site_project_id' => $project->id,
            'material_id' => $material->id,
            'title' => 'Cement 42.5R 50kg',
            'total_amount' => 60900,
        ]);
    }

    public function test_user_can_add_a_material_from_the_expenses_page(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('tools.materials.store'), [
                'name' => 'Sand (sharp)',
                'category' => 'Aggregates',
                'unit' => 'trip',
                'default_unit_price' => 45000,
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $this->assertDatabaseHas('materials', [
            'name' => 'Sand (sharp)',
            'category' => 'Aggregates',
            'unit' => 'trip',
            'default_unit_price' => 45000,
            'is_active' => true,
        ]);
    }

    public function test_material_name_must_be_unique(): void
    {
        $user = User::factory()->create();
        Material::create([
            'name' => 'Cement 42.5R 50kg',
            'category' => 'Cement & Concrete',
            'unit' => 'bag',
            'default_unit_price' => 5800,
            'is_active' => true,
        ]);

        $this->actingAs($user)
            ->post(route('tools.materials.store'), [
                'name' => 'Cement 42.5R 50kg',
                'category' => 'Cement & Concrete',
                'unit' => 'bag',
                'default_unit_price' => 6000,
            ])
            ->assertSessionHasErrors('name');
    }

    public function test_material_rejects_an_unknown_category(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('tools.materials.store'), [
                'name' => 'Mystery item',
                'category' => 'Spaceship parts',
                'unit' => 'pcs',
                'default_unit_price' => 100,
            ])
            ->assertSessionHasErrors('category');
    }

    public function test_user_can_upload_a_receipt_without_expense_details(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('tools.receipts.store'), [
                'receipt' => UploadedFile::fake()->image('supplier-receipt.jpg'),
                'vendor' => 'BuildMart',
                'purchase_date' => '2026-06-23',
                'total_amount' => 14500,
                'receipt_number' => 'INV-1042',
                'receipt_currency' => 'XAF',
                'receipt_subtotal' => 14000,
                'receipt_tax_amount' => 500,
                'receipt_payment_method' => 'Cash',
                'receipt_confidence' => 97.5,
                'receipt_text' => "BUILDMART\nCement 2 x 7,000\nTOTAL 14,500 XAF",
                'receipt_items' => [[
                    'description' => 'Cement',
                    'quantity' => 2,
                    'unit_price' => 7000,
                    'total' => 14000,
                ]],
            ])
            ->assertSessionHasNoErrors()
            ->assertSessionHas('status', 'Receipt uploaded.')
            ->assertRedirect();

        $receipt = Expense::where('user_id', $user->id)->firstOrFail();

        $this->assertSame('receipt', $receipt->entry_type);
        $this->assertNull($receipt->material_id);
        $this->assertSame('BuildMart', $receipt->vendor);
        $this->assertSame('INV-1042', $receipt->receipt_number);
        $this->assertSame('XAF', $receipt->receipt_currency);
        $this->assertSame('Cement', $receipt->receipt_items[0]['description']);
        $this->assertSame('supplier-receipt.jpg', $receipt->receipt_original_name);
        Storage::disk('public')->assertExists($receipt->receipt_path);

        $this->actingAs($user)
            ->get(route('tools.expenses'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('summary.total', 14500)
                ->where('summary.count', 1)
                ->where('summary.average', 14500)
                ->where('expenses.data.0.entryType', 'receipt'));

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('stats.totalSpent', 14500)
                ->where('stats.monthSpent', 14500)
                ->where('stats.receiptCount', 1)
                ->where('recentExpenses.0.title', 'Receipt - BuildMart'));
    }

    public function test_user_can_export_ocr_receipts_to_excel(): void
    {
        $user = User::factory()->create();
        Expense::create([
            'user_id' => $user->id,
            'entry_type' => 'receipt',
            'title' => 'Receipt - BuildMart',
            'vendor' => 'BuildMart',
            'category' => 'Other',
            'purchase_date' => '2026-06-23',
            'total_amount' => 14500,
            'payment_method' => 'Cash',
            'status' => 'pending',
            'receipt_path' => 'receipts/1/supplier-receipt.jpg',
            'receipt_original_name' => 'supplier-receipt.jpg',
            'receipt_number' => 'INV-1042',
            'receipt_currency' => 'XAF',
            'receipt_confidence' => 97.5,
            'receipt_items' => [[
                'description' => 'Cement',
                'quantity' => 2,
                'unit_price' => 7000,
                'total' => 14000,
            ]],
        ]);

        $response = $this->actingAs($user)->get(route('tools.receipts.export'));

        $response->assertOk()
            ->assertDownload('receipt-ocr-export-'.now()->format('Y-m-d').'.xlsx');

        $temporaryFile = tempnam(sys_get_temp_dir(), 'receipt-export-');
        file_put_contents($temporaryFile, $response->streamedContent());
        $spreadsheet = IOFactory::load($temporaryFile);

        $this->assertSame(['Receipts', 'Line Items'], $spreadsheet->getSheetNames());
        $this->assertSame('BuildMart', $spreadsheet->getSheetByName('Receipts')->getCell('C2')->getValue());
        $this->assertEquals(14500, $spreadsheet->getSheetByName('Receipts')->getCell('H2')->getValue());
        $this->assertSame('Cement', $spreadsheet->getSheetByName('Line Items')->getCell('E2')->getValue());

        $spreadsheet->disconnectWorksheets();
        unlink($temporaryFile);
    }

    public function test_user_can_download_an_assistant_table_as_excel(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('tools.receipts.report'), [
            'format' => 'xlsx',
            'title' => 'Pending receipts',
            'columns' => ['Date', 'Vendor', 'Total'],
            'rows' => [
                ['2026-06-23', 'BuildMart', '14 500 FCFA'],
                ['Total', '', '14 500 FCFA'],
            ],
        ]);

        $response->assertOk()
            ->assertDownload('pending-receipts-'.now()->format('Y-m-d').'.xlsx');

        $temporaryFile = tempnam(sys_get_temp_dir(), 'receipt-report-');
        file_put_contents($temporaryFile, $response->streamedContent());
        $spreadsheet = IOFactory::load($temporaryFile);
        $sheet = $spreadsheet->getActiveSheet();

        $this->assertSame('Vendor', $sheet->getCell('B1')->getValue());
        $this->assertSame('BuildMart', $sheet->getCell('B2')->getValue());
        $this->assertSame('14 500 FCFA', $sheet->getCell('C3')->getValue());

        $spreadsheet->disconnectWorksheets();
        unlink($temporaryFile);
    }

    public function test_user_can_download_an_assistant_table_as_pdf(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('tools.receipts.report'), [
            'format' => 'pdf',
            'title' => 'Pending receipts',
            'columns' => ['Date', 'Vendor', 'Total'],
            'rows' => [['2026-06-23', 'BuildMart', '14 500 FCFA']],
        ]);

        $response->assertOk();
        $this->assertSame('application/pdf', $response->headers->get('content-type'));
        $this->assertStringContainsString(
            'pending-receipts-'.now()->format('Y-m-d').'.pdf',
            (string) $response->headers->get('content-disposition'),
        );
        $this->assertStringStartsWith('%PDF-', $response->getContent());
    }

    public function test_report_export_rejects_an_unsupported_format(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('tools.receipts.report'), [
                'format' => 'docx',
                'columns' => ['Date'],
                'rows' => [['2026-06-23']],
            ])
            ->assertSessionHasErrors('format');
    }

    public function test_owner_can_view_their_receipt_file(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        Storage::disk('public')->put('receipts/'.$user->id.'/supplier-receipt.jpg', 'image-bytes');

        $expense = Expense::create([
            'user_id' => $user->id,
            'entry_type' => 'receipt',
            'title' => 'Receipt - BuildMart',
            'category' => 'Other',
            'purchase_date' => '2026-06-23',
            'total_amount' => 14500,
            'payment_method' => 'Cash',
            'status' => 'pending',
            'receipt_path' => 'receipts/'.$user->id.'/supplier-receipt.jpg',
            'receipt_original_name' => 'supplier-receipt.jpg',
        ]);

        $this->actingAs($user)
            ->get(route('tools.receipts.show', $expense->id))
            ->assertOk()
            ->assertHeader('content-disposition', 'inline; filename=supplier-receipt.jpg');
    }

    public function test_user_cannot_view_another_users_receipt(): void
    {
        Storage::fake('public');

        $owner = User::factory()->create();
        $other = User::factory()->create();
        Storage::disk('public')->put('receipts/'.$owner->id.'/supplier-receipt.jpg', 'image-bytes');

        $expense = Expense::create([
            'user_id' => $owner->id,
            'entry_type' => 'receipt',
            'title' => 'Receipt - BuildMart',
            'category' => 'Other',
            'purchase_date' => '2026-06-23',
            'total_amount' => 14500,
            'payment_method' => 'Cash',
            'status' => 'pending',
            'receipt_path' => 'receipts/'.$owner->id.'/supplier-receipt.jpg',
            'receipt_original_name' => 'supplier-receipt.jpg',
        ]);

        $this->actingAs($other)
            ->get(route('tools.receipts.show', $expense->id))
            ->assertNotFound();
    }

    public function test_receipt_only_upload_requires_a_receipt(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('tools.receipts.store'))
            ->assertSessionHasErrors('receipt');

        $this->assertDatabaseCount('expenses', 0);
    }

    public function test_expense_tracker_and_calculators_render(): void
    {
        $user = User::factory()->create();
        $material = Material::create([
            'name' => 'PVC pipe 110mm',
            'category' => 'Plumbing',
            'unit' => 'length',
            'default_unit_price' => 6500,
            'is_active' => true,
        ]);

        Expense::create([
            'user_id' => $user->id,
            'material_id' => $material->id,
            'title' => 'PVC pipes',
            'category' => 'Plumbing',
            'purchase_date' => now()->toDateString(),
            'total_amount' => 120000,
            'payment_method' => 'Cash',
            'status' => 'paid',
        ]);

        $this->actingAs($user)
            ->get(route('tools.expenses'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Tools/Expenses')
                ->has('expenses.data', 1)
                ->has('categories')
                ->has('materials', 1)
                ->has('summary'));

        $this->actingAs($user)
            ->get(route('tools.calculators'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Tools/Calculators'));
    }

    public function test_user_can_scan_a_receipt_with_amazon_textract(): void
    {
        config([
            'services.textract.key' => 'test-key',
            'services.textract.secret' => 'test-secret',
            'services.textract.region' => 'us-east-1',
        ]);

        $receipt = UploadedFile::fake()->image('receipt.jpg');
        $field = fn (string $type, string $text, ?string $currency = null) => array_filter([
            'Type' => ['Text' => $type, 'Confidence' => 99],
            'ValueDetection' => ['Text' => $text, 'Confidence' => 96.5],
            'Currency' => $currency ? ['Code' => $currency, 'Confidence' => 99] : null,
        ]);
        $handler = new MockHandler;
        $handler->append(new Result([
            'ExpenseDocuments' => [[
                'SummaryFields' => [
                    $field('VENDOR_NAME', 'Depot 12'),
                    $field('INVOICE_RECEIPT_ID', 'R-9001'),
                    $field('INVOICE_RECEIPT_DATE', '20/06/2026'),
                    $field('SUBTOTAL', '60,000'),
                    $field('TAX', '900'),
                    $field('TOTAL', '60,900 FCFA', 'XAF'),
                    $field('PAYMENT_METHOD', 'POS'),
                ],
                'LineItemGroups' => [[
                    'LineItems' => [[
                        'LineItemExpenseFields' => [
                            $field('ITEM', 'Cement'),
                            $field('QUANTITY', '10.5'),
                            $field('UNIT_PRICE', '5,800'),
                            $field('PRICE', '60,900'),
                        ],
                    ]],
                ]],
                'Blocks' => [
                    ['BlockType' => 'LINE', 'Text' => 'DEPOT 12'],
                    ['BlockType' => 'LINE', 'Text' => 'TOTAL 60,900 FCFA'],
                ],
            ]],
        ]));
        $client = new TextractClient([
            'version' => 'latest',
            'region' => 'us-east-1',
            'credentials' => ['key' => 'test-key', 'secret' => 'test-secret'],
            'handler' => $handler,
        ]);
        $scan = (new AmazonTextractReceiptScanner)->scan($receipt, $client);

        $scanner = Mockery::mock(AmazonTextractReceiptScanner::class);
        $scanner->shouldReceive('scan')->once()->andReturn($scan);
        $this->app->instance(AmazonTextractReceiptScanner::class, $scanner);
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('tools.expenses.scan-receipt'), [
                'receipt' => $receipt,
            ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJson([
                'text' => "DEPOT 12\nTOTAL 60,900 FCFA",
                'vendor' => 'Depot 12',
                'receipt_number' => 'R-9001',
                'purchase_date' => '2026-06-20',
                'subtotal' => 60000,
                'tax_amount' => 900,
                'total_amount' => 60900,
                'currency' => 'XAF',
                'payment_method' => 'POS',
                'items' => [[
                    'description' => 'Cement',
                    'quantity' => 10.5,
                    'unit_price' => 5800,
                    'total' => 60900,
                ]],
                'confidence' => 96.5,
            ]);
    }

    public function test_receipt_scanner_requires_amazon_textract_credentials(): void
    {
        config([
            'services.textract.key' => null,
            'services.textract.secret' => null,
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('tools.expenses.scan-receipt'), [
                'receipt' => UploadedFile::fake()->image('receipt.jpg'),
            ], ['Accept' => 'application/json'])
            ->assertStatus(503)
            ->assertJson([
                'message' => 'Amazon Textract is not configured yet.',
            ]);
    }

    public function test_receipt_scanner_rejects_non_image_files_for_direct_textract_scan(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->withHeaders(['Accept' => 'application/json'])
            ->post(route('tools.expenses.scan-receipt'), [
                'receipt' => UploadedFile::fake()->create('receipt.txt', 100, 'text/plain'),
            ])
            ->assertUnprocessable()
            ->assertJsonPath(
                'errors.receipt.0',
                'Use a JPG or PNG receipt image. PDF/TIFF receipts need an S3-based Textract flow.',
            );
    }
}
