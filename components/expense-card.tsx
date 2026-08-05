"use client";

import {
  Edit,
  Trash,
  Loader2,
  User,
  CreditCard,
  Wallet,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const dateLabel = new Date(expense.date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const showMethod =
    expense.payment_method && expense.payment_method !== "Cash";

  return (
    <Card className="p-3.5 transition-colors">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-snug">
              {expense.description}
            </p>
            <span className="shrink-0 whitespace-nowrap text-[15px] font-semibold tabular-nums">
              {"\u20B9"}
              {expense.amount.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <span className="tabular-nums">{dateLabel}</span>
            {expense.area && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="truncate font-medium text-foreground/70">
                  {expense.area}
                </span>
              </>
            )}
          </div>

          {(expense.paid_to || showMethod || expense.funding_source) && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
              {expense.paid_to && (
                <span className="inline-flex items-center gap-1">
                  <User className="h-3 w-3 shrink-0" />
                  {expense.paid_to}
                </span>
              )}
              {expense.funding_source && (
                <span className="inline-flex items-center gap-1">
                  <Wallet className="h-3 w-3 shrink-0" />
                  {expense.funding_source}
                </span>
              )}
              {showMethod && (
                <span className="inline-flex items-center gap-1">
                  <CreditCard className="h-3 w-3 shrink-0" />
                  {expense.payment_method}
                </span>
              )}
            </div>
          )}

          {expense.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {expense.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          {expense.notes && (
            <p className="mt-2 line-clamp-2 text-[12px] italic text-muted-foreground/80">
              {expense.notes}
            </p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="-mr-1 -mt-0.5 h-8 w-8 shrink-0 rounded-full text-muted-foreground"
              disabled={disabled}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreHorizontal className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(expense)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(expense.id)}
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
