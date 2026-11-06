"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { formatNumber } from "@/lib/utils";

interface PlatformSlice {
  name: string;
  value: number;
}

interface PlatformDonutProps {
  data: PlatformSlice[];
}

const COLORS = ["#6366f1", "#10b981", "#ec4899", "#f59e0b", "#06b6d4", "#8b5cf6"];

export function PlatformDonut({ data }: PlatformDonutProps) {
  const filtered = data.filter((d) => d.value > 0);

  if (filtered.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-900/30 text-xs">
        No platform metric data available.
      </div>
    );
  }

  const total = filtered.reduce((acc, cur) => acc + cur.value, 0);

  return (
    <div className="h-64 w-full flex flex-col justify-between">
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0];
                  const percent = total > 0 ? ((Number(item.value) / total) * 100).toFixed(1) : 0;
                  return (
                    <div className="bg-slate-900 border border-slate-700 p-2 rounded-lg text-xs shadow-lg">
                      <p className="font-medium text-slate-200">{item.name}</p>
                      <p className="text-indigo-400 font-mono mt-0.5">
                        {formatNumber(Number(item.value))} ({percent}%)
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Pie
              data={filtered}
              innerRadius={45}
              outerRadius={65}
              paddingAngle={4}
              dataKey="value"
            >
              {filtered.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
        {filtered.map((item, idx) => {
          const percent = total > 0 ? ((item.value / total) * 100).toFixed(0) : "0";
          return (
            <div key={item.name} className="flex items-center gap-2 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
              />
              <span className="text-slate-400 truncate">{item.name}</span>
              <span className="text-slate-200 font-mono ml-auto font-medium">{percent}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

