<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ExpenseController extends Controller
{
    private const CATEGORIES = [
        'Cement & Concrete',
        'Blocks & Bricks',
        'Steel & Rebar',
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
            ->with('siteProject')
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
            'paymentMethods' => self::PAYMENT_METHODS,
            'statuses' => self::STATUSES,
            'filters' => $request->only(['search', 'category', 'project', 'status', 'from', 'to']),
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
        $data = $request->validate($this->rules($user));

        Expense::create($this->expenseAttributes($data, $request, $user));

        return back()->with('status', 'Expense recorded.');
    }

    public function update(Request $request, Expense $expense)
    {
        $user = $request->user();
        abort_unless($expense->user_id === $user->id, 404);

        $data = $request->validate($this->rules($user));

        $expense->update($this->expenseAttributes($data, $request, $user, $expense));

        return back()->with('status', 'Expense updated.');
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
                        ->orWhere('receipt_text', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('category'), fn (Builder $query) => $query->where('category', $request->string('category')->toString()))
            ->when($request->filled('project'), fn (Builder $query) => $query->where('site_project_id', $request->integer('project')))
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', $request->string('status')->toString()))
            ->when($request->filled('from'), fn (Builder $query) => $query->whereDate('purchase_date', '>=', $request->date('from')))
            ->when($request->filled('to'), fn (Builder $query) => $query->whereDate('purchase_date', '<=', $request->date('to')));
    }

    private function rules(User $user): array
    {
        return [
            'site_project_id' => [
                'nullable',
                Rule::exists('site_projects', 'id')->where(fn ($query) => $query->where('user_id', $user->id)),
            ],
            'title' => ['required', 'string', 'max:160'],
            'vendor' => ['nullable', 'string', 'max:160'],
            'category' => ['required', Rule::in(self::CATEGORIES)],
            'purchase_date' => ['required', 'date'],
            'quantity' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
            'unit' => ['nullable', 'string', 'max:30'],
            'unit_cost' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
            'total_amount' => ['nullable', 'numeric', 'min:0', 'max:999999999'],
            'payment_method' => ['required', Rule::in(self::PAYMENT_METHODS)],
            'status' => ['required', Rule::in(self::STATUSES)],
            'receipt' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:10240'],
            'receipt_text' => ['nullable', 'string', 'max:65000'],
            'receipt_confidence' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    private function expenseAttributes(array $data, Request $request, User $user, ?Expense $expense = null): array
    {
        $quantity = $this->nullableFloat($data['quantity'] ?? null);
        $unitCost = $this->nullableFloat($data['unit_cost'] ?? null);
        $total = $this->nullableFloat($data['total_amount'] ?? null);

        if ($total === null && $quantity !== null && $unitCost !== null) {
            $total = round($quantity * $unitCost, 2);
        }

        $attributes = [
            'user_id' => $user->id,
            'site_project_id' => $data['site_project_id'] ?? null,
            'title' => $data['title'],
            'vendor' => $data['vendor'] ?? null,
            'category' => $data['category'],
            'purchase_date' => $data['purchase_date'],
            'quantity' => $quantity,
            'unit' => $data['unit'] ?? null,
            'unit_cost' => $unitCost,
            'total_amount' => $total ?? 0,
            'payment_method' => $data['payment_method'],
            'status' => $data['status'],
            'receipt_text' => $data['receipt_text'] ?? null,
            'receipt_confidence' => $this->nullableFloat($data['receipt_confidence'] ?? null),
            'notes' => $data['notes'] ?? null,
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

    private function serializeExpense(Expense $expense): array
    {
        return [
            'id' => $expense->id,
            'title' => $expense->title,
            'vendor' => $expense->vendor,
            'category' => $expense->category,
            'purchaseDate' => $expense->purchase_date?->toDateString(),
            'quantity' => $expense->quantity !== null ? (float) $expense->quantity : null,
            'unit' => $expense->unit,
            'unitCost' => $expense->unit_cost !== null ? (float) $expense->unit_cost : null,
            'totalAmount' => (float) $expense->total_amount,
            'paymentMethod' => $expense->payment_method,
            'status' => $expense->status,
            'receiptUrl' => $expense->receipt_path ? asset('storage/'.$expense->receipt_path) : null,
            'receiptOriginalName' => $expense->receipt_original_name,
            'receiptText' => $expense->receipt_text,
            'receiptConfidence' => $expense->receipt_confidence !== null ? (float) $expense->receipt_confidence : null,
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
