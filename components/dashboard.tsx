"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DollarSign, Building, Home, Landmark, Loader2 } from "lucide-react";
import { useExpenseService } from "@/hooks/use-expense-service";
import { ExpenseChart } from "@/components/expense-chart";

export default function Dashboard() {
  const { construction, property, loans, isLoading, grandTotal, adjustedTotal } = useExpenseService();

  const totals = {
    construction: construction.reduce((sum, e) => sum + e.amount, 0),
    property: property.reduce((sum, e) => sum + e.amount, 0),
    loanPaid: loans.reduce(
      (sum, loan) =>
        sum +
        loan.payments.reduce((s, p) => s + (p.paid ? p.amount : 0), 0),
      0
    ),
    loanTotal: loans.reduce((sum, loan) => sum + loan.amount, 0),
  };

  const pct = (val: number) => (grandTotal ? (val / grandTotal) * 100 : 0);

  const coveredByLoanAmount =
    construction
      .filter((e) => e.covered_by_loan)
      .reduce((sum, e) => sum + e.amount, 0) +
    property
      .filter((e) => e.covered_by_loan)
      .reduce((sum, e) => sum + e.amount, 0);

  const chartData = [
    { name: "Construction", value: totals.construction },
    { name: "Property", value: totals.property },
    { name: "Loan Payments", value: totals.loanPaid },
  ];

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
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium">Total</CardTitle>
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-lg font-bold">₹{adjustedTotal.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground">Adjusted total</p>
            {coveredByLoanAmount > 0 && (
              <p className="text-[10px] text-muted-foreground">
                ₹{coveredByLoanAmount.toLocaleString()} via loan
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium">Construction</CardTitle>
            <Building className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-lg font-bold">₹{totals.construction.toLocaleString()}</div>
            <Progress value={pct(totals.construction)} className="h-1.5 mt-1" />
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {pct(totals.construction).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium">Property</CardTitle>
            <Home className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-lg font-bold">₹{totals.property.toLocaleString()}</div>
            <Progress value={pct(totals.property)} className="h-1.5 mt-1" />
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {pct(totals.property).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium">Loan Paid</CardTitle>
            <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-lg font-bold">₹{totals.loanPaid.toLocaleString()}</div>
            <Progress
              value={totals.loanTotal ? (totals.loanPaid / totals.loanTotal) * 100 : 0}
              className="h-1.5 mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {totals.loanTotal
                ? `${((totals.loanPaid / totals.loanTotal) * 100).toFixed(1)}% of loans`
                : "No loans"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Expense Breakdown</CardTitle>
          <CardDescription className="text-xs">
            Visual breakdown by category
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2">
          <ExpenseChart data={chartData} />
        </CardContent>
      </Card>
    </div>
  );
}
