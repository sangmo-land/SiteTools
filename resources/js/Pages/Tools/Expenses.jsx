import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Banknote,
    CalendarDays,
    Eye,
    FileImage,
    Filter,
    FolderPlus,
    Plus,
    ReceiptText,
    Search,
    Trash2,
    Upload,
    WalletCards,
} from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { useMemo, useRef, useState } from 'react';

const today = () => new Date().toISOString().slice(0, 10);

const formatMoney = (value) =>
    new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 0,
    }).format(Number(value || 0));

const statusLabels = {
    paid: 'Paid',
    pending: 'Pending',
    reconciled: 'Reconciled',
    planning: 'Planning',
    active: 'Active',
    on_hold: 'On hold',
    completed: 'Completed',
};

export default function Expenses({
    expenses,
    projects,
    categories,
    paymentMethods,
    statuses,
    filters,
    summary,
}) {
    const fileInputRef = useRef(null);
    const [receiptPreview, setReceiptPreview] = useState(null);
    const [ocrState, setOcrState] = useState({
        status: 'idle',
        progress: 0,
        message: '',
    });
    const [filterData, setFilterData] = useState({
        search: filters.search || '',
        category: filters.category || '',
        project: filters.project || '',
        status: filters.status || '',
        from: filters.from || '',
        to: filters.to || '',
    });

    const defaultExpenseForm = useMemo(
        () => ({
            site_project_id: '',
            title: '',
            vendor: '',
            category: categories[0] || 'Other',
            purchase_date: today(),
            quantity: '',
            unit: '',
            unit_cost: '',
            total_amount: '',
            payment_method: paymentMethods.includes('POS')
                ? 'POS'
                : paymentMethods[0],
            status: 'paid',
            receipt: null,
            receipt_text: '',
            receipt_confidence: '',
            notes: '',
        }),
        [categories, paymentMethods],
    );

    const expenseForm = useForm(defaultExpenseForm);
    const projectForm = useForm({
        name: '',
        location: '',
        client_name: '',
        budget: '',
        start_date: today(),
        status: 'active',
        notes: '',
    });

    const computedTotal =
        expenseForm.data.total_amount === '' &&
        expenseForm.data.quantity !== '' &&
        expenseForm.data.unit_cost !== ''
            ? Number(expenseForm.data.quantity || 0) *
              Number(expenseForm.data.unit_cost || 0)
            : null;

    const submitExpense = (event) => {
        event.preventDefault();

        expenseForm.post(route('tools.expenses.store'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                expenseForm.setData(defaultExpenseForm);
                setReceiptPreview(null);
                setOcrState({ status: 'idle', progress: 0, message: '' });

                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            },
        });
    };

    const submitProject = (event) => {
        event.preventDefault();

        projectForm.post(route('tools.projects.store'), {
            preserveScroll: true,
            onSuccess: () =>
                projectForm.setData({
                    name: '',
                    location: '',
                    client_name: '',
                    budget: '',
                    start_date: today(),
                    status: 'active',
                    notes: '',
                }),
        });
    };

    const applyFilters = (event) => {
        event.preventDefault();

        router.get(route('tools.expenses'), compactFilters(filterData), {
            preserveState: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        const cleared = {
            search: '',
            category: '',
            project: '',
            status: '',
            from: '',
            to: '',
        };

        setFilterData(cleared);
        router.get(route('tools.expenses'), {}, { replace: true });
    };

    const handleReceiptChange = async (event) => {
        const file = event.target.files?.[0] || null;
        expenseForm.setData('receipt', file);

        if (!file) {
            setReceiptPreview(null);
            setOcrState({ status: 'idle', progress: 0, message: '' });
            return;
        }

        if (file.type.startsWith('image/')) {
            setReceiptPreview(URL.createObjectURL(file));
            await scanReceipt(file, expenseForm, setOcrState);
            return;
        }

        setReceiptPreview(null);
        setOcrState({
            status: 'ready',
            progress: 0,
            message: 'PDF attached',
        });
    };

    const deleteExpense = (expense) => {
        if (!window.confirm(`Delete ${expense.title}?`)) {
            return;
        }

        router.delete(route('tools.expenses.destroy', expense.id), {
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-medium text-emerald-700">
                            Expense tracker
                        </p>
                        <h1 className="mt-1 text-2xl font-semibold text-zinc-950">
                            Site purchases and receipts
                        </h1>
                    </div>
                    <Link
                        href={route('tools.calculators')}
                        className="inline-flex w-fit items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    >
                        <WalletCards className="h-4 w-4" />
                        Open calculators
                    </Link>
                </div>
            }
        >
            <Head title="Expenses" />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                    label="Filtered total"
                    value={formatMoney(summary.total)}
                    icon={Banknote}
                    accent="emerald"
                />
                <SummaryCard
                    label="Entries"
                    value={summary.count}
                    icon={ReceiptText}
                    accent="cyan"
                />
                <SummaryCard
                    label="Average spend"
                    value={formatMoney(summary.average)}
                    icon={WalletCards}
                    accent="amber"
                />
                <SummaryCard
                    label="With receipts"
                    value={summary.withReceipts}
                    icon={FileImage}
                    accent="rose"
                />
            </div>

            <form
                onSubmit={applyFilters}
                className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
            >
                <div className="grid gap-3 lg:grid-cols-[1.35fr_repeat(5,minmax(0,1fr))_auto]">
                    <FieldShell icon={Search}>
                        <input
                            value={filterData.search}
                            onChange={(event) =>
                                setFilterData((current) => ({
                                    ...current,
                                    search: event.target.value,
                                }))
                            }
                            className="w-full rounded-md border-zinc-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                            placeholder="Search vendor, item, receipt text"
                            type="search"
                        />
                    </FieldShell>
                    <select
                        value={filterData.category}
                        onChange={(event) =>
                            setFilterData((current) => ({
                                ...current,
                                category: event.target.value,
                            }))
                        }
                        className="rounded-md border-zinc-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                    >
                        <option value="">All categories</option>
                        {categories.map((category) => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}
                    </select>
                    <select
                        value={filterData.project}
                        onChange={(event) =>
                            setFilterData((current) => ({
                                ...current,
                                project: event.target.value,
                            }))
                        }
                        className="rounded-md border-zinc-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                    >
                        <option value="">All projects</option>
                        {projects.map((project) => (
                            <option key={project.id} value={project.id}>
                                {project.name}
                            </option>
                        ))}
                    </select>
                    <select
                        value={filterData.status}
                        onChange={(event) =>
                            setFilterData((current) => ({
                                ...current,
                                status: event.target.value,
                            }))
                        }
                        className="rounded-md border-zinc-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                    >
                        <option value="">All statuses</option>
                        {statuses.map((status) => (
                            <option key={status} value={status}>
                                {statusLabels[status]}
                            </option>
                        ))}
                    </select>
                    <input
                        value={filterData.from}
                        onChange={(event) =>
                            setFilterData((current) => ({
                                ...current,
                                from: event.target.value,
                            }))
                        }
                        className="rounded-md border-zinc-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                        type="date"
                    />
                    <input
                        value={filterData.to}
                        onChange={(event) =>
                            setFilterData((current) => ({
                                ...current,
                                to: event.target.value,
                            }))
                        }
                        className="rounded-md border-zinc-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                        type="date"
                    />
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-zinc-950 text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                            aria-label="Apply filters"
                            title="Apply filters"
                        >
                            <Filter className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="rounded-md border border-zinc-300 px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </form>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.78fr]">
                <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                            <Plus className="h-5 w-5" />
                        </span>
                        <div>
                            <h2 className="text-base font-semibold text-zinc-950">
                                Record purchase
                            </h2>
                            <p className="text-sm text-zinc-500">
                                Materials, supplier, payment, and receipt
                            </p>
                        </div>
                    </div>

                    <form onSubmit={submitExpense} className="mt-5 space-y-5">
                        <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                                label="Item or material"
                                error={expenseForm.errors.title}
                            >
                                <input
                                    value={expenseForm.data.title}
                                    onChange={(event) =>
                                        expenseForm.setData(
                                            'title',
                                            event.target.value,
                                        )
                                    }
                                    className="w-full rounded-md border-zinc-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                                    placeholder="Cement, blocks, pipes"
                                />
                            </FormField>
                            <FormField
                                label="Vendor"
                                error={expenseForm.errors.vendor}
                            >
                                <input
                                    value={expenseForm.data.vendor}
                                    onChange={(event) =>
                                        expenseForm.setData(
                                            'vendor',
                                            event.target.value,
                                        )
                                    }
                                    className="w-full rounded-md border-zinc-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                                    placeholder="Supplier or store"
                                />
                            </FormField>
                            <FormField
                                label="Project"
                                error={expenseForm.errors.site_project_id}
                            >
                                <select
                                    value={expenseForm.data.site_project_id}
                                    onChange={(event) =>
                                        expenseForm.setData(
                                            'site_project_id',
                                            event.target.value,
                                        )
                                    }
                                    className="w-full rounded-md border-zinc-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                                >
                                    <option value="">Unassigned</option>
                                    {projects.map((project) => (
                                        <option
                                            key={project.id}
                                            value={project.id}
                                        >
                                            {project.name}
                                        </option>
                                    ))}
                                </select>
                            </FormField>
                            <FormField
                                label="Category"
                                error={expenseForm.errors.category}
                            >
                                <select
                                    value={expenseForm.data.category}
                                    onChange={(event) =>
                                        expenseForm.setData(
                                            'category',
                                            event.target.value,
                                        )
                                    }
                                    className="w-full rounded-md border-zinc-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                                >
                                    {categories.map((category) => (
                                        <option
                                            key={category}
                                            value={category}
                                        >
                                            {category}
                                        </option>
                                    ))}
                                </select>
                            </FormField>
                            <FormField
                                label="Purchase date"
                                error={expenseForm.errors.purchase_date}
                            >
                                <input
                                    value={expenseForm.data.purchase_date}
                                    onChange={(event) =>
                                        expenseForm.setData(
                                            'purchase_date',
                                            event.target.value,
                                        )
                                    }
                                    className="w-full rounded-md border-zinc-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                                    type="date"
                                />
                            </FormField>
                            <FormField
                                label="Payment"
                                error={expenseForm.errors.payment_method}
                            >
                                <select
                                    value={expenseForm.data.payment_method}
                                    onChange={(event) =>
                                        expenseForm.setData(
                                            'payment_method',
                                            event.target.value,
                                        )
                                    }
                                    className="w-full rounded-md border-zinc-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                                >
                                    {paymentMethods.map((method) => (
                                        <option key={method} value={method}>
                                            {method}
                                        </option>
                                    ))}
                                </select>
                            </FormField>
                        </div>

                        <div className="grid gap-4 md:grid-cols-4">
                            <FormField
                                label="Quantity"
                                error={expenseForm.errors.quantity}
                            >
                                <input
                                    value={expenseForm.data.quantity}
                                    onChange={(event) =>
                                        expenseForm.setData(
                                            'quantity',
                                            event.target.value,
                                        )
                                    }
                                    className="w-full rounded-md border-zinc-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                                    min="0"
                                    step="0.001"
                                    type="number"
                                />
                            </FormField>
                            <FormField
                                label="Unit"
                                error={expenseForm.errors.unit}
                            >
                                <input
                                    value={expenseForm.data.unit}
                                    onChange={(event) =>
                                        expenseForm.setData(
                                            'unit',
                                            event.target.value,
                                        )
                                    }
                                    className="w-full rounded-md border-zinc-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                                    placeholder="bags, pcs, tons"
                                />
                            </FormField>
                            <FormField
                                label="Unit cost"
                                error={expenseForm.errors.unit_cost}
                            >
                                <input
                                    value={expenseForm.data.unit_cost}
                                    onChange={(event) =>
                                        expenseForm.setData(
                                            'unit_cost',
                                            event.target.value,
                                        )
                                    }
                                    className="w-full rounded-md border-zinc-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                                    min="0"
                                    step="0.01"
                                    type="number"
                                />
                            </FormField>
                            <FormField
                                label="Total"
                                error={expenseForm.errors.total_amount}
                            >
                                <input
                                    value={expenseForm.data.total_amount}
                                    onChange={(event) =>
                                        expenseForm.setData(
                                            'total_amount',
                                            event.target.value,
                                        )
                                    }
                                    className="w-full rounded-md border-zinc-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                                    min="0"
                                    step="0.01"
                                    type="number"
                                    placeholder={
                                        computedTotal
                                            ? formatMoney(computedTotal)
                                            : 'Auto or manual'
                                    }
                                />
                            </FormField>
                        </div>

                        <div className="grid gap-4 md:grid-cols-[0.65fr_1fr]">
                            <FormField
                                label="Status"
                                error={expenseForm.errors.status}
                            >
                                <select
                                    value={expenseForm.data.status}
                                    onChange={(event) =>
                                        expenseForm.setData(
                                            'status',
                                            event.target.value,
                                        )
                                    }
                                    className="w-full rounded-md border-zinc-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                                >
                                    {statuses.map((status) => (
                                        <option key={status} value={status}>
                                            {statusLabels[status]}
                                        </option>
                                    ))}
                                </select>
                            </FormField>
                            <FormField
                                label="Receipt"
                                error={expenseForm.errors.receipt}
                            >
                                <label className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-md border border-dashed border-zinc-300 px-3 py-2 text-sm text-zinc-600 transition hover:border-emerald-400 hover:bg-emerald-50">
                                    <span className="flex items-center gap-2 truncate">
                                        <Upload className="h-4 w-4 shrink-0" />
                                        <span className="truncate">
                                            {expenseForm.data.receipt?.name ||
                                                'Attach receipt image or PDF'}
                                        </span>
                                    </span>
                                    <input
                                        ref={fileInputRef}
                                        onChange={handleReceiptChange}
                                        className="sr-only"
                                        type="file"
                                        accept="image/*,.pdf"
                                    />
                                </label>
                            </FormField>
                        </div>

                        <FormField
                            label="Notes"
                            error={expenseForm.errors.notes}
                        >
                            <textarea
                                value={expenseForm.data.notes}
                                onChange={(event) =>
                                    expenseForm.setData(
                                        'notes',
                                        event.target.value,
                                    )
                                }
                                className="min-h-24 w-full rounded-md border-zinc-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                                placeholder="Delivery details, approvals, invoice number"
                            />
                        </FormField>

                        <input
                            type="hidden"
                            value={expenseForm.data.receipt_text}
                            name="receipt_text"
                        />
                        <input
                            type="hidden"
                            value={expenseForm.data.receipt_confidence}
                            name="receipt_confidence"
                        />

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm text-zinc-500">
                                {computedTotal !== null
                                    ? `Calculated total: ${formatMoney(computedTotal)}`
                                    : 'Receipt OCR can prefill vendor, date, and total.'}
                            </p>
                            <button
                                type="submit"
                                disabled={expenseForm.processing}
                                className="inline-flex items-center gap-2 rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
                            >
                                <Plus className="h-4 w-4" />
                                Save purchase
                            </button>
                        </div>
                    </form>
                </section>

                <div className="space-y-6">
                    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-50 text-cyan-700">
                                <FileImage className="h-5 w-5" />
                            </span>
                            <div>
                                <h2 className="text-base font-semibold text-zinc-950">
                                    Receipt scanner
                                </h2>
                                <p className="text-sm text-zinc-500">
                                    Browser OCR for image receipts
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
                            {receiptPreview ? (
                                <img
                                    src={receiptPreview}
                                    alt="Receipt preview"
                                    className="max-h-72 w-full object-contain"
                                />
                            ) : (
                                <div className="flex h-44 items-center justify-center text-sm text-zinc-500">
                                    No image selected
                                </div>
                            )}
                        </div>

                        <div className="mt-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-zinc-700">
                                    {ocrState.status === 'scanning'
                                        ? 'Scanning'
                                        : ocrState.message || 'Ready'}
                                </span>
                                <span className="text-zinc-500">
                                    {ocrState.progress}%
                                </span>
                            </div>
                            <div className="mt-2 h-2 rounded-md bg-zinc-100">
                                <div
                                    className="h-2 rounded-md bg-cyan-600 transition-all"
                                    style={{ width: `${ocrState.progress}%` }}
                                />
                            </div>
                        </div>

                        <textarea
                            value={expenseForm.data.receipt_text}
                            onChange={(event) =>
                                expenseForm.setData(
                                    'receipt_text',
                                    event.target.value,
                                )
                            }
                            className="mt-4 min-h-32 w-full rounded-md border-zinc-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                            placeholder="OCR text appears here"
                        />
                    </section>

                    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-50 text-amber-700">
                                <FolderPlus className="h-5 w-5" />
                            </span>
                            <div>
                                <h2 className="text-base font-semibold text-zinc-950">
                                    New project
                                </h2>
                                <p className="text-sm text-zinc-500">
                                    Assign purchases to sites
                                </p>
                            </div>
                        </div>

                        <form onSubmit={submitProject} className="mt-5 space-y-4">
                            <FormField
                                label="Project name"
                                error={projectForm.errors.name}
                            >
                                <input
                                    value={projectForm.data.name}
                                    onChange={(event) =>
                                        projectForm.setData(
                                            'name',
                                            event.target.value,
                                        )
                                    }
                                    className="w-full rounded-md border-zinc-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                                    placeholder="Lekki duplex phase 1"
                                />
                            </FormField>
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                                <FormField
                                    label="Location"
                                    error={projectForm.errors.location}
                                >
                                    <input
                                        value={projectForm.data.location}
                                        onChange={(event) =>
                                            projectForm.setData(
                                                'location',
                                                event.target.value,
                                            )
                                        }
                                        className="w-full rounded-md border-zinc-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                                    />
                                </FormField>
                                <FormField
                                    label="Budget"
                                    error={projectForm.errors.budget}
                                >
                                    <input
                                        value={projectForm.data.budget}
                                        onChange={(event) =>
                                            projectForm.setData(
                                                'budget',
                                                event.target.value,
                                            )
                                        }
                                        className="w-full rounded-md border-zinc-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                                        min="0"
                                        step="0.01"
                                        type="number"
                                    />
                                </FormField>
                            </div>
                            <button
                                type="submit"
                                disabled={projectForm.processing}
                                className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
                            >
                                <FolderPlus className="h-4 w-4" />
                                Create project
                            </button>
                        </form>
                    </section>
                </div>
            </div>

            <section className="mt-6 rounded-lg border border-zinc-200 bg-white shadow-sm">
                <div className="flex flex-col gap-2 border-b border-zinc-200 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-base font-semibold text-zinc-950">
                            Purchase log
                        </h2>
                        <p className="mt-1 text-sm text-zinc-500">
                            Receipts, payment state, and project allocation
                        </p>
                    </div>
                    <span className="text-sm font-medium text-zinc-500">
                        {expenses.total} records
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-zinc-200">
                        <thead className="bg-zinc-50">
                            <tr>
                                <TableHead>Item</TableHead>
                                <TableHead>Project</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Payment</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Receipt</TableHead>
                                <TableHead />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 bg-white">
                            {expenses.data.length ? (
                                expenses.data.map((expense) => (
                                    <tr key={expense.id}>
                                        <TableCell>
                                            <p className="font-semibold text-zinc-950">
                                                {expense.title}
                                            </p>
                                            <p className="mt-1 text-sm text-zinc-500">
                                                {expense.vendor || 'No vendor'}{' '}
                                                - {expense.category}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            {expense.project?.name ||
                                                'Unassigned'}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center gap-2">
                                                <CalendarDays className="h-4 w-4 text-zinc-400" />
                                                {expense.purchaseDate}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <span>
                                                    {expense.paymentMethod}
                                                </span>
                                                <StatusBadge
                                                    status={expense.status}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-semibold text-zinc-950">
                                                {formatMoney(
                                                    expense.totalAmount,
                                                )}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {expense.receiptUrl ? (
                                                <a
                                                    href={expense.receiptUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 text-zinc-700 transition hover:bg-zinc-50"
                                                    aria-label="Open receipt"
                                                    title="Open receipt"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </a>
                                            ) : (
                                                <span className="text-zinc-400">
                                                    None
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    deleteExpense(expense)
                                                }
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 text-red-700 transition hover:bg-red-50"
                                                aria-label="Delete expense"
                                                title="Delete expense"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </TableCell>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan="7"
                                        className="px-4 py-10 text-center text-sm text-zinc-500"
                                    >
                                        No purchases match the current filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination links={expenses.links} />
            </section>
        </AuthenticatedLayout>
    );
}

async function scanReceipt(file, expenseForm, setOcrState) {
    setOcrState({
        status: 'scanning',
        progress: 1,
        message: 'Preparing scanner',
    });

    let worker;

    try {
        worker = await createWorker('eng', 1, {
            logger: (message) => {
                if (message.status === 'recognizing text') {
                    setOcrState({
                        status: 'scanning',
                        progress: Math.round(message.progress * 100),
                        message: 'Reading receipt',
                    });
                }
            },
        });

        const {
            data: { text, confidence },
        } = await worker.recognize(file);

        const extracted = extractReceiptData(text || '');

        expenseForm.setData('receipt_text', text || '');
        expenseForm.setData(
            'receipt_confidence',
            confidence ? Number(confidence).toFixed(2) : '',
        );

        Object.entries(extracted).forEach(([field, value]) => {
            if (value && !expenseForm.data[field]) {
                expenseForm.setData(field, value);
            }
        });

        setOcrState({
            status: 'complete',
            progress: 100,
            message: 'Scan complete',
        });
    } catch (error) {
        setOcrState({
            status: 'error',
            progress: 0,
            message: 'Scan unavailable',
        });
    } finally {
        if (worker) {
            await worker.terminate();
        }
    }
}

function extractReceiptData(text) {
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    const totalLine =
        lines.find((line) => /grand\s*total|total|amount\s*due/i.test(line)) ||
        '';
    const amounts = parseAmounts(totalLine).length
        ? parseAmounts(totalLine)
        : parseAmounts(text);
    const totalAmount = amounts.length ? Math.max(...amounts).toFixed(2) : '';
    const dateMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
    const purchaseDate = dateMatch ? normalizeDate(dateMatch) : '';
    const vendor =
        lines.find((line) => /[a-z]/i.test(line) && line.length <= 50) || '';
    const title =
        lines.find((line) =>
            /cement|block|steel|sand|granite|pipe|paint|timber|wire|tile|diesel/i.test(
                line,
            ),
        ) || 'Receipt purchase';

    return {
        vendor,
        title,
        purchase_date: purchaseDate,
        total_amount: totalAmount,
    };
}

function parseAmounts(text) {
    return [...text.matchAll(/(?:NGN|N)?\s*([0-9]{1,3}(?:[, ]?[0-9]{3})*(?:\.[0-9]{2})|[0-9]+\.[0-9]{2})/gi)]
        .map((match) => Number(match[1].replace(/[, ]/g, '')))
        .filter((amount) => Number.isFinite(amount) && amount > 0);
}

function normalizeDate(match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const year = match[3].length === 2 ? `20${match[3]}` : match[3];
    const day = first > 12 ? first : second;
    const month = first > 12 ? second : first;

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function compactFilters(filters) {
    return Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== ''),
    );
}

function SummaryCard({ label, value, icon: Icon, accent }) {
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

function FieldShell({ icon: Icon, children }) {
    return (
        <div className="relative">
            <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <div className="[&_input]:pl-9">{children}</div>
        </div>
    );
}

function FormField({ label, error, children }) {
    return (
        <div>
            <InputLabel value={label} />
            <div className="mt-1">{children}</div>
            <InputError message={error} className="mt-2" />
        </div>
    );
}

function TableHead({ children }) {
    return (
        <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">
            {children}
        </th>
    );
}

function TableCell({ children }) {
    return (
        <td className="whitespace-nowrap px-4 py-4 text-sm text-zinc-700">
            {children}
        </td>
    );
}

function StatusBadge({ status }) {
    const classes = {
        paid: 'bg-emerald-50 text-emerald-700',
        pending: 'bg-amber-50 text-amber-700',
        reconciled: 'bg-cyan-50 text-cyan-700',
    };

    return (
        <span
            className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${classes[status] || 'bg-zinc-100 text-zinc-700'}`}
        >
            {statusLabels[status] || status}
        </span>
    );
}

function Pagination({ links }) {
    if (!links || links.length <= 3) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 p-4">
            {links.map((link, index) =>
                link.url ? (
                    <Link
                        key={`${link.label}-${index}`}
                        href={link.url}
                        preserveScroll
                        className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                            link.active
                                ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                                : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50'
                        }`}
                        dangerouslySetInnerHTML={{
                            __html: cleanPaginationLabel(link.label),
                        }}
                    />
                ) : (
                    <span
                        key={`${link.label}-${index}`}
                        className="rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-400"
                        dangerouslySetInnerHTML={{
                            __html: cleanPaginationLabel(link.label),
                        }}
                    />
                ),
            )}
        </div>
    );
}

function cleanPaginationLabel(label) {
    return label
        .replace('&laquo; Previous', 'Previous')
        .replace('Next &raquo;', 'Next');
}
