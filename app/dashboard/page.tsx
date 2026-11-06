import Link from "next/link";
import { db } from "@/lib/db";
import { connectedAccounts } from "@/lib/db/schema";
import { syncConnectedAccount } from "@/lib/sync";
import {
  getOverviewKpis,
  getPlatformSummaries,
  getTimelineMetrics,
} from "@/lib/analytics/metrics";
import { compareContentTypes } from "@/lib/analytics/comparisons";
import { Header } from "@/components/layout/header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { TimelineChart } from "@/components/charts/timeline-chart";
import { PlatformDonut } from "@/components/charts/platform-donut";
import { ContentBarChart } from "@/components/charts/content-bar-chart";
import {
  Eye,
  Headphones,
  Heart,
  Percent,
  Video,
  UploadCloud,
  CheckCircle2,
} from "lucide-react";
import { formatNumber, formatPercentage } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Automated background sync check (real-time telemetry refresh)
  try {
    const accounts = await db.select().from(connectedAccounts);
    for (const acc of accounts) {
      const minutesAgo = acc.lastSyncedAt
        ? (Date.now() - new Date(acc.lastSyncedAt).getTime()) / (1000 * 60)
        : 999;
      if (minutesAgo > 15) {
        syncConnectedAccount(acc.id).catch((err) =>
          console.warn(`Automated sync warning for account #${acc.id}:`, err)
        );
      }
    }
  } catch {}

  const [kpis, platformSummaries, timeline, contentTypes] = await Promise.all([
    getOverviewKpis().catch(() => ({
      totalContent: 0,
      totalViews: 0,
      totalStreams: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      totalWatchTimeHours: 0,
      overallEngagementRate: null,
      platformsCount: 0,
      importsCount: 0,
    })),
    getPlatformSummaries().catch(() => []),
    getTimelineMetrics().catch(() => []),
    compareContentTypes().catch(() => []),
  ]);

  const platformSlices = platformSummaries.map((p) => ({
    name: p.platformName,
    value: (p.totalViews || 0) + (p.totalStreams || 0),
  }));

  const contentTypeBars = contentTypes.map((c) => ({
    name: c.contentType,
    views: c.totalViews || 0,
    count: c.contentCount,
  }));

  const totalInteractions = kpis.totalLikes + kpis.totalComments + kpis.totalShares;

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Executive Performance Overview"
        description="Consolidated cross-platform telemetry and key creator metrics from Neon PostgreSQL."
        actions={
          <a
            href="/imports"
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Ingest Dataset
          </a>
        }
      />

      <div className="p-8 space-y-8 flex-1">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            title="Total Published Content"
            value={formatNumber(kpis.totalContent)}
            subtitle={`Across ${kpis.platformsCount} connected platforms`}
            icon={Video}
            badge="Catalog"
            badgeColor="indigo"
          />
          <KpiCard
            title="Total Cross-Platform Views"
            value={formatNumber(kpis.totalViews)}
            subtitle="Aggregated video & post views"
            icon={Eye}
            badge="Reach"
            badgeColor="cyan"
          />
          <KpiCard
            title="Total Music Streams"
            value={formatNumber(kpis.totalStreams)}
            subtitle="Spotify & audio releases"
            icon={Headphones}
            badge="Music"
            badgeColor="emerald"
          />
          <KpiCard
            title="Total Interactions"
            value={formatNumber(totalInteractions)}
            subtitle={`${formatNumber(kpis.totalLikes)} likes · ${formatNumber(kpis.totalComments)} comments`}
            icon={Heart}
            badge="Community"
            badgeColor="rose"
          />
          <KpiCard
            title="Avg Engagement Rate"
            value={formatPercentage(kpis.overallEngagementRate)}
            subtitle="Interactions per view ratio"
            icon={Percent}
            badge="Conversion"
            badgeColor="amber"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Timeline Area Chart (2 Cols) */}
          <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-100 text-sm">Performance Trajectory</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Historical metric snapshot capture volume across dates
                </p>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Metric: Views
              </span>
            </div>
            <TimelineChart data={timeline} metricLabel="Captured Views" />
          </div>

          {/* Platform Distribution Donut (1 Col) */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">Platform Distribution</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Share of views & streams by platform
              </p>
            </div>
            <div className="my-auto">
              <PlatformDonut data={platformSlices} />
            </div>
          </div>
        </div>

        {/* Content Type Comparison & Platform Summary Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Format Comparison Bar Chart */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-100 text-sm">Content Format Performance</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Aggregate reach grouped by creator format
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Total Views</span>
            </div>
            <ContentBarChart data={contentTypeBars} dataKey="views" label="Views" />
          </div>

          {/* Platform Breakdown Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-100 text-sm">Platform Telemetry Summary</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verified metric totals per distribution channel
                </p>
              </div>
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" /> Live Neon Sync
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-[11px] uppercase font-semibold text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3">Platform</th>
                    <th className="py-2.5 px-2 text-right">Items</th>
                    <th className="py-2.5 px-2 text-right">Views/Streams</th>
                    <th className="py-2.5 px-2 text-right">Likes</th>
                    <th className="py-2.5 px-2 text-right">Engagement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {platformSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No platform metric data available.
                      </td>
                    </tr>
                  ) : (
                    platformSummaries.map((p) => {
                      const volume = (p.totalViews ?? 0) + (p.totalStreams ?? 0);
                      return (
                        <tr key={p.platformId} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-medium text-slate-200">
                            {p.platformName}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-400">
                            {p.totalContent}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-medium text-slate-100">
                            {volume > 0 ? formatNumber(volume) : "—"}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-slate-400">
                            {formatNumber(p.totalLikes)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono text-indigo-400 font-medium">
                            {formatPercentage(p.engagementRate)}
                          </td>
                        </tr>
                      );
                    })
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

