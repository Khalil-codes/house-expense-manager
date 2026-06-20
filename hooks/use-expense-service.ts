"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  queryKeys,
  expenseService,
  loanService,
  categoryService,
  payeeService,
  departmentService,
  dataService,
  PAYMENT_METHODS,
  type Expense,
  type LoanData,
  type Category,
  type Payee,
  type Department,
} from "@/lib/api/expense-service";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CreatePayeeInput,
  UpdatePayeeInput,
  CreateDepartmentInput,
  UpdateDepartmentInput,
} from "@/lib/validations";

export type { Expense, LoanData, LoanPayment, Prepayment, Category, Payee, Department } from "@/lib/api/expense-service";
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

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => categoryService.getAll(),
  });

  const payeesQuery = useQuery({
    queryKey: queryKeys.payees,
    queryFn: payeeService.getAll,
  });

  const departmentsQuery = useQuery({
    queryKey: queryKeys.departments,
    queryFn: departmentService.getAll,
  });

  // ---- Derived data ----

  const expenses = (expensesQuery.data ?? []) as Expense[];
  const loans = (loansQuery.data ?? []) as LoanData[];
  const allCategories = (categoriesQuery.data ?? []) as Category[];
  const allPayees = (payeesQuery.data ?? []) as Payee[];
  const allDepartments = (departmentsQuery.data ?? []) as Department[];
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

  // ---- Department Mutations ----

  const createDepartmentMutation = useMutation({
    mutationFn: (data: CreateDepartmentInput) => departmentService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.departments }),
  });

  const updateDepartmentMutation = useMutation({
    mutationFn: ({ id, ...data }: UpdateDepartmentInput & { id: number }) =>
      departmentService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.departments }),
  });

  const deleteDepartmentMutation = useMutation({
    mutationFn: (id: number) => departmentService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.departments }),
  });

  // ---- Category Mutations ----

  const createCategoryMutation = useMutation({
    mutationFn: (data: CreateCategoryInput) => categoryService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.categories }),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, ...data }: UpdateCategoryInput & { id: number }) =>
      categoryService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.categories }),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => categoryService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.categories }),
  });

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

  // ---- Expense Mutations ----

  const addExpenseMutation = useMutation({
    mutationFn: (data: {
      id: string;
      type: "construction" | "property";
      description: string;
      amount: number;
      category_id: number;
      date: string;
      payee_id: number | null;
      department_id: number | null;
      payment_method: string;
      notes: string | null;
      covered_by_loan: boolean;
    }) => expenseService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.expenses }),
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      description: string;
      amount: number;
      category_id: number;
      date: string;
      payee_id: number | null;
      department_id: number | null;
      payment_method: string;
      notes: string | null;
      covered_by_loan: boolean;
    }) => expenseService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.expenses }),
  });

  const removeExpenseMutation = useMutation({
    mutationFn: (id: string) => expenseService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.expenses }),
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
    categories: allCategories,
    payees: allPayees,
    departments: allDepartments,
    isLoading,

    grandTotal,
    adjustedTotal,

    PAYMENT_METHODS,

    createDepartment: createDepartmentMutation.mutateAsync,
    updateDepartment: updateDepartmentMutation.mutateAsync,
    deleteDepartment: deleteDepartmentMutation.mutateAsync,

    createCategory: createCategoryMutation.mutateAsync,
    updateCategory: updateCategoryMutation.mutateAsync,
    deleteCategory: deleteCategoryMutation.mutateAsync,

    createPayee: createPayeeMutation.mutateAsync,
    updatePayee: updatePayeeMutation.mutateAsync,
    deletePayee: deletePayeeMutation.mutateAsync,

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
      qc.invalidateQueries({ queryKey: queryKeys.categories });
      qc.invalidateQueries({ queryKey: queryKeys.payees });
      qc.invalidateQueries({ queryKey: queryKeys.departments });
    },

    queryKeys,
  };
}
