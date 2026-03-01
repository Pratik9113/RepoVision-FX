import type { ReactNode } from "react";
type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger" | "outline";


interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    default: "bg-white/5 border-white/10 text-slate-300",
    primary: "bg-indigo-500/20 border border-indigo-400/30 text-indigo-200",
    success: "bg-green-500/20 border border-green-400/30 text-green-200",
    warning: "bg-yellow-500/20 border border-yellow-400/30 text-yellow-200",
    danger: "bg-red-500/20 border border-red-400/30 text-red-200",
    outline: "bg-transparent border border-slate-500/30 text-slate-400",
  };


  const variantClass = variants[variant] || variants.default;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${variantClass} ${className}`}
    >
      {children}
    </span>
  );
}
