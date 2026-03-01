"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useExpenseService,
  type LoanData,
  type LoanPayment,
} from "@/hooks/use-expense-service";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  LayoutList,
  LayoutGrid,
  Wallet,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoanForm } from "@/components/loan-form";
import { PrepaymentForm } from "@/components/prepayment-form";
import type { LoanFormValues, PrepaymentFormValues } from "@/lib/validations";

const PAYMENTS_PER_PAGE = 12;
type ScheduleView = "table" | "list";

export default function LoanTracker() {
  const {
    loans,
    isLoading,
    addLoan,
    deleteLoan,
    togglePayment,
    addPrepayment,
  } = useExpenseService();

  const [selectedLoanId, setSelectedLoanId] = useState<string>("");
  const [loanFormOpen, setLoanFormOpen] = useState(false);
  const [prepayDialogOpen, setPrepayDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(-1);
  const [deletingLoan, setDeletingLoan] = useState(false);
  const [togglingPaymentId, setTogglingPaymentId] = useState<number | null>(
    null
  );
  const [scheduleView, setScheduleView] = useState<ScheduleView>("list");

  const selectedLoan: LoanData | undefined = useMemo(() => {
    if (selectedLoanId) return loans.find((l) => l.id === selectedLoanId);
    return loans[0];
  }, [loans, selectedLoanId]);

  const loanStats = useMemo(() => {
    if (!selectedLoan || selectedLoan.payments.length === 0) {
      return {
        amountPaid: 0,
        interestPaid: 0,
        principalPaid: 0,
        remainingBalance: 0,
        totalPayable: 0,
        progressPercent: 0,
      };
    }

    const amountPaid = selectedLoan.payments.reduce(
      (sum, p) => sum + (p.paid ? p.amount : 0),
      0
    );
    const interestPaid = selectedLoan.payments.reduce(
      (sum, p) => sum + (p.paid ? p.interest : 0),
      0
    );
    const principalPaid = selectedLoan.payments.reduce(
      (sum, p) => sum + (p.paid ? p.principal : 0),
      0
    );
    const remainingBalance = selectedLoan.amount - principalPaid;
    const totalPayable = selectedLoan.payments.reduce(
      (sum, p) => sum + p.amount,
      0
    );
    const progressPercent = totalPayable > 0 ? (amountPaid / totalPayable) * 100 : 0;

    return {
      amountPaid,
      interestPaid,
      principalPaid,
      remainingBalance,
      totalPayable,
      progressPercent,
    };
  }, [selectedLoan]);

  const nextPayment = useMemo((): LoanPayment | null => {
    if (!selectedLoan) return null;
    return selectedLoan.payments.find((p) => !p.paid) ?? null;
  }, [selectedLoan]);

  const allPaymentsPaid = useMemo(() => {
    if (!selectedLoan || selectedLoan.payments.length === 0) return false;
    return selectedLoan.payments.every((p) => p.paid);
  }, [selectedLoan]);

  const smartStartPage = useMemo(() => {
    if (!selectedLoan) return 0;
    const nextUnpaidIdx = selectedLoan.payments.findIndex((p) => !p.paid);
    return nextUnpaidIdx >= 0
      ? Math.floor(nextUnpaidIdx / PAYMENTS_PER_PAGE)
      : 0;
  }, [selectedLoan]);

  useEffect(() => {
    if (currentPage === -1 && selectedLoan) {
      setCurrentPage(smartStartPage);
    }
  }, [currentPage, selectedLoan, smartStartPage]);

  const paginatedPayments = useMemo(() => {
    if (!selectedLoan || currentPage < 0)
      return { payments: [], totalPages: 0, pageYearLabel: "" };

    const total = selectedLoan.payments.length;
    const totalPages = Math.ceil(total / PAYMENTS_PER_PAGE);
    const start = currentPage * PAYMENTS_PER_PAGE;
    const payments = selectedLoan.payments.slice(
      start,
      start + PAYMENTS_PER_PAGE
    );

    const firstYear =
      payments.length > 0 ? new Date(payments[0].date).getFullYear() : 0;
    const lastYear =
      payments.length > 0
        ? new Date(payments[payments.length - 1].date).getFullYear()
        : 0;
    const pageYearLabel =
      firstYear === lastYear ? `${firstYear}` : `${firstYear}\u2013${lastYear}`;

    return { payments, totalPages, pageYearLabel };
  }, [selectedLoan, currentPage]);

  const onCreateLoan = async (values: LoanFormValues) => {
    await addLoan({
      id: crypto.randomUUID(),
      name: values.name,
      amount: values.amount,
      interest: values.interest,
      tenure: values.tenure,
      start_date: values.start_date,
    });
    setLoanFormOpen(false);
    setCurrentPage(-1);
  };

  const handleDeleteLoan = async (loanId: string) => {
    if (!confirm("Are you sure you want to delete this loan?")) return;
    setDeletingLoan(true);
    try {
      await deleteLoan(loanId);
      setSelectedLoanId("");
      setCurrentPage(-1);
    } finally {
      setDeletingLoan(false);
    }
  };

  const handleTogglePayment = useCallback(
    async (paymentId: number, currentPaid: boolean) => {
      if (!selectedLoan) return;
      setTogglingPaymentId(paymentId);
      try {
        await togglePayment({
          loanId: selectedLoan.id,
          paymentId,
          paid: !currentPaid,
        });
      } finally {
        setTogglingPaymentId(null);
      }
    },
    [selectedLoan, togglePayment]
  );

  const onPrepay = async (values: PrepaymentFormValues) => {
    if (!selectedLoan) return;
    await addPrepayment({
      loanId: selectedLoan.id,
      amount: values.amount,
      date: values.date,
    });
    setCurrentPage(-1);
  };

  const isOverdue = (paymentDate: string, paid: boolean) => {
    if (paid) return false;
    return new Date(paymentDate) < new Date();
  };

  const fmt = (n: number) =>
    `\u20B9${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Loading loan data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── 1. Loan Header + Actions ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {loans.length > 1 && (
          <Select
            value={selectedLoan?.id || ""}
            onValueChange={(v) => {
              setSelectedLoanId(v);
              setCurrentPage(-1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Select loan" />
            </SelectTrigger>
            <SelectContent>
              {loans.map((loan) => (
                <SelectItem key={loan.id} value={loan.id}>
                  {loan.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Dialog open={loanFormOpen} onOpenChange={setLoanFormOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="ml-auto">
              <Plus className="h-4 w-4 mr-1" />
              Add Loan
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New Loan</DialogTitle>
              <DialogDescription>
                Enter loan details to generate a payment schedule.
              </DialogDescription>
            </DialogHeader>
            <LoanForm
              onSubmit={onCreateLoan}
              onCancel={() => setLoanFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {selectedLoan && (
        <>
          {/* ── 2. Loan Summary Card ── */}
          <LoanSummaryCard
            loan={selectedLoan}
            stats={loanStats}
            onDelete={() => handleDeleteLoan(selectedLoan.id)}
            isDeleting={deletingLoan}
          />

          {/* ── 3. Next Payment Banner ── */}
          <NextPaymentBanner
            payment={nextPayment}
            allPaid={allPaymentsPaid}
            isOverdue={nextPayment ? isOverdue(nextPayment.date, nextPayment.paid) : false}
            onMarkPaid={() =>
              nextPayment &&
              handleTogglePayment(nextPayment.id, nextPayment.paid)
            }
            isToggling={
              nextPayment ? togglingPaymentId === nextPayment.id : false
            }
            disabled={togglingPaymentId !== null}
            fmt={fmt}
          />

          {/* ── 4. Payment Schedule ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold">Payment Schedule</h3>
              <div className="flex items-center gap-2">
                {/* Prepay button */}
                <Dialog
                  open={prepayDialogOpen}
                  onOpenChange={setPrepayDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Wallet className="h-4 w-4 mr-1" />
                      Prepay
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Prepayment</DialogTitle>
                      <DialogDescription>
                        Reduce your loan principal and save on interest.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <PrepaymentForm
                        remainingBalance={loanStats.remainingBalance}
                        onSubmit={async (v) => {
                          await onPrepay(v);
                          setPrepayDialogOpen(false);
                        }}
                      />
                      {selectedLoan.prepayments.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            Previous prepayments
                          </p>
                          <div className="max-h-40 overflow-y-auto space-y-1.5">
                            {selectedLoan.prepayments.map((prep) => (
                              <div
                                key={prep.id}
                                className="flex items-center justify-between text-sm px-3 py-2 bg-muted rounded-md"
                              >
                                <span>
                                  {new Date(prep.date).toLocaleDateString(
                                    "en-IN",
                                    {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    }
                                  )}
                                </span>
                                <span className="font-medium">
                                  {fmt(prep.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                {/* List / Table toggle */}
                <div className="flex border rounded-md">
                  <Button
                    variant={scheduleView === "list" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8 rounded-r-none"
                    onClick={() => setScheduleView("list")}
                  >
                    <LayoutList className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={scheduleView === "table" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8 rounded-l-none"
                    onClick={() => setScheduleView("table")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Year selector + pagination */}
            {paginatedPayments.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Select
                  value={currentPage.toString()}
                  onValueChange={(v) => setCurrentPage(parseInt(v))}
                >
                  <SelectTrigger className="h-8 text-xs w-auto min-w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(
                      { length: paginatedPayments.totalPages },
                      (_, i) => {
                        const pageStart = i * PAYMENTS_PER_PAGE;
                        const first = selectedLoan!.payments[pageStart];
                        const last =
                          selectedLoan!.payments[
                            Math.min(
                              pageStart + PAYMENTS_PER_PAGE - 1,
                              selectedLoan!.payments.length - 1
                            )
                          ];
                        const y1 = new Date(first.date).getFullYear();
                        const y2 = new Date(last.date).getFullYear();
                        const label =
                          y1 === y2 ? `${y1}` : `${y1}\u2013${y2}`;
                        return (
                          <SelectItem key={i} value={i.toString()}>
                            {label}
                          </SelectItem>
                        );
                      }
                    )}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    currentPage >= paginatedPayments.totalPages - 1
                  }
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Schedule content */}
            {scheduleView === "table" ? (
              <ScheduleTable
                payments={paginatedPayments.payments}
                isOverdue={isOverdue}
                togglingPaymentId={togglingPaymentId}
                onToggle={handleTogglePayment}
                fmt={fmt}
              />
            ) : (
              <ScheduleList
                payments={paginatedPayments.payments}
                isOverdue={isOverdue}
                togglingPaymentId={togglingPaymentId}
                onToggle={handleTogglePayment}
                fmt={fmt}
              />
            )}
          </div>
        </>
      )}

      {loans.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No loans added yet</p>
            <Button onClick={() => setLoanFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Loan
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Loan Summary Card
   ═══════════════════════════════════════════════════════════════════════════ */

function LoanSummaryCard({
  loan,
  stats,
  onDelete,
  isDeleting,
}: {
  loan: LoanData;
  stats: {
    amountPaid: number;
    principalPaid: number;
    remainingBalance: number;
    totalPayable: number;
    progressPercent: number;
  };
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const fmt = (n: number) =>
    `\u20B9${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  const loanTerms = [
    fmt(loan.amount),
    `${loan.interest}%`,
    `${loan.tenure}yr`,
  ].join(" \u00B7 ");

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-base truncate">{loan.name}</h3>
            <p className="text-xs text-muted-foreground">{loanTerms}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
            disabled={isDeleting}
            onClick={onDelete}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Repayment progress</span>
            <span className="font-medium">
              {stats.progressPercent.toFixed(1)}%
            </span>
          </div>
          <Progress value={stats.progressPercent} className="h-2" />
        </div>

        {/* Two key stats */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Total Paid</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {fmt(stats.amountPaid)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="text-lg font-bold">
              {fmt(stats.remainingBalance)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Next Payment Banner
   ═══════════════════════════════════════════════════════════════════════════ */

function NextPaymentBanner({
  payment,
  allPaid,
  isOverdue,
  onMarkPaid,
  isToggling,
  disabled,
  fmt,
}: {
  payment: LoanPayment | null;
  allPaid: boolean;
  isOverdue: boolean;
  onMarkPaid: () => void;
  isToggling: boolean;
  disabled: boolean;
  fmt: (n: number) => string;
}) {
  if (allPaid) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 p-4">
        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-800 dark:text-green-300">
            All payments completed
          </p>
          <p className="text-xs text-green-600 dark:text-green-500">
            Congratulations! This loan is fully paid off.
          </p>
        </div>
      </div>
    );
  }

  if (!payment) return null;

  const dateStr = new Date(payment.date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border p-4 ${
        isOverdue
          ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
          : "border-border bg-muted/30"
      }`}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {isOverdue && (
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {isOverdue ? "Overdue" : "Next payment"}{" "}
            <span className="text-muted-foreground font-normal">
              &middot; EMI #{payment.month}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {isOverdue ? `Due since ${dateStr}` : `Due ${dateStr}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:shrink-0">
        <span className="text-lg font-bold">{fmt(payment.amount)}</span>
        <Button
          size="sm"
          variant={isOverdue ? "destructive" : "default"}
          disabled={disabled}
          onClick={onMarkPaid}
        >
          {isToggling ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-1" />
          )}
          Mark Paid
        </Button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Schedule – Table View
   ═══════════════════════════════════════════════════════════════════════════ */

function ScheduleTable({
  payments,
  isOverdue,
  togglingPaymentId,
  onToggle,
  fmt,
}: {
  payments: LoanPayment[];
  isOverdue: (date: string, paid: boolean) => boolean;
  togglingPaymentId: number | null;
  onToggle: (id: number, paid: boolean) => void;
  fmt: (n: number) => string;
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>EMI</TableHead>
            <TableHead className="hidden sm:table-cell">Principal</TableHead>
            <TableHead className="hidden sm:table-cell">Interest</TableHead>
            <TableHead className="hidden sm:table-cell">Balance</TableHead>
            <TableHead className="w-10">Paid</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow
              key={payment.id}
              className={
                isOverdue(payment.date, payment.paid)
                  ? "bg-destructive/10"
                  : payment.paid
                  ? "bg-green-500/5"
                  : ""
              }
            >
              <TableCell className="text-xs py-2">
                {isOverdue(payment.date, payment.paid) && (
                  <AlertCircle className="h-3 w-3 text-destructive inline mr-0.5" />
                )}
                {payment.month}
              </TableCell>
              <TableCell className="text-xs py-2">
                {new Date(payment.date).toLocaleDateString("en-IN", {
                  month: "short",
                  year: "2-digit",
                })}
              </TableCell>
              <TableCell className="text-xs py-2 font-medium">
                {fmt(payment.amount)}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-xs py-2">
                {fmt(payment.principal)}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-xs py-2">
                {fmt(payment.interest)}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-xs py-2">
                {fmt(payment.balance)}
              </TableCell>
              <TableCell className="py-2">
                {togglingPaymentId === payment.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Checkbox
                    checked={payment.paid}
                    disabled={togglingPaymentId !== null}
                    onCheckedChange={() =>
                      onToggle(payment.id, payment.paid)
                    }
                    className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Schedule – Card/List View
   ═══════════════════════════════════════════════════════════════════════════ */

function ScheduleList({
  payments,
  isOverdue,
  togglingPaymentId,
  onToggle,
  fmt,
}: {
  payments: LoanPayment[];
  isOverdue: (date: string, paid: boolean) => boolean;
  togglingPaymentId: number | null;
  onToggle: (id: number, paid: boolean) => void;
  fmt: (n: number) => string;
}) {
  return (
    <div className="space-y-2">
      {payments.map((payment) => {
        const overdue = isOverdue(payment.date, payment.paid);
        const toggling = togglingPaymentId === payment.id;

        return (
          <div
            key={payment.id}
            className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
              overdue
                ? "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20"
                : payment.paid
                ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20"
                : "border-border"
            }`}
          >
            {/* Left: month + date */}
            <div className="w-16 shrink-0 text-center">
              <p className="text-xs text-muted-foreground">
                EMI #{payment.month}
              </p>
              <p className="text-xs font-medium">
                {new Date(payment.date).toLocaleDateString("en-IN", {
                  month: "short",
                  year: "2-digit",
                })}
              </p>
            </div>

            {/* Center: amount + details */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{fmt(payment.amount)}</p>
              <p className="text-[11px] text-muted-foreground">
                P: {fmt(payment.principal)} &middot; I:{" "}
                {fmt(payment.interest)} &middot; Bal: {fmt(payment.balance)}
              </p>
            </div>

            {/* Status badge */}
            {overdue && (
              <Badge
                variant="destructive"
                className="text-[10px] px-1.5 py-0 hidden sm:inline-flex"
              >
                Overdue
              </Badge>
            )}

            {/* Right: checkbox */}
            <div className="shrink-0">
              {toggling ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Checkbox
                  checked={payment.paid}
                  disabled={togglingPaymentId !== null}
                  onCheckedChange={() => onToggle(payment.id, payment.paid)}
                  className="h-5 w-5 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
