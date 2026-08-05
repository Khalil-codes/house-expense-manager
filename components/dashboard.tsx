"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Landmark,
  CheckCircle2,
  AlertCircle,
  Wallet,
  Receipt,
  Hammer,
  ArrowDownLeft,
  PlusCircle,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExpenseService, type Expense } from "@/hooks/use-expense-service";
import type { FundingSource } from "@/hooks/use-expense-service";
import { ExpenseChart } from "@/components/expense-chart";
import { TrendChart, type TrendPoint } from "@/components/trend-chart";
import { FundingEntryForm } from "@/components/funding-tracker";
import { computeLoanStats } from "@/lib/loan-utils";
import { toast } from "sonner";
import type { FundingEntryFormValues } from "@/lib/validations";

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

export default function Dashboard({
  onQuickAction,
}: {
  onQuickAction?: (tab: string, action?: string) => void;
} = {}) {
  const {
    expenses,
    construction,
    property,
    loans,
    fundingSources,
    isLoading,
    grandTotal,
    adjustedTotal,
    addFundingEntry,
  } = useExpenseService();
  const [recordOpen, setRecordOpen] = useState(false);

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
    if (!peakMonth || v.total > peakMonth.total)
      peakMonth = { key, total: v.total };
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

  // ---- Loans & debt ----
  const loanStatsAll = loans.map(computeLoanStats);
  const totalBorrowed = loanStatsAll.reduce((s, l) => s + l.borrowed, 0);
  const totalRepaidPrincipal = loanStatsAll.reduce(
    (s, l) => s + l.principalPaid,
    0
  );
  const totalOutstanding = loanStatsAll.reduce((s, l) => s + l.outstanding, 0);
  const repaidPercent =
    totalBorrowed > 0 ? (totalRepaidPrincipal / totalBorrowed) * 100 : 0;
  const nextPayment = loans
    .flatMap((l) =>
      l.payments
        .filter((p) => !p.paid)
        .map((p) => ({ date: p.date, amount: p.amount, loanName: l.name }))
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const nextOverdue = nextPayment
    ? new Date(nextPayment.date).getTime() < todayStart
    : false;

  // ---- Sales proceeds ----
  const saleTotalProceeds = saleSources.reduce(
    (s, f) => s + (f.total_value ?? 0),
    0
  );
  const saleAvailable = saleSources.reduce((s, f) => s + f.balance, 0);
  const saleReceived = saleSources.reduce((s, f) => s + f.received, 0);
  const saleInTransit = saleSources.reduce((s, f) => s + f.in_transit, 0);
  const saleYetToReceive = saleSources.reduce(
    (s, f) => s + (f.remaining ?? 0),
    0
  );
  const salePctReceived = saleTotalProceeds
    ? (saleReceived / saleTotalProceeds) * 100
    : 0;
  const salePctInTransit = saleTotalProceeds
    ? (saleInTransit / saleTotalProceeds) * 100
    : 0;

  // ---- Composition ----
  const compositionTotal = constructionTotal + propertyTotal + loanPaid;
  const composition = [
    {
      label: "Construction",
      value: constructionTotal,
      color: "hsl(var(--chart-1))",
    },
    {
      label: "Property",
      value: propertyTotal,
      color: "hsl(var(--chart-2))",
    },
    {
      label: "Loan paid",
      value: loanPaid,
      color: "hsl(var(--chart-3))",
    },
  ].filter((s) => s.value > 0);

  // ---- Funding chart ----
  const fundingChart = fundingSources
    .filter((s) => !s.archived && s.outflows > 0)
    .map((s) => ({ name: s.name, value: s.outflows }));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="mb-4 h-7 w-7 animate-spin" />
        <p className="text-sm">Loading dashboard…</p>
      </div>
    );
  }

  const insights = [
    {
      label: "Avg / month",
      value: compact(avgPerMonth),
      hint: `over ${activeMonths} month${activeMonths === 1 ? "" : "s"}`,
    },
    {
      label: "Peak month",
      value: peakMonth ? compact(peakMonth.total) : "—",
      hint: peakMonth ? fmtMonth(peakMonth.key) : "no data",
    },
    {
      label: "This month",
      value: compact(thisMonthAmt),
      hint: `${thisMonth.length} expense${thisMonth.length === 1 ? "" : "s"}`,
    },
    {
      label: "Biggest expense",
      value: compact(biggest.amount),
      hint: biggest.description || "—",
    },
    {
      label: "Loan-funded",
      value: `${loanPct.toFixed(0)}%`,
      hint: `${compact(loanFunded)} of spend`,
    },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Hero */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-[13px] font-medium text-muted-foreground">
            Total spent
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[40px] font-semibold leading-none tracking-tight tabular-nums">
              {inr(adjustedTotal)}
            </span>
          </div>
          {coveredByLoan > 0 && (
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              +{compact(coveredByLoan)} covered via loan
            </p>
          )}

          {composition.length > 0 && (
            <div className="mt-5">
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                {composition.map((s) => (
                  <div
                    key={s.label}
                    style={{
                      width: `${(s.value / compositionTotal) * 100}%`,
                      backgroundColor: s.color,
                    }}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                  />
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {composition.map((s) => (
                  <div key={s.label} className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="truncate text-[11px] font-medium text-muted-foreground">
                        {s.label}
                      </span>
                    </div>
                    <p className="mt-1 text-[15px] font-semibold tabular-nums">
                      {compact(s.value)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {grandTotal
                        ? ((s.value / compositionTotal) * 100).toFixed(0)
                        : 0}
                      %
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2.5">
        <QuickAction
          icon={Hammer}
          label="Add construction expense"
          onClick={() => onQuickAction?.("construction", "add")}
        />
        <QuickAction
          icon={ArrowDownLeft}
          label="Record money in"
          onClick={() => setRecordOpen(true)}
        />
      </div>

      <RecordFundingDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        sources={fundingSources.filter((s) => !s.archived)}
        onSubmit={async (sourceId, values) => {
          await addFundingEntry({ sourceId, ...values });
          toast.success("Entry recorded");
          setRecordOpen(false);
        }}
      />

      {/* Insights */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
            {insights.map((s) => (
              <div key={s.label} className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {s.value}
                </p>
                {s.hint && (
                  <p className="truncate text-[11px] text-muted-foreground">
                    {s.hint}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sales proceeds */}
      {saleTotalProceeds > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Wallet className="h-3.5 w-3.5" />
              </span>
              <div>
                <CardTitle className="text-base">Sales proceeds</CardTitle>
                <CardDescription>
                  {saleSources.length} source
                  {saleSources.length === 1 ? "" : "s"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-medium text-muted-foreground">
                Total proceeds
              </span>
              <span className="text-2xl font-semibold tabular-nums">
                {inr(saleTotalProceeds)}
              </span>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                {salePctReceived > 0 && (
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${salePctReceived}%` }}
                  />
                )}
                {salePctInTransit > 0 && (
                  <div
                    className="h-full bg-amber-400 dark:bg-amber-500"
                    style={{ width: `${salePctInTransit}%` }}
                  />
                )}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Received
                    </span>
                  </div>
                  <p className="mt-1 text-[15px] font-semibold tabular-nums">
                    {compact(saleReceived)}
                  </p>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400 dark:bg-amber-500" />
                    <span className="text-[11px] font-medium text-muted-foreground">
                      In transit
                    </span>
                  </div>
                  <p className="mt-1 text-[15px] font-semibold tabular-nums">
                    {compact(saleInTransit)}
                  </p>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/30" />
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Remaining
                    </span>
                  </div>
                  <p className="mt-1 text-[15px] font-semibold tabular-nums">
                    {compact(saleYetToReceive)}
                  </p>
                </div>
              </div>
            </div>

            {/* Available balance */}
            <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3.5 py-2.5">
              <span className="text-[13px] font-medium">Available balance</span>
              <span className="text-[15px] font-semibold tabular-nums">
                {inr(saleAvailable)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loans & debt */}
      {loans.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Landmark className="h-3.5 w-3.5" />
              </span>
              <div>
                <CardTitle className="text-base">Loans &amp; debt</CardTitle>
                <CardDescription>
                  {loans.length} loan{loans.length === 1 ? "" : "s"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-medium text-muted-foreground">
                Outstanding
              </span>
              <span className="text-2xl font-semibold tabular-nums">
                {inr(totalOutstanding)}
              </span>
            </div>

            <div>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, repaidPercent)}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{repaidPercent.toFixed(0)}% repaid</span>
                <span className="tabular-nums">
                  {compact(totalRepaidPrincipal)} of {compact(totalBorrowed)}
                </span>
              </div>
            </div>

            {nextPayment ? (
              <div
                className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 ${
                  nextOverdue ? "bg-destructive/10" : "bg-muted/60"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <AlertCircle
                    className={`h-4 w-4 shrink-0 ${
                      nextOverdue ? "text-destructive" : "text-muted-foreground"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">
                      {nextOverdue ? "EMI overdue" : "Next EMI"}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {nextPayment.loanName} ·{" "}
                      {new Date(nextPayment.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 text-[15px] font-semibold tabular-nums ${
                    nextOverdue ? "text-destructive" : ""
                  }`}
                >
                  {inr(nextPayment.amount)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 rounded-xl bg-muted/60 px-3.5 py-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                <p className="text-[13px] font-medium">All EMIs cleared</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Monthly trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monthly spend</CardTitle>
          <CardDescription>Construction vs property over time</CardDescription>
        </CardHeader>
        <CardContent className="px-2">
          <TrendChart data={trendData} />
        </CardContent>
      </Card>

      {/* This month */}
      <MonthExpenses expenses={expenses} />

      {/* Funding source */}
      {fundingChart.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Where it came from</CardTitle>
            <CardDescription>Payouts by funding source</CardDescription>
          </CardHeader>
          <CardContent className="px-2">
            <ExpenseChart data={fundingChart} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="secondary"
      onClick={onClick}
      className="h-auto flex-col items-center gap-2 rounded-2xl py-4"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="text-[13px] font-medium">{label}</span>
    </Button>
  );
}

function RecordFundingDialog({
  open,
  onOpenChange,
  sources,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sources: FundingSource[];
  onSubmit: (sourceId: number, values: FundingEntryFormValues) => Promise<void>;
}) {
  const [sourceId, setSourceId] = useState<string>("");

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setSourceId("");
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record funding</DialogTitle>
          <DialogDescription>
            Log money in or out on a funding source.
          </DialogDescription>
        </DialogHeader>

        {sources.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No funding sources yet. Add one from the Funding tab first.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">
                Funding source
              </label>
              <Select value={sourceId} onValueChange={setSourceId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a source" />
                </SelectTrigger>
                <SelectContent>
                  {sources.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {sourceId && (
              <FundingEntryForm
                onSubmit={(values) => onSubmit(Number(sourceId), values)}
                onCancel={() => onOpenChange(false)}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MonthExpenses({ expenses }: { expenses: Expense[] }) {
  const [offset, setOffset] = useState(0);
  const base = new Date();
  const view = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const key = monthKey(view);

  const items = expenses
    .filter((e) => monthKey(new Date(e.date)) === key)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const total = items.reduce((s, e) => s + e.amount, 0);
  const label = view.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">This month</CardTitle>
            <CardDescription>{label}</CardDescription>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => setOffset((o) => o - 1)}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => setOffset((o) => Math.min(0, o + 1))}
              disabled={offset >= 0}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No expenses this month.
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between rounded-xl bg-muted/60 px-3.5 py-2.5">
              <span className="text-[13px] text-muted-foreground">
                {items.length} expense{items.length === 1 ? "" : "s"}
              </span>
              <span className="text-lg font-semibold tabular-nums tracking-tight">
                {inr(total)}
              </span>
            </div>
            <div className="-mx-2 max-h-80 divide-y divide-border/60 overflow-auto">
              {items.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-3 px-2 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {e.description}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="tabular-nums">
                        {new Date(e.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      {e.area && (
                        <>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="truncate">{e.area}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {inr(e.amount)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
