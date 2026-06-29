<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\Material;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseController extends Controller
{
    public const CATEGORIES = [
        'Cement & Concrete',
        'Blocks & Bricks',
        'Steel & Rebar',
        'Aggregates',
        'Timber & Formwork',
        'Roofing',
        'Plumbing',
        'Electrical',
        'Paint & Finishes',
        'Tools & Equipment',
        'Transport',
        'Labour Support',
        'Other',
    ];

    private const PAYMENT_METHODS = [
        'Cash',
        'POS',
        'Bank transfer',
        'Mobile money',
        'Credit',
        'Cheque',
    ];

    private const STATUSES = ['paid', 'pending', 'reconciled'];

    public function index(Request $request): Response
    {
        $user = $request->user();
        $summaryQuery = $this->filteredExpenseQuery($request, $user);

        $expenses = $this->filteredExpenseQuery($request, $user)
            ->with(['material', 'siteProject'])
            ->latest('purchase_date')
            ->latest()
            ->paginate(12)
            ->withQueryString()
            ->through(fn (Expense $expense) => $this->serializeExpense($expense));

        return Inertia::render('Tools/Expenses', [
            'expenses' => $expenses,
            'projects' => $user->siteProjects()
                ->orderBy('name')
                ->get()
                ->map(fn ($project) => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'location' => $project->location,
                    'budget' => (float) ($project->budget ?? 0),
                    'status' => $project->status,
                ]),
            'categories' => self::CATEGORIES,
            'materials' => Material::query()
                ->where('is_active', true)
                ->orderBy('category')
                ->orderBy('name')
                ->get()
                ->map(fn (Material $material) => [
                    'id' => $material->id,
                    'name' => $material->name,
                    'category' => $material->category,
                    'unit' => $material->unit,
                    'defaultUnitPrice' => (float) $material->default_unit_price,
                ]),
            'paymentMethods' => self::PAYMENT_METHODS,
            'statuses' => self::STATUSES,
            'filters' => $request->only(['search', 'category', 'material', 'project', 'status', 'from', 'to']),
            'summary' => [
                'total' => (float) (clone $summaryQuery)->sum('total_amount'),
                'count' => (clone $summaryQuery)->count(),
                'average' => (float) ((clone $summaryQuery)->avg('total_amount') ?? 0),
                'withReceipts' => (clone $summaryQuery)->whereNotNull('receipt_path')->count(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $data = $request->validate($this->purchaseRules($user));

        Expense::create($this->purchaseAttributes($data, $request, $user));

        return back()->with('status', 'Purchase recorded.');
    }

    public function storeReceipt(Request $request)
    {
        $data = $request->validate(array_merge($this->receiptOcrRules(), [
            'receipt' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf,tif,tiff', 'max:10240'],
            'vendor' => ['nullable', 'string', 'max:160'],
            'purchase_date' => ['nullable', 'date'],
            'total_amount' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
        ]));
        $user = $request->user();
        $file = $data['receipt'];
        $vendor = $data['vendor'] ?? null;

        Expense::create([
            'user_id' => $user->id,
            'entry_type' => 'receipt',
            'title' => $vendor ? "Receipt - {$vendor}" : 'Receipt only',
            'vendor' => $vendor,
            'category' => 'Other',
            'purchase_date' => $data['purchase_date'] ?? now()->toDateString(),
            'total_amount' => $this->nullableFloat($data['total_amount'] ?? null) ?? 0,
            'payment_method' => $data['receipt_payment_method'] ?? 'Not provided',
            'status' => 'pending',
            'receipt_path' => $file->store("receipts/{$user->id}", 'public'),
            'receipt_original_name' => $file->getClientOriginalName(),
            'receipt_number' => $data['receipt_number'] ?? null,
            'receipt_currency' => $data['receipt_currency'] ?? null,
            'receipt_subtotal' => $this->nullableFloat($data['receipt_subtotal'] ?? null),
            'receipt_tax_amount' => $this->nullableFloat($data['receipt_tax_amount'] ?? null),
            'receipt_items' => $data['receipt_items'] ?? [],
            'receipt_text' => $data['receipt_text'] ?? null,
            'receipt_confidence' => $this->nullableFloat($data['receipt_confidence'] ?? null),
        ]);

        return back()->with('status', 'Receipt uploaded.');
    }

    public function showReceipt(Request $request, Expense $expense)
    {
        abort_unless($expense->user_id === $request->user()->id, 404);

        $disk = Storage::disk('public');

        abort_unless($expense->receipt_path && $disk->exists($expense->receipt_path), 404);

        return $disk->response(
            $expense->receipt_path,
            $expense->receipt_original_name,
        );
    }

    public function update(Request $request, Expense $expense)
    {
        $user = $request->user();
        abort_unless($expense->user_id === $user->id, 404);

        $data = $request->validate($this->purchaseRules($user));

        $expense->update($this->purchaseAttributes($data, $request, $user, $expense));

        return back()->with('status', 'Purchase updated.');
    }

    public function destroy(Request $request, Expense $expense)
    {
        abort_unless($expense->user_id === $request->user()->id, 404);

        if ($expense->receipt_path) {
            Storage::disk('public')->delete($expense->receipt_path);
        }

        $expense->delete();

        return back()->with('status', 'Expense deleted.');
    }

    private function filteredExpenseQuery(Request $request, User $user): Builder
    {
        return Expense::query()
            ->where('user_id', $user->id)
            ->when($request->filled('search'), function (Builder $query) use ($request) {
                $search = $request->string('search')->toString();

                $query->where(function (Builder $query) use ($search) {
                    $query->where('title', 'like', "%{$search}%")
                        ->orWhere('vendor', 'like', "%{$search}%")
                        ->orWhere('notes', 'like', "%{$search}%")
                        ->orWhere('receipt_text', 'like', "%{$search}%")
                        ->orWhere('receipt_original_name', 'like', "%{$search}%")
                        ->orWhereHas('material', fn (Builder $query) => $query->where('name', 'like', "%{$search}%"));
                });
            })
            ->when($request->filled('category'), fn (Builder $query) => $query->where('category', $request->string('category')->toString()))
            ->when($request->filled('material'), fn (Builder $query) => $query->where('material_id', $request->integer('material')))
            ->when($request->filled('project'), fn (Builder $query) => $query->where('site_project_id', $request->integer('project')))
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', $request->string('status')->toString()))
            ->when($request->filled('from'), fn (Builder $query) => $query->whereDate('purchase_date', '>=', $request->date('from')))
            ->when($request->filled('to'), fn (Builder $query) => $query->whereDate('purchase_date', '<=', $request->date('to')));
    }

    private function purchaseRules(User $user): array
    {
        return [
            'site_project_id' => [
                'nullable',
                Rule::exists('site_projects', 'id')->where(fn ($query) => $query->where('user_id', $user->id)),
            ],
            'vendor' => ['nullable', 'string', 'max:160'],
            'purchase_date' => ['required', 'date'],
            'payment_method' => ['required', Rule::in(self::PAYMENT_METHODS)],
            'status' => ['required', Rule::in(self::STATUSES)],
            'receipt' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf,tif,tiff', 'max:10240'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.material_id' => [
                'nullable',
                Rule::exists('materials', 'id')->where(fn ($query) => $query->where('is_active', true)),
            ],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.category' => ['required', Rule::in(self::CATEGORIES)],
            'items.*.unit' => ['nullable', 'string', 'max:30'],
            'items.*.quantity' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
            'items.*.unit_price' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
            'items.*.total' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
            ...$this->receiptOcrRules(),
        ];
    }

    private function receiptOcrRules(): array
    {
        return [
            'receipt_number' => ['nullable', 'string', 'max:100'],
            'receipt_currency' => ['nullable', 'string', 'max:10'],
            'receipt_subtotal' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
            'receipt_tax_amount' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
            'receipt_payment_method' => ['nullable', 'string', 'max:50'],
            'receipt_items' => ['nullable', 'array', 'max:200'],
            'receipt_items.*.description' => ['required', 'string', 'max:255'],
            'receipt_items.*.quantity' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
            'receipt_items.*.unit_price' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
            'receipt_items.*.total' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
            'receipt_items.*.material_id' => ['nullable', 'integer'],
            'receipt_items.*.material_name' => ['nullable', 'string', 'max:160'],
            'receipt_items.*.canonical_name' => ['nullable', 'string', 'max:255'],
            'receipt_items.*.normalized_unit' => ['nullable', 'string', 'max:30'],
            'receipt_items.*.match_confidence' => ['nullable', 'numeric', 'min:0', 'max:1'],
            'receipt_text' => ['nullable', 'string', 'max:65000'],
            'receipt_confidence' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ];
    }

    private function purchaseAttributes(array $data, Request $request, User $user, ?Expense $expense = null): array
    {
        $lineItems = array_map($this->normalizeItem(...), $data['items']);
        $total = array_sum(array_column($lineItems, 'total'));

        $first = $lineItems[0];
        $single = count($lineItems) === 1;
        $extra = count($lineItems) - 1;

        $attributes = [
            'user_id' => $user->id,
            'entry_type' => 'expense',
            'site_project_id' => $data['site_project_id'] ?? null,
            'material_id' => $single ? $first['material_id'] : null,
            'title' => $single ? $first['description'] : "{$first['description']} +{$extra} more",
            'vendor' => $data['vendor'] ?? null,
            'category' => $first['category'],
            'purchase_date' => $data['purchase_date'],
            'quantity' => $single ? $first['quantity'] : null,
            'unit' => $single ? $first['unit'] : null,
            'unit_cost' => $single ? $first['unit_price'] : null,
            'total_amount' => round($total, 2),
            'payment_method' => $data['payment_method'],
            'status' => $data['status'],
            'line_items' => $lineItems,
            'notes' => $data['notes'] ?? null,
            'receipt_text' => $data['receipt_text'] ?? null,
            'receipt_confidence' => $this->nullableFloat($data['receipt_confidence'] ?? null),
            'receipt_number' => $data['receipt_number'] ?? null,
            'receipt_currency' => $data['receipt_currency'] ?? null,
            'receipt_subtotal' => $this->nullableFloat($data['receipt_subtotal'] ?? null),
            'receipt_tax_amount' => $this->nullableFloat($data['receipt_tax_amount'] ?? null),
            'receipt_items' => $data['receipt_items'] ?? [],
        ];

        if ($request->hasFile('receipt')) {
            if ($expense?->receipt_path) {
                Storage::disk('public')->delete($expense->receipt_path);
            }

            $file = $request->file('receipt');
            $attributes['receipt_path'] = $file->store("receipts/{$user->id}", 'public');
            $attributes['receipt_original_name'] = $file->getClientOriginalName();
        }

        return $attributes;
    }

    /**
     * Normalise one submitted line item, resolving its catalogue material
     * (existing or brand new) and computing the line total.
     *
     * @param  array<string, mixed>  $raw
     * @return array<string, mixed>
     */
    private function normalizeItem(array $raw): array
    {
        $material = $this->resolveMaterial($raw);
        $quantity = $this->nullableFloat($raw['quantity'] ?? null);
        $unitPrice = $this->nullableFloat($raw['unit_price'] ?? null)
            ?? ($material ? (float) $material->default_unit_price : null);
        $total = $this->nullableFloat($raw['total'] ?? null);

        if ($total === null) {
            $total = $quantity !== null && $unitPrice !== null
                ? round($quantity * $unitPrice, 2)
                : ($unitPrice ?? 0.0);
        }

        return [
            'material_id' => $material?->id,
            'material_name' => $material?->name,
            'description' => trim((string) $raw['description']),
            'category' => $raw['category'],
            'quantity' => $quantity,
            'unit' => $raw['unit'] ?? $material?->unit,
            'unit_price' => $unitPrice,
            'total' => (float) $total,
        ];
    }

    /**
     * Find the catalogue material an item refers to. A brand-new item (no
     * material_id) is added to the catalogue by name so it can be reused on
     * later purchases.
     *
     * @param  array<string, mixed>  $raw
     */
    private function resolveMaterial(array $raw): ?Material
    {
        if (! empty($raw['material_id'])) {
            return Material::find($raw['material_id']);
        }

        $name = trim((string) ($raw['description'] ?? ''));

        if ($name === '') {
            return null;
        }

        return Material::firstOrCreate(
            ['name' => $name],
            [
                'category' => $raw['category'] ?? 'Other',
                'unit' => $raw['unit'] ?? 'unit',
                'default_unit_price' => $this->nullableFloat($raw['unit_price'] ?? null) ?? 0,
                'is_active' => true,
            ],
        );
    }

    private function serializeExpense(Expense $expense): array
    {
        return [
            'id' => $expense->id,
            'entryType' => $expense->entry_type,
            'title' => $expense->title,
            'material' => $expense->material ? [
                'id' => $expense->material->id,
                'name' => $expense->material->name,
                'category' => $expense->material->category,
                'unit' => $expense->material->unit,
                'defaultUnitPrice' => (float) $expense->material->default_unit_price,
            ] : null,
            'vendor' => $expense->vendor,
            'category' => $expense->category,
            'purchaseDate' => $expense->purchase_date?->toDateString(),
            'quantity' => $expense->quantity !== null ? (float) $expense->quantity : null,
            'unit' => $expense->unit,
            'unitCost' => $expense->unit_cost !== null ? (float) $expense->unit_cost : null,
            'totalAmount' => (float) $expense->total_amount,
            'paymentMethod' => $expense->payment_method,
            'status' => $expense->status,
            'receiptUrl' => $expense->receipt_path ? route('tools.receipts.show', $expense->id, false) : null,
            'receiptOriginalName' => $expense->receipt_original_name,
            'receiptText' => $expense->receipt_text,
            'receiptConfidence' => $expense->receipt_confidence !== null ? (float) $expense->receipt_confidence : null,
            'receiptNumber' => $expense->receipt_number,
            'receiptCurrency' => $expense->receipt_currency,
            'receiptSubtotal' => $expense->receipt_subtotal !== null ? (float) $expense->receipt_subtotal : null,
            'receiptTaxAmount' => $expense->receipt_tax_amount !== null ? (float) $expense->receipt_tax_amount : null,
            'receiptItems' => $expense->receipt_items ?? [],
            'lineItems' => array_map(static fn (array $item): array => [
                'description' => $item['description'] ?? null,
                'materialName' => $item['material_name'] ?? null,
                'category' => $item['category'] ?? null,
                'quantity' => isset($item['quantity']) ? (float) $item['quantity'] : null,
                'unit' => $item['unit'] ?? null,
                'unitPrice' => isset($item['unit_price']) ? (float) $item['unit_price'] : null,
                'total' => isset($item['total']) ? (float) $item['total'] : null,
            ], array_filter($expense->line_items ?? [], 'is_array')),
            'notes' => $expense->notes,
            'project' => $expense->siteProject ? [
                'id' => $expense->siteProject->id,
                'name' => $expense->siteProject->name,
            ] : null,
        ];
    }

    private function nullableFloat(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (float) $value;
    }
}
