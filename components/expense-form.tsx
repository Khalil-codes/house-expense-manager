"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  ChevronsUpDown,
  ChevronDown,
  PlusCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DialogFooter } from "@/components/ui/dialog";
import { expenseFormSchema, type ExpenseFormValues } from "@/lib/validations";
import type {
  Expense,
  Payee,
  Area,
  Tag,
  FundingSource,
} from "@/lib/api/expense-service";
import { PAYMENT_METHODS } from "@/lib/api/expense-service";
import { PayeeCombobox } from "@/components/payee-combobox";
import { TagInput } from "@/components/tag-input";

interface ExpenseFormProps {
  type: "construction" | "property";
  editExpense?: Expense | null;
  payees: Payee[];
  areas: Area[];
  tags: Tag[];
  fundingSources: FundingSource[];
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
  onCancel: () => void;
  onCreateArea: (name: string) => Promise<Area>;
}

const DEFAULT_VALUES: ExpenseFormValues = {
  description: "",
  amount: 0,
  area_id: 0,
  date: new Date().toISOString().split("T")[0],
  payee_name: null,
  funding_source_id: null,
  payment_method: "Cash",
  notes: null,
  tags: [],
};

export function ExpenseForm({
  type,
  editExpense,
  payees,
  areas,
  tags,
  fundingSources,
  onSubmit,
  onCancel,
  onCreateArea,
}: ExpenseFormProps) {
  const [areaOpen, setAreaOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const [creatingArea, setCreatingArea] = useState(false);

  // Open the extra section by default when editing an expense that already uses
  // one of those optional fields, so nothing is hidden from the user.
  const [showMore, setShowMore] = useState(
    !!editExpense &&
      ((editExpense.tags?.length ?? 0) > 0 ||
        !!editExpense.notes ||
        (!!editExpense.payment_method &&
          editExpense.payment_method !== "Cash"))
  );

  const activeFundingSources = fundingSources.filter((s) => !s.archived);
  const tagSuggestions = tags.map((t) => t.name);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: editExpense
      ? {
          description: editExpense.description,
          amount: editExpense.amount,
          area_id: editExpense.area_id ?? 0,
          date: new Date(editExpense.date).toISOString().split("T")[0],
          payee_name: editExpense.paid_to || null,
          funding_source_id: editExpense.funding_source_id ?? null,
          payment_method: editExpense.payment_method ?? "Cash",
          notes: editExpense.notes ?? null,
          tags: editExpense.tags ?? [],
        }
      : DEFAULT_VALUES,
  });

  const isEditMode = !!editExpense;

  const handleCreateArea = async () => {
    if (!newAreaName.trim() || creatingArea) return;
    setCreatingArea(true);
    try {
      const created = await onCreateArea(newAreaName.trim());
      form.setValue("area_id", created.id);
      setNewAreaName("");
      setAreaOpen(false);
    } finally {
      setCreatingArea(false);
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4 py-1">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What was it for?</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    autoFocus
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

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        {"\u20B9"}
                      </span>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="5,000"
                        className="pl-7"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
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
          </div>

          <FormField
            control={form.control}
            name="area_id"
            render={({ field }) => {
              const selected = areas.find((a) => a.id === field.value);
              return (
                <FormItem>
                  <FormLabel>Area of house</FormLabel>
                  <Popover open={areaOpen} onOpenChange={setAreaOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={areaOpen}
                          className="w-full justify-between font-normal"
                        >
                          <span
                            className={cn(
                              "truncate",
                              !selected && "text-muted-foreground"
                            )}
                          >
                            {selected?.name ?? "Select an area"}
                          </span>
                          <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[--radix-popover-trigger-width] p-0"
                      align="start"
                    >
                      <Command>
                        <CommandInput placeholder="Search areas..." />
                        <CommandList>
                          <CommandEmpty>No areas found.</CommandEmpty>
                          <CommandGroup>
                            {areas.map((area) => (
                              <CommandItem
                                key={area.id}
                                value={area.name}
                                onSelect={() => {
                                  field.onChange(area.id);
                                  setAreaOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === area.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {area.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          <CommandSeparator />
                          <CommandGroup>
                            <div className="flex items-center gap-1 px-2 py-1.5">
                              <Input
                                placeholder="New area..."
                                value={newAreaName}
                                onChange={(e) =>
                                  setNewAreaName(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleCreateArea();
                                  }
                                }}
                                className="h-7 text-xs"
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 shrink-0"
                                disabled={creatingArea || !newAreaName.trim()}
                                onClick={handleCreateArea}
                              >
                                {creatingArea ? (
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
            name="payee_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Paid to</FormLabel>
                <FormControl>
                  <PayeeCombobox
                    value={field.value}
                    onChange={field.onChange}
                    payees={payees}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="funding_source_id"
            render={({ field }) => {
              const selected = fundingSources.find((s) => s.id === field.value);
              return (
                <FormItem>
                  <FormLabel>Funding source</FormLabel>
                  <Select
                    value={field.value?.toString() ?? "__none__"}
                    onValueChange={(v) =>
                      field.onChange(v === "__none__" ? null : parseInt(v))
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select funding source">
                          {selected?.name ?? "None"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {activeFundingSources.map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <Collapsible open={showMore} onOpenChange={setShowMore}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-between px-1 text-muted-foreground hover:text-foreground"
              >
                More details
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    showMore && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-3">
            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment method</FormLabel>
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
              name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <TagInput
                        value={field.value}
                        onChange={field.onChange}
                        suggestions={tagSuggestions}
                      />
                    </FormControl>
                    <FormMessage />
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
                        className="min-h-[70px] resize-none"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CollapsibleContent>
          </Collapsible>
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
