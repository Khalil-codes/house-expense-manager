"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">New Loan</CardTitle>
        <CardDescription>
          Enter loan details to generate a payment schedule
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="space-y-3">
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
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} placeholder="2500000" />
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
                        {...field}
                        placeholder="8.5"
                        step="0.01"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="tenure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tenure (years)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} placeholder="20" />
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
          </CardContent>
          <CardFooter className="flex justify-between pt-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={form.formState.isSubmitting}
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Loan
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
