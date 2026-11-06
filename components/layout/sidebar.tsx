"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Video,
  BarChart3,
  FileSpreadsheet,
  UploadCloud,
  Database,
  Music2,
  Sparkles,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Content Hub", href: "/content", icon: Video },
  { name: "Analytics & Research", href: "/analytics", icon: BarChart3 },
  { name: "Custom Reports", href: "/reports", icon: FileSpreadsheet },
  { name: "Data Ingestion", href: "/imports", icon: UploadCloud },
  { name: "Live API Connections", href: "/integrations", icon: Link2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col h-screen sticky top-0 z-30 shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Music2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-100 tracking-tight text-sm leading-tight">
              Creator Analytics
            </h1>
            <span className="text-[11px] font-medium text-indigo-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 inline" /> Lab Research
            </span>
          </div>
        </div>
        <div className="mt-3 px-2 py-1 rounded bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400">
          <span>Role</span>
          <span className="text-slate-200 font-medium">VTuber & Producer</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-indigo-400" : "text-slate-400")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Database & Environment Status Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-300">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>Storage Engine</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-md p-2 text-[11px] space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Database</span>
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Neon Postgres
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Branch</span>
            <span className="text-slate-300 font-mono">production</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Host Runtime</span>
            <span className="text-slate-300">Vercel Edge/Serverless</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

