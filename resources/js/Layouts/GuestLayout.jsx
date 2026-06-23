import { Link } from '@inertiajs/react';
import { Construction } from 'lucide-react';

export default function GuestLayout({ children }) {
    return (
        <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-4 pt-8 sm:justify-center sm:pt-0">
            <Link
                href="/"
                className="flex items-center gap-3 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-zinc-950 text-white">
                    <Construction className="h-5 w-5" />
                </span>
                <span className="text-xl font-semibold text-zinc-950">
                    SiteTools
                </span>
            </Link>

            <div className="mt-6 w-full overflow-hidden rounded-lg border border-zinc-200 bg-white px-6 py-5 shadow-sm sm:max-w-md">
                {children}
            </div>
        </div>
    );
}
