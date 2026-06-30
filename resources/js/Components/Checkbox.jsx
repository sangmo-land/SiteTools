export default function Checkbox({ className = '', ...props }) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'rounded border-white/20 bg-white/10 text-brand-500 shadow-sm focus:ring-brand-500 focus:ring-offset-0 ' +
                className
            }
        />
    );
}
