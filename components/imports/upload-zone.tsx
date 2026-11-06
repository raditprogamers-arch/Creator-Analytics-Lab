"use client";

import { useState } from "react";
import {
  UploadCloud,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Settings2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

interface UploadZoneProps {
  platforms: { id: number; name: string }[];
  onImportComplete?: () => void;
}

export function UploadZone({ platforms, onImportComplete }: UploadZoneProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("YouTube");
  const [showMapping, setShowMapping] = useState<boolean>(false);

  // Column mapping fields
  const [mappings, setMappings] = useState({
    external_id: "",
    title: "",
    content_type: "",
    language: "",
    published_at: "",
    views: "",
    likes: "",
    comments: "",
    shares: "",
    streams: "",
  });

  const [loading, setLoading] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvContent((event.target?.result as string) || "");
      };
      reader.readAsText(f);
      setDryRunResult(null);
      setImportResult(null);
      setErrorMessage(null);
    }
  };

  const handleValidateDryRun = async () => {
    if (!csvContent) {
      setErrorMessage("Please select a valid CSV file first.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvText: csvContent,
          filename: file?.name || "upload.csv",
          platformName: selectedPlatform,
          dryRun: true,
          customMappings: showMapping ? mappings : undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Validation failed");
      }
      setDryRunResult(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to validate dataset");
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!csvContent) return;

    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvText: csvContent,
          filename: file?.name || "upload.csv",
          platformName: selectedPlatform,
          dryRun: false,
          customMappings: showMapping ? mappings : undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Import failed");
      }
      setImportResult(data);
      setDryRunResult(null);
      if (onImportComplete) onImportComplete();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to commit import transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Box */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h3 className="font-semibold text-slate-100 text-base">Import Performance Dataset</h3>
            <p className="text-xs text-slate-400 mt-1">
              Upload multi-platform export CSVs (YouTube Analytics, TikTok Analytics, Spotify for Artists, etc.)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400">Target Platform:</label>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
            >
              {platforms.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowMapping(!showMapping)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition ${
                showMapping
                  ? "bg-indigo-600/20 border-indigo-500 text-indigo-400"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              Custom Mapping
            </button>
          </div>
        </div>

        {/* Custom Column Mapping Drawer */}
        {showMapping && (
          <div className="mt-4 p-4 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
            <h4 className="font-semibold text-slate-200 mb-2">Column Mapping Override</h4>
            <p className="text-slate-400 text-[11px] mb-3">
              Type the exact CSV column header that corresponds to each internal field.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {Object.keys(mappings).map((field) => (
                <div key={field}>
                  <label className="text-slate-400 block mb-1 font-mono uppercase text-[10px]">
                    {field}
                  </label>
                  <input
                    type="text"
                    placeholder={`e.g. ${field}`}
                    value={(mappings as any)[field]}
                    onChange={(e) =>
                      setMappings({ ...mappings, [field]: e.target.value })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* File Dropzone */}
        <div className="mt-6 border-2 border-dashed border-slate-800 hover:border-indigo-500/60 rounded-xl p-8 text-center transition bg-slate-950/40">
          <UploadCloud className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-200">
            {file ? file.name : "Select or drag a CSV dataset here"}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {file
              ? `${(file.size / 1024).toFixed(1)} KB — Ready for validation`
              : "Supports standard YouTube Studio, TikTok, and Spotify CSV export formats"}
          </p>
          <label className="mt-4 inline-block px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700 transition">
            Browse File
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs text-slate-500">
            Dry-run validation checks for duplicate IDs, missing required fields, and non-negative metrics before writing.
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleValidateDryRun}
              disabled={!csvContent || loading}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5 text-indigo-400" />}
              Validate (Dry Run)
            </button>
            <button
              onClick={handleExecuteImport}
              disabled={!csvContent || loading}
              className="px-5 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              Commit Import <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Import Success Banner */}
        {importResult && (
          <div className="mt-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Import Transaction Committed Successfully! (Batch #{importResult.importId})</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-500/20 font-mono">
              <div>Total Rows: <span className="font-bold text-white">{importResult.totalRows}</span></div>
              <div>Accepted: <span className="font-bold text-white">{importResult.successfulRows}</span></div>
              <div>New Content: <span className="font-bold text-white">{importResult.newContentsCreated}</span></div>
              <div>Snapshots: <span className="font-bold text-white">{importResult.snapshotsRecorded}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Dry Run Validation Results Card */}
      {dryRunResult && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h4 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-indigo-400" />
              Validation Dry-Run Report
            </h4>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                {dryRunResult.validRows} Valid
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-mono">
                {dryRunResult.rejectedRows} Rejected
              </span>
            </div>
          </div>

          {/* Rejected Rows Table if any */}
          {dryRunResult.rejectedDetails && dryRunResult.rejectedDetails.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Rejected Rows (Will be skipped or prevented):
              </p>
              <div className="max-h-48 overflow-y-auto border border-rose-500/20 rounded-lg">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-rose-950/40 text-rose-300 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Row #</th>
                      <th className="py-2 px-3">Validation Error Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-500/10 bg-slate-950/60">
                    {dryRunResult.rejectedDetails.map((r: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-1.5 px-3 font-mono text-slate-400">{r.rowIndex}</td>
                        <td className="py-1.5 px-3 text-rose-400">{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sample Valid Items Preview */}
          {dryRunResult.sampleMapped && dryRunResult.sampleMapped.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold text-slate-400">Sample Parsed Content Rows:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {dryRunResult.sampleMapped.map((s: any, idx: number) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs">
                    <p className="font-semibold text-slate-200 truncate">{s.content.title}</p>
                    <p className="text-slate-500 text-[11px] font-mono mt-0.5">ID: {s.content.externalId}</p>
                    <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5 text-[10px]">
                      {Object.entries(s.metrics).map(([k, v]) => (
                        <span key={k} className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono">
                          {k}: {String(v)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

