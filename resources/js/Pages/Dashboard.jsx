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
    new Intl.NumberFormat('fr-CM', {
        style: 'currency',
        currency: 'XAF',
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

const chartColors = [
    'bg-emerald-500',
    'bg-cyan-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-lime-500',
    'bg-sky-500',
];

const categoryColors = [
    'bg-emerald-500',
    'bg-cyan-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-lime-500',
    'bg-sky-500',
];

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
                            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                        >
                            <ReceiptText className="h-4 w-4" />
                            Add expense
                        </Link>
                        <Link
                            href={route('tools.calculators')}
                            className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
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

            <section className="panel-card lift-in mt-6 overflow-hidden rounded-lg p-0">
                <div className="grid gap-0 md:grid-cols-[1.2fr_0.8fr]">
                    <div className="bg-zinc-950 p-5 text-white">
                        <p className="text-sm font-semibold text-emerald-300">
                            Live site picture
                        </p>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-200">
                            Your spend, receipts, and project budgets now sit
                            on one colorful operations layer, so the page feels
                            closer to a control room than a static ledger.
                        </p>
                    </div>
                    <div className="soft-stripes grid grid-cols-3 gap-3 bg-emerald-600 p-5 text-white">
                        <MiniMetric label="Projects" value={stats.projectCount} />
                        <MiniMetric label="Open" value={stats.openProjectCount} />
                        <MiniMetric label="Receipts" value={stats.receiptCount} />
                    </div>
                </div>
            </section>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
                <section className="panel-card lift-in rounded-lg p-5">
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
                        {monthlyTrend.map((month, index) => (
                            <div
                                key={month.label}
                                className="flex h-full flex-col justify-end gap-2"
                                style={{ animationDelay: `${index * 60}ms` }}
                            >
                                <div className="flex flex-1 items-end rounded-md bg-zinc-100 p-1">
                                    <div
                                        className={`meter-fill w-full rounded-md ${chartColors[index % chartColors.length]}`}
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

                <section className="panel-card lift-in rounded-lg p-5">
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
                            categoryTotals.map((category, index) => (
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
                                            className={`meter-fill h-2 rounded-md ${categoryColors[index % categoryColors.length]}`}
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
                <section className="panel-card lift-in rounded-lg p-5">
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
                                        className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-amber-300 hover:bg-amber-50/40"
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
                                                className="meter-fill h-2 rounded-md bg-amber-500"
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

                <section className="panel-card lift-in rounded-lg p-5">
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
                                        className="grid gap-3 p-4 transition hover:bg-cyan-50/50 sm:grid-cols-[1fr_auto]"
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
        emerald: {
            card: 'border-emerald-200 bg-emerald-50/70',
            icon: 'bg-emerald-600 text-white shadow-emerald-700/20',
            line: 'bg-emerald-500',
        },
        cyan: {
            card: 'border-cyan-200 bg-cyan-50/70',
            icon: 'bg-cyan-600 text-white shadow-cyan-700/20',
            line: 'bg-cyan-500',
        },
        amber: {
            card: 'border-amber-200 bg-amber-50/70',
            icon: 'bg-amber-500 text-white shadow-amber-700/20',
            line: 'bg-amber-500',
        },
        rose: {
            card: 'border-rose-200 bg-rose-50/70',
            icon: 'bg-rose-500 text-white shadow-rose-700/20',
            line: 'bg-rose-500',
        },
    };
    const colors = colorMap[accent];

    return (
        <section
            className={`lift-in overflow-hidden rounded-lg border p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${colors.card}`}
        >
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-medium text-zinc-600">
                        {label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-zinc-950">
                        {value}
                    </p>
                </div>
                <span
                    className={`flex h-11 w-11 items-center justify-center rounded-md shadow-lg ${colors.icon}`}
                >
                    <Icon className="h-5 w-5" />
                </span>
            </div>
            <div className="mt-5 h-1 rounded-md bg-white/80">
                <div className="workline h-1 rounded-md" />
            </div>
        </section>
    );
}

function MiniMetric({ label, value }) {
    return (
        <div className="rounded-md border border-white/20 bg-white/15 p-3 backdrop-blur">
            <p className="text-xs font-medium text-white/75">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
    );
}

function EmptyState({ text }) {
    return (
        <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
            {text}
        </div>
    );
}
