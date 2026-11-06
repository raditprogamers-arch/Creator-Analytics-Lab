"use client";

import { ReactNode } from "react";
import { Sparkles } from "lucide-react";

interface HeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function Header({ title, description, actions }: HeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/40 backdrop-blur-md px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
          {title}
        </h1>
        {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </header>
  );
}

