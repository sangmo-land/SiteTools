import { Link } from '@inertiajs/react';

export default function NavLink({
    active = false,
    className = '',
    children,
    ...props
}) {
    return (
        <Link
            {...props}
            className={
                'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium leading-5 transition duration-150 ease-in-out focus:outline-none ' +
                (active
                    ? 'border-emerald-500 text-zinc-900 focus:border-emerald-700'
                    : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 focus:border-zinc-300 focus:text-zinc-700') +
                className
            }
        >
            {children}
        </Link>
    );
}
