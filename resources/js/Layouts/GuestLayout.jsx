import { Link } from '@inertiajs/react';
import {
    Calculator,
    Construction,
    ReceiptText,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';

const highlights = [
    {
        icon: ReceiptText,
        title: 'Scan & file receipts',
        text: 'AI reads supplier, totals, and every line item in seconds.',
    },
    {
        icon: Calculator,
        title: 'Field calculators',
        text: 'Concrete, blocks, paint, and unit conversions on site.',
    },
    {
        icon: ShieldCheck,
        title: 'Budgets you can trust',
        text: 'Every purchase tied to a project, auditable end to end.',
    },
];

export default function GuestLayout({ children }) {
    return (
        <div className="min-h-screen lg:grid lg:grid-cols-2">
            {/* Brand panel */}
            <div className="ink-panel relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
                <div className="grid-texture pointer-events-none absolute inset-0 opacity-[0.18]" />
                <div className="relative">
                    <Link href="/" className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-900/40 ring-1 ring-white/20">
                            <Construction className="h-6 w-6" />
                        </span>
                        <span className="text-xl font-bold tracking-tight">
                            SiteTools
                        </span>
                    </Link>
                </div>

                <div className="relative max-w-md">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-brand-200">
                        <Sparkles className="h-3.5 w-3.5" />
                        Built for the construction site
                    </span>
                    <h2 className="mt-5 text-3xl font-bold leading-tight">
                        Every receipt, budget, and quantity in one{' '}
                        <span className="gradient-text">workspace</span>.
                    </h2>
                    <p className="mt-4 text-sm leading-6 text-slate-300">
                        Track material spend, scan receipts, and run field
                        calculators without the spreadsheets.
                    </p>

                    <div className="mt-8 space-y-3">
                        {highlights.map(({ icon: Icon, title, text }) => (
                            <div
                                key={title}
                                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5"
                            >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-brand-300">
                                    <Icon className="h-[18px] w-[18px]" />
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-white">
                                        {title}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {text}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="relative text-xs text-slate-400">
                    © {new Date().getFullYear()} SiteTools — Construction expense
                    &amp; field operations
                </p>
            </div>

            {/* Form panel */}
            <div className="app-canvas flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6">
                <div className="w-full max-w-md">
                    <Link
                        href="/"
                        className="mb-8 flex items-center justify-center gap-2.5 lg:hidden"
                    >
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg ring-1 ring-white/20">
                            <Construction className="h-5 w-5" />
                        </span>
                        <span className="text-lg font-bold text-white">
                            SiteTools
                        </span>
                    </Link>

                    <div className="card fade-up p-7 sm:p-8">{children}</div>
                </div>
            </div>
        </div>
    );
}
