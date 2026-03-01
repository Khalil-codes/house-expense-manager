"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { prepaymentFormSchema, type PrepaymentFormValues } from "@/lib/validations";

interface PrepaymentFormProps {
  remainingBalance: number;
  onSubmit: (values: PrepaymentFormValues) => Promise<void>;
}

const PREPAYMENT_DEFAULTS: PrepaymentFormValues = {
  amount: 0,
  date: new Date().toISOString().split("T")[0],
};

export function PrepaymentForm({ remainingBalance, onSubmit }: PrepaymentFormProps) {
  const form = useForm<PrepaymentFormValues>({
    resolver: zodResolver(prepaymentFormSchema),
    defaultValues: PREPAYMENT_DEFAULTS,
  });

  const handleSubmit = async (values: PrepaymentFormValues) => {
    if (values.amount > remainingBalance) return;
    await onSubmit(values);
    form.reset(PREPAYMENT_DEFAULTS);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prepayment Amount (₹)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g. 100000"
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
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prepayment Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full"
          size="sm"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Apply Prepayment
        </Button>
      </form>
    </Form>
  );
}
