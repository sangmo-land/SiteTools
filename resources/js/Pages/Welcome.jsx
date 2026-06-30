import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    BarChart3,
    Calculator,
    Check,
    Construction,
    FileSpreadsheet,
    FolderKanban,
    ReceiptText,
    ScanLine,
    Sparkles,
    WalletCards,
} from 'lucide-react';

export default function Welcome({ auth }) {
    const primaryCta = auth.user ? route('dashboard') : route('register');
    const secondaryCta = auth.user ? route('tools.expenses') : route('login');

    return (
        <>
            <Head title="SiteTools — Construction expense & field operations" />
            <div className="min-h-screen bg-ink text-white">
                <NavBar auth={auth} />
                <Hero primaryCta={primaryCta} secondaryCta={secondaryCta} authed={!!auth.user} />
                <LogosStrip />
                <Features />
                <Showcase />
                <CtaBand primaryCta={primaryCta} authed={!!auth.user} />
                <Footer />
            </div>
        </>
    );
}

function NavBar({ auth }) {
    return (
        <header className="sticky top-0 z-30 border-b border-white/5 bg-ink/80 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <Link href="/" className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-900/40 ring-1 ring-white/20">
                        <Construction className="h-5 w-5" />
                    </span>
                    <span className="text-lg font-bold tracking-tight">
                        SiteTools
                    </span>
                </Link>

                <nav className="hidden items-center gap-7 text-sm font-medium text-slate-300 md:flex">
                    <a href="#features" className="transition hover:text-white">
                        Features
                    </a>
                    <a href="#showcase" className="transition hover:text-white">
                        How it works
                    </a>
                </nav>

                <div className="flex items-center gap-2">
                    {auth.user ? (
                        <Link href={route('dashboard')} className="btn btn-primary">
                            Open dashboard
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    ) : (
                        <>
                            <Link
                                href={route('login')}
                                className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white sm:inline-flex"
                            >
                                Log in
                            </Link>
                            <Link href={route('register')} className="btn btn-primary">
                                Get started
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}

function Hero({ primaryCta, secondaryCta, authed }) {
    return (
        <section className="relative overflow-hidden">
            <div className="grid-texture pointer-events-none absolute inset-0 opacity-[0.15]" />
            <div className="pointer-events-none absolute -left-40 top-0 h-[34rem] w-[34rem] rounded-full bg-brand-500/20 blur-[120px]" />
            <div className="pointer-events-none absolute -right-40 top-20 h-[30rem] w-[30rem] rounded-full bg-sky-500/15 blur-[120px]" />

            <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pb-28 lg:pt-24">
                <div className="mx-auto max-w-3xl text-center">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-brand-200 fade-up">
                        <Sparkles className="h-3.5 w-3.5" />
                        AI receipt scanning, now on site
                    </span>
                    <h1 className="fade-up anim-delay-1 mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
                        Cost control for the
                        <br />
                        <span className="gradient-text">construction site</span>
                    </h1>
                    <p className="fade-up anim-delay-2 mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                        Track material expenses, scan receipts, manage project
                        budgets, and calculate site quantities — all from one
                        focused, auditable workspace.
                    </p>
                    <div className="fade-up anim-delay-3 mt-9 flex flex-wrap items-center justify-center gap-3">
                        <Link href={primaryCta} className="btn btn-primary px-6 py-3 text-base">
                            {authed ? 'Open dashboard' : 'Start tracking free'}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link
                            href={secondaryCta}
                            className="inline-flex items-center gap-2 rounded-[0.625rem] border border-white/15 bg-white/5 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10"
                        >
                            {authed ? 'Go to expenses' : 'See the tools'}
                        </Link>
                    </div>
                    <p className="fade-up anim-delay-4 mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                            <Check className="h-3.5 w-3.5 text-brand-400" />
                            No credit card required
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Check className="h-3.5 w-3.5 text-brand-400" />
                            Built for FCFA budgets
                        </span>
                    </p>
                </div>

                <HeroPreview />
            </div>
        </section>
    );
}

function HeroPreview() {
    const stats = [
        { label: 'Total spend', value: '12.4M FCFA', icon: WalletCards },
        { label: 'This month', value: '1.86M FCFA', icon: BarChart3 },
        { label: 'Receipts', value: '248', icon: ReceiptText },
        { label: 'Projects', value: '6', icon: FolderKanban },
    ];
    const bars = [38, 52, 44, 70, 60, 88];

    return (
        <div className="fade-up anim-delay-4 relative mx-auto mt-16 max-w-5xl">
            <div className="absolute inset-x-8 -bottom-6 h-24 rounded-full bg-brand-500/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-3 shadow-2xl backdrop-blur">
                <div className="rounded-xl border border-white/5 bg-ink-soft/80 p-5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {stats.map(({ label, value, icon: Icon }) => (
                            <div
                                key={label}
                                className="rounded-xl border border-white/5 bg-white/[0.04] p-4"
                            >
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/15 text-brand-300">
                                    <Icon className="h-[18px] w-[18px]" />
                                </span>
                                <p className="mt-3 text-xs text-slate-400">
                                    {label}
                                </p>
                                <p className="mt-0.5 text-lg font-bold text-white">
                                    {value}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-[1.5fr_1fr]">
                        <div className="rounded-xl border border-white/5 bg-white/[0.04] p-4">
                            <p className="text-xs font-semibold text-slate-300">
                                Spend trend
                            </p>
                            <div className="mt-4 flex h-28 items-end gap-2">
                                {bars.map((h, i) => (
                                    <div
                                        key={i}
                                        className="flex-1 rounded-t-md bg-gradient-to-t from-brand-600 to-brand-400"
                                        style={{ height: `${h}%` }}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="rounded-xl border border-white/5 bg-white/[0.04] p-4">
                            <p className="text-xs font-semibold text-slate-300">
                                Recent receipt
                            </p>
                            <div className="mt-3 space-y-2.5">
                                {[
                                    ['Cement 42.5', '420,000'],
                                    ['Steel rebar 12mm', '310,000'],
                                    ['River sand', '95,000'],
                                ].map(([item, amt]) => (
                                    <div
                                        key={item}
                                        className="flex items-center justify-between text-xs"
                                    >
                                        <span className="text-slate-300">
                                            {item}
                                        </span>
                                        <span className="font-semibold text-white">
                                            {amt}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-500/15 px-2.5 py-1 text-[0.65rem] font-semibold text-brand-300">
                                <ScanLine className="h-3 w-3" />
                                Auto-scanned
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function LogosStrip() {
    const items = ['Concrete', 'Steel', 'Masonry', 'Finishing', 'Electrical', 'Plumbing'];

    return (
        <div className="border-y border-white/5 bg-white/[0.02]">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Track every trade on the build
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-semibold text-slate-400">
                    {items.map((item) => (
                        <span key={item}>{item}</span>
                    ))}
                </div>
            </div>
        </div>
    );
}

const features = [
    {
        icon: ScanLine,
        title: 'AI receipt capture',
        text: 'Snap a receipt — Textract reads the supplier, date, totals, and every line item, then matches them to your material catalogue.',
        accent: 'from-brand-500/20 text-brand-300',
        span: 'lg:col-span-2',
    },
    {
        icon: WalletCards,
        title: 'Expense control',
        text: 'Track spend by vendor, category, project, and payment state.',
        accent: 'from-sky-500/20 text-sky-300',
    },
    {
        icon: Calculator,
        title: 'Field calculators',
        text: 'Concrete, blocks, paint, and quick unit conversions.',
        accent: 'from-amber-500/20 text-amber-300',
    },
    {
        icon: Sparkles,
        title: 'Ask your data',
        text: 'Plain-language answers across every receipt — export to Excel or PDF in one click.',
        accent: 'from-violet-500/20 text-violet-300',
        span: 'lg:col-span-2',
    },
];

function Features() {
    return (
        <section id="features" className="relative py-20 lg:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl">
                    <p className="text-sm font-semibold text-brand-400">
                        Everything in one place
                    </p>
                    <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                        From the first receipt to the final budget line
                    </h2>
                    <p className="mt-4 text-base leading-7 text-slate-400">
                        SiteTools keeps every purchase, supplier, and quantity in
                        one auditable workspace — no spreadsheets required.
                    </p>
                </div>

                <div className="mt-12 grid gap-4 lg:grid-cols-3">
                    {features.map((feature) => (
                        <FeatureCard key={feature.title} {...feature} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function FeatureCard({ icon: Icon, title, text, accent, span = '' }) {
    return (
        <article
            className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/20 hover:bg-white/[0.05] ${span}`}
        >
            <span
                className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br to-transparent ${accent}`}
            >
                <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-5 text-lg font-bold text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
        </article>
    );
}

const steps = [
    {
        icon: ScanLine,
        title: 'Capture',
        text: 'Upload a receipt or log a purchase. AI extracts the line items automatically.',
    },
    {
        icon: FolderKanban,
        title: 'Organise',
        text: 'Assign each purchase to a project and category. Budgets update instantly.',
    },
    {
        icon: FileSpreadsheet,
        title: 'Report',
        text: 'Ask questions in plain language and export clean Excel or PDF reports.',
    },
];

function Showcase() {
    return (
        <section
            id="showcase"
            className="border-t border-white/5 bg-white/[0.02] py-20 lg:py-28"
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <p className="text-sm font-semibold text-brand-400">
                        How it works
                    </p>
                    <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                        Three steps to a clean budget
                    </h2>
                </div>

                <div className="mt-14 grid gap-6 md:grid-cols-3">
                    {steps.map((step, index) => (
                        <div key={step.title} className="relative text-center">
                            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-brand-300">
                                <step.icon className="h-6 w-6" />
                            </span>
                            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                                Step {index + 1}
                            </p>
                            <h3 className="mt-1 text-lg font-bold text-white">
                                {step.title}
                            </h3>
                            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-400">
                                {step.text}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function CtaBand({ primaryCta, authed }) {
    return (
        <section className="py-20 lg:py-24">
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand-600/20 via-ink-soft to-ink-soft p-10 text-center lg:p-16">
                    <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-500/20 blur-[100px]" />
                    <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">
                        Take control of your site spend today
                    </h2>
                    <p className="relative mx-auto mt-4 max-w-xl text-base text-slate-300">
                        Join builders keeping every franc accounted for.
                    </p>
                    <div className="relative mt-8 flex justify-center">
                        <Link href={primaryCta} className="btn btn-primary px-7 py-3.5 text-base">
                            {authed ? 'Open dashboard' : 'Create your free workspace'}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}

function Footer() {
    return (
        <footer className="border-t border-white/5">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-10 sm:flex-row sm:px-6 lg:px-8">
                <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white ring-1 ring-white/20">
                        <Construction className="h-4 w-4" />
                    </span>
                    <div>
                        <p className="text-sm font-bold text-white">SiteTools</p>
                        <p className="text-xs text-slate-500">
                            Construction expense &amp; field operations
                        </p>
                    </div>
                </div>
                <p className="text-sm text-slate-500">
                    © {new Date().getFullYear()} SiteTools. All rights reserved.
                </p>
            </div>
        </footer>
    );
}
