"use client";

import {
  Edit,
  Trash,
  Loader2,
  Calendar,
  Tag,
  User,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Expense } from "@/lib/api/expense-service";

interface ExpenseCardProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  disabled: boolean;
}

export function ExpenseCard({
  expense,
  onEdit,
  onDelete,
  isDeleting,
  disabled,
}: ExpenseCardProps) {
  return (
    <Card className="transition-colors hover:bg-muted/20">
      <CardContent className="p-0">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="text-lg font-bold tabular-nums">
            {"\u20B9"}{expense.amount.toLocaleString()}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {new Date(expense.date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        <div className="px-4 pb-3">
          <p className="text-sm font-medium leading-snug">
            {expense.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 px-4 pb-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
            <Tag className="h-3 w-3" />
            {expense.category}
          </span>
          {expense.paid_to && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              {expense.paid_to}
            </span>
          )}
          {expense.payment_method && expense.payment_method !== "Cash" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
              <CreditCard className="h-3 w-3" />
              {expense.payment_method}
            </span>
          )}
          {expense.covered_by_loan && (
            <Badge
              variant="secondary"
              className="text-[10px] px-2 py-0.5 font-normal"
            >
              Loan covered
            </Badge>
          )}
        </div>

        {expense.notes && (
          <div className="px-4 pb-3">
            <p className="text-xs text-muted-foreground/80 line-clamp-2 italic">
              {expense.notes}
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-1 border-t px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs"
            disabled={disabled}
            onClick={() => onEdit(expense)}
          >
            <Edit className="mr-1.5 h-3 w-3" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs text-destructive hover:text-destructive"
            disabled={disabled}
            onClick={() => onDelete(expense.id)}
          >
            {isDeleting ? (
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
            ) : (
              <Trash className="mr-1.5 h-3 w-3" />
            )}
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
