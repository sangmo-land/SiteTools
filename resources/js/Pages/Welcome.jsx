import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Calculator,
    Construction,
    ReceiptText,
    ShieldCheck,
    WalletCards,
} from 'lucide-react';

export default function Welcome({ auth }) {
    return (
        <>
            <Head title="Welcome" />
            <div className="min-h-screen bg-zinc-950 text-white">
                <header className="absolute left-0 right-0 top-0 z-20">
                    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                        <Link
                            href="/"
                            className="flex items-center gap-3 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
                        >
                            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-zinc-950">
                                <Construction className="h-5 w-5" />
                            </span>
                            <span className="text-lg font-semibold">
                                SiteTools
                            </span>
                        </Link>

                        <nav className="flex items-center gap-2">
                            {auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={route('login')}
                                        className="rounded-md px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        href={route('register')}
                                        className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                    >
                                        Register
                                    </Link>
                                </>
                            )}
                        </nav>
                    </div>
                </header>

                <section className="relative min-h-[84vh] overflow-hidden">
                    <img
                        src="/images/site-tools-hero.png"
                        alt="Construction materials and site expense dashboard"
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-zinc-950/60" />
                    <div className="relative z-10 mx-auto flex min-h-[84vh] max-w-7xl items-center px-4 pb-16 pt-24 sm:px-6 lg:px-8">
                        <div className="max-w-3xl">
                            <p className="text-sm font-semibold text-emerald-300">
                                Construction site operations
                            </p>
                            <h1 className="mt-4 text-4xl font-semibold text-white sm:text-6xl">
                                SiteTools
                            </h1>
                            <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-100">
                                Track material expenses, scan receipts, manage
                                project budgets, and calculate site quantities
                                from one focused workspace.
                            </p>
                            <div className="mt-8 flex flex-wrap gap-3">
                                <Link
                                    href={
                                        auth.user
                                            ? route('tools.expenses')
                                            : route('register')
                                    }
                                    className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                                >
                                    Start tracking
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                                <Link
                                    href={
                                        auth.user
                                            ? route('tools.calculators')
                                            : route('login')
                                    }
                                    className="inline-flex items-center gap-2 rounded-md border border-white/40 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                                >
                                    Open tools
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-white py-14 text-zinc-950">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <p className="text-sm font-semibold text-emerald-700">
                            Everything in one place
                        </p>
                        <h2 className="mt-2 max-w-2xl text-2xl font-semibold text-zinc-950 sm:text-3xl">
                            Built for cost control on the site
                        </h2>
                        <p className="mt-3 max-w-2xl text-base text-zinc-600">
                            From the first receipt to the final budget line,
                            SiteTools keeps every purchase, supplier, and
                            quantity in one auditable workspace.
                        </p>
                    </div>
                    <div className="mx-auto mt-8 grid max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
                        <Feature
                            icon={ReceiptText}
                            title="Receipt capture"
                            text="Attach receipts and keep AI-extracted text searchable with every purchase."
                            accent="emerald"
                        />
                        <Feature
                            icon={WalletCards}
                            title="Expense control"
                            text="Track material spend by vendor, category, project, and payment state."
                            accent="cyan"
                        />
                        <Feature
                            icon={Calculator}
                            title="Field calculators"
                            text="Estimate concrete, blocks, paint, and quick unit conversions."
                            accent="amber"
                        />
                        <Feature
                            icon={ShieldCheck}
                            title="Project records"
                            text="Separate site budgets and receipts by authenticated user."
                            accent="rose"
                        />
                    </div>
                </section>

                <footer className="border-t border-white/10 bg-zinc-950">
                    <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
                        <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-600 text-white">
                                <Construction className="h-4 w-4" />
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-white">
                                    SiteTools
                                </p>
                                <p className="text-xs text-zinc-400">
                                    Construction site expense &amp; field
                                    operations
                                </p>
                            </div>
                        </div>
                        <p className="text-sm text-zinc-400">
                            &copy; {new Date().getFullYear()} SiteTools. All
                            rights reserved.
                        </p>
                    </div>
                </footer>
            </div>
        </>
    );
}

function Feature({ icon: Icon, title, text, accent }) {
    const colorMap = {
        emerald: 'bg-emerald-50 text-emerald-700',
        cyan: 'bg-cyan-50 text-cyan-700',
        amber: 'bg-amber-50 text-amber-700',
        rose: 'bg-rose-50 text-rose-700',
    };

    return (
        <article className="panel-card lift-in rounded-lg p-5">
            <span
                className={`flex h-10 w-10 items-center justify-center rounded-md ${colorMap[accent]}`}
            >
                <Icon className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-base font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{text}</p>
        </article>
    );
}
