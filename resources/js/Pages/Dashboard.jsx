import AuthenticatedLayout, { PageHeader } from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    ArrowUpRight,
    Calculator,
    CalendarDays,
    ClipboardList,
    FolderKanban,
    Package,
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

const statusStyles = {
    active: 'bg-brand-50 text-brand-700 ring-brand-600/20',
    planning: 'bg-sky-50 text-sky-700 ring-sky-600/20',
    on_hold: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    completed: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

const barColors = [
    'from-brand-500 to-brand-400',
    'from-sky-500 to-sky-400',
    'from-amber-500 to-amber-400',
    'from-violet-500 to-violet-400',
    'from-rose-500 to-rose-400',
    'from-emerald-500 to-emerald-400',
];

const dotColors = [
    'bg-brand-500',
    'bg-sky-500',
    'bg-amber-500',
    'bg-violet-500',
    'bg-rose-500',
    'bg-emerald-500',
];

export default function Dashboard({
    stats,
    recentExpenses,
    categoryTotals,
    monthlyTrend,
    projects,
}) {
    const maxMonth = Math.max(...monthlyTrend.map((m) => m.total), 1);
    const maxCategory = Math.max(...categoryTotals.map((c) => c.total), 1);
    const categoryGrandTotal = categoryTotals.reduce(
        (sum, c) => sum + c.total,
        0,
    );

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    eyebrow="Site command center"
                    title="Dashboard"
                    actions={
                        <>
                            <Link
                                href={route('tools.calculators')}
                                className="btn btn-secondary"
                            >
                                <Calculator className="h-4 w-4" />
                                Calculators
                            </Link>
                            <Link
                                href={route('tools.expenses')}
                                className="btn btn-primary"
                            >
                                <ReceiptText className="h-4 w-4" />
                                Add expense
                            </Link>
                        </>
                    }
                />
            }
        >
            <Head title="Dashboard" />

            {/* Stat cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Total spend"
                    value={formatMoney(stats.totalSpent)}
                    icon={WalletCards}
                    accent="brand"
                    delay="anim-delay-1"
                />
                <StatCard
                    label="This month"
                    value={formatMoney(stats.monthSpent)}
                    icon={CalendarDays}
                    accent="sky"
                    delay="anim-delay-2"
                />
                <StatCard
                    label="Open projects"
                    value={stats.openProjectCount}
                    sub={`${stats.projectCount} total`}
                    icon={FolderKanban}
                    accent="amber"
                    delay="anim-delay-3"
                />
                <StatCard
                    label="Receipts saved"
                    value={stats.receiptCount}
                    icon={ClipboardList}
                    accent="violet"
                    delay="anim-delay-4"
                />
            </div>

            {/* Charts row */}
            <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                <section className="card fade-up p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-base font-bold text-ink">
                                Spend trend
                            </h2>
                            <p className="mt-0.5 text-sm text-slate-500">
                                Last six months
                            </p>
                        </div>
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                            <TrendingUp className="h-[18px] w-[18px]" />
                        </span>
                    </div>
                    <div className="mt-6 grid grid-cols-6 items-end gap-2 sm:gap-3">
                        {monthlyTrend.map((month, index) => (
                            <div
                                key={month.label}
                                className="flex flex-col items-center gap-2"
                            >
                                <div className="flex h-44 w-full items-end">
                                    <div className="meter-track flex w-full items-end !rounded-lg bg-slate-100">
                                        <div
                                            className={`w-full rounded-lg bg-gradient-to-t ${barColors[index % barColors.length]} transition-all`}
                                            style={{
                                                height: `${Math.max((month.total / maxMonth) * 100, month.total ? 6 : 2)}%`,
                                                minHeight: '4px',
                                            }}
                                            title={formatMoney(month.total)}
                                        />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-semibold text-slate-700">
                                        {month.label.split(' ')[0]}
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                        {compactMoney(month.total)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="card fade-up anim-delay-1 p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-base font-bold text-ink">
                                Category mix
                            </h2>
                            <p className="mt-0.5 text-sm text-slate-500">
                                Top material groups
                            </p>
                        </div>
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                            <Package className="h-[18px] w-[18px]" />
                        </span>
                    </div>
                    <div className="mt-5 space-y-3.5">
                        {categoryTotals.length ? (
                            categoryTotals.map((category, index) => (
                                <div key={category.category}>
                                    <div className="flex items-center justify-between gap-3 text-sm">
                                        <span className="flex items-center gap-2 truncate font-medium text-slate-700">
                                            <span
                                                className={`h-2 w-2 shrink-0 rounded-full ${dotColors[index % dotColors.length]}`}
                                            />
                                            <span className="truncate">
                                                {category.category}
                                            </span>
                                        </span>
                                        <span className="shrink-0 text-xs font-semibold text-slate-500">
                                            {category.total
                                                ? Math.round(
                                                      (category.total /
                                                          (categoryGrandTotal ||
                                                              1)) *
                                                          100,
                                                  )
                                                : 0}
                                            %
                                        </span>
                                    </div>
                                    <div className="meter-track mt-2 h-2">
                                        <div
                                            className={`meter-fill h-2 rounded-full ${dotColors[index % dotColors.length]}`}
                                            style={{
                                                width: `${Math.max((category.total / maxCategory) * 100, 4)}%`,
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

            {/* Projects + recent */}
            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
                <section className="card fade-up p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-bold text-ink">
                                Project budgets
                            </h2>
                            <p className="mt-0.5 text-sm text-slate-500">
                                Active site cost position
                            </p>
                        </div>
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                            <FolderKanban className="h-[18px] w-[18px]" />
                        </span>
                    </div>
                    <div className="mt-4 space-y-3">
                        {projects.length ? (
                            projects.map((project) => {
                                const hasBudget = project.budget > 0;
                                const progress = hasBudget
                                    ? Math.min(
                                          100,
                                          (project.spent / project.budget) * 100,
                                      )
                                    : 0;
                                const over = hasBudget && progress >= 100;

                                return (
                                    <div
                                        key={project.id}
                                        className="rounded-xl border hairline bg-white p-4 transition hover:border-brand-300 hover:shadow-sm"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h3 className="truncate font-semibold text-ink">
                                                    {project.name}
                                                </h3>
                                                <p className="mt-0.5 truncate text-xs text-slate-500">
                                                    {project.location ||
                                                        'No location'}{' '}
                                                    · {project.expenseCount}{' '}
                                                    expenses
                                                </p>
                                            </div>
                                            <span
                                                className={`badge shrink-0 ring-1 ring-inset ${statusStyles[project.status] || 'bg-slate-100 text-slate-600 ring-slate-500/20'}`}
                                            >
                                                {statusLabels[project.status] ||
                                                    project.status}
                                            </span>
                                        </div>
                                        <div className="mt-3 flex items-center justify-between text-sm">
                                            <span className="font-semibold text-ink">
                                                {formatMoney(project.spent)}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {hasBudget
                                                    ? `of ${formatMoney(project.budget)}`
                                                    : 'No budget set'}
                                            </span>
                                        </div>
                                        <div className="meter-track mt-2 h-1.5">
                                            <div
                                                className={`meter-fill h-1.5 rounded-full ${over ? 'bg-rose-500' : 'bg-amber-500'}`}
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

                <section className="card fade-up anim-delay-1 overflow-hidden">
                    <div className="flex items-center justify-between gap-3 border-b hairline p-5 sm:px-6">
                        <div>
                            <h2 className="text-base font-bold text-ink">
                                Recent purchases
                            </h2>
                            <p className="mt-0.5 text-sm text-slate-500">
                                Latest site material entries
                            </p>
                        </div>
                        <Link
                            href={route('tools.expenses')}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
                        >
                            View all
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                    <div className="divide-y hairline">
                        {recentExpenses.length ? (
                            recentExpenses.map((expense) => (
                                <div
                                    key={expense.id}
                                    className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50/70 sm:px-6"
                                >
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                        <ReceiptText className="h-4 w-4" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-ink">
                                            {expense.title}
                                        </p>
                                        <p className="truncate text-xs text-slate-500">
                                            {expense.vendor || 'No vendor'}
                                            {expense.project
                                                ? ` · ${expense.project.name}`
                                                : ''}
                                        </p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="text-sm font-semibold text-ink">
                                            {formatMoney(expense.totalAmount)}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {expense.purchaseDate}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-6">
                                <EmptyState text="No expenses recorded yet." />
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Quick actions */}
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <QuickAction
                    href={route('tools.expenses')}
                    title="Record a purchase"
                    text="Log materials and attach a receipt"
                    icon={ReceiptText}
                    accent="brand"
                />
                <QuickAction
                    href={route('tools.expenses')}
                    title="Scan a receipt"
                    text="Let AI extract the line items"
                    icon={ClipboardList}
                    accent="sky"
                />
                <QuickAction
                    href={route('tools.calculators')}
                    title="Run a calculator"
                    text="Concrete, blocks, paint & units"
                    icon={Calculator}
                    accent="amber"
                />
            </div>
        </AuthenticatedLayout>
    );
}

function StatCard({ label, value, sub, icon: Icon, accent, delay = '' }) {
    const accents = {
        brand: 'bg-brand-50 text-brand-600',
        sky: 'bg-sky-50 text-sky-600',
        amber: 'bg-amber-50 text-amber-600',
        violet: 'bg-violet-50 text-violet-600',
    };

    return (
        <section className={`card card-hover fade-up ${delay} p-5`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="eyebrow">{label}</p>
                    <p className="mt-2 truncate text-2xl font-bold text-ink">
                        {value}
                    </p>
                    {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
                </div>
                <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accents[accent]}`}
                >
                    <Icon className="h-5 w-5" />
                </span>
            </div>
        </section>
    );
}

function QuickAction({ href, title, text, icon: Icon, accent }) {
    const accents = {
        brand: 'bg-brand-50 text-brand-600',
        sky: 'bg-sky-50 text-sky-600',
        amber: 'bg-amber-50 text-amber-600',
    };

    return (
        <Link
            href={href}
            className="card card-hover group flex items-center gap-4 p-4"
        >
            <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accents[accent]}`}
            >
                <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{title}</p>
                <p className="truncate text-xs text-slate-500">{text}</p>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-brand-500" />
        </Link>
    );
}

function EmptyState({ text }) {
    return (
        <div className="rounded-xl border border-dashed hairline p-6 text-center text-sm text-slate-500">
            {text}
        </div>
    );
}

function compactMoney(value) {
    const n = Number(value || 0);
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
    return String(n);
}
