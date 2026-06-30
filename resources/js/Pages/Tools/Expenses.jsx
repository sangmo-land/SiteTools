import InputError from '@/Components/InputError';
import AuthenticatedLayout, { PageHeader } from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Banknote,
    CalendarDays,
    ChevronDown,
    Download,
    Eye,
    FileImage,
    FileSpreadsheet,
    FileText,
    Filter,
    FolderPlus,
    PackageSearch,
    Plus,
    ReceiptText,
    Search,
    Send,
    Sparkles,
    Trash2,
    Upload,
    WalletCards,
} from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';

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
    const [showFilters, setShowFilters] = useState(() =>
        ['category', 'material', 'project', 'status', 'from', 'to'].some(
            (key) => (filters[key] || '') !== '',
        ),
    );
    const activeFilterCount = Object.values(filterData).filter(
        (value) => value !== '',
    ).length;

    const blankItem = useCallback(
        () => ({
            material_id: '',
            description: '',
            category: categories[0] || 'Other',
            unit: '',
            quantity: '',
            unit_price: '',
            total: '',
        }),
        [categories],
    );
    const defaultExpenseForm = useMemo(
        () => ({
            site_project_id: '',
            vendor: '',
            purchase_date: today(),
            payment_method: paymentMethods.includes('POS')
                ? 'POS'
                : paymentMethods[0],
            status: 'paid',
            receipt: null,
            notes: '',
            items: [blankItem()],
            ...emptyReceiptOcr(),
        }),
        [paymentMethods, blankItem],
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

    const items = expenseForm.data.items;
    const grandTotal = items.reduce(
        (sum, item) => sum + (Number(item.total) || 0),
        0,
    );
    const itemError = (index, field) =>
        expenseForm.errors[`items.${index}.${field}`];

    const setItems = (next) => expenseForm.setData('items', next);
    const updateItem = (index, patch) =>
        setItems(
            items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
        );
    const addItem = () => setItems([...items, blankItem()]);
    const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

    const pickMaterial = (index, value) => {
        const material = materials.find((m) => String(m.id) === String(value));

        if (!material) {
            updateItem(index, { material_id: '' });
            return;
        }

        updateItem(index, {
            material_id: String(material.id),
            description: material.name,
            category: material.category,
            unit: material.unit,
            unit_price: material.defaultUnitPrice,
            total: lineTotal(
                items[index].quantity,
                material.defaultUnitPrice,
                items[index].total,
            ),
        });
    };

    const changeItemField = (index, field, value) => {
        const current = items[index];
        const patch = { [field]: value };

        if (field === 'quantity') {
            patch.total = lineTotal(value, current.unit_price, current.total);
        } else if (field === 'unit_price') {
            patch.total = lineTotal(current.quantity, value, current.total);
        }

        updateItem(index, patch);
    };

    const submitExpense = (event) => {
        event.preventDefault();

        expenseForm.post(route('tools.expenses.store'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                expenseForm.setData({
                    ...defaultExpenseForm,
                    items: [blankItem()],
                });
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

    const handleReceiptChange = async (event) => {
        const file = event.target.files?.[0] || null;
        expenseForm.setData('receipt', file);

        if (!file) {
            setReceiptPreview(null);
            setOcrState({ status: 'idle', progress: 0, message: '' });
            return;
        }

        setReceiptPreview(
            canPreviewReceipt(file) ? URL.createObjectURL(file) : null,
        );
        await scanReceipt(file, setOcrState, (scan) => {
            const scanned = itemsFromScan(scan, materials, categories);

            expenseForm.setData({
                ...expenseForm.data,
                ...receiptDataFromScan(scan),
                vendor: expenseForm.data.vendor || scan.vendor || '',
                purchase_date:
                    scan.purchase_date || expenseForm.data.purchase_date,
                items: scanned.length ? scanned : expenseForm.data.items,
            });
        });
    };

    const handleReceiptOnlyChange = async (event) => {
        const file = event.target.files?.[0] || null;
        receiptOnlyForm.setData('receipt', file);
        setReceiptOnlyPreview(
            canPreviewReceipt(file) ? URL.createObjectURL(file) : null,
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
                <PageHeader
                    eyebrow="Expense tracker"
                    title="Purchases & receipts"
                    actions={
                        <>
                            <a
                                href={route('tools.receipts.export')}
                                className="btn btn-secondary"
                            >
                                <FileSpreadsheet className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                    Export Excel
                                </span>
                            </a>
                            <a
                                href="/admin/materials"
                                className="btn btn-secondary"
                            >
                                <PackageSearch className="h-4 w-4" />
                                <span className="hidden sm:inline">
                                    Materials
                                </span>
                            </a>
                            <Link
                                href={route('tools.calculators')}
                                className="btn btn-primary"
                            >
                                <WalletCards className="h-4 w-4" />
                                Calculators
                            </Link>
                        </>
                    }
                />
            }
        >
            <Head title="Expenses" />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                    label="Filtered total"
                    value={formatMoney(summary.total)}
                    icon={Banknote}
                    accent="brand"
                />
                <SummaryCard
                    label="Entries"
                    value={summary.count}
                    icon={ReceiptText}
                    accent="sky"
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
                    accent="violet"
                />
            </div>

            <form onSubmit={applyFilters} className="card mt-5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={filterData.search}
                            onChange={(event) =>
                                setFilterData((current) => ({
                                    ...current,
                                    search: event.target.value,
                                }))
                            }
                            className="field pl-9"
                            placeholder="Search vendor, material, receipt text"
                            type="search"
                        />
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setShowFilters((open) => !open)}
                            aria-expanded={showFilters}
                            className="btn btn-secondary"
                        >
                            <Filter className="h-4 w-4" />
                            Filters
                            {activeFilterCount > 0 && (
                                <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-semibold text-white">
                                    {activeFilterCount}
                                </span>
                            )}
                            <ChevronDown
                                className={`h-4 w-4 text-slate-400 transition ${showFilters ? 'rotate-180' : ''}`}
                            />
                        </button>
                        <button type="submit" className="btn btn-primary">
                            Apply
                        </button>
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="btn btn-ghost"
                        >
                            Clear
                        </button>
                    </div>
                </div>

                {showFilters && (
                    <div className="mt-4 grid gap-3 border-t hairline pt-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        <select
                            value={filterData.category}
                            onChange={(event) =>
                                setFilterData((current) => ({
                                    ...current,
                                    category: event.target.value,
                                }))
                            }
                            className="field"
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
                            className="field"
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
                            className="field"
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
                            className="field"
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
                            aria-label="From date"
                            className="field"
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
                            aria-label="To date"
                            className="field"
                            type="date"
                        />
                    </div>
                )}
            </form>

            <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.78fr]">
                <section className="card p-5 sm:p-6">
                    <SectionHeading
                        icon={Plus}
                        title="Add a receipt or purchase"
                        subtitle="Upload only the receipt, or record all purchase details."
                    />

                    <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-white/10 p-1">
                        <button
                            type="button"
                            onClick={() => setUploadMode('receipt')}
                            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                                uploadMode === 'receipt'
                                    ? 'bg-white/5 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            Receipt only
                        </button>
                        <button
                            type="button"
                            onClick={() => setUploadMode('expense')}
                            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                                uploadMode === 'expense'
                                    ? 'bg-white/5 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white'
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
                            <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-sm text-sky-200">
                                Choose a receipt. OCR will read its supplier,
                                date, totals, and line items for the Excel
                                export—no manual purchase details are required.
                            </div>

                            <FormField
                                label="Receipt"
                                error={receiptOnlyForm.errors.receipt}
                            >
                                <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed hairline bg-white/5 px-4 py-6 text-center text-sm text-slate-300 transition hover:border-brand-400/50 hover:bg-brand-500/10">
                                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-brand-600 shadow-sm">
                                        <Upload className="h-5 w-5" />
                                    </span>
                                    <span className="font-semibold text-white">
                                        {receiptOnlyForm.data.receipt?.name ||
                                            'Choose JPG or PNG receipt'}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        JPG or PNG up to 5 MB
                                    </span>
                                    <input
                                        ref={receiptOnlyInputRef}
                                        onChange={handleReceiptOnlyChange}
                                        className="sr-only"
                                        type="file"
                                        accept=".jpg,.jpeg,.png"
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
                                    className="btn btn-primary"
                                >
                                    <Upload className="h-4 w-4" />
                                    Upload receipt
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form
                            onSubmit={submitExpense}
                            className="mt-5 space-y-5"
                        >
                            <div className="grid gap-4 md:grid-cols-2">
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
                                        className="field"
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
                                        className="field"
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
                                        className="field"
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
                                        className="field"
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
                                        className="field"
                                    >
                                        {statuses.map((status) => (
                                            <option key={status} value={status}>
                                                {statusLabels[status]}
                                            </option>
                                        ))}
                                    </select>
                                </FormField>
                            </div>

                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <h3 className="text-sm font-semibold text-white">
                                            Items in this purchase
                                        </h3>
                                        <p className="text-xs text-slate-400">
                                            Pick an item from your catalogue or
                                            add a brand-new one.
                                        </p>
                                    </div>
                                    <span className="badge bg-brand-500/15 text-brand-300">
                                        Total {formatMoney(grandTotal)}
                                    </span>
                                </div>

                                {items.map((item, index) => (
                                    <ItemRow
                                        key={index}
                                        index={index}
                                        item={item}
                                        materials={materials}
                                        categories={categories}
                                        canRemove={items.length > 1}
                                        error={(field) =>
                                            itemError(index, field)
                                        }
                                        onPickMaterial={(value) =>
                                            pickMaterial(index, value)
                                        }
                                        onField={(field, value) =>
                                            changeItemField(index, field, value)
                                        }
                                        onRemove={() => removeItem(index)}
                                    />
                                ))}

                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="inline-flex items-center gap-2 rounded-lg border border-dashed hairline px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-brand-400/50 hover:bg-brand-500/10 hover:text-brand-200"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add item
                                </button>
                            </div>

                            <FormField
                                label="Receipt (optional)"
                                error={expenseForm.errors.receipt}
                            >
                                <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed hairline px-3 py-2.5 text-sm text-slate-300 transition hover:border-brand-400/50 hover:bg-brand-500/10">
                                    <span className="flex items-center gap-2 truncate">
                                        <Upload className="h-4 w-4 shrink-0 text-slate-400" />
                                        <span className="truncate">
                                            {expenseForm.data.receipt?.name ||
                                                'Attach a JPG or PNG receipt to auto-fill items'}
                                        </span>
                                    </span>
                                    <input
                                        ref={fileInputRef}
                                        onChange={handleReceiptChange}
                                        className="sr-only"
                                        type="file"
                                        accept=".jpg,.jpeg,.png"
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
                                    className="field min-h-24"
                                    placeholder="Delivery details, approvals, invoice number"
                                />
                            </FormField>

                            <div className="flex flex-wrap items-center justify-between gap-3 border-t hairline pt-4">
                                <p className="text-sm text-slate-400">
                                    {items.length} item
                                    {items.length === 1 ? '' : 's'} ·{' '}
                                    <span className="font-semibold text-white">
                                        {formatMoney(grandTotal)}
                                    </span>
                                </p>
                                <button
                                    type="submit"
                                    disabled={expenseForm.processing}
                                    className="btn btn-primary"
                                >
                                    <Plus className="h-4 w-4" />
                                    Save purchase
                                </button>
                            </div>
                        </form>
                    )}
                </section>

                <div className="space-y-5">
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

                    <section className="card p-5 sm:p-6">
                        <SectionHeading
                            icon={FolderPlus}
                            title="New project"
                            subtitle="Assign purchases to sites"
                        />

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
                                    className="field"
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
                                        className="field"
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
                                        className="field"
                                        min="0"
                                        step="1"
                                        type="number"
                                    />
                                </FormField>
                            </div>
                            <button
                                type="submit"
                                disabled={projectForm.processing}
                                className="btn btn-primary"
                            >
                                <FolderPlus className="h-4 w-4" />
                                Create project
                            </button>
                        </form>
                    </section>
                </div>
            </div>

            <ReceiptAssistant />

            <section className="card mt-5 overflow-hidden">
                <div className="flex flex-col gap-2 border-b hairline p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div>
                        <h2 className="text-base font-bold text-white">
                            Purchase log
                        </h2>
                        <p className="mt-0.5 text-sm text-slate-400">
                            Receipts, payment state, and project allocation
                        </p>
                    </div>
                    <span className="badge bg-white/10 text-slate-300">
                        {expenses.total} records
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y hairline">
                        <thead className="bg-white/[0.04]">
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
                        <tbody className="divide-y hairline bg-white/5">
                            {expenses.data.length ? (
                                expenses.data.map((expense) => (
                                    <tr
                                        key={expense.id}
                                        className="transition hover:bg-white/[0.04]"
                                    >
                                        <TableCell>
                                            <p className="font-semibold text-white">
                                                {expense.title}
                                            </p>
                                            <p className="mt-0.5 text-sm text-slate-400">
                                                {expense.entryType === 'receipt'
                                                    ? expense.receiptOriginalName
                                                    : `${expense.vendor || 'No vendor'} · ${expense.category}`}
                                            </p>
                                            {expense.lineItems?.length > 1 && (
                                                <ul className="mt-1.5 max-w-xs space-y-0.5 text-xs text-slate-400">
                                                    {expense.lineItems.map(
                                                        (line, lineIndex) => (
                                                            <li
                                                                key={lineIndex}
                                                                className="flex justify-between gap-3"
                                                            >
                                                                <span className="truncate">
                                                                    {line.quantity !==
                                                                    null
                                                                        ? `${Number(line.quantity)} × `
                                                                        : ''}
                                                                    {
                                                                        line.description
                                                                    }
                                                                </span>
                                                                <span className="shrink-0 tabular-nums">
                                                                    {formatMoney(
                                                                        line.total ||
                                                                            0,
                                                                    )}
                                                                </span>
                                                            </li>
                                                        ),
                                                    )}
                                                </ul>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {expense.project?.name ? (
                                                <span className="badge bg-white/10 text-slate-300">
                                                    {expense.project.name}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">
                                                    Unassigned
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center gap-2 text-slate-300">
                                                <CalendarDays className="h-4 w-4 text-slate-400" />
                                                {expense.purchaseDate}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {expense.lineItems?.length > 1
                                                ? `${expense.lineItems.length} items`
                                                : expense.quantity !== null
                                                  ? `${Number(expense.quantity).toFixed(1)} ${expense.unit || ''}`
                                                  : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {expense.entryType === 'receipt' ? (
                                                expense.paymentMethod ===
                                                'Not provided' ? (
                                                    <span className="text-slate-400">
                                                        Not provided
                                                    </span>
                                                ) : (
                                                    <span>
                                                        {expense.paymentMethod}
                                                    </span>
                                                )
                                            ) : (
                                                <div className="space-y-1">
                                                    <span className="text-slate-300">
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
                                                    <span className="font-semibold text-white">
                                                        {formatReceiptAmount(
                                                            expense.totalAmount,
                                                            expense.receiptCurrency,
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">
                                                        Not provided
                                                    </span>
                                                )
                                            ) : (
                                                <span className="font-semibold text-white">
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
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border hairline text-slate-300 transition hover:border-brand-400/40 hover:bg-brand-500/10 hover:text-brand-200"
                                                    aria-label="Open receipt"
                                                    title="Open receipt"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </a>
                                            ) : (
                                                <span className="text-slate-400">
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
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-500/30 text-rose-400 transition hover:bg-rose-500/10"
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
                                        className="px-4 py-12 text-center text-sm text-slate-400"
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
        message: 'Sending receipt to Amazon Textract',
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
            message: 'Amazon Textract scan complete',
        });
    } catch (error) {
        setOcrState({
            status: 'error',
            progress: 0,
            message:
                error.response?.data?.message ||
                'Amazon Textract is unavailable. Enter the details manually.',
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

function canPreviewReceipt(file) {
    return ['image/jpeg', 'image/png'].includes(file?.type);
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
    ].filter(
        ([, value]) => value !== null && value !== undefined && value !== '',
    );

    const scanning = ocrState.status === 'scanning';
    const error = ocrState.status === 'error';

    return (
        <section className="card p-5 sm:p-6">
            <SectionHeading
                icon={FileImage}
                title="Receipt scanner"
                subtitle="Amazon Textract analysis for JPG/PNG receipts"
                accent="sky"
            />

            <div className="mt-5 overflow-hidden rounded-xl border hairline bg-white/5">
                {receiptPreview ? (
                    <img
                        src={receiptPreview}
                        alt="Receipt preview"
                        className="max-h-72 w-full object-contain"
                    />
                ) : (
                    <div className="flex h-44 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-slate-400">
                        <FileImage className="h-7 w-7 text-slate-300" />
                        {receiptName || 'No receipt selected'}
                    </div>
                )}
            </div>

            <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                    <span
                        className={`font-medium ${error ? 'text-rose-400' : 'text-slate-200'}`}
                    >
                        {scanning
                            ? 'Scanning…'
                            : ocrState.message || 'Ready'}
                    </span>
                    <span className="text-slate-400">{ocrState.progress}%</span>
                </div>
                <div className="meter-track mt-2 h-2">
                    <div
                        className={`h-2 rounded-full transition-all ${error ? 'bg-rose-500' : 'bg-brand-600'} ${scanning ? 'shimmer' : ''}`}
                        style={{ width: `${ocrState.progress}%` }}
                    />
                </div>
            </div>

            {extractedFields.length > 0 && (
                <div className="mt-4 grid gap-3 rounded-xl border hairline bg-white/5 p-4 sm:grid-cols-2">
                    {extractedFields.map(([label, value]) => (
                        <div key={label}>
                            <p className="eyebrow">{label}</p>
                            <p className="mt-1 break-words text-sm font-semibold text-white">
                                {value}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {scanData.receipt_items?.length > 0 && (
                <div className="mt-4 overflow-x-auto rounded-xl border hairline">
                    <table className="min-w-full divide-y hairline text-sm">
                        <thead className="bg-white/5 text-left text-xs font-semibold text-slate-400">
                            <tr>
                                <th className="px-3 py-2">Item</th>
                                <th className="px-3 py-2">Catalog match</th>
                                <th className="px-3 py-2">Qty</th>
                                <th className="px-3 py-2">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y hairline bg-white/5">
                            {scanData.receipt_items.map((item, index) => (
                                <tr key={`${item.description}-${index}`}>
                                    <td className="px-3 py-2 text-slate-200">
                                        {item.description}
                                    </td>
                                    <td className="px-3 py-2">
                                        <CatalogMatch item={item} />
                                    </td>
                                    <td className="px-3 py-2 text-slate-300">
                                        {item.quantity ?? '-'}
                                        {item.normalized_unit
                                            ? ` ${item.normalized_unit}`
                                            : ''}
                                    </td>
                                    <td className="px-3 py-2 font-medium text-slate-200">
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
                className="field mt-4 min-h-32"
                placeholder="Amazon Textract OCR text appears here"
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

function CatalogMatch({ item }) {
    const confidence =
        item.match_confidence !== null && item.match_confidence !== undefined
            ? Math.round(Number(item.match_confidence) * 100)
            : null;

    if (item.material_name) {
        return (
            <span className="inline-flex items-center gap-1.5">
                <span className="badge bg-brand-500/15 text-brand-300">
                    {item.material_name}
                </span>
                {confidence !== null && (
                    <span className="text-xs text-slate-400">
                        {confidence}%
                    </span>
                )}
            </span>
        );
    }

    if (item.canonical_name) {
        return (
            <span className="text-xs text-slate-400">
                {item.canonical_name}
                <span className="ml-1 text-slate-400">(unmatched)</span>
            </span>
        );
    }

    return <span className="text-xs text-slate-400">-</span>;
}

function ReceiptAssistant() {
    const [question, setQuestion] = useState('');
    const [state, setState] = useState({
        status: 'idle',
        answer: '',
        error: '',
        count: null,
        table: null,
    });
    const [download, setDownload] = useState({ format: null, error: '' });

    const ask = async (event) => {
        event.preventDefault();
        const trimmed = question.trim();

        if (!trimmed || state.status === 'loading') {
            return;
        }

        setState({
            status: 'loading',
            answer: '',
            error: '',
            count: null,
            table: null,
        });
        setDownload({ format: null, error: '' });

        try {
            const response = await window.axios.post(
                route('tools.receipts.query'),
                { question: trimmed },
                { headers: { Accept: 'application/json' } },
            );

            setState({
                status: 'done',
                answer: response.data.answer || '',
                error: '',
                count: response.data.recordCount ?? null,
                table: response.data.table || null,
            });
        } catch (error) {
            setState({
                status: 'error',
                answer: '',
                error:
                    error.response?.data?.message ||
                    'The assistant could not answer that. Please try again.',
                count: null,
                table: null,
            });
        }
    };

    const downloadReport = async (format) => {
        if (!state.table || download.format !== null) {
            return;
        }

        setDownload({ format, error: '' });

        try {
            const response = await window.axios.post(
                route('tools.receipts.report'),
                {
                    format,
                    title: state.table.title,
                    columns: state.table.columns,
                    rows: state.table.rows,
                },
                { responseType: 'blob' },
            );

            triggerDownload(response, format);
            setDownload({ format: null, error: '' });
        } catch (error) {
            setDownload({
                format: null,
                error: 'The file could not be generated. Please try again.',
            });
        }
    };

    const examples = [
        'How much did I spend on cement last month?',
        'Which vendor did I spend the most with?',
        'List all pending receipts and their totals.',
    ];

    return (
        <section className="card relative mt-5 overflow-hidden p-5 sm:p-6">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
            <SectionHeading
                icon={Sparkles}
                title="Ask about your receipts"
                subtitle="Plain-language answers drawn from your scanned receipts and recorded purchases"
                accent="violet"
            />

            <form onSubmit={ask} className="mt-5 flex flex-col gap-3 sm:flex-row">
                <input
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    className="field"
                    placeholder="e.g. How much did I spend on cement last month?"
                    type="text"
                />
                <button
                    type="submit"
                    disabled={state.status === 'loading' || !question.trim()}
                    className="btn btn-primary shrink-0"
                >
                    <Send className="h-4 w-4" />
                    {state.status === 'loading' ? 'Thinking…' : 'Ask'}
                </button>
            </form>

            <div className="mt-3 flex flex-wrap gap-2">
                {examples.map((example) => (
                    <button
                        key={example}
                        type="button"
                        onClick={() => setQuestion(example)}
                        className="rounded-full border hairline bg-white/5 px-3 py-1 text-xs text-slate-300 transition hover:border-brand-400/40 hover:bg-brand-500/10 hover:text-brand-200"
                    >
                        {example}
                    </button>
                ))}
            </div>

            {state.status === 'error' && (
                <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                    {state.error}
                </div>
            )}

            {state.status === 'done' && (
                <div className="mt-4 space-y-4">
                    {state.answer && (
                        <div className="rounded-xl border hairline bg-white/5 p-4">
                            <p className="whitespace-pre-wrap text-sm text-slate-200">
                                {state.answer}
                            </p>
                            {state.count !== null && (
                                <p className="mt-3 text-xs text-slate-400">
                                    Based on {state.count} record
                                    {state.count === 1 ? '' : 's'}.
                                </p>
                            )}
                        </div>
                    )}

                    {state.table && (
                        <AssistantTable
                            table={state.table}
                            download={download}
                            onDownload={downloadReport}
                        />
                    )}
                </div>
            )}
        </section>
    );
}

function AssistantTable({ table, download, onDownload }) {
    const downloadOptions = [
        { format: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
        { format: 'pdf', label: 'PDF', icon: FileText },
    ];

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">
                    {table.title}
                </h3>
                <div className="flex gap-2">
                    {downloadOptions.map(({ format, label, icon: Icon }) => (
                        <button
                            key={format}
                            type="button"
                            onClick={() => onDownload(format)}
                            disabled={download.format !== null}
                            className="inline-flex items-center gap-1.5 rounded-lg border hairline bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-sm transition hover:bg-white/5 disabled:opacity-50"
                        >
                            {download.format === format ? (
                                <Download className="h-3.5 w-3.5 animate-pulse" />
                            ) : (
                                <Icon className="h-3.5 w-3.5" />
                            )}
                            {download.format === format
                                ? 'Preparing…'
                                : label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border hairline">
                <table className="min-w-full divide-y hairline text-sm">
                    <thead className="bg-white/5 text-left text-xs font-semibold text-slate-400">
                        <tr>
                            {table.columns.map((column, index) => (
                                <th
                                    key={`${column}-${index}`}
                                    className="px-3 py-2"
                                >
                                    {column}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y hairline bg-white/5">
                        {table.rows.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                {row.map((cell, cellIndex) => (
                                    <td
                                        key={cellIndex}
                                        className="px-3 py-2 text-slate-200"
                                    >
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {download.error && (
                <p className="text-xs text-rose-400">{download.error}</p>
            )}
        </div>
    );
}

function triggerDownload(response, format) {
    const blob = new Blob([response.data], {
        type:
            response.headers?.['content-type'] ||
            (format === 'pdf'
                ? 'application/pdf'
                : 'application/octet-stream'),
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download =
        filenameFromHeaders(response.headers) ||
        `receipt-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function filenameFromHeaders(headers) {
    const disposition = headers?.['content-disposition'] || '';
    const match = /filename="?([^";]+)"?/.exec(disposition);

    return match ? match[1] : null;
}

function ItemRow({
    index,
    item,
    materials,
    categories,
    canRemove,
    error,
    onPickMaterial,
    onField,
    onRemove,
}) {
    return (
        <div className="rounded-xl border hairline bg-white/[0.04] p-4">
            <div className="flex items-center justify-between">
                <p className="badge bg-white/5 text-slate-300 shadow-sm">
                    Item {index + 1}
                </p>
                {canRemove && (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 transition hover:text-rose-200"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                    </button>
                )}
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
                <FormField label="From catalogue">
                    <select
                        value={item.material_id}
                        onChange={(event) => onPickMaterial(event.target.value)}
                        className="field"
                    >
                        <option value="">+ New item</option>
                        {materials.map((material) => (
                            <option key={material.id} value={material.id}>
                                {material.name} —{' '}
                                {formatMoney(material.defaultUnitPrice)}/
                                {material.unit}
                            </option>
                        ))}
                    </select>
                </FormField>
                <FormField label="Item name" error={error('description')}>
                    <input
                        value={item.description}
                        onChange={(event) =>
                            onField('description', event.target.value)
                        }
                        className="field"
                        placeholder="e.g. Cement 42.5"
                    />
                </FormField>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <FormField label="Category" error={error('category')}>
                    <select
                        value={item.category}
                        onChange={(event) =>
                            onField('category', event.target.value)
                        }
                        className="field"
                    >
                        {categories.map((category) => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}
                    </select>
                </FormField>
                <FormField label="Quantity" error={error('quantity')}>
                    <input
                        value={item.quantity}
                        onChange={(event) =>
                            onField('quantity', event.target.value)
                        }
                        className="field"
                        min="0"
                        step="0.1"
                        type="number"
                        placeholder="0"
                    />
                </FormField>
                <FormField label="Unit" error={error('unit')}>
                    <input
                        value={item.unit}
                        onChange={(event) => onField('unit', event.target.value)}
                        className="field"
                        placeholder="bag, pcs"
                    />
                </FormField>
                <FormField label="Unit price" error={error('unit_price')}>
                    <input
                        value={item.unit_price}
                        onChange={(event) =>
                            onField('unit_price', event.target.value)
                        }
                        className="field"
                        min="0"
                        step="1"
                        type="number"
                        placeholder="0"
                    />
                </FormField>
                <FormField label="Line total" error={error('total')}>
                    <input
                        value={item.total}
                        onChange={(event) =>
                            onField('total', event.target.value)
                        }
                        className="field"
                        min="0"
                        step="1"
                        type="number"
                        placeholder="0"
                    />
                </FormField>
            </div>
        </div>
    );
}

function lineTotal(quantity, unitPrice, fallback) {
    if (
        quantity === '' ||
        quantity === null ||
        unitPrice === '' ||
        unitPrice === null
    ) {
        return fallback;
    }

    const total = Number(quantity) * Number(unitPrice);

    return Number.isFinite(total) ? String(round2(total)) : fallback;
}

function round2(value) {
    return Math.round(value * 100) / 100;
}

function itemsFromScan(scan, materials, categories) {
    return (scan.items || []).map((item) => {
        const material = item.material_id
            ? materials.find((m) => String(m.id) === String(item.material_id))
            : null;

        return {
            material_id: material ? String(material.id) : '',
            description: item.description || item.canonical_name || '',
            category: material?.category || categories[0] || 'Other',
            unit: item.normalized_unit || material?.unit || '',
            quantity: item.quantity != null ? String(item.quantity) : '',
            unit_price: item.unit_price != null ? String(item.unit_price) : '',
            total: item.total != null ? String(item.total) : '',
        };
    });
}

function SummaryCard({ label, value, icon: Icon, accent = 'brand' }) {
    const accents = {
        brand: 'bg-brand-500/15 text-brand-300',
        sky: 'bg-sky-500/15 text-sky-300',
        amber: 'bg-amber-500/15 text-amber-300',
        violet: 'bg-violet-500/15 text-violet-300',
    };

    return (
        <section className="card card-hover p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="eyebrow">{label}</p>
                    <p className="mt-2 truncate text-2xl font-bold text-white">
                        {value}
                    </p>
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

function SectionHeading({ icon: Icon, title, subtitle, accent = 'brand' }) {
    const accents = {
        brand: 'bg-brand-500/15 text-brand-300',
        sky: 'bg-sky-500/15 text-sky-300',
        violet: 'bg-violet-500/15 text-violet-300',
    };

    return (
        <div className="flex items-center gap-3">
            <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accents[accent]}`}
            >
                <Icon className="h-5 w-5" />
            </span>
            <div>
                <h2 className="text-base font-bold text-white">{title}</h2>
                {subtitle && (
                    <p className="text-sm text-slate-400">{subtitle}</p>
                )}
            </div>
        </div>
    );
}

function FormField({ label, error, children }) {
    return (
        <div>
            <span className="label">{label}</span>
            <div className="mt-1.5">{children}</div>
            <InputError message={error} className="mt-2" />
        </div>
    );
}

function TableHead({ children }) {
    return (
        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
            {children}
        </th>
    );
}

function TableCell({ children }) {
    return (
        <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-200">
            {children}
        </td>
    );
}

function StatusBadge({ status }) {
    const classes = {
        paid: 'bg-brand-500/15 text-brand-300',
        pending: 'bg-amber-500/15 text-amber-300',
        reconciled: 'bg-sky-500/15 text-sky-300',
    };

    return (
        <span className={`badge ${classes[status] || 'bg-white/10 text-slate-300'}`}>
            {statusLabels[status] || status}
        </span>
    );
}

function Pagination({ links }) {
    if (!links || links.length <= 3) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-2 border-t hairline p-4">
            {links.map((link, index) =>
                link.url ? (
                    <Link
                        key={`${link.label}-${index}`}
                        href={link.url}
                        preserveScroll
                        className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                            link.active
                                ? 'border-brand-400/60 bg-brand-500/15 text-brand-300'
                                : 'border-transparent text-slate-300 hover:bg-white/10'
                        }`}
                        dangerouslySetInnerHTML={{
                            __html: cleanPaginationLabel(link.label),
                        }}
                    />
                ) : (
                    <span
                        key={`${link.label}-${index}`}
                        className="rounded-lg px-3 py-2 text-sm text-slate-300"
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
