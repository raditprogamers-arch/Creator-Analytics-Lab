"use client";

import { useState } from "react";
import { Download, Table, Calculator, Filter } from "lucide-react";
import { ContentWithMetrics } from "@/lib/analytics/metrics";
import { calculateSummaryStats } from "@/lib/analytics/statistics";
import { formatNumber, formatPercentage } from "@/lib/utils";

interface ReportGeneratorProps {
  contents: ContentWithMetrics[];
  platforms: { id: number; name: string }[];
}

export function ReportGenerator({ contents, platforms }: ReportGeneratorProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedMetric, setSelectedMetric] = useState<"views" | "likes" | "engagementRate" | "streams">("views");

  const filtered = contents.filter((c) => {
    if (selectedPlatform !== "all" && c.platformId !== Number(selectedPlatform)) return false;
    if (selectedType !== "all" && c.contentType !== selectedType) return false;
    return true;
  });

  const numericValues = filtered
    .map((c) => c[selectedMetric])
    .filter((v): v is number => v !== null && v !== undefined && !isNaN(v));

  const stats = calculateSummaryStats(numericValues);

  const handleExportCSV = () => {
    if (filtered.length === 0) return;

    const headers = [
      "ID",
      "Platform",
      "External_ID",
      "Title",
      "Content_Type",
      "Language",
      "Published_At",
      "Views",
      "Likes",
      "Comments",
      "Shares",
      "Streams",
      "Watch_Time_Hours",
      "Engagement_Rate_Pct",
    ];

    const rows = filtered.map((c) => [
      c.id,
      `"${c.platformName}"`,
      `"${c.externalId}"`,
      `"${c.title.replace(/"/g, '""')}"`,
      `"${c.contentType}"`,
      `"${c.language || ""}"`,
      `"${c.publishedAt || ""}"`,
      c.views ?? "",
      c.likes ?? "",
      c.comments ?? "",
      c.shares ?? "",
      c.streams ?? "",
      c.watchTimeHours ?? "",
      c.engagementRate ?? "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `creator_analytics_report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Configuration & Filter Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Platforms</option>
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-400">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Content Types</option>
              <option value="original_song">Original Song</option>
              <option value="music_cover">Music Cover</option>
              <option value="short_form">Short Form</option>
              <option value="long_form">Long Form</option>
            </select>
          </div>

          <div className="text-xs text-slate-400">
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-indigo-300 font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="views">Metric: Views</option>
              <option value="likes">Metric: Likes</option>
              <option value="streams">Metric: Streams</option>
              <option value="engagementRate">Metric: Engagement Rate (%)</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={filtered.length === 0}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Export Clean CSV ({filtered.length} Items)
        </button>
      </div>

      {/* Statistical Summary Grid */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
          <Calculator className="w-4 h-4 text-indigo-400" />
          Statistical Distribution Analysis:{" "}
          <span className="capitalize text-indigo-300 font-mono">{selectedMetric}</span>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3 text-center">
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">Count (N)</span>
            <span className="text-base font-bold text-slate-200 font-mono">{stats.count}</span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">Mean</span>
            <span className="text-base font-bold text-slate-200 font-mono">
              {formatNumber(stats.mean)}
            </span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">Median</span>
            <span className="text-base font-bold text-indigo-400 font-mono">
              {formatNumber(stats.median)}
            </span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">Std Dev</span>
            <span className="text-base font-bold text-slate-200 font-mono">
              {formatNumber(stats.std)}
            </span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">Min</span>
            <span className="text-base font-bold text-slate-200 font-mono">
              {formatNumber(stats.min)}
            </span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">Q25 (25%)</span>
            <span className="text-base font-bold text-slate-200 font-mono">
              {formatNumber(stats.q25)}
            </span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">Q75 (75%)</span>
            <span className="text-base font-bold text-slate-200 font-mono">
              {formatNumber(stats.q75)}
            </span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">Max</span>
            <span className="text-base font-bold text-slate-200 font-mono">
              {formatNumber(stats.max)}
            </span>
          </div>
        </div>
      </div>

      {/* Report Data Preview Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h4 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
            <Table className="w-4 h-4 text-indigo-400" />
            Filtered Report Dataset Preview
          </h4>
          <span className="text-xs text-slate-400 font-mono">{filtered.length} Rows</span>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] font-semibold uppercase text-slate-400 sticky top-0">
              <tr>
                <th className="py-2.5 px-3">Title</th>
                <th className="py-2.5 px-3">Platform</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3 text-right">Views</th>
                <th className="py-2.5 px-3 text-right">Streams</th>
                <th className="py-2.5 px-3 text-right">Likes</th>
                <th className="py-2.5 px-3 text-right">Engagement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2 px-3 font-medium text-slate-200 truncate max-w-xs">{c.title}</td>
                  <td className="py-2 px-3 text-slate-400">{c.platformName}</td>
                  <td className="py-2 px-3 text-slate-400 capitalize">{c.contentType.replace(/_/g, " ")}</td>
                  <td className="py-2 px-3 text-right font-mono">{formatNumber(c.views)}</td>
                  <td className="py-2 px-3 text-right font-mono">{formatNumber(c.streams)}</td>
                  <td className="py-2 px-3 text-right font-mono">{formatNumber(c.likes)}</td>
                  <td className="py-2 px-3 text-right font-mono text-indigo-400">{formatPercentage(c.engagementRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

