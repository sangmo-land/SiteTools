import Dropdown from '@/Components/Dropdown';
import { Link, usePage } from '@inertiajs/react';
import {
    Calculator,
    ChevronDown,
    ClipboardList,
    Construction,
    LayoutDashboard,
    LogOut,
    Menu,
    ReceiptText,
    UserRound,
    X,
} from 'lucide-react';
import { useState } from 'react';

export default function AuthenticatedLayout({ header, children }) {
    const { auth, flash } = usePage().props;
    const user = auth.user;
    const [showingNavigationDropdown, setShowingNavigationDropdown] =
        useState(false);

    const navItems = [
        {
            name: 'Dashboard',
            href: route('dashboard'),
            active: route().current('dashboard'),
            icon: LayoutDashboard,
        },
        {
            name: 'Expenses',
            href: route('tools.expenses'),
            active: route().current('tools.expenses'),
            icon: ReceiptText,
        },
        {
            name: 'Calculators',
            href: route('tools.calculators'),
            active: route().current('tools.calculators'),
            icon: Calculator,
        },
    ];

    return (
        <div className="site-app-bg flex min-h-screen flex-col text-zinc-950">
            <nav className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 shadow-sm backdrop-blur-xl">
                <div className="workline h-1" />
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-8">
                        <Link
                            href={route('dashboard')}
                            className="flex items-center gap-3 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                        >
                            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-600 text-white shadow-lg shadow-emerald-700/20 ring-1 ring-emerald-300/60">
                                <Construction className="h-5 w-5" />
                            </span>
                            <span className="text-lg font-semibold text-zinc-950">
                                SiteTools
                            </span>
                        </Link>

                        <div className="hidden items-center gap-1 md:flex">
                            {navItems.map((item) => (
                                <DesktopNavItem key={item.name} {...item} />
                            ))}
                        </div>
                    </div>

                    <div className="hidden items-center gap-3 md:flex">
                        <Dropdown>
                            <Dropdown.Trigger>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white/80 px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                                >
                                    <UserRound className="h-4 w-4" />
                                    <span>{user.name}</span>
                                    <ChevronDown className="h-4 w-4" />
                                </button>
                            </Dropdown.Trigger>

                            <Dropdown.Content>
                                <Dropdown.Link href={route('profile.edit')}>
                                    Profile
                                </Dropdown.Link>
                                <Dropdown.Link
                                    href={route('logout')}
                                    method="post"
                                    as="button"
                                >
                                    Log Out
                                </Dropdown.Link>
                            </Dropdown.Content>
                        </Dropdown>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            setShowingNavigationDropdown((current) => !current)
                        }
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-200 bg-white/80 text-zinc-700 shadow-sm transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 md:hidden"
                        aria-label="Toggle navigation"
                    >
                        {showingNavigationDropdown ? (
                            <X className="h-5 w-5" />
                        ) : (
                            <Menu className="h-5 w-5" />
                        )}
                    </button>
                </div>

                {showingNavigationDropdown && (
                    <div className="border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
                        <div className="space-y-1">
                            {navItems.map((item) => (
                                <MobileNavItem key={item.name} {...item} />
                            ))}
                        </div>
                        <div className="mt-4 border-t border-zinc-200 pt-4">
                            <div className="px-2 text-sm font-semibold text-zinc-900">
                                {user.name}
                            </div>
                            <div className="px-2 text-sm text-zinc-500">
                                {user.email}
                            </div>
                            <div className="mt-3 grid gap-1">
                                <MobileNavItem
                                    name="Profile"
                                    href={route('profile.edit')}
                                    active={route().current('profile.edit')}
                                    icon={UserRound}
                                />
                                <Link
                                    method="post"
                                    href={route('logout')}
                                    as="button"
                                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Log Out
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {flash?.status && (
                <div className="border-b border-emerald-200 bg-emerald-50/95">
                    <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 text-sm font-medium text-emerald-800 sm:px-6 lg:px-8">
                        <ClipboardList className="h-4 w-4" />
                        {flash.status}
                    </div>
                </div>
            )}

            {header && (
                <header className="border-b border-zinc-200 bg-white/80 backdrop-blur">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        {header}
                    </div>
                </header>
            )}

            <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
                {children}
            </main>

            <footer className="mt-8 border-t border-zinc-200 bg-white/70 backdrop-blur">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-zinc-500 sm:flex-row sm:px-6 lg:px-8">
                    <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-600 text-white">
                            <Construction className="h-3.5 w-3.5" />
                        </span>
                        <span className="font-medium text-zinc-700">
                            SiteTools
                        </span>
                        <span aria-hidden="true">&middot;</span>
                        <span>
                            &copy; {new Date().getFullYear()} All rights
                            reserved
                        </span>
                    </div>
                    <p>Construction site expense &amp; field operations</p>
                </div>
            </footer>
        </div>
    );
}

function DesktopNavItem({ name, href, active, icon: Icon }) {
    return (
        <Link
            href={href}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                active
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/20'
                    : 'text-zinc-600 hover:bg-amber-50 hover:text-zinc-950'
            }`}
        >
            <Icon className="h-4 w-4" />
            {name}
        </Link>
    );
}

function MobileNavItem({ name, href, active, icon: Icon }) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                active
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-zinc-700 hover:bg-zinc-100'
            }`}
        >
            <Icon className="h-4 w-4" />
            {name}
        </Link>
    );
}
