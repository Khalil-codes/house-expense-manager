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

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif';

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const construction = isDark ? "hsl(211, 100%, 60%)" : "hsl(211, 100%, 50%)";
  const property = isDark ? "hsl(145, 58%, 50%)" : "hsl(145, 63%, 42%)";
  const axis = isDark ? "hsl(240, 5%, 65%)" : "hsl(240, 4%, 46%)";
  const grid = isDark ? "hsl(240, 4%, 20%)" : "hsl(240, 6%, 90%)";

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
        <CartesianGrid vertical={false} stroke={grid} strokeDasharray="2 4" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 10, fill: axis, fontFamily: FONT_FAMILY }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          width={44}
          tick={{ fontSize: 10, fill: axis, fontFamily: FONT_FAMILY }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => compact(v as number)}
        />
        <Tooltip
          cursor={{ fill: isDark ? "hsl(240,4%,18%)" : "hsl(240,6%,94%)" }}
          formatter={(value, name) => [
            compact(value as number),
            String(name).charAt(0).toUpperCase() + String(name).slice(1),
          ]}
          contentStyle={{
            backgroundColor: isDark ? "hsl(240, 5%, 12%)" : "#ffffff",
            border: `1px solid ${grid}`,
            borderRadius: "16px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            fontSize: "12px",
            fontFamily: FONT_FAMILY,
            color: isDark ? "hsl(0,0%,98%)" : "hsl(240,6%,10%)",
          }}
        />
        <Legend
          wrapperStyle={{
            fontSize: "11px",
            fontFamily: FONT_FAMILY,
            paddingTop: "4px",
          }}
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
          maxBarSize={28}
        />
        <Bar
          dataKey="property"
          stackId="a"
          fill={property}
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
