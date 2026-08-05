"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useTheme } from "next-themes";

interface ChartData {
  name: string;
  value: number;
}

const COLORS_LIGHT = [
  "hsl(211, 100%, 50%)",
  "hsl(145, 63%, 42%)",
  "hsl(28, 100%, 52%)",
  "hsl(265, 70%, 60%)",
  "hsl(240, 4%, 60%)",
];

const COLORS_DARK = [
  "hsl(211, 100%, 60%)",
  "hsl(145, 58%, 50%)",
  "hsl(28, 100%, 58%)",
  "hsl(265, 70%, 68%)",
  "hsl(240, 5%, 65%)",
];

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif';

const compact = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(0)}K`;
  return `₹${Math.round(n)}`;
};

export function ExpenseChart({ data }: { data: ChartData[] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const colors = isDark ? COLORS_DARK : COLORS_LIGHT;

  const filteredData = data
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  if (filteredData.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No data available
      </div>
    );
  }

  const total = filteredData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col items-center gap-5 px-2 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative h-[176px] w-[176px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filteredData}
              cx="50%"
              cy="50%"
              outerRadius={86}
              innerRadius={60}
              paddingAngle={2}
              dataKey="value"
              stroke="transparent"
            >
              {filteredData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) =>
                value ? [`₹${Number(value).toLocaleString("en-IN")}`, ""] : undefined
              }
              contentStyle={{
                backgroundColor: isDark ? "hsl(240, 5%, 12%)" : "#ffffff",
                border: `1px solid ${isDark ? "hsl(240, 4%, 20%)" : "hsl(240, 6%, 88%)"}`,
                borderRadius: "16px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                fontSize: "12px",
                fontFamily: FONT_FAMILY,
                color: isDark ? "hsl(0,0%,98%)" : "hsl(240,6%,10%)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Total
          </span>
          <span className="text-lg font-semibold tabular-nums tracking-tight">
            {compact(total)}
          </span>
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-1">
        {filteredData.map((d, index) => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <li
              key={d.name}
              className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                {d.name}
              </span>
              <span className="shrink-0 text-[13px] font-semibold tabular-nums">
                {compact(d.value)}
              </span>
              <span className="w-9 shrink-0 text-right text-[12px] tabular-nums text-muted-foreground">
                {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
