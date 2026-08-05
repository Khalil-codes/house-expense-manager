"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Check, ChevronsUpDown, PlusCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DialogFooter } from "@/components/ui/dialog";
import {
  ledgerEntryFormSchema,
  type LedgerEntryFormValues,
} from "@/lib/validations";
import type { LedgerEntry, LedgerPerson } from "@/hooks/use-ledger";

interface LedgerEntryFormProps {
  editEntry?: LedgerEntry | null;
  persons: LedgerPerson[];
  onSubmit: (values: LedgerEntryFormValues) => Promise<void>;
  onCancel: () => void;
  onCreatePerson: (name: string) => Promise<LedgerPerson>;
}

function toInputDate(value: string | null): string {
  if (!value) return "";
  try {
    return format(new Date(value), "yyyy-MM-dd");
  } catch {
    return "";
  }
}

export function LedgerEntryForm({
  editEntry,
  persons,
  onSubmit,
  onCancel,
  onCreatePerson,
}: LedgerEntryFormProps) {
  const isEditMode = !!editEntry;

  const [personOpen, setPersonOpen] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [creatingPerson, setCreatingPerson] = useState(false);

  const form = useForm<LedgerEntryFormValues>({
    resolver: zodResolver(ledgerEntryFormSchema),
    defaultValues: editEntry
      ? {
          person_id: editEntry.person_id,
          amount: editEntry.amount,
          date_lent: toInputDate(editEntry.date_lent),
          date_paid_off: toInputDate(editEntry.date_paid_off),
          payment_method: editEntry.payment_method ?? null,
          notes: editEntry.notes,
          recurring: editEntry.recurring,
          installment_count: null,
          frequency: null,
          first_due_date: null,
        }
      : {
          person_id: 0,
          amount: 0,
          date_lent: format(new Date(), "yyyy-MM-dd"),
          date_paid_off: null,
          payment_method: null,
          notes: null,
          recurring: false,
          installment_count: null,
          frequency: "monthly",
          first_due_date: "",
        },
  });

  const recurring = form.watch("recurring");
  const amount = form.watch("amount");
  const installmentCount = form.watch("installment_count");
  const isSubmitting = form.formState.isSubmitting;

  const perInstallment =
    recurring && amount > 0 && installmentCount && installmentCount > 0
      ? Math.round((amount / installmentCount) * 100) / 100
      : null;

  const handleCreatePerson = async () => {
    if (!newPersonName.trim() || creatingPerson) return;
    setCreatingPerson(true);
    try {
      const created = await onCreatePerson(newPersonName.trim());
      form.setValue("person_id", created.id, { shouldValidate: true });
      setNewPersonName("");
      setPersonOpen(false);
    } finally {
      setCreatingPerson(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4 py-2">
          <FormField
            control={form.control}
            name="person_id"
            render={({ field }) => {
              const selected = persons.find((p) => p.id === field.value);
              return (
                <FormItem>
                  <FormLabel>Person</FormLabel>
                  <Popover open={personOpen} onOpenChange={setPersonOpen} modal>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={personOpen}
                          className="w-full justify-between font-normal"
                        >
                          <span className="truncate">
                            {selected?.name ?? "Select person"}
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
                        <CommandInput placeholder="Search people..." />
                        <CommandList>
                          <CommandEmpty>No people found.</CommandEmpty>
                          <CommandGroup>
                            {persons.map((person) => (
                              <CommandItem
                                key={person.id}
                                value={person.name}
                                onSelect={() => {
                                  field.onChange(person.id);
                                  setPersonOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === person.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {person.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          <CommandSeparator />
                          <CommandGroup>
                            <div className="flex items-center gap-1.5 px-2 py-1.5">
                              <Input
                                placeholder="New person…"
                                value={newPersonName}
                                onChange={(e) =>
                                  setNewPersonName(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleCreatePerson();
                                  }
                                }}
                                className="h-9"
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="secondary"
                                className="h-9 w-9 shrink-0 rounded-lg"
                                disabled={creatingPerson || !newPersonName.trim()}
                                onClick={handleCreatePerson}
                              >
                                {creatingPerson ? (
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
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="5000"
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
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
            name="date_lent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date lent</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!isEditMode && (
            <FormField
              control={form.control}
              name="recurring"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-2xl border border-border/60 p-4 space-y-0">
                  <div>
                    <FormLabel className="cursor-pointer">
                      Recurring (EMI)
                    </FormLabel>
                    <FormDescription className="text-xs">
                      Split into installments
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}

          {!isEditMode && recurring && (
            <div className="space-y-4 rounded-2xl border border-border/60 p-4">
              <FormField
                control={form.control}
                name="installment_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of installments</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="12"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    {perInstallment !== null && (
                      <FormDescription className="text-xs">
                        {"\u20B9"}
                        {perInstallment.toLocaleString()} per installment
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <Select
                      value={field.value ?? "monthly"}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="first_due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First due date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

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
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter className="gap-1 pt-3">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? "Save changes" : "Add entry"}
          </Button>
          <Button
            type="button"
            variant="ghost"
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
