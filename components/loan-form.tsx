"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { loanFormSchema, type LoanFormValues } from "@/lib/validations";

interface LoanFormProps {
  onSubmit: (values: LoanFormValues) => Promise<void>;
  onCancel: () => void;
}

const LOAN_DEFAULTS: LoanFormValues = {
  name: "Home Loan",
  amount: 0,
  interest: 0,
  tenure: 0,
  start_date: new Date().toISOString().split("T")[0],
};

export function LoanForm({ onSubmit, onCancel }: LoanFormProps) {
  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: LOAN_DEFAULTS,
  });

  const handleSubmit = async (values: LoanFormValues) => {
    await onSubmit(values);
    form.reset(LOAN_DEFAULTS);
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="space-y-5 py-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Loan Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. Home Loan" />
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
                    placeholder="2500000"
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
            name="interest"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Interest (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="8.5"
                    step="0.01"
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
            name="tenure"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tenure (years)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="20"
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
            name="start_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <DialogFooter className="gap-2 pt-4">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Loan
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
