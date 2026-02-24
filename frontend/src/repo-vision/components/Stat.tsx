import type { FC } from "react";

interface StatProps {
  label: string;
  value: number | string;
  icon?: string;
  trend?: number;
}

export const Stat: FC<StatProps> = ({ label, value, icon, trend }) => {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center hover:bg-white/10 transition-colors">
      <div className="flex items-center justify-center gap-2 mb-2">
        {icon && <span className="text-lg">{icon}</span>}
        <div className="text-2xl font-semibold text-slate-100">{value}</div>
        {trend !== undefined && (
          <span
            className={`text-xs ${trend > 0 ? "text-green-400" : "text-red-400"}`}
          >
            {trend > 0 ? "↗" : "↘"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
};
