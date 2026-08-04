"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useTheme } from "next-themes";

export interface TrendPoint {
  month: string;
  construction: number;
  property: number;
}

const compact = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(0)}K`;
  return `₹${Math.round(n)}`;
};

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const construction = isDark ? "hsl(217, 91%, 65%)" : "hsl(221, 83%, 53%)";
  const property = isDark ? "hsl(152, 69%, 55%)" : "hsl(142, 71%, 45%)";
  const axis = isDark ? "hsl(210, 20%, 70%)" : "hsl(222, 20%, 40%)";
  const grid = isDark ? "hsl(215, 20%, 22%)" : "hsl(214, 32%, 91%)";

  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No expense data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={grid} strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 10, fill: axis }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          width={44}
          tick={{ fontSize: 10, fill: axis }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => compact(v as number)}
        />
        <Tooltip
          cursor={{ fill: isDark ? "hsl(215,20%,20%)" : "hsl(214,32%,95%)" }}
          formatter={(value, name) => [
            compact(value as number),
            String(name).charAt(0).toUpperCase() + String(name).slice(1),
          ]}
          contentStyle={{
            backgroundColor: isDark ? "hsl(222, 47%, 11%)" : "white",
            border: `1px solid ${grid}`,
            borderRadius: "8px",
            fontSize: "12px",
            color: isDark ? "white" : "black",
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }}
          formatter={(value) => (
            <span style={{ color: axis }}>
              {String(value).charAt(0).toUpperCase() + String(value).slice(1)}
            </span>
          )}
        />
        <Bar
          dataKey="construction"
          stackId="a"
          fill={construction}
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="property"
          stackId="a"
          fill={property}
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
