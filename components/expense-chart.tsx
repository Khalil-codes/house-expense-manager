"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useTheme } from "next-themes";

interface ChartData {
  name: string;
  value: number;
}

const COLORS_LIGHT = [
  "hsl(221, 83%, 53%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
];

const COLORS_DARK = [
  "hsl(217, 91%, 65%)",
  "hsl(152, 69%, 55%)",
  "hsl(45, 93%, 58%)",
  "hsl(0, 84%, 64%)",
];

export function ExpenseChart({ data }: { data: ChartData[] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const colors = isDark ? COLORS_DARK : COLORS_LIGHT;

  const filteredData = data.filter((d) => d.value > 0);

  if (filteredData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
        No expense data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={filteredData}
          cx="50%"
          cy="50%"
          outerRadius={80}
          innerRadius={40}
          paddingAngle={2}
          dataKey="value"
          label={({ name, percent }) =>
            percent && percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
          }
          labelLine={false}
          fontSize={11}
        >
          {filteredData.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={colors[index % colors.length]}
              stroke="transparent"
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => value ? [`₹${value.toLocaleString()}`, ""] : undefined}
          contentStyle={{
            backgroundColor: isDark ? "hsl(222, 47%, 11%)" : "white",
            border: `1px solid ${isDark ? "hsl(215, 20%, 25%)" : "hsl(214, 32%, 91%)"}`,
            borderRadius: "8px",
            fontSize: "12px",
            color: isDark ? "white" : "black",
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
          formatter={(value) => (
            <span style={{ color: isDark ? "hsl(210, 20%, 80%)" : "hsl(222, 47%, 20%)" }}>
              {value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
