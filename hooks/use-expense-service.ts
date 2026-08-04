"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  queryKeys,
  expenseService,
  loanService,
  payeeService,
  dataService,
  PAYMENT_METHODS,
  type Expense,
  type LoanData,
  type Payee,
  type Area,
  type Tag,
  type FundingSource,
} from "@/lib/api/expense-service";
import type {
  CreateExpenseInput,
  UpdateExpenseInput,
  CreatePayeeInput,
  UpdatePayeeInput,
  CreateAreaInput,
  UpdateAreaInput,
  CreateFundingSourceInput,
  UpdateFundingSourceInput,
  CreateFundingEntryInput,
} from "@/lib/validations";
import {
  listAreas,
  createArea,
  updateArea,
  deleteArea,
} from "@/lib/actions/areas";
import { listTags, createTag, deleteTag } from "@/lib/actions/tags";
import {
  listFundingSources,
  createFundingSource,
  updateFundingSource,
  deleteFundingSource,
  addFundingEntry,
  deleteFundingEntry,
} from "@/lib/actions/funding";
import { mergePayees } from "@/lib/actions/payees";

export type {
  Expense,
  LoanData,
  LoanPayment,
  Prepayment,
  Payee,
  Area,
  Tag,
  FundingSource,
  FundingLedgerItem,
} from "@/lib/api/expense-service";
export { PAYMENT_METHODS } from "@/lib/api/expense-service";

export function useExpenseService() {
  const qc = useQueryClient();

  // ---- Queries ----

  const expensesQuery = useQuery({
    queryKey: queryKeys.expenses,
    queryFn: expenseService.getAll,
  });

  const loansQuery = useQuery({
    queryKey: queryKeys.loans,
    queryFn: loanService.getAll,
  });

  const payeesQuery = useQuery({
    queryKey: queryKeys.payees,
    queryFn: payeeService.getAll,
  });

  const areasQuery = useQuery({
    queryKey: queryKeys.areas,
    queryFn: () => listAreas(),
  });

  const tagsQuery = useQuery({
    queryKey: queryKeys.tags,
    queryFn: () => listTags(),
  });

  const fundingSourcesQuery = useQuery({
    queryKey: queryKeys.fundingSources,
    queryFn: () => listFundingSources(),
  });

  // ---- Derived data ----

  const expenses = (expensesQuery.data ?? []) as Expense[];
  const loans = (loansQuery.data ?? []) as LoanData[];
  const allPayees = (payeesQuery.data ?? []) as Payee[];
  const allAreas = (areasQuery.data ?? []) as Area[];
  const allTags = (tagsQuery.data ?? []) as Tag[];
  const fundingSources = (fundingSourcesQuery.data ?? []) as FundingSource[];
  const isLoading = expensesQuery.isLoading || loansQuery.isLoading;

  const construction = useMemo(
    () => expenses.filter((e) => e.type === "construction"),
    [expenses]
  );

  const property = useMemo(
    () => expenses.filter((e) => e.type === "property"),
    [expenses]
  );

  const grandTotal = useMemo(() => {
    const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    const loanPaidTotal = loans.reduce(
      (total, loan) =>
        total +
        loan.payments.reduce(
          (sum, p) => sum + (p.paid ? p.amount : 0),
          0
        ),
      0
    );
    return expenseTotal + loanPaidTotal;
  }, [expenses, loans]);

  const adjustedTotal = useMemo(() => {
    const expenseTotal = expenses
      .filter((e) => !e.covered_by_loan)
      .reduce((sum, e) => sum + e.amount, 0);
    const loanPaidTotal = loans.reduce(
      (total, loan) =>
        total +
        loan.payments.reduce(
          (sum, p) => sum + (p.paid ? p.amount : 0),
          0
        ),
      0
    );
    return expenseTotal + loanPaidTotal;
  }, [expenses, loans]);

  // ---- Payee Mutations ----

  const createPayeeMutation = useMutation({
    mutationFn: (data: CreatePayeeInput) => payeeService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.payees }),
  });

  const updatePayeeMutation = useMutation({
    mutationFn: ({ id, ...data }: UpdatePayeeInput & { id: number }) =>
      payeeService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.payees }),
  });

  const deletePayeeMutation = useMutation({
    mutationFn: (id: number) => payeeService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.payees }),
  });

  const mergePayeesMutation = useMutation({
    mutationFn: ({ from_id, into_id }: { from_id: number; into_id: number }) =>
      mergePayees({ from_id, into_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.payees });
      qc.invalidateQueries({ queryKey: queryKeys.expenses });
    },
  });

  // ---- Expense Mutations ----

  const addExpenseMutation = useMutation({
    mutationFn: (data: CreateExpenseInput) => expenseService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.expenses });
      qc.invalidateQueries({ queryKey: queryKeys.payees });
      qc.invalidateQueries({ queryKey: queryKeys.tags });
      qc.invalidateQueries({ queryKey: queryKeys.fundingSources });
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, ...data }: UpdateExpenseInput & { id: string }) =>
      expenseService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.expenses });
      qc.invalidateQueries({ queryKey: queryKeys.payees });
      qc.invalidateQueries({ queryKey: queryKeys.tags });
      qc.invalidateQueries({ queryKey: queryKeys.fundingSources });
    },
  });

  const removeExpenseMutation = useMutation({
    mutationFn: (id: string) => expenseService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.expenses });
      qc.invalidateQueries({ queryKey: queryKeys.fundingSources });
    },
  });

  // ---- Area Mutations ----

  const createAreaMutation = useMutation({
    mutationFn: (data: CreateAreaInput) => createArea(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.areas }),
  });

  const updateAreaMutation = useMutation({
    mutationFn: ({ id, ...data }: UpdateAreaInput & { id: number }) =>
      updateArea(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.areas }),
  });

  const deleteAreaMutation = useMutation({
    mutationFn: (id: number) => deleteArea(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.areas }),
  });

  // ---- Tag Mutations ----

  const createTagMutation = useMutation({
    mutationFn: (name: string) => createTag({ name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tags }),
  });

  const deleteTagMutation = useMutation({
    mutationFn: (id: number) => deleteTag(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tags });
      qc.invalidateQueries({ queryKey: queryKeys.expenses });
    },
  });

  // ---- Funding Source Mutations ----

  const createFundingSourceMutation = useMutation({
    mutationFn: (data: CreateFundingSourceInput) => createFundingSource(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.fundingSources }),
  });

  const updateFundingSourceMutation = useMutation({
    mutationFn: ({ id, ...data }: UpdateFundingSourceInput & { id: number }) =>
      updateFundingSource(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.fundingSources }),
  });

  const deleteFundingSourceMutation = useMutation({
    mutationFn: (id: number) => deleteFundingSource(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.fundingSources }),
  });

  const addFundingEntryMutation = useMutation({
    mutationFn: ({
      sourceId,
      ...data
    }: CreateFundingEntryInput & { sourceId: number }) =>
      addFundingEntry(sourceId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.fundingSources }),
  });

  const deleteFundingEntryMutation = useMutation({
    mutationFn: (entryId: number) => deleteFundingEntry(entryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.fundingSources }),
  });

  // ---- Loan Mutations ----

  const addLoanMutation = useMutation({
    mutationFn: (data: {
      id: string;
      name: string;
      amount: number;
      interest: number;
      tenure: number;
      start_date: string;
    }) => loanService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.loans }),
  });

  const deleteLoanMutation = useMutation({
    mutationFn: (id: string) => loanService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.loans }),
  });

  const updateLoanNameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      loanService.updateName(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.loans }),
  });

  const togglePaymentMutation = useMutation({
    mutationFn: ({
      loanId,
      paymentId,
      paid,
    }: {
      loanId: string;
      paymentId: number;
      paid: boolean;
    }) => loanService.togglePayment(loanId, paymentId, paid),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.loans }),
  });

  const addPrepaymentMutation = useMutation({
    mutationFn: ({
      loanId,
      amount,
      date,
    }: {
      loanId: string;
      amount: number;
      date: string;
    }) => loanService.addPrepayment(loanId, { amount, date }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.loans }),
  });

  return {
    expenses,
    loans,
    construction,
    property,
    payees: allPayees,
    areas: allAreas,
    tags: allTags,
    fundingSources,
    isLoading,

    grandTotal,
    adjustedTotal,

    PAYMENT_METHODS,

    createPayee: createPayeeMutation.mutateAsync,
    updatePayee: updatePayeeMutation.mutateAsync,
    deletePayee: deletePayeeMutation.mutateAsync,
    mergePayees: mergePayeesMutation.mutateAsync,

    createArea: createAreaMutation.mutateAsync,
    updateArea: updateAreaMutation.mutateAsync,
    deleteArea: deleteAreaMutation.mutateAsync,

    createTag: createTagMutation.mutateAsync,
    deleteTag: deleteTagMutation.mutateAsync,

    createFundingSource: createFundingSourceMutation.mutateAsync,
    updateFundingSource: updateFundingSourceMutation.mutateAsync,
    deleteFundingSource: deleteFundingSourceMutation.mutateAsync,
    addFundingEntry: addFundingEntryMutation.mutateAsync,
    deleteFundingEntry: deleteFundingEntryMutation.mutateAsync,

    addExpense: addExpenseMutation.mutateAsync,
    updateExpense: updateExpenseMutation.mutateAsync,
    removeExpense: removeExpenseMutation.mutateAsync,

    addLoan: addLoanMutation.mutateAsync,
    deleteLoan: deleteLoanMutation.mutateAsync,
    updateLoanName: updateLoanNameMutation.mutateAsync,
    togglePayment: togglePaymentMutation.mutateAsync,
    addPrepayment: addPrepaymentMutation.mutateAsync,

    exportData: dataService.exportData,

    refreshData: () => {
      qc.invalidateQueries({ queryKey: queryKeys.expenses });
      qc.invalidateQueries({ queryKey: queryKeys.loans });
      qc.invalidateQueries({ queryKey: queryKeys.payees });
      qc.invalidateQueries({ queryKey: queryKeys.areas });
      qc.invalidateQueries({ queryKey: queryKeys.tags });
      qc.invalidateQueries({ queryKey: queryKeys.fundingSources });
    },

    queryKeys,
  };
}
