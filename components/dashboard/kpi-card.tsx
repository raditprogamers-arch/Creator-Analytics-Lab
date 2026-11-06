import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: "indigo" | "emerald" | "amber" | "rose" | "cyan";
  className?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  badgeColor = "indigo",
  className,
}: KpiCardProps) {
  const badgeClasses = {
    indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  }[badgeColor];

  return (
    <div
      className={cn(
        "bg-slate-900/70 border border-slate-800 rounded-xl p-5 hover:border-slate-700/80 transition-all shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700/40 flex items-center justify-center">
          <Icon className="w-4 h-4 text-indigo-400" />
        </div>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-2xl md:text-3xl font-bold text-slate-100 font-mono tracking-tight">
          {value}
        </div>
        {badge && (
          <span
            className={cn(
              "text-[11px] font-semibold px-2 py-0.5 rounded-full border",
              badgeClasses
            )}
          >
            {badge}
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-slate-400 mt-2">{subtitle}</p>}
    </div>
  );
}

