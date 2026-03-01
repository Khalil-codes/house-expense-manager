"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronsUpDown, PlusCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  DialogFooter,
} from "@/components/ui/dialog";
import {
  expenseFormSchema,
  type ExpenseFormValues,
} from "@/lib/validations";
import type { Expense, Category, Payee } from "@/lib/api/expense-service";
import { PAYMENT_METHODS } from "@/lib/api/expense-service";

interface ExpenseFormProps {
  type: "construction" | "property";
  editExpense?: Expense | null;
  categories: Category[];
  payees: Payee[];
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
  onCancel: () => void;
  onCreateCategory: (name: string, type: string) => Promise<Category>;
  onCreatePayee: (name: string) => Promise<Payee>;
}

const DEFAULT_VALUES: ExpenseFormValues = {
  description: "",
  amount: 0,
  category_id: 0,
  date: new Date().toISOString().split("T")[0],
  payee_id: null,
  payment_method: "Cash",
  notes: null,
  covered_by_loan: false,
};

export function ExpenseForm({
  type,
  editExpense,
  categories,
  payees,
  onSubmit,
  onCancel,
  onCreateCategory,
  onCreatePayee,
}: ExpenseFormProps) {
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [payeeOpen, setPayeeOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newPayeeName, setNewPayeeName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [creatingPayee, setCreatingPayee] = useState(false);

  const filteredCategories = categories.filter(
    (c) => c.type === type || c.type === "both"
  );

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: editExpense
      ? {
          description: editExpense.description,
          amount: editExpense.amount,
          category_id: editExpense.category_id ?? 0,
          date: new Date(editExpense.date).toISOString().split("T")[0],
          payee_id: editExpense.payee_id ?? null,
          payment_method: editExpense.payment_method ?? "Cash",
          notes: editExpense.notes ?? null,
          covered_by_loan: editExpense.covered_by_loan ?? false,
        }
      : DEFAULT_VALUES,
  });

  const isEditMode = !!editExpense;

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || creatingCategory) return;
    setCreatingCategory(true);
    try {
      const created = await onCreateCategory(newCategoryName.trim(), type);
      form.setValue("category_id", created.id);
      setNewCategoryName("");
      setCategoryOpen(false);
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleCreatePayee = async () => {
    if (!newPayeeName.trim() || creatingPayee) return;
    setCreatingPayee(true);
    try {
      const created = await onCreatePayee(newPayeeName.trim());
      form.setValue("payee_id", created.id);
      setNewPayeeName("");
      setPayeeOpen(false);
    } finally {
      setCreatingPayee(false);
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-5 py-2">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={
                      type === "construction"
                        ? "e.g. Foundation work"
                        : "e.g. Land purchase"
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="5000"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category_id"
            render={({ field }) => {
              const selected = filteredCategories.find(
                (c) => c.id === field.value
              );
              return (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={categoryOpen}
                          className="w-full justify-between font-normal"
                        >
                          <span className="truncate">
                            {selected?.name ?? "Select category"}
                          </span>
                          <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search categories..." />
                        <CommandList>
                          <CommandEmpty>No categories found.</CommandEmpty>
                          <CommandGroup>
                            {filteredCategories.map((cat) => (
                              <CommandItem
                                key={cat.id}
                                value={cat.name}
                                onSelect={() => {
                                  field.onChange(cat.id);
                                  setCategoryOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === cat.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {cat.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          <CommandSeparator />
                          <CommandGroup>
                            <div className="flex items-center gap-1 px-2 py-1.5">
                              <Input
                                placeholder="New category..."
                                value={newCategoryName}
                                onChange={(e) =>
                                  setNewCategoryName(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleCreateCategory();
                                  }
                                }}
                                className="h-7 text-xs"
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 shrink-0"
                                disabled={creatingCategory || !newCategoryName.trim()}
                                onClick={handleCreateCategory}
                              >
                                {creatingCategory ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <PlusCircle className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="payee_id"
            render={({ field }) => {
              const selected = payees.find((p) => p.id === field.value);
              return (
                <FormItem>
                  <FormLabel>Paid To</FormLabel>
                  <Popover open={payeeOpen} onOpenChange={setPayeeOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={payeeOpen}
                          className="w-full justify-between font-normal"
                        >
                          <span className="truncate">
                            {selected?.name ?? "Select payee"}
                          </span>
                          <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search payees..." />
                        <CommandList>
                          <CommandEmpty>No payees found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="__none__"
                              onSelect={() => {
                                field.onChange(null);
                                setPayeeOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === null
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <span className="text-muted-foreground">
                                None
                              </span>
                            </CommandItem>
                            {payees.map((payee) => (
                              <CommandItem
                                key={payee.id}
                                value={payee.name}
                                onSelect={() => {
                                  field.onChange(payee.id);
                                  setPayeeOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === payee.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {payee.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          <CommandSeparator />
                          <CommandGroup>
                            <div className="flex items-center gap-1 px-2 py-1.5">
                              <Input
                                placeholder="New payee..."
                                value={newPayeeName}
                                onChange={(e) =>
                                  setNewPayeeName(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleCreatePayee();
                                  }
                                }}
                                className="h-7 text-xs"
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 shrink-0"
                                disabled={creatingPayee || !newPayeeName.trim()}
                                onClick={handleCreatePayee}
                              >
                                {creatingPayee ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <PlusCircle className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="payment_method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Method</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="covered_by_loan"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3 space-y-0 rounded-lg border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="font-normal cursor-pointer">
                  Covered by loan
                </FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Optional notes..."
                    className="min-h-[80px] resize-none"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(e.target.value || null)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter className="gap-2 pt-4">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "Update" : "Add"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Cancel
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
