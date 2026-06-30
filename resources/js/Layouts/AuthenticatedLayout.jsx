import { Link, usePage } from '@inertiajs/react';
import {
    Calculator,
    ChevronsUpDown,
    Construction,
    LayoutDashboard,
    LifeBuoy,
    LogOut,
    Menu,
    ReceiptText,
    Settings,
    UserRound,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const navGroups = [
    {
        label: 'Workspace',
        items: [
            {
                name: 'Dashboard',
                route: 'dashboard',
                icon: LayoutDashboard,
            },
            {
                name: 'Expenses',
                route: 'tools.expenses',
                icon: ReceiptText,
            },
            {
                name: 'Calculators',
                route: 'tools.calculators',
                icon: Calculator,
            },
        ],
    },
];

export default function AuthenticatedLayout({ header, children }) {
    const { auth, flash } = usePage().props;
    const user = auth.user;
    const [mobileOpen, setMobileOpen] = useState(false);
    const [flashVisible, setFlashVisible] = useState(true);

    useEffect(() => {
        setFlashVisible(true);
    }, [flash?.status]);

    return (
        <div className="app-canvas min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
            {/* Desktop sidebar */}
            <Sidebar user={user} className="hidden lg:flex" />

            {/* Mobile sidebar */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div
                        className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
                        onClick={() => setMobileOpen(false)}
                    />
                    <Sidebar
                        user={user}
                        className="absolute inset-y-0 left-0 flex w-72 fade-in"
                        onNavigate={() => setMobileOpen(false)}
                        onClose={() => setMobileOpen(false)}
                    />
                </div>
            )}

            <div className="flex min-h-screen flex-col">
                {/* Top bar */}
                <header className="glass-nav sticky top-0 z-30 border-b hairline">
                    <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
                        <button
                            type="button"
                            onClick={() => setMobileOpen(true)}
                            className="btn btn-secondary h-10 w-10 !p-0 lg:hidden"
                            aria-label="Open navigation"
                        >
                            <Menu className="h-5 w-5" />
                        </button>

                        <Link
                            href="/"
                            className="flex items-center gap-2.5 lg:hidden"
                        >
                            <BrandMark />
                            <span className="text-base font-bold text-white">
                                SiteTools
                            </span>
                        </Link>

                        <div className="hidden flex-1 items-center gap-2 text-sm font-medium text-slate-400 lg:flex">
                            <span className="text-slate-300">/</span>
                            <span className="text-slate-300">
                                {currentSectionName()}
                            </span>
                        </div>

                        <div className="hidden items-center gap-2 lg:flex">
                            <Link
                                href={route('tools.expenses')}
                                className="btn btn-primary"
                            >
                                <ReceiptText className="h-4 w-4" />
                                New expense
                            </Link>
                            <UserMenu user={user} />
                        </div>
                    </div>
                </header>

                {/* Page header band */}
                {header && (
                    <div className="border-b hairline bg-white/5">
                        <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
                            {header}
                        </div>
                    </div>
                )}

                {flash?.status && flashVisible && (
                    <div className="px-4 pt-4 sm:px-6 lg:px-8">
                        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-sm font-medium text-brand-200 fade-up">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
                                <ReceiptText className="h-4 w-4" />
                            </span>
                            <span className="flex-1">{flash.status}</span>
                            <button
                                type="button"
                                onClick={() => setFlashVisible(false)}
                                className="rounded-md p-1 text-brand-300/70 transition hover:bg-brand-500/20 hover:text-brand-100"
                                aria-label="Dismiss"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}

                <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                    {children}
                </main>

                <footer className="border-t hairline">
                    <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-slate-400 sm:flex-row sm:px-6 lg:px-8">
                        <span className="flex items-center gap-2">
                            <Construction className="h-3.5 w-3.5 text-brand-600" />
                            <span className="font-semibold text-slate-200">
                                SiteTools
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                                © {new Date().getFullYear()} All rights reserved
                            </span>
                        </span>
                        <span>Construction expense &amp; field operations</span>
                    </div>
                </footer>
            </div>
        </div>
    );
}

function Sidebar({ user, className = '', onNavigate, onClose }) {
    return (
        <aside
            className={`ink-panel flex-col border-r border-white/5 text-slate-300 ${className}`}
        >
            <div className="flex h-16 items-center justify-between px-5">
                <Link
                    href="/"
                    onClick={onNavigate}
                    className="flex items-center gap-2.5"
                >
                    <BrandMark />
                    <span className="text-base font-bold tracking-tight text-white">
                        SiteTools
                    </span>
                </Link>
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                        aria-label="Close navigation"
                    >
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>

            <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
                {navGroups.map((group) => (
                    <div key={group.label}>
                        <p className="px-3 pb-2 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-slate-400">
                            {group.label}
                        </p>
                        <div className="space-y-1">
                            {group.items.map((item) => (
                                <NavItem
                                    key={item.name}
                                    item={item}
                                    onNavigate={onNavigate}
                                />
                            ))}
                        </div>
                    </div>
                ))}

                <div className="px-1">
                    <UsageCard />
                </div>
            </nav>

            <div className="border-t border-white/5 p-3">
                <a href="mailto:support@sitetools.app" className="nav-link">
                    <LifeBuoy className="h-[18px] w-[18px]" />
                    Help &amp; support
                </a>
                <Link
                    href={route('profile.edit')}
                    onClick={onNavigate}
                    className="mt-1 flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-2.5 transition hover:bg-white/10"
                >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold text-white">
                        {initials(user.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-white">
                            {user.name}
                        </span>
                        <span className="block truncate text-xs text-slate-400">
                            {user.email}
                        </span>
                    </span>
                    <Settings className="h-4 w-4 shrink-0 text-slate-400" />
                </Link>
            </div>
        </aside>
    );
}

function NavItem({ item, onNavigate }) {
    const active = route().current(item.route);
    const Icon = item.icon;

    return (
        <Link
            href={route(item.route)}
            onClick={onNavigate}
            className={`nav-link ${active ? 'nav-link-active' : ''}`}
        >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {item.name}
        </Link>
    );
}

function UsageCard() {
    return (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold text-white">Field-ready</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
                Scan a receipt and let AI sort the line items into your budget.
            </p>
            <Link
                href={route('tools.expenses')}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-300 transition hover:text-brand-200"
            >
                Scan a receipt
                <ReceiptText className="h-3.5 w-3.5" />
            </Link>
        </div>
    );
}

function UserMenu({ user }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl border hairline bg-white/5 px-2 py-1.5 text-sm font-medium text-slate-200 shadow-sm transition hover:bg-white/5"
            >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-bold text-white">
                    {initials(user.name)}
                </span>
                <span className="max-w-[8rem] truncate">{user.name}</span>
                <ChevronsUpDown className="h-4 w-4 text-slate-400" />
            </button>

            {open && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setOpen(false)}
                    />
                    <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border hairline bg-ink-soft p-1.5 shadow-2xl shadow-black/50 fade-up">
                        <div className="px-3 py-2">
                            <p className="truncate text-sm font-semibold text-white">
                                {user.name}
                            </p>
                            <p className="truncate text-xs text-slate-400">
                                {user.email}
                            </p>
                        </div>
                        <div className="my-1 border-t hairline" />
                        <Link
                            href={route('profile.edit')}
                            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                        >
                            <UserRound className="h-4 w-4 text-slate-400" />
                            Profile settings
                        </Link>
                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-400 transition hover:bg-rose-500/10"
                        >
                            <LogOut className="h-4 w-4" />
                            Log out
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}

function BrandMark() {
    return (
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-900/30 ring-1 ring-white/20">
            <Construction className="h-5 w-5" />
        </span>
    );
}

function currentSectionName() {
    const all = navGroups.flatMap((group) => group.items);
    const match = all.find((item) => route().current(item.route));

    if (match) return match.name;
    if (route().current('profile.edit')) return 'Profile';

    return 'SiteTools';
}

function initials(name = '') {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

export function PageHeader({ eyebrow, title, description, actions }) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                {eyebrow && <p className="eyebrow">{eyebrow}</p>}
                <h1 className="mt-1 truncate text-xl font-bold text-white sm:text-2xl">
                    {title}
                </h1>
                {description && (
                    <p className="mt-1 text-sm text-slate-400">{description}</p>
                )}
            </div>
            {actions && (
                <div className="flex flex-wrap items-center gap-2">{actions}</div>
            )}
        </div>
    );
}
