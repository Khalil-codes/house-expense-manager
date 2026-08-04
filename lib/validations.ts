import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared Enums
// ---------------------------------------------------------------------------

export const expenseTypeSchema = z.enum(["construction", "property"]);

// ---------------------------------------------------------------------------
// Input Schemas (what the client sends)
// ---------------------------------------------------------------------------

export const createExpenseSchema = z.object({
  id: z.string().min(1),
  type: expenseTypeSchema,
  description: z.string().min(1),
  amount: z.number().positive(),
  area_id: z.number().int().positive(),
  date: z.string().min(1),
  payee_name: z.string().nullable().default(null),
  funding_source_id: z.number().int().positive().nullable().default(null),
  payment_method: z.string().default("Cash"),
  notes: z.string().nullable().default(null),
  tags: z.array(z.string()).default([]),
});

export const updateExpenseSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  area_id: z.number().int().positive(),
  date: z.string().min(1),
  payee_name: z.string().nullable().default(null),
  funding_source_id: z.number().int().positive().nullable().default(null),
  payment_method: z.string().default("Cash"),
  notes: z.string().nullable().default(null),
  tags: z.array(z.string()).default([]),
});

export const createPayeeSchema = z.object({
  name: z.string().min(1, "Payee name is required"),
  phone: z.string().nullable().default(null),
});

export const updatePayeeSchema = z.object({
  name: z.string().min(1, "Payee name is required"),
  phone: z.string().nullable().default(null),
});

export const mergePayeesSchema = z.object({
  from_id: z.number().int().positive(),
  into_id: z.number().int().positive(),
});

// ---------------------------------------------------------------------------
// Area / Tag Schemas
// ---------------------------------------------------------------------------

export const createAreaSchema = z.object({
  name: z.string().min(1, "Area name is required"),
  sort_order: z.number().int().default(0),
});

export const updateAreaSchema = z.object({
  name: z.string().min(1, "Area name is required"),
  sort_order: z.number().int().default(0),
});

export const createTagSchema = z.object({
  name: z.string().min(1, "Tag name is required"),
});

// ---------------------------------------------------------------------------
// Funding Source Schemas
// ---------------------------------------------------------------------------

export const fundingSourceKindSchema = z.enum([
  "sale_proceeds",
  "loan",
  "cash",
  "other",
]);

export const fundingEntryDirectionSchema = z.enum(["in", "out"]);
export const fundingEntryStatusSchema = z.enum([
  "received",
  "in_transit",
  "expected",
]);

export const createFundingSourceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  kind: fundingSourceKindSchema.default("other"),
  total_value: z.number().nonnegative().nullable().default(null),
  notes: z.string().nullable().default(null),
});

export const updateFundingSourceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  kind: fundingSourceKindSchema,
  total_value: z.number().nonnegative().nullable().default(null),
  notes: z.string().nullable().default(null),
  archived: z.boolean().default(false),
});

export const createFundingEntrySchema = z
  .object({
    direction: fundingEntryDirectionSchema,
    amount: z.number().positive(),
    title: z.string().min(1, "Title is required"),
    date: z.string().min(1, "Date is required"),
    status: fundingEntryStatusSchema.nullable().default(null),
    method: z.string().nullable().default(null),
    notes: z.string().nullable().default(null),
  })
  .refine((d) => d.direction !== "in" || d.status !== null, {
    message: "Receipts require a status",
    path: ["status"],
  });

export const createLoanSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  amount: z.number().positive(),
  interest: z.number().positive(),
  tenure: z.number().int().positive(),
  start_date: z.string().default(""),
});

export const updateLoanNameSchema = z.object({
  name: z.string().min(1),
});

export const togglePaymentSchema = z.object({
  paymentId: z.number().int(),
  paid: z.boolean(),
});

export const addPrepaymentSchema = z.object({
  amount: z.number().positive(),
  date: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Ledger Schemas
// ---------------------------------------------------------------------------

export const ledgerFrequencySchema = z.enum(["weekly", "monthly"]);

export const PAYMENT_METHODS = [
  "Cash",
  "UPI",
  "Bank Transfer",
  "Cheque",
  "Credit Card",
  "Other",
] as const;

// Kept as an alias for existing ledger imports; single source of truth above.
export const LEDGER_PAYMENT_METHODS = PAYMENT_METHODS;

export const createLedgerPersonSchema = z.object({
  name: z.string().min(1, "Person name is required"),
  phone: z.string().nullable().default(null),
});

export const updateLedgerPersonSchema = z.object({
  name: z.string().min(1, "Person name is required"),
  phone: z.string().nullable().default(null),
});

export const createLedgerEntrySchema = z
  .object({
    id: z.string().min(1),
    person_id: z.number().int().positive(),
    amount: z.number().positive(),
    date_lent: z.string().min(1),
    date_paid_off: z.string().nullable().default(null),
    recurring: z.boolean().default(false),
    payment_method: z.string().nullable().default(null),
    notes: z.string().nullable().default(null),
    // Only used when recurring is true to generate the installment schedule.
    installment_count: z.number().int().positive().nullable().default(null),
    frequency: ledgerFrequencySchema.nullable().default(null),
    first_due_date: z.string().nullable().default(null),
  })
  .refine(
    (data) =>
      !data.recurring ||
      (data.installment_count !== null &&
        data.frequency !== null &&
        data.first_due_date !== null &&
        data.first_due_date.length > 0),
    {
      message:
        "Recurring entries require installment count, frequency, and first due date",
      path: ["installment_count"],
    }
  );

export const updateLedgerEntrySchema = z.object({
  person_id: z.number().int().positive(),
  amount: z.number().positive(),
  date_lent: z.string().min(1),
  date_paid_off: z.string().nullable().default(null),
  payment_method: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});

export const toggleInstallmentSchema = z.object({
  installmentId: z.number().int(),
  paid: z.boolean(),
});

export const createLedgerPaymentSchema = z.object({
  amount: z.number().positive(),
  date: z.string().min(1),
  payment_method: z.string().nullable().default(null),
});

// ---------------------------------------------------------------------------
// Form Schemas (coerce strings from HTML inputs)
// ---------------------------------------------------------------------------

export const expenseFormSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  area_id: z.number().int().positive("Area is required"),
  date: z.string().min(1, "Date is required"),
  payee_name: z.string().nullable(),
  funding_source_id: z.number().int().positive().nullable(),
  payment_method: z.string(),
  notes: z.string().nullable(),
  tags: z.array(z.string()),
});

export const fundingSourceFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  kind: fundingSourceKindSchema,
  total_value: z.number().nonnegative().nullable(),
  notes: z.string().nullable(),
});

export const fundingEntryFormSchema = z
  .object({
    direction: fundingEntryDirectionSchema,
    amount: z.number().positive("Amount must be greater than 0"),
    title: z.string().min(1, "Title is required"),
    date: z.string().min(1, "Date is required"),
    status: fundingEntryStatusSchema.nullable(),
    method: z.string().nullable(),
    notes: z.string().nullable(),
  })
  .refine((d) => d.direction !== "in" || d.status !== null, {
    message: "Receipts require a status",
    path: ["status"],
  });

export const loanFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  interest: z.number().positive("Interest must be greater than 0"),
  tenure: z.number().int().positive("Tenure must be at least 1 year"),
  start_date: z.string().min(1, "Start date is required"),
});

export const prepaymentFormSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  date: z.string().min(1, "Date is required"),
});

export const ledgerEntryFormSchema = z
  .object({
    person_id: z.number().int().positive("Person is required"),
    amount: z.number().positive("Amount must be greater than 0"),
    date_lent: z.string().min(1, "Date lent is required"),
    date_paid_off: z.string().nullable(),
    payment_method: z.string().nullable(),
    notes: z.string().nullable(),
    recurring: z.boolean(),
    installment_count: z.number().int().positive().nullable(),
    frequency: ledgerFrequencySchema.nullable(),
    first_due_date: z.string().nullable(),
  })
  .refine(
    (data) =>
      !data.recurring ||
      (data.installment_count !== null &&
        data.installment_count > 0 &&
        data.frequency !== null &&
        !!data.first_due_date),
    {
      message: "Installment count, frequency and first due date are required",
      path: ["installment_count"],
    }
  );

export const ledgerPaymentFormSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  date: z.string().min(1, "Date is required"),
  payment_method: z.string().nullable(),
});

// ---------------------------------------------------------------------------
// Inferred Types
// ---------------------------------------------------------------------------

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type CreatePayeeInput = z.infer<typeof createPayeeSchema>;
export type UpdatePayeeInput = z.infer<typeof updatePayeeSchema>;
export type MergePayeesInput = z.infer<typeof mergePayeesSchema>;
export type CreateAreaInput = z.infer<typeof createAreaSchema>;
export type UpdateAreaInput = z.infer<typeof updateAreaSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type FundingSourceKind = z.infer<typeof fundingSourceKindSchema>;
export type CreateFundingSourceInput = z.infer<typeof createFundingSourceSchema>;
export type UpdateFundingSourceInput = z.infer<typeof updateFundingSourceSchema>;
export type CreateFundingEntryInput = z.infer<typeof createFundingEntrySchema>;
export type FundingSourceFormValues = z.infer<typeof fundingSourceFormSchema>;
export type FundingEntryFormValues = z.infer<typeof fundingEntryFormSchema>;
export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type UpdateLoanNameInput = z.infer<typeof updateLoanNameSchema>;
export type TogglePaymentInput = z.infer<typeof togglePaymentSchema>;
export type AddPrepaymentInput = z.infer<typeof addPrepaymentSchema>;
export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;
export type LoanFormValues = z.infer<typeof loanFormSchema>;
export type PrepaymentFormValues = z.infer<typeof prepaymentFormSchema>;
export type LedgerFrequency = z.infer<typeof ledgerFrequencySchema>;
export type CreateLedgerPersonInput = z.infer<typeof createLedgerPersonSchema>;
export type UpdateLedgerPersonInput = z.infer<typeof updateLedgerPersonSchema>;
export type CreateLedgerEntryInput = z.infer<typeof createLedgerEntrySchema>;
export type UpdateLedgerEntryInput = z.infer<typeof updateLedgerEntrySchema>;
export type ToggleInstallmentInput = z.infer<typeof toggleInstallmentSchema>;
export type CreateLedgerPaymentInput = z.infer<typeof createLedgerPaymentSchema>;
export type LedgerEntryFormValues = z.infer<typeof ledgerEntryFormSchema>;
export type LedgerPaymentFormValues = z.infer<typeof ledgerPaymentFormSchema>;
