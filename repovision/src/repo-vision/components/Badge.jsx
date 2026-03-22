export function Badge({ children, variant = "default", className = "" }) {
    const variants = {
        default: "bg-white/5 border-white/10 text-white/40",
        blue: "bg-sky-500/10 border-sky-500/20 text-sky-400",
        sky: "bg-sky-600/10 border-sky-600/20 text-sky-500",
        indigo: "bg-indigo-600/10 border-indigo-600/20 text-indigo-400",
        success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
        danger: "bg-red-500/10 border-red-500/20 text-red-400",
    };

    const variantClass = variants[variant] || variants.default;

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest border transition-all duration-300 ${variantClass} ${className}`}
        >
            <div className={`w-1 h-1 rounded-full ${variantClass.split(' ')[2].replace('text-', 'bg-')} animate-pulse`} />
            {children}
        </span>
    );
}
