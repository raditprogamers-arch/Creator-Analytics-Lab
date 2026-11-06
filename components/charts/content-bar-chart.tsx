"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatNumber } from "@/lib/utils";

interface BarChartItem {
  name: string;
  views?: number | null;
  count?: number | null;
  likes?: number | null;
}

interface ContentBarChartProps {
  data: BarChartItem[];
  dataKey?: "views" | "count" | "likes";
  label?: string;
  fill?: string;
}

export function ContentBarChart({
  data,
  dataKey = "views",
  label = "Total Views",
  fill = "#6366f1",
}: ContentBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-900/30 text-xs">
        No comparative data available.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.name.replace(/_/g, " "),
    value: Number(d[dataKey] || 0),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="#64748b"
            fontSize={11}
            tickLine={false}
            interval={0}
            angle={-15}
            textAnchor="end"
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
                  <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-xs shadow-lg">
                    <p className="font-semibold text-slate-200 capitalize">{item.name}</p>
                    <p className="text-indigo-400 font-mono mt-1">
                      {label}: {Number(item.value).toLocaleString()}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="value" fill={fill} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

