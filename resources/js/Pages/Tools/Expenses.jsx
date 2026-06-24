import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Banknote,
    CalendarDays,
    Eye,
    FileImage,
    FileSpreadsheet,
    Filter,
    FolderPlus,
    PackageSearch,
    Plus,
    ReceiptText,
    Search,
    Trash2,
    Upload,
    WalletCards,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

const today = () => new Date().toISOString().slice(0, 10);

const emptyReceiptOcr = () => ({
    receipt_text: '',
    receipt_confidence: '',
    receipt_number: '',
    receipt_currency: '',
    receipt_subtotal: '',
    receipt_tax_amount: '',
    receipt_payment_method: '',
    receipt_items: [],
});

const formatMoney = (value) =>
    new Intl.NumberFormat('fr-CM', {
        style: 'currency',
        currency: 'XAF',
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
    materials,
    paymentMethods,
    statuses,
    filters,
    summary,
}) {
    const fileInputRef = useRef(null);
    const receiptOnlyInputRef = useRef(null);
    const [uploadMode, setUploadMode] = useState('expense');
    const [receiptPreview, setReceiptPreview] = useState(null);
    const [receiptOnlyPreview, setReceiptOnlyPreview] = useState(null);
    const [ocrState, setOcrState] = useState({
        status: 'idle',
        progress: 0,
        message: '',
    });
    const [receiptOnlyOcrState, setReceiptOnlyOcrState] = useState({
        status: 'idle',
        progress: 0,
        message: '',
    });
    const [filterData, setFilterData] = useState({
        search: filters.search || '',
        category: filters.category || '',
        material: filters.material || '',
        project: filters.project || '',
        status: filters.status || '',
        from: filters.from || '',
        to: filters.to || '',
    });

    const firstMaterial = materials[0] || null;
    const defaultExpenseForm = useMemo(
        () => ({
            site_project_id: '',
            material_id: firstMaterial?.id || '',
            vendor: '',
            purchase_date: today(),
            quantity: '',
            unit: firstMaterial?.unit || '',
            unit_cost: firstMaterial?.defaultUnitPrice || '',
            total_amount: '',
            payment_method: paymentMethods.includes('POS')
                ? 'POS'
                : paymentMethods[0],
            status: 'paid',
            receipt: null,
            ...emptyReceiptOcr(),
            notes: '',
        }),
        [firstMaterial, paymentMethods],
    );

    const expenseForm = useForm(defaultExpenseForm);
    const receiptOnlyForm = useForm({
        receipt: null,
        vendor: '',
        purchase_date: '',
        total_amount: '',
        ...emptyReceiptOcr(),
    });
    const projectForm = useForm({
        name: '',
        location: '',
        client_name: '',
        budget: '',
        start_date: today(),
        status: 'active',
        notes: '',
    });

    const selectedMaterial =
        materials.find(
            (material) =>
                String(material.id) === String(expenseForm.data.material_id),
        ) || null;
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

    const submitReceiptOnly = (event) => {
        event.preventDefault();

        receiptOnlyForm.post(route('tools.receipts.store'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                receiptOnlyForm.reset();
                setReceiptOnlyPreview(null);
                setReceiptOnlyOcrState({
                    status: 'idle',
                    progress: 0,
                    message: '',
                });

                if (receiptOnlyInputRef.current) {
                    receiptOnlyInputRef.current.value = '';
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
            material: '',
            project: '',
            status: '',
            from: '',
            to: '',
        };

        setFilterData(cleared);
        router.get(route('tools.expenses'), {}, { replace: true });
    };

    const selectMaterial = (materialId) => {
        const material = materials.find(
            (item) => String(item.id) === String(materialId),
        );

        expenseForm.setData({
            ...expenseForm.data,
            material_id: materialId,
            unit: material?.unit || '',
            unit_cost: material?.defaultUnitPrice || '',
            total_amount: '',
        });
    };

    const handleReceiptChange = async (event) => {
        const file = event.target.files?.[0] || null;
        expenseForm.setData('receipt', file);

        if (!file) {
            setReceiptPreview(null);
            setOcrState({ status: 'idle', progress: 0, message: '' });
            return;
        }

        setReceiptPreview(
            file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        );
        await scanReceipt(file, setOcrState, (scan) => {
            expenseForm.setData({
                ...expenseForm.data,
                ...receiptDataFromScan(scan),
                vendor: expenseForm.data.vendor || scan.vendor || '',
                purchase_date:
                    scan.purchase_date || expenseForm.data.purchase_date,
                total_amount:
                    expenseForm.data.total_amount || scan.total_amount || '',
            });
        });
    };

    const handleReceiptOnlyChange = async (event) => {
        const file = event.target.files?.[0] || null;
        receiptOnlyForm.setData('receipt', file);
        setReceiptOnlyPreview(
            file?.type.startsWith('image/')
                ? URL.createObjectURL(file)
                : null,
        );

        if (!file) {
            setReceiptOnlyOcrState({
                status: 'idle',
                progress: 0,
                message: '',
            });
            return;
        }

        await scanReceipt(file, setReceiptOnlyOcrState, (scan) => {
            receiptOnlyForm.setData({
                ...receiptOnlyForm.data,
                receipt: file,
                ...receiptDataFromScan(scan),
                vendor: scan.vendor || '',
                purchase_date: scan.purchase_date || '',
                total_amount: scan.total_amount ?? '',
            });
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
                    <div className="flex flex-wrap gap-2">
                        <a
                            href={route('tools.receipts.export')}
                            className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                        >
                            <FileSpreadsheet className="h-4 w-4" />
                            Export receipt Excel
                        </a>
                        <a
                            href="/admin/materials"
                            className="inline-flex items-center gap-2 rounded-md border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-900 shadow-sm transition hover:bg-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
                        >
                            <PackageSearch className="h-4 w-4" />
                            Manage materials
                        </a>
                        <Link
                            href={route('tools.calculators')}
                            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                        >
                            <WalletCards className="h-4 w-4" />
                            Open calculators
                        </Link>
                    </div>
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
                className="panel-card lift-in mt-6 rounded-lg p-4"
            >
                <div className="grid gap-3 lg:grid-cols-[1.35fr_repeat(6,minmax(0,1fr))_auto]">
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
                            placeholder="Search vendor, material, receipt text"
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
                        value={filterData.material}
                        onChange={(event) =>
                            setFilterData((current) => ({
                                ...current,
                                material: event.target.value,
                            }))
                        }
                        className="rounded-md border-zinc-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                    >
                        <option value="">All materials</option>
                        {materials.map((material) => (
                            <option key={material.id} value={material.id}>
                                {material.name}
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
                            className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-emerald-600 text-white shadow-md shadow-emerald-700/20 transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                            aria-label="Apply filters"
                            title="Apply filters"
                        >
                            <Filter className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="rounded-md border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </form>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.78fr]">
                <section className="panel-card lift-in rounded-lg p-5">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                            <Plus className="h-5 w-5" />
                        </span>
                        <div>
                            <h2 className="text-base font-semibold text-zinc-950">
                                Add a receipt or purchase
                            </h2>
                            <p className="text-sm text-zinc-500">
                                Upload only the receipt, or record all purchase
                                details.
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg bg-zinc-100 p-1">
                        <button
                            type="button"
                            onClick={() => setUploadMode('receipt')}
                            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                                uploadMode === 'receipt'
                                    ? 'bg-white text-cyan-800 shadow-sm'
                                    : 'text-zinc-600 hover:text-zinc-950'
                            }`}
                        >
                            Receipt only
                        </button>
                        <button
                            type="button"
                            onClick={() => setUploadMode('expense')}
                            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                                uploadMode === 'expense'
                                    ? 'bg-white text-emerald-800 shadow-sm'
                                    : 'text-zinc-600 hover:text-zinc-950'
                            }`}
                        >
                            Full expense
                        </button>
                    </div>

                    {uploadMode === 'receipt' ? (
                        <form
                            onSubmit={submitReceiptOnly}
                            className="mt-5 space-y-5"
                        >
                            <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950">
                                Choose a receipt. OCR will read its supplier,
                                date, totals, and line items for the Excel
                                export—no manual purchase details are required.
                            </div>

                            <FormField
                                label="Receipt"
                                error={receiptOnlyForm.errors.receipt}
                            >
                                <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-cyan-300 bg-cyan-50/50 px-4 py-6 text-center text-sm text-cyan-900 transition hover:border-cyan-500 hover:bg-cyan-50">
                                    <Upload className="h-6 w-6" />
                                    <span className="font-semibold">
                                        {receiptOnlyForm.data.receipt?.name ||
                                            'Choose receipt image or PDF'}
                                    </span>
                                    <span className="text-xs text-cyan-700">
                                        JPG, PNG, WebP, or PDF up to 10 MB
                                    </span>
                                    <input
                                        ref={receiptOnlyInputRef}
                                        onChange={handleReceiptOnlyChange}
                                        className="sr-only"
                                        type="file"
                                        accept="image/*,.pdf"
                                    />
                                </label>
                            </FormField>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={
                                        receiptOnlyForm.processing ||
                                        !receiptOnlyForm.data.receipt ||
                                        receiptOnlyOcrState.status === 'scanning'
                                    }
                                    className="inline-flex items-center gap-2 rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-700/20 transition hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-50"
                                >
                                    <Upload className="h-4 w-4" />
                                    Upload receipt
                                </button>
                            </div>
                        </form>
                    ) : (
                        <>
                            {!materials.length && (
                                <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                                    Add materials in the Filament admin dashboard
                                    before recording expenses.
                                </div>
                            )}

                            <form
                                onSubmit={submitExpense}
                                className="mt-5 space-y-5"
                            >
                        <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                                label="Item or material"
                                error={expenseForm.errors.material_id}
                            >
                                <select
                                    value={expenseForm.data.material_id}
                                    onChange={(event) =>
                                        selectMaterial(event.target.value)
                                    }
                                    className="w-full rounded-md border-zinc-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                                    disabled={!materials.length}
                                >
                                    <option value="">
                                        Select a material
                                    </option>
                                    {materials.map((material) => (
                                        <option
                                            key={material.id}
                                            value={material.id}
                                        >
                                            {material.name} -{' '}
                                            {formatMoney(
                                                material.defaultUnitPrice,
                                            )}
                                            /{material.unit}
                                        </option>
                                    ))}
                                </select>
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
                        </div>

                        {selectedMaterial && (
                            <div className="soft-stripes grid gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm md:grid-cols-3">
                                <MaterialMeta
                                    label="Category"
                                    value={selectedMaterial.category}
                                />
                                <MaterialMeta
                                    label="Default unit"
                                    value={selectedMaterial.unit}
                                />
                                <MaterialMeta
                                    label="Default price"
                                    value={`${formatMoney(selectedMaterial.defaultUnitPrice)} / ${selectedMaterial.unit}`}
                                />
                            </div>
                        )}

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
                                    step="0.1"
                                    type="number"
                                    placeholder="0.0"
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
                                label="Unit price (FCFA)"
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
                                    step="1"
                                    type="number"
                                />
                            </FormField>
                            <FormField
                                label="Total (FCFA)"
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
                                    step="1"
                                    type="number"
                                    placeholder={
                                        computedTotal
                                            ? formatMoney(computedTotal)
                                            : 'Auto or manual'
                                    }
                                />
                            </FormField>
                        </div>

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

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm text-zinc-500">
                                {computedTotal !== null
                                    ? `Calculated total: ${formatMoney(computedTotal)}`
                                    : 'AI receipt scanning can prefill vendor, date, and total.'}
                            </p>
                            <button
                                type="submit"
                                disabled={
                                    expenseForm.processing ||
                                    !materials.length
                                }
                                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
                            >
                                <Plus className="h-4 w-4" />
                                Save purchase
                            </button>
                        </div>
                            </form>
                        </>
                    )}
                </section>

                <div className="space-y-6">
                    <ReceiptScanner
                        receiptPreview={
                            uploadMode === 'receipt'
                                ? receiptOnlyPreview
                                : receiptPreview
                        }
                        receiptName={
                            uploadMode === 'receipt'
                                ? receiptOnlyForm.data.receipt?.name
                                : expenseForm.data.receipt?.name
                        }
                        ocrState={
                            uploadMode === 'receipt'
                                ? receiptOnlyOcrState
                                : ocrState
                        }
                        scanData={
                            uploadMode === 'receipt'
                                ? receiptOnlyForm.data
                                : expenseForm.data
                        }
                        receiptText={
                            uploadMode === 'receipt'
                                ? receiptOnlyForm.data.receipt_text
                                : expenseForm.data.receipt_text
                        }
                        onReceiptTextChange={(value) =>
                            uploadMode === 'receipt'
                                ? receiptOnlyForm.setData('receipt_text', value)
                                : expenseForm.setData('receipt_text', value)
                        }
                    />

                    <section className="panel-card lift-in rounded-lg p-5">
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

                        <form
                            onSubmit={submitProject}
                            className="mt-5 space-y-4"
                        >
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
                                    placeholder="Bonamoussadi villa phase 1"
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
                                    label="Budget (FCFA)"
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
                                        step="1"
                                        type="number"
                                    />
                                </FormField>
                            </div>
                            <button
                                type="submit"
                                disabled={projectForm.processing}
                                className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:opacity-50"
                            >
                                <FolderPlus className="h-4 w-4" />
                                Create project
                            </button>
                        </form>
                    </section>
                </div>
            </div>

            <section className="panel-card lift-in mt-6 rounded-lg shadow-sm">
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
                                <TableHead>Entry</TableHead>
                                <TableHead>Project</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Qty</TableHead>
                                <TableHead>Payment</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Receipt</TableHead>
                                <TableHead />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 bg-white">
                            {expenses.data.length ? (
                                expenses.data.map((expense) => (
                                    <tr
                                        key={expense.id}
                                        className="transition hover:bg-emerald-50/40"
                                    >
                                        <TableCell>
                                            <p className="font-semibold text-zinc-950">
                                                {expense.title}
                                            </p>
                                            <p className="mt-1 text-sm text-zinc-500">
                                                {expense.entryType === 'receipt'
                                                    ? expense.receiptOriginalName
                                                    : `${expense.vendor || 'No vendor'} - ${expense.category}`}
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
                                            {expense.quantity !== null
                                                ? `${Number(expense.quantity).toFixed(1)} ${expense.unit || ''}`
                                                : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {expense.entryType === 'receipt' ? (
                                                expense.paymentMethod ===
                                                'Not provided' ? (
                                                    <span className="text-zinc-400">
                                                        Not provided
                                                    </span>
                                                ) : (
                                                    <span>
                                                        {expense.paymentMethod}
                                                    </span>
                                                )
                                            ) : (
                                                <div className="space-y-1">
                                                    <span>
                                                        {expense.paymentMethod}
                                                    </span>
                                                    <StatusBadge
                                                        status={expense.status}
                                                    />
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {expense.entryType === 'receipt' ? (
                                                Number(expense.totalAmount) >
                                                0 ? (
                                                    <span className="font-semibold text-zinc-950">
                                                        {formatReceiptAmount(
                                                            expense.totalAmount,
                                                            expense.receiptCurrency,
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-400">
                                                        Not provided
                                                    </span>
                                                )
                                            ) : (
                                                <span className="font-semibold text-zinc-950">
                                                    {formatMoney(
                                                        expense.totalAmount,
                                                    )}
                                                </span>
                                            )}
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
                                        colSpan="8"
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

async function scanReceipt(file, setOcrState, onScan) {
    setOcrState({
        status: 'scanning',
        progress: 15,
        message: 'Sending receipt to AI',
    });

    try {
        const formData = new FormData();
        formData.append('receipt', file);

        const response = await window.axios.post(
            route('tools.expenses.scan-receipt'),
            formData,
            {
                headers: {
                    Accept: 'application/json',
                },
            },
        );
        const scan = response.data;

        onScan(scan);

        setOcrState({
            status: 'complete',
            progress: 100,
            message: 'AI scan complete',
        });
    } catch (error) {
        setOcrState({
            status: 'error',
            progress: 0,
            message:
                error.response?.data?.message ||
                'AI scan unavailable. Enter the details manually.',
        });
    }
}

function receiptDataFromScan(scan) {
    return {
        receipt_text: scan.text || '',
        receipt_confidence: scan.confidence ?? '',
        receipt_number: scan.receipt_number || '',
        receipt_currency: scan.currency || '',
        receipt_subtotal: scan.subtotal ?? '',
        receipt_tax_amount: scan.tax_amount ?? '',
        receipt_payment_method: scan.payment_method || '',
        receipt_items: scan.items || [],
    };
}

function compactFilters(filters) {
    return Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== ''),
    );
}

function ReceiptScanner({
    receiptPreview,
    receiptName,
    ocrState,
    scanData,
    receiptText,
    onReceiptTextChange,
}) {
    const extractedFields = [
        ['Vendor', scanData.vendor],
        ['Date', scanData.purchase_date],
        ['Receipt no.', scanData.receipt_number],
        [
            'Total',
            formatReceiptAmount(
                scanData.total_amount,
                scanData.receipt_currency,
            ),
        ],
        [
            'Confidence',
            scanData.receipt_confidence !== ''
                ? `${scanData.receipt_confidence}%`
                : null,
        ],
        ['Line items', scanData.receipt_items?.length || null],
    ].filter(([, value]) => value !== null && value !== undefined && value !== '');

    return (
        <section className="panel-card lift-in rounded-lg p-5">
            <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-50 text-cyan-700">
                    <FileImage className="h-5 w-5" />
                </span>
                <div>
                    <h2 className="text-base font-semibold text-zinc-950">
                        Receipt scanner
                    </h2>
                    <p className="text-sm text-zinc-500">
                        OpenAI vision for receipt images and PDFs
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
                    <div className="flex h-44 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-zinc-500">
                        <FileImage className="h-7 w-7 text-zinc-400" />
                        {receiptName || 'No receipt selected'}
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
                    <span className="text-zinc-500">{ocrState.progress}%</span>
                </div>
                <div className="mt-2 h-2 rounded-md bg-zinc-100">
                    <div
                        className="h-2 rounded-md bg-cyan-600 transition-all"
                        style={{ width: `${ocrState.progress}%` }}
                    />
                </div>
            </div>

            {extractedFields.length > 0 && (
                <div className="mt-4 grid gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 sm:grid-cols-2">
                    {extractedFields.map(([label, value]) => (
                        <div key={label}>
                            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                                {label}
                            </p>
                            <p className="mt-1 break-words text-sm font-semibold text-zinc-950">
                                {value}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {scanData.receipt_items?.length > 0 && (
                <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
                    <table className="min-w-full divide-y divide-zinc-200 text-sm">
                        <thead className="bg-zinc-50 text-left text-xs font-semibold text-zinc-500">
                            <tr>
                                <th className="px-3 py-2">Item</th>
                                <th className="px-3 py-2">Qty</th>
                                <th className="px-3 py-2">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 bg-white">
                            {scanData.receipt_items.map((item, index) => (
                                <tr key={`${item.description}-${index}`}>
                                    <td className="px-3 py-2 text-zinc-800">
                                        {item.description}
                                    </td>
                                    <td className="px-3 py-2 text-zinc-600">
                                        {item.quantity ?? '-'}
                                    </td>
                                    <td className="px-3 py-2 font-medium text-zinc-800">
                                        {formatReceiptAmount(
                                            item.total,
                                            scanData.receipt_currency,
                                        ) || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <textarea
                value={receiptText}
                onChange={(event) => onReceiptTextChange(event.target.value)}
                className="mt-4 min-h-32 w-full rounded-md border-zinc-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="AI-extracted receipt text appears here"
            />
        </section>
    );
}

function formatReceiptAmount(value, currency) {
    if (value === '' || value === null || value === undefined) {
        return null;
    }

    return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(value))}${currency ? ` ${currency}` : ''}`;
}

function SummaryCard({ label, value, icon: Icon, accent }) {
    const colorMap = {
        emerald: {
            card: 'border-emerald-200 bg-emerald-50/70',
            icon: 'bg-emerald-600 text-white shadow-emerald-700/20',
        },
        cyan: {
            card: 'border-cyan-200 bg-cyan-50/70',
            icon: 'bg-cyan-600 text-white shadow-cyan-700/20',
        },
        amber: {
            card: 'border-amber-200 bg-amber-50/70',
            icon: 'bg-amber-500 text-white shadow-amber-700/20',
        },
        rose: {
            card: 'border-rose-200 bg-rose-50/70',
            icon: 'bg-rose-500 text-white shadow-rose-700/20',
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
            <div className="workline mt-5 h-1 rounded-md" />
        </section>
    );
}

function MaterialMeta({ label, value }) {
    return (
        <div>
            <p className="text-xs font-semibold text-zinc-500">{label}</p>
            <p className="mt-1 font-semibold text-zinc-950">{value}</p>
        </div>
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
