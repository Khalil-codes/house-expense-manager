"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Layers,
  Users,
  Loader2,
  CalendarClock,
  TrendingUp,
  Receipt,
  Landmark,
} from "lucide-react";
import { useExpenseService } from "@/hooks/use-expense-service";
import { ExpenseChart } from "@/components/expense-chart";
import { TrendChart, type TrendPoint } from "@/components/trend-chart";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const compact = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(0)}K`;
  return `₹${Math.round(n)}`;
};

const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const fmtMonth = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return `${d.toLocaleDateString("en-IN", { month: "short" })} '${String(
    y
  ).slice(2)}`;
};

const monthRange = (keys: string[]) => {
  if (keys.length === 0) return [];
  const sorted = [...keys].sort();
  const [sy, sm] = sorted[0].split("-").map(Number);
  const [ey, em] = sorted[sorted.length - 1].split("-").map(Number);
  const out: string[] = [];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
};

export default function Dashboard() {
  const {
    expenses,
    construction,
    property,
    loans,
    fundingSources,
    isLoading,
    grandTotal,
    adjustedTotal,
  } = useExpenseService();

  const constructionTotal = construction.reduce((s, e) => s + e.amount, 0);
  const propertyTotal = property.reduce((s, e) => s + e.amount, 0);
  const loanPaid = loans.reduce(
    (sum, loan) =>
      sum + loan.payments.reduce((s, p) => s + (p.paid ? p.amount : 0), 0),
    0
  );
  const coveredByLoan = expenses
    .filter((e) => e.covered_by_loan)
    .reduce((s, e) => s + e.amount, 0);

  const now = new Date();
  const thisMonth = expenses.filter((e) => {
    const d = new Date(e.date);
    return (
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    );
  });
  const thisMonthAmt = thisMonth.reduce((s, e) => s + e.amount, 0);

  // ---- Sale proceeds ----
  const saleSources = fundingSources.filter(
    (s) => !s.archived && s.kind === "sale_proceeds"
  );
  const saleReceived = saleSources.reduce((s, f) => s + f.received, 0);
  const saleDeployed = saleSources.reduce((s, f) => s + f.outflows, 0);
  const saleValue = saleReceived > 0 ? saleReceived : saleDeployed;
  const saleHint = saleReceived > 0 ? "received" : "funded from sales";

  // ---- Monthly aggregation ----
  const byMonth = new Map<
    string,
    { construction: number; property: number; total: number }
  >();
  for (const e of expenses) {
    const k = monthKey(new Date(e.date));
    const cur = byMonth.get(k) ?? { construction: 0, property: 0, total: 0 };
    if (e.type === "construction") cur.construction += e.amount;
    else cur.property += e.amount;
    cur.total += e.amount;
    byMonth.set(k, cur);
  }
  let months = monthRange([...byMonth.keys()]);
  if (months.length > 12) months = months.slice(-12);
  const trendData: TrendPoint[] = months.map((k) => ({
    month: fmtMonth(k),
    construction: byMonth.get(k)?.construction ?? 0,
    property: byMonth.get(k)?.property ?? 0,
  }));

  const activeMonths = byMonth.size;
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const avgPerMonth = activeMonths ? expenseTotal / activeMonths : 0;

  let peakMonth: { key: string; total: number } | null = null;
  for (const [key, v] of byMonth) {
    if (!peakMonth || v.total > peakMonth.total) peakMonth = { key, total: v.total };
  }

  const biggest = expenses.reduce(
    (m, e) => (e.amount > m.amount ? e : m),
    { amount: 0, description: "" } as { amount: number; description: string }
  );

  // ---- Loan-funded share ----
  const totalDeployed = fundingSources
    .filter((s) => !s.archived)
    .reduce((s, f) => s + f.outflows, 0);
  const loanFunded = fundingSources
    .filter((s) => !s.archived && s.kind === "loan")
    .reduce((s, f) => s + f.outflows, 0);
  const loanPct = totalDeployed ? (loanFunded / totalDeployed) * 100 : 0;

  // ---- Spend by area ----
  const areaMap = new Map<string, number>();
  for (const e of expenses) {
    const key = e.area || "Unassigned";
    areaMap.set(key, (areaMap.get(key) ?? 0) + e.amount);
  }
  const areaBreakdown = [...areaMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const topAreas = areaBreakdown.slice(0, 5);
  const areaMax = Math.max(...topAreas.map((a) => a.value), 1);

  // ---- Top payees ----
  const payeeMap = new Map<string, number>();
  for (const e of expenses) {
    const p = e.paid_to?.trim();
    if (p) payeeMap.set(p, (payeeMap.get(p) ?? 0) + e.amount);
  }
  const allPayees = [...payeeMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const topPayees = allPayees.slice(0, 5);
  const payeeMax = Math.max(...topPayees.map((p) => p.value), 1);

  // ---- Charts ----
  const sectionChart = [
    { name: "Construction", value: constructionTotal },
    { name: "Property", value: propertyTotal },
    { name: "Loan Payments", value: loanPaid },
  ];
  const fundingChart = fundingSources
    .filter((s) => !s.archived && s.outflows > 0)
    .map((s) => ({ name: s.name, value: s.outflows }));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hero summary */}
      <Card>
        <CardContent className="pt-5">
          <p className="text-xs text-muted-foreground">Total spent</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight">
              {inr(adjustedTotal)}
            </span>
            {coveredByLoan > 0 && (
              <span className="text-xs text-muted-foreground">
                +{compact(coveredByLoan)} via loan
              </span>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-4 sm:grid-cols-3 lg:grid-cols-5">
            <MiniStat
              label="Construction"
              value={compact(constructionTotal)}
              hint={`${grandTotal ? ((constructionTotal / grandTotal) * 100).toFixed(0) : 0}% of total`}
            />
            <MiniStat
              label="Property"
              value={compact(propertyTotal)}
              hint={`${grandTotal ? ((propertyTotal / grandTotal) * 100).toFixed(0) : 0}% of total`}
            />
            <MiniStat
              label="Loan paid"
              value={compact(loanPaid)}
              hint={`${loans.length} loan${loans.length === 1 ? "" : "s"}`}
            />
            {saleSources.length > 0 && (
              <MiniStat
                label="Sale proceeds"
                value={compact(saleValue)}
                hint={saleHint}
              />
            )}
            <MiniStat
              label="This month"
              value={compact(thisMonthAmt)}
              hint={`${thisMonth.length} expense${thisMonth.length === 1 ? "" : "s"}`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Insight strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Avg / month"
          value={compact(avgPerMonth)}
          hint={`over ${activeMonths} month${activeMonths === 1 ? "" : "s"}`}
          icon={<CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <StatCard
          label="Peak month"
          value={peakMonth ? compact(peakMonth.total) : "—"}
          hint={peakMonth ? fmtMonth(peakMonth.key) : "no data"}
          icon={<TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <StatCard
          label="Biggest expense"
          value={compact(biggest.amount)}
          hint={biggest.description || "—"}
          icon={<Receipt className="h-3.5 w-3.5 text-muted-foreground" />}
        />
        <StatCard
          label="Loan-funded"
          value={`${loanPct.toFixed(0)}%`}
          hint={`${compact(loanFunded)} of spend`}
          icon={<Landmark className="h-3.5 w-3.5 text-muted-foreground" />}
        />
      </div>

      {/* Monthly trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monthly spend</CardTitle>
          <CardDescription className="text-xs">
            Construction vs property over time
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2">
          <TrendChart data={trendData} />
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Where it went</CardTitle>
            <CardDescription className="text-xs">
              Spend by section
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2">
            <ExpenseChart data={sectionChart} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Where it came from</CardTitle>
            <CardDescription className="text-xs">
              Payouts by funding source
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2">
            <ExpenseChart data={fundingChart} />
          </CardContent>
        </Card>
      </div>

      {/* Detail lists */}
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-1.5">
              <Layers className="h-4 w-4" /> Top areas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 px-3">
            {topAreas.length === 0 && (
              <p className="text-xs text-muted-foreground">No expenses yet.</p>
            )}
            {topAreas.map((a) => (
              <BarRow
                key={a.name}
                label={a.name}
                value={inr(a.value)}
                pct={(a.value / areaMax) * 100}
              />
            ))}
            {areaBreakdown.length > topAreas.length && (
              <p className="text-[10px] text-muted-foreground">
                +{areaBreakdown.length - topAreas.length} more
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-1.5">
              <Users className="h-4 w-4" /> Top payees
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 px-3">
            {topPayees.length === 0 && (
              <p className="text-xs text-muted-foreground">No payees yet.</p>
            )}
            {topPayees.map((p) => (
              <BarRow
                key={p.name}
                label={p.name}
                value={inr(p.value)}
                pct={(p.value / payeeMax) * 100}
              />
            ))}
            {allPayees.length > topPayees.length && (
              <p className="text-[10px] text-muted-foreground">
                +{allPayees.length - topPayees.length} more
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
        <CardTitle className="text-xs font-medium">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="text-lg font-bold tabular-nums">{value}</div>
        {hint && (
          <p className="truncate text-[10px] text-muted-foreground">{hint}</p>
        )}
      </CardContent>
    </Card>
  );
}

function MiniStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-base font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function BarRow({
  label,
  value,
  pct,
}: {
  label: string;
  value: string;
  pct: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium truncate pr-2">{label}</span>
        <span className="text-muted-foreground whitespace-nowrap tabular-nums">
          {value}
        </span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}
