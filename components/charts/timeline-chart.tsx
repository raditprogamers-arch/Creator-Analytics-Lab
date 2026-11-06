"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatNumber } from "@/lib/utils";

interface TimelinePoint {
  date: string;
  platform: string;
  totalValue: number;
  avgValue: number;
}

interface TimelineChartProps {
  data: TimelinePoint[];
  metricLabel?: string;
}

export function TimelineChart({ data, metricLabel = "Views" }: TimelineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-72 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
        <p className="text-sm">No historical metric snapshots available yet.</p>
        <span className="text-xs text-slate-600 mt-1">
          Import platform CSV datasets to generate time-series trends.
        </span>
      </div>
    );
  }

  // Aggregate by date
  const dateMap = new Map<string, number>();
  data.forEach((d) => {
    const cur = dateMap.get(d.date) || 0;
    dateMap.set(d.date, cur + d.totalValue);
  });

  const chartData = Array.from(dateMap.entries())
    .map(([date, total]) => ({ date, total }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "#334155" }}
          />
          <YAxis
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: "#334155" }}
            tickFormatter={(val) => formatNumber(val)}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs">
                    <p className="text-slate-400 font-mono mb-1">{item.date}</p>
                    <p className="font-semibold text-indigo-400">
                      {metricLabel}: {Number(item.total).toLocaleString()}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#818cf8"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#metricGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

