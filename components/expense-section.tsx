"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useExpenseService, type Expense } from "@/hooks/use-expense-service";
import { Plus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExpenseForm } from "@/components/expense-form";
import { ExpenseList } from "@/components/expense-list";
import type { ExpenseFormValues } from "@/lib/validations";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

interface ExpenseSectionProps {
  type: "construction" | "property";
  title: string;
  autoOpenAdd?: boolean;
  onAutoOpenHandled?: () => void;
}

export function ExpenseSection({
  type,
  title,
  autoOpenAdd,
  onAutoOpenHandled,
}: ExpenseSectionProps) {
  const {
    construction,
    property,
    payees,
    areas,
    tags,
    fundingSources,
    isLoading,
    addExpense,
    updateExpense,
    removeExpense,
    createArea,
  } = useExpenseService();

  const expenses = type === "construction" ? construction : property;
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);

  const openAdd = () => {
    setEditExpense(null);
    setIsDialogOpen(true);
  };

  useEffect(() => {
    if (autoOpenAdd) {
      openAdd();
      onAutoOpenHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenAdd]);

  const openEdit = (expense: Expense) => {
    setEditExpense(expense);
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: ExpenseFormValues) => {
    const payload = {
      description: values.description,
      amount: values.amount,
      area_id: values.area_id,
      date: new Date(values.date).toISOString(),
      payee_name: values.payee_name,
      funding_source_id: values.funding_source_id,
      payment_method: values.payment_method,
      notes: values.notes,
      tags: values.tags,
    };

    if (editExpense) {
      await updateExpense({ id: editExpense.id, ...payload });
    } else {
      await addExpense({ id: crypto.randomUUID(), type, ...payload });
    }

    setIsDialogOpen(false);
    setEditExpense(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="mb-4 h-7 w-7 animate-spin" />
        <p className="text-sm">Loading {title.toLowerCase()}…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted-foreground">
            Total spent
          </p>
          <p className="text-[32px] font-semibold leading-none tracking-tight tabular-nums">
            {inr(total)}
          </p>
          <p className="mt-1.5 text-[12px] text-muted-foreground">
            {expenses.length} expense{expenses.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button className="rounded-full shadow-sm" onClick={openAdd}>
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editExpense ? "Edit" : "New"} {title.toLowerCase()} expense
            </DialogTitle>
            <DialogDescription>
              {editExpense
                ? "Update the details of this expense."
                : "Record what you paid, to whom, and where it went."}
            </DialogDescription>
          </DialogHeader>
          <ExpenseForm
            type={type}
            editExpense={editExpense}
            payees={payees}
            areas={areas}
            tags={tags}
            fundingSources={fundingSources}
            onSubmit={onSubmit}
            onCancel={() => setIsDialogOpen(false)}
            onCreateArea={(name) => createArea({ name, sort_order: 0 })}
          />
        </DialogContent>
      </Dialog>

      <ExpenseList expenses={expenses} onEdit={openEdit} onDelete={removeExpense} />
    </div>
  );
}
