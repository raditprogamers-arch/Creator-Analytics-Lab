"use client";

import { useState } from "react";
import { RotateCcw, CheckCircle, AlertCircle, Clock } from "lucide-react";

interface ImportHistoryItem {
  id: number;
  filename: string;
  platformId: number | null;
  platformName: string | null;
  importedAt: string;
  totalRows: number;
  successfulRows: number;
  rejectedRows: number;
  importStatus: string;
  errorSummary: string | null;
}

interface HistoryTableProps {
  initialImports: ImportHistoryItem[];
  onRollbackComplete?: () => void;
}

export function HistoryTable({ initialImports, onRollbackComplete }: HistoryTableProps) {
  const [imports, setImports] = useState<ImportHistoryItem[]>(initialImports);
  const [rollingBackId, setRollingBackId] = useState<number | null>(null);

  const handleRollback = async (id: number) => {
    if (
      !confirm(
        `Are you sure you want to rollback import #${id}? All metric snapshots tied to this import batch will be deleted permanently.`
      )
    ) {
      return;
    }

    setRollingBackId(id);
    try {
      const res = await fetch(`/api/imports?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Rollback failed");
      }
      setImports((prev) => prev.filter((item) => item.id !== id));
      if (onRollbackComplete) onRollbackComplete();
    } catch (err: any) {
      alert("Error rolling back import: " + err.message);
    } finally {
      setRollingBackId(null);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          Ingestion Audit Trail & History
        </h3>
        <span className="text-xs text-slate-400 font-mono">{imports.length} Batches Recorded</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/70 border-b border-slate-800 text-xs font-semibold uppercase text-slate-400">
            <tr>
              <th className="py-3 px-4">Batch ID</th>
              <th className="py-3 px-3">Filename</th>
              <th className="py-3 px-3">Platform</th>
              <th className="py-3 px-3">Date</th>
              <th className="py-3 px-3 text-right">Rows (OK / Total)</th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 px-4 text-center">Audit Rollback</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {imports.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 text-sm">
                  No previous imports logged in Neon database.
                </td>
              </tr>
            ) : (
              imports.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition-colors text-xs">
                  <td className="py-3 px-4 font-mono text-slate-400">#{item.id}</td>
                  <td className="py-3 px-3 font-medium text-slate-200">{item.filename}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                      {item.platformName || "Generic"}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400 font-mono">
                    {new Date(item.importedAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    <span className="text-emerald-400">{item.successfulRows}</span> /{" "}
                    <span className="text-slate-400">{item.totalRows}</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        item.importStatus === "completed"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : item.importStatus === "partial"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}
                    >
                      {item.importStatus === "completed" ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      {item.importStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleRollback(item.id)}
                      disabled={rollingBackId === item.id}
                      className="px-2.5 py-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition border border-transparent hover:border-rose-500/30 flex items-center gap-1.5 mx-auto disabled:opacity-50"
                      title="Undo this import batch and delete its metrics"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Rollback
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

