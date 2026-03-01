"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "@/hooks/use-expense-service";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoanForm } from "@/components/loan-form";
import { PrepaymentForm } from "@/components/prepayment-form";
import type { LoanFormValues, PrepaymentFormValues } from "@/lib/validations";

const PAYMENTS_PER_PAGE = 12;

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
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [deletingLoan, setDeletingLoan] = useState(false);
  const [togglingPaymentId, setTogglingPaymentId] = useState<number | null>(null);

  const selectedLoan: LoanData | undefined = useMemo(() => {
    if (selectedLoanId) {
      return loans.find((l) => l.id === selectedLoanId);
    }
    return loans[0];
  }, [loans, selectedLoanId]);

  const loanStats = useMemo(() => {
    if (!selectedLoan || selectedLoan.payments.length === 0) {
      return { amountPaid: 0, interestPaid: 0, principalPaid: 0, remainingBalance: 0 };
    }

    const amountPaid = selectedLoan.payments.reduce(
      (sum, p) => sum + (p.paid ? p.amount : 0), 0
    );
    const interestPaid = selectedLoan.payments.reduce(
      (sum, p) => sum + (p.paid ? p.interest : 0), 0
    );
    const principalPaid = selectedLoan.payments.reduce(
      (sum, p) => sum + (p.paid ? p.principal : 0), 0
    );
    const remainingBalance = selectedLoan.amount - principalPaid;

    return { amountPaid, interestPaid, principalPaid, remainingBalance };
  }, [selectedLoan]);

  const paginatedPayments = useMemo(() => {
    if (!selectedLoan) return { payments: [], totalPages: 0, smartStartPage: 0 };

    const total = selectedLoan.payments.length;
    const totalPages = Math.ceil(total / PAYMENTS_PER_PAGE);

    const nextUnpaidIdx = selectedLoan.payments.findIndex((p) => !p.paid);
    const smartStartPage =
      nextUnpaidIdx >= 0
        ? Math.floor(nextUnpaidIdx / PAYMENTS_PER_PAGE)
        : 0;

    const start = currentPage * PAYMENTS_PER_PAGE;
    const payments = selectedLoan.payments.slice(start, start + PAYMENTS_PER_PAGE);

    return { payments, totalPages, smartStartPage };
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
    setShowLoanForm(false);
    setCurrentPage(0);
  };

  const handleDeleteLoan = async (loanId: string) => {
    if (!confirm("Are you sure you want to delete this loan?")) return;
    setDeletingLoan(true);
    try {
      await deleteLoan(loanId);
      setSelectedLoanId("");
    } finally {
      setDeletingLoan(false);
    }
  };

  const handleTogglePayment = async (paymentId: number, currentPaid: boolean) => {
    if (!selectedLoan) return;
    setTogglingPaymentId(paymentId);
    try {
      await togglePayment({ loanId: selectedLoan.id, paymentId, paid: !currentPaid });
    } finally {
      setTogglingPaymentId(null);
    }
  };

  const onPrepay = async (values: PrepaymentFormValues) => {
    if (!selectedLoan) return;
    await addPrepayment({ loanId: selectedLoan.id, amount: values.amount, date: values.date });
    setCurrentPage(0);
  };

  const isOverdue = (paymentDate: string, paid: boolean) => {
    if (paid) return false;
    return new Date(paymentDate) < new Date();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Loading loan data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {loans.length > 1 && (
            <Select
              value={selectedLoan?.id || ""}
              onValueChange={(v) => {
                setSelectedLoanId(v);
                setCurrentPage(0);
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

          <Button
            size="sm"
            onClick={() => setShowLoanForm(true)}
            className="ml-auto"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Loan
          </Button>
        </div>
      </div>

      {showLoanForm && (
        <LoanForm
          onSubmit={onCreateLoan}
          onCancel={() => setShowLoanForm(false)}
        />
      )}

      {selectedLoan && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Amount Paid
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="text-lg font-bold">
                  ₹{loanStats.amountPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <Progress
                  value={selectedLoan.amount ? (loanStats.amountPaid / (selectedLoan.amount * (1 + selectedLoan.interest / 100 * selectedLoan.tenure))) * 100 : 0}
                  className="h-1.5 mt-1"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Remaining
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="text-lg font-bold">
                  ₹{loanStats.remainingBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {selectedLoan.amount
                    ? ((loanStats.remainingBalance / selectedLoan.amount) * 100).toFixed(1)
                    : 0}
                  % of principal
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Interest Paid
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="text-lg font-bold">
                  ₹{loanStats.interestPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {loanStats.amountPaid
                    ? ((loanStats.interestPaid / loanStats.amountPaid) * 100).toFixed(1)
                    : 0}
                  % of paid
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Principal Paid
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="text-lg font-bold">
                  ₹{loanStats.principalPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {selectedLoan.amount
                    ? ((loanStats.principalPaid / selectedLoan.amount) * 100).toFixed(1)
                    : 0}
                  % of loan
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold">{selectedLoan.name}</h3>
              <p className="text-xs text-muted-foreground">
                ₹{selectedLoan.amount.toLocaleString()} at {selectedLoan.interest}% for{" "}
                {selectedLoan.tenure}yr
                {selectedLoan.start_date &&
                  ` from ${new Date(selectedLoan.start_date).toLocaleDateString()}`}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive h-8 w-8"
              disabled={deletingLoan}
              onClick={() => handleDeleteLoan(selectedLoan.id)}
            >
              {deletingLoan ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>

          <Card>
            <CardContent className="pt-4 px-3">
              <Tabs defaultValue="schedule">
                <TabsList className="w-full grid grid-cols-3 mb-3">
                  <TabsTrigger value="schedule" className="text-xs">
                    Schedule
                  </TabsTrigger>
                  <TabsTrigger value="prepayment" className="text-xs">
                    Prepay
                  </TabsTrigger>
                  <TabsTrigger value="history" className="text-xs">
                    History
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="schedule" className="mt-0">
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
                        {paginatedPayments.payments.map((payment) => (
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
                            <TableCell className="text-xs py-2">
                              ₹{payment.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-xs py-2">
                              ₹{payment.principal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-xs py-2">
                              ₹{payment.interest.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-xs py-2">
                              ₹{payment.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </TableCell>
                            <TableCell className="py-2">
                              {togglingPaymentId === payment.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Checkbox
                                  checked={payment.paid}
                                  disabled={togglingPaymentId !== null}
                                  onCheckedChange={() =>
                                    handleTogglePayment(payment.id, payment.paid)
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

                  {paginatedPayments.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 0}
                        onClick={() => setCurrentPage((p) => p - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Page {currentPage + 1} of {paginatedPayments.totalPages}
                        </span>
                        <Select
                          value={currentPage.toString()}
                          onValueChange={(v) => setCurrentPage(parseInt(v))}
                        >
                          <SelectTrigger className="h-7 w-[90px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: paginatedPayments.totalPages }, (_, i) => (
                              <SelectItem key={i} value={i.toString()}>
                                Year {Math.floor((i * PAYMENTS_PER_PAGE) / 12) + 1}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= paginatedPayments.totalPages - 1}
                        onClick={() => setCurrentPage((p) => p + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="prepayment" className="mt-0 space-y-3">
                  <PrepaymentForm
                    remainingBalance={loanStats.remainingBalance}
                    onSubmit={onPrepay}
                  />
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-xs text-muted-foreground">
                      Making a prepayment reduces your loan principal and recalculates
                      remaining payments, helping you save on interest.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="history" className="mt-0">
                  {selectedLoan.prepayments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No prepayments made yet
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedLoan.prepayments.map((prep) => (
                            <TableRow key={prep.id}>
                              <TableCell className="text-sm">
                                {new Date(prep.date).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-sm">
                                ₹{prep.amount.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}

      {loans.length === 0 && !showLoanForm && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No loans added yet</p>
            <Button onClick={() => setShowLoanForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Loan
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
