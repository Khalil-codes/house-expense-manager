"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { useIsMobile } from "@/components/ui/use-mobile";
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
  Check,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LoanForm } from "@/components/loan-form";
import { PrepaymentForm } from "@/components/prepayment-form";
import type { LoanFormValues, PrepaymentFormValues } from "@/lib/validations";
import { normalizeName } from "@/lib/loan-utils";

const PAYMENTS_PER_PAGE = 12;
type ScheduleView = "table" | "list";

export default function LoanTracker() {
  const {
    loans,
    fundingSources,
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
  const isMobile = useIsMobile();
  const effectiveScheduleView: ScheduleView = isMobile ? "list" : scheduleView;

  const selectedLoan: LoanData | undefined = useMemo(() => {
    if (selectedLoanId) return loans.find((l) => l.id === selectedLoanId);
    return loans[0];
  }, [loans, selectedLoanId]);

  // Auto-link to a same-named funding source to show how much was deployed.
  const deployedFromLoan = useMemo(() => {
    if (!selectedLoan) return null;
    const match = fundingSources.find(
      (s) => normalizeName(s.name) === normalizeName(selectedLoan.name)
    );
    return match ? match.outflows : null;
  }, [fundingSources, selectedLoan]);

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
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="mb-4 h-7 w-7 animate-spin" />
        <p className="text-sm">Loading loans…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
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
            <Button size="sm" className="ml-auto rounded-full">
              <Plus className="h-4 w-4 mr-1" />
              Add loan
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
            deployed={deployedFromLoan}
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
              <h3 className="text-base font-semibold tracking-tight">
                Payment schedule
              </h3>
              <div className="flex items-center gap-2">
                {/* Prepay button */}
                <Dialog
                  open={prepayDialogOpen}
                  onOpenChange={setPrepayDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="secondary" size="sm" className="h-9 rounded-full">
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
                <div className="hidden md:block">
                  <Segmented
                    aria-label="Schedule view"
                    size="sm"
                    value={scheduleView}
                    onChange={(v) => setScheduleView(v as ScheduleView)}
                    options={[
                      { value: "list", label: <LayoutList className="h-4 w-4" /> },
                      { value: "table", label: <LayoutGrid className="h-4 w-4" /> },
                    ]}
                  />
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
            {effectiveScheduleView === "table" ? (
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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Wallet className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mt-3 text-sm font-medium">No loans yet</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Add a loan to generate its payment schedule.
          </p>
          <Button className="mt-4 rounded-full" onClick={() => setLoanFormOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add loan
          </Button>
        </div>
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
  deployed,
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
  deployed?: number | null;
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
      <CardContent className="space-y-4 p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold tracking-tight">
              {loan.name}
            </h3>
            <p className="text-[13px] text-muted-foreground">{loanTerms}</p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="-mr-1.5 h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:text-destructive"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-[18px] w-[18px]" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {loan.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the loan and its entire payment schedule. This
                  can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={onDelete}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[13px] text-muted-foreground">
            <span>Repayment progress</span>
            <span className="font-medium text-foreground">
              {stats.progressPercent.toFixed(1)}%
            </span>
          </div>
          <Progress value={stats.progressPercent} className="h-2.5" />
        </div>

        {/* Two key stats */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[12px] text-muted-foreground">Total paid</p>
            <p className="text-xl font-semibold tabular-nums text-primary">
              {fmt(stats.amountPaid)}
            </p>
          </div>
          <div>
            <p className="text-[12px] text-muted-foreground">Remaining</p>
            <p className="text-xl font-semibold tabular-nums">
              {fmt(stats.remainingBalance)}
            </p>
          </div>
        </div>

        {deployed != null && deployed > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="text-[13px] font-medium">Deployed into house</p>
              <p className="text-[11px] text-muted-foreground">
                spent from this loan&apos;s funding
              </p>
            </div>
            <span className="shrink-0 text-[15px] font-semibold tabular-nums">
              {fmt(deployed)}
            </span>
          </div>
        )}
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
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </span>
          <div>
            <p className="text-sm font-medium">All payments completed</p>
            <p className="text-[13px] text-muted-foreground">
              This loan is fully paid off.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!payment) return null;

  const dateStr = new Date(payment.date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {isOverdue && (
            <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-destructive" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium">
              <span className={isOverdue ? "text-destructive" : undefined}>
                {isOverdue ? "Overdue" : "Next payment"}
              </span>{" "}
              <span className="font-normal text-muted-foreground">
                · EMI #{payment.month}
              </span>
            </p>
            <p className="flex items-center gap-1 text-[13px] text-muted-foreground">
              {isOverdue && <AlertCircle className="h-3.5 w-3.5" />}
              {isOverdue ? `Due since ${dateStr}` : `Due ${dateStr}`}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:shrink-0">
          <span className="text-lg font-semibold tabular-nums">
            {fmt(payment.amount)}
          </span>
          <Button
            variant={isOverdue ? "destructive" : "default"}
            disabled={disabled}
            onClick={onMarkPaid}
          >
            {isToggling ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-1 h-4 w-4" />
            )}
            Mark paid
          </Button>
        </div>
      </CardContent>
    </Card>
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
    <div className="overflow-x-auto rounded-2xl border border-border/60">
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
                  ? "bg-destructive/5"
                  : payment.paid
                  ? "bg-muted/40"
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
            className={`flex items-center gap-3 rounded-2xl border border-border/60 p-3 transition-colors ${
              overdue
                ? "bg-destructive/5"
                : payment.paid
                ? "bg-muted/40"
                : "bg-card"
            }`}
          >
            {/* Left: month + date */}
            <div className="w-16 shrink-0 text-center">
              <p className="text-[11px] text-muted-foreground">
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
              <p className="text-sm font-semibold tabular-nums">
                {fmt(payment.amount)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                P: {fmt(payment.principal)} · I: {fmt(payment.interest)} · Bal:{" "}
                {fmt(payment.balance)}
              </p>
            </div>

            {/* Status */}
            {overdue && (
              <Badge
                variant="destructive"
                className="hidden px-2 py-0 text-[10px] sm:inline-flex"
              >
                Overdue
              </Badge>
            )}

            {/* Right: checkbox with 44px target */}
            <button
              type="button"
              disabled={togglingPaymentId !== null}
              onClick={() => onToggle(payment.id, payment.paid)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-muted disabled:opacity-60"
              aria-label={payment.paid ? "Mark unpaid" : "Mark paid"}
            >
              {toggling ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <span
                  className={`flex h-[22px] w-[22px] items-center justify-center rounded-[6px] border transition-colors ${
                    payment.paid
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input"
                  }`}
                >
                  {payment.paid && <Check className="h-3.5 w-3.5" />}
                </span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
