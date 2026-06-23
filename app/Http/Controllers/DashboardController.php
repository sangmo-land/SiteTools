<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $expenseBase = Expense::query()->where('user_id', $user->id);
        $monthStart = now()->startOfMonth()->toDateString();
        $monthEnd = now()->endOfMonth()->toDateString();

        $totalSpent = (float) (clone $expenseBase)->sum('total_amount');
        $monthSpent = (float) (clone $expenseBase)
            ->whereBetween('purchase_date', [$monthStart, $monthEnd])
            ->sum('total_amount');

        $recentMonths = collect(range(5, 0))->map(fn (int $offset) => now()->subMonths($offset)->startOfMonth());
        $monthlyRows = (clone $expenseBase)
            ->where('purchase_date', '>=', $recentMonths->first()->toDateString())
            ->get(['purchase_date', 'total_amount']);

        return Inertia::render('Dashboard', [
            'stats' => [
                'totalSpent' => $totalSpent,
                'monthSpent' => $monthSpent,
                'projectCount' => $user->siteProjects()->count(),
                'receiptCount' => (clone $expenseBase)->whereNotNull('receipt_path')->count(),
                'openProjectCount' => $user->siteProjects()->whereIn('status', ['planning', 'active', 'on_hold'])->count(),
            ],
            'recentExpenses' => (clone $expenseBase)
                ->with('siteProject')
                ->latest('purchase_date')
                ->latest()
                ->limit(7)
                ->get()
                ->map(fn (Expense $expense) => $this->serializeExpense($expense)),
            'categoryTotals' => (clone $expenseBase)
                ->select('category', DB::raw('SUM(total_amount) as total'))
                ->groupBy('category')
                ->orderByDesc('total')
                ->limit(6)
                ->get()
                ->map(fn ($row) => [
                    'category' => $row->category,
                    'total' => (float) $row->total,
                ]),
            'monthlyTrend' => $this->monthlyTrend($recentMonths, $monthlyRows),
            'projects' => $user->siteProjects()
                ->withCount('expenses')
                ->withSum('expenses', 'total_amount')
                ->latest('updated_at')
                ->limit(5)
                ->get()
                ->map(fn ($project) => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'location' => $project->location,
                    'status' => $project->status,
                    'budget' => (float) ($project->budget ?? 0),
                    'spent' => (float) ($project->expenses_sum_total_amount ?? 0),
                    'expenseCount' => $project->expenses_count,
                ]),
            'toolHighlights' => [
                ['name' => 'Expense Tracker', 'route' => 'tools.expenses', 'accent' => 'emerald'],
                ['name' => 'Receipt Scanner', 'route' => 'tools.expenses', 'accent' => 'cyan'],
                ['name' => 'Site Calculators', 'route' => 'tools.calculators', 'accent' => 'amber'],
            ],
        ]);
    }

    private function serializeExpense(Expense $expense): array
    {
        return [
            'id' => $expense->id,
            'title' => $expense->title,
            'vendor' => $expense->vendor,
            'category' => $expense->category,
            'purchaseDate' => $expense->purchase_date?->toDateString(),
            'totalAmount' => (float) $expense->total_amount,
            'paymentMethod' => $expense->payment_method,
            'status' => $expense->status,
            'project' => $expense->siteProject ? [
                'id' => $expense->siteProject->id,
                'name' => $expense->siteProject->name,
            ] : null,
        ];
    }

    private function monthlyTrend(Collection $months, Collection $rows): Collection
    {
        $totals = $rows->groupBy(fn (Expense $expense) => $expense->purchase_date?->format('Y-m'))
            ->map(fn (Collection $monthRows) => (float) $monthRows->sum('total_amount'));

        return $months->map(fn ($month) => [
            'label' => $month->format('M Y'),
            'total' => (float) ($totals[$month->format('Y-m')] ?? 0),
        ]);
    }
}
