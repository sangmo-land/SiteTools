import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Calculator,
    CalendarDays,
    ClipboardList,
    FolderKanban,
    ReceiptText,
    TrendingUp,
    WalletCards,
} from 'lucide-react';

const formatMoney = (value) =>
    new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 0,
    }).format(Number(value || 0));

const statusLabels = {
    planning: 'Planning',
    active: 'Active',
    on_hold: 'On hold',
    completed: 'Completed',
    paid: 'Paid',
    pending: 'Pending',
    reconciled: 'Reconciled',
};

export default function Dashboard({
    stats,
    recentExpenses,
    categoryTotals,
    monthlyTrend,
    projects,
}) {
    const maxMonth = Math.max(...monthlyTrend.map((month) => month.total), 1);
    const maxCategory = Math.max(
        ...categoryTotals.map((category) => category.total),
        1,
    );

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-sm font-medium text-emerald-700">
                            Site command center
                        </p>
                        <h1 className="mt-1 text-2xl font-semibold text-zinc-950">
                            Dashboard
                        </h1>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href={route('tools.expenses')}
                            className="inline-flex items-center gap-2 rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                        >
                            <ReceiptText className="h-4 w-4" />
                            Add expense
                        </Link>
                        <Link
                            href={route('tools.calculators')}
                            className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                        >
                            <Calculator className="h-4 w-4" />
                            Calculators
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title="Dashboard" />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Total spend"
                    value={formatMoney(stats.totalSpent)}
                    icon={WalletCards}
                    accent="emerald"
                />
                <StatCard
                    label="This month"
                    value={formatMoney(stats.monthSpent)}
                    icon={CalendarDays}
                    accent="cyan"
                />
                <StatCard
                    label="Open projects"
                    value={stats.openProjectCount}
                    icon={FolderKanban}
                    accent="amber"
                />
                <StatCard
                    label="Receipts saved"
                    value={stats.receiptCount}
                    icon={ClipboardList}
                    accent="rose"
                />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
                <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-base font-semibold text-zinc-950">
                                Spend trend
                            </h2>
                            <p className="mt-1 text-sm text-zinc-500">
                                Last six months
                            </p>
                        </div>
                        <TrendingUp className="h-5 w-5 text-emerald-700" />
                    </div>
                    <div className="mt-6 grid h-56 grid-cols-6 items-end gap-3">
                        {monthlyTrend.map((month) => (
                            <div
                                key={month.label}
                                className="flex h-full flex-col justify-end gap-2"
                            >
                                <div className="flex flex-1 items-end rounded-md bg-zinc-100">
                                    <div
                                        className="w-full rounded-md bg-emerald-600"
                                        style={{
                                            height: `${Math.max((month.total / maxMonth) * 100, month.total ? 8 : 2)}%`,
                                        }}
                                    />
                                </div>
                                <div className="min-h-10 text-center">
                                    <p className="text-xs font-medium text-zinc-700">
                                        {month.label.split(' ')[0]}
                                    </p>
                                    <p className="text-[11px] text-zinc-500">
                                        {formatMoney(month.total)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-semibold text-zinc-950">
                                Category mix
                            </h2>
                            <p className="mt-1 text-sm text-zinc-500">
                                Top material groups
                            </p>
                        </div>
                        <ReceiptText className="h-5 w-5 text-cyan-700" />
                    </div>
                    <div className="mt-5 space-y-4">
                        {categoryTotals.length ? (
                            categoryTotals.map((category) => (
                                <div key={category.category}>
                                    <div className="flex items-center justify-between gap-3 text-sm">
                                        <span className="font-medium text-zinc-800">
                                            {category.category}
                                        </span>
                                        <span className="text-zinc-500">
                                            {formatMoney(category.total)}
                                        </span>
                                    </div>
                                    <div className="mt-2 h-2 rounded-md bg-zinc-100">
                                        <div
                                            className="h-2 rounded-md bg-cyan-600"
                                            style={{
                                                width: `${Math.max((category.total / maxCategory) * 100, 5)}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <EmptyState text="No category spending yet." />
                        )}
                    </div>
                </section>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-semibold text-zinc-950">
                                Project budgets
                            </h2>
                            <p className="mt-1 text-sm text-zinc-500">
                                Active site cost position
                            </p>
                        </div>
                        <FolderKanban className="h-5 w-5 text-amber-700" />
                    </div>
                    <div className="mt-5 space-y-4">
                        {projects.length ? (
                            projects.map((project) => {
                                const hasBudget = project.budget > 0;
                                const progress = hasBudget
                                    ? Math.min(
                                          100,
                                          (project.spent / project.budget) *
                                              100,
                                      )
                                    : 0;

                                return (
                                    <div
                                        key={project.id}
                                        className="rounded-lg border border-zinc-200 p-4"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <h3 className="font-semibold text-zinc-950">
                                                    {project.name}
                                                </h3>
                                                <p className="mt-1 text-sm text-zinc-500">
                                                    {project.location ||
                                                        'No location'}
                                                </p>
                                            </div>
                                            <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                                                {statusLabels[
                                                    project.status
                                                ] || project.status}
                                            </span>
                                        </div>
                                        <div className="mt-4 flex items-center justify-between text-sm">
                                            <span className="text-zinc-500">
                                                {project.expenseCount} expenses
                                            </span>
                                            <span className="font-semibold text-zinc-900">
                                                {formatMoney(project.spent)}
                                            </span>
                                        </div>
                                        <div className="mt-3 h-2 rounded-md bg-zinc-100">
                                            <div
                                                className="h-2 rounded-md bg-amber-500"
                                                style={{
                                                    width: `${hasBudget ? Math.max(progress, 3) : 0}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <EmptyState text="Create a project from the expense tracker." />
                        )}
                    </div>
                </section>

                <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-semibold text-zinc-950">
                                Recent purchases
                            </h2>
                            <p className="mt-1 text-sm text-zinc-500">
                                Latest site material entries
                            </p>
                        </div>
                        <Link
                            href={route('tools.expenses')}
                            className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                        >
                            Open
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                    <div className="mt-5 overflow-hidden rounded-lg border border-zinc-200">
                        {recentExpenses.length ? (
                            <div className="divide-y divide-zinc-200">
                                {recentExpenses.map((expense) => (
                                    <div
                                        key={expense.id}
                                        className="grid gap-3 p-4 sm:grid-cols-[1fr_auto]"
                                    >
                                        <div>
                                            <p className="font-semibold text-zinc-950">
                                                {expense.title}
                                            </p>
                                            <p className="mt-1 text-sm text-zinc-500">
                                                {expense.vendor || 'No vendor'}{' '}
                                                {expense.project
                                                    ? `- ${expense.project.name}`
                                                    : ''}
                                            </p>
                                        </div>
                                        <div className="sm:text-right">
                                            <p className="font-semibold text-zinc-950">
                                                {formatMoney(
                                                    expense.totalAmount,
                                                )}
                                            </p>
                                            <p className="mt-1 text-sm text-zinc-500">
                                                {expense.purchaseDate}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState text="No expenses recorded yet." />
                        )}
                    </div>
                </section>
            </div>
        </AuthenticatedLayout>
    );
}

function StatCard({ label, value, icon: Icon, accent }) {
    const colorMap = {
        emerald: 'bg-emerald-50 text-emerald-700',
        cyan: 'bg-cyan-50 text-cyan-700',
        amber: 'bg-amber-50 text-amber-700',
        rose: 'bg-rose-50 text-rose-700',
    };

    return (
        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-medium text-zinc-500">
                        {label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-zinc-950">
                        {value}
                    </p>
                </div>
                <span
                    className={`flex h-11 w-11 items-center justify-center rounded-md ${colorMap[accent]}`}
                >
                    <Icon className="h-5 w-5" />
                </span>
            </div>
        </section>
    );
}

function EmptyState({ text }) {
    return (
        <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
            {text}
        </div>
    );
}
