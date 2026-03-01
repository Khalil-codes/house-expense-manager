"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExpenseService } from "@/hooks/use-expense-service";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
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

export default function MonthlyAnalytics() {
  const { construction, property, loans, isLoading } = useExpenseService();
  const [timeRange, setTimeRange] = useState("6");
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [chartData, setChartData] = useState<
    { month: string; Construction: number; Property: number; Loan: number }[]
  >([]);

  useEffect(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - Number.parseInt(timeRange));

    const months: Date[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      months.push(new Date(currentDate));
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    const result = months.map((month) => {
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      const constructionExpenses = construction
        .filter((e) => {
          const d = new Date(e.date);
          return d >= monthStart && d <= monthEnd;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      const propertyExpenses = property
        .filter((e) => {
          const d = new Date(e.date);
          return d >= monthStart && d <= monthEnd;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      const loanPayments = loans.reduce(
        (total, loan) =>
          total +
          loan.payments
            .filter((p) => {
              const d = new Date(p.date);
              return p.paid && d >= monthStart && d <= monthEnd;
            })
            .reduce((sum, p) => sum + p.amount, 0),
        0
      );

      return {
        month: month.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        Construction: constructionExpenses,
        Property: propertyExpenses,
        Loan: loanPayments,
      };
    });

    setChartData(result);
  }, [construction, property, loans, timeRange]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            <div>
              <CardTitle className="text-base">Monthly Expenditure</CardTitle>
              <CardDescription className="text-xs">
                Breakdown of expenses over time
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs shrink-0">Range:</Label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 months</SelectItem>
                  <SelectItem value="6">6 months</SelectItem>
                  <SelectItem value="12">12 months</SelectItem>
                  <SelectItem value="24">24 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-1 pb-3">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? "hsl(215, 20%, 25%)" : "hsl(214, 32%, 91%)"}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: isDark ? "hsl(210, 20%, 70%)" : "hsl(222, 47%, 30%)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: isDark ? "hsl(210, 20%, 70%)" : "hsl(222, 47%, 30%)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                width={40}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `₹${value.toLocaleString()}`,
                  name,
                ]}
                contentStyle={{
                  backgroundColor: isDark ? "hsl(222, 47%, 11%)" : "white",
                  border: `1px solid ${isDark ? "hsl(215, 20%, 25%)" : "hsl(214, 32%, 91%)"}`,
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: isDark ? "white" : "black",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "4px" }} />
              <Bar
                dataKey="Construction"
                fill={isDark ? "hsl(217, 91%, 65%)" : "hsl(221, 83%, 53%)"}
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="Property"
                fill={isDark ? "hsl(152, 69%, 55%)" : "hsl(142, 71%, 45%)"}
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="Loan"
                fill={isDark ? "hsl(45, 93%, 58%)" : "hsl(38, 92%, 50%)"}
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
