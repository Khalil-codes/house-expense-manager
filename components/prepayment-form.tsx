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

  const fmt = (n: number) =>
    `\u20B9${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  const quickAmounts = [50000, 100000, 250000, 500000].filter(
    (a) => a < remainingBalance
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-muted px-3.5 py-2.5 text-[13px]">
          <span className="text-muted-foreground">Remaining balance</span>
          <span className="font-semibold tabular-nums">
            {fmt(remainingBalance)}
          </span>
        </div>
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prepayment amount (₹)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g. 100000"
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              {quickAmounts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {quickAmounts.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => field.onChange(a)}
                      className="rounded-full bg-muted px-3 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-secondary active:scale-[0.97]"
                    >
                      {fmt(a)}
                    </button>
                  ))}
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prepayment date</FormLabel>
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
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Apply prepayment
        </Button>
      </form>
    </Form>
  );
}
