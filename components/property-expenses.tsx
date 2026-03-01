"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useExpenseService,
  type Expense,
} from "@/hooks/use-expense-service";
import { Plus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExpenseForm } from "@/components/expense-form";
import { ExpenseList } from "@/components/expense-list";
import type { ExpenseFormValues } from "@/lib/validations";

export default function PropertyExpenses() {
  const {
    property,
    categories,
    payees,
    isLoading,
    addExpense,
    updateExpense,
    removeExpense,
    createCategory,
    createPayee,
  } = useExpenseService();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);

  const propertyTotal = property.reduce((total, e) => total + e.amount, 0);

  const openAdd = () => {
    setEditExpense(null);
    setIsAddDialogOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditExpense(expense);
    setIsAddDialogOpen(true);
  };

  const onSubmit = async (values: ExpenseFormValues) => {
    if (editExpense) {
      await updateExpense({
        id: editExpense.id,
        description: values.description,
        amount: values.amount,
        category_id: values.category_id,
        date: new Date(values.date).toISOString(),
        payee_id: values.payee_id,
        payment_method: values.payment_method,
        notes: values.notes,
        covered_by_loan: values.covered_by_loan,
      });
    } else {
      await addExpense({
        id: crypto.randomUUID(),
        type: "property",
        description: values.description,
        amount: values.amount,
        category_id: values.category_id,
        date: new Date(values.date).toISOString(),
        payee_id: values.payee_id,
        payment_method: values.payment_method,
        notes: values.notes,
        covered_by_loan: values.covered_by_loan,
      });
    }

    setIsAddDialogOpen(false);
    setEditExpense(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Loading property expenses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Property Expenses</CardTitle>
              <CardDescription className="text-xs">
                Total spent: ₹{propertyTotal.toLocaleString()}
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={openAdd}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editExpense ? "Edit" : "Add"} Property Expense
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Enter expense details
                  </DialogDescription>
                </DialogHeader>
                <ExpenseForm
                  type="property"
                  editExpense={editExpense}
                  categories={categories}
                  payees={payees}
                  onSubmit={onSubmit}
                  onCancel={() => setIsAddDialogOpen(false)}
                  onCreateCategory={(name, type) =>
                    createCategory({ name, type: type as "construction" | "property" | "both" })
                  }
                  onCreatePayee={(name) => createPayee({ name, phone: null })}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <ExpenseList
            expenses={property}
            onEdit={openEdit}
            onDelete={removeExpense}
          />
        </CardContent>
      </Card>
    </div>
  );
}
