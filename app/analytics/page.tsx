import {
  compareContentTypes,
  compareLanguages,
  compareOriginalVsCovers,
} from "@/lib/analytics/comparisons";
import { Header } from "@/components/layout/header";
import { ContentBarChart } from "@/components/charts/content-bar-chart";
import { Music, Globe2, Layers, Sparkles } from "lucide-react";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [contentTypes, languages, originalVsCovers] = await Promise.all([
    compareContentTypes().catch(() => []),
    compareLanguages().catch(() => []),
    compareOriginalVsCovers().catch(() => []),
  ]);

  const languageBars = languages.map((l) => ({
    name: l.language,
    views: l.totalViews || 0,
    count: l.contentCount,
  }));

  const musicBars = originalVsCovers.map((m) => ({
    name: m.releaseCategory,
    views: (m.totalViews || 0) + (m.totalStreams || 0),
    count: m.releaseCount,
  }));

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Deep Analytics & Research"
        description="Comparative analysis of music production releases, language resonance, and format velocity."
      />

      <div className="p-8 space-y-8 flex-1">
        {/* Highlight Section: Music Release Comparison */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-semibold text-slate-100 text-base flex items-center gap-2">
                <Music className="w-5 h-5 text-indigo-400" />
                Original Songs vs. Music Covers Research
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Comparative telemetry evaluating audience retention and reach for original compositions versus cover versions.
              </p>
            </div>
            <span className="text-xs text-indigo-400 font-mono bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Music Producer Metrics
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            <ContentBarChart
              data={musicBars}
              dataKey="views"
              label="Combined Views & Streams"
              fill="#818cf8"
            />

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] uppercase font-semibold text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-2 text-right">Releases</th>
                    <th className="py-2.5 px-2 text-right">Avg Views</th>
                    <th className="py-2.5 px-2 text-right">Avg Likes</th>
                    <th className="py-2.5 px-2 text-right">Total Streams</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {originalVsCovers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No music release comparison data available yet.
                      </td>
                    </tr>
                  ) : (
                    originalVsCovers.map((m) => (
                      <tr key={m.releaseCategory} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-semibold text-slate-200">
                          {m.releaseCategory}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-400">
                          {m.releaseCount}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-medium text-slate-100">
                          {formatNumber(m.avgViews)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-400">
                          {formatNumber(m.avgLikes)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-emerald-400">
                          {formatNumber(m.totalStreams)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Language Resonance & Content Format Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Language Breakdown */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-emerald-400" />
                  Language Resonance
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Performance across ID, EN, JA, JV, and SU content
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Views by Language</span>
            </div>
            <ContentBarChart data={languageBars} dataKey="views" label="Views" fill="#10b981" />
          </div>

          {/* Format Velocity Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Format Breakdown Details
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Granular counts, total views, and average likes per format
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] uppercase font-semibold text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3">Format</th>
                    <th className="py-2.5 px-2 text-right">Items</th>
                    <th className="py-2.5 px-2 text-right">Total Views</th>
                    <th className="py-2.5 px-2 text-right">Avg Views</th>
                    <th className="py-2.5 px-2 text-right">Avg Likes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {contentTypes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No format data available.
                      </td>
                    </tr>
                  ) : (
                    contentTypes.map((c) => (
                      <tr key={c.contentType} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-medium text-slate-200 capitalize">
                          {c.contentType.replace(/_/g, " ")}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-400">
                          {c.contentCount}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-medium text-slate-100">
                          {formatNumber(c.totalViews)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-400">
                          {formatNumber(c.avgViews)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-400">
                          {formatNumber(c.avgLikes)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

