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
  category_id: z.number().int().positive(),
  date: z.string().min(1),
  payee_id: z.number().int().positive().nullable().default(null),
  payment_method: z.string().default("Cash"),
  notes: z.string().nullable().default(null),
  covered_by_loan: z.boolean().default(false),
});

export const updateExpenseSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  category_id: z.number().int().positive(),
  date: z.string().min(1),
  payee_id: z.number().int().positive().nullable().default(null),
  payment_method: z.string().default("Cash"),
  notes: z.string().nullable().default(null),
  covered_by_loan: z.boolean().default(false),
});

export const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  type: z.enum(["construction", "property", "both"]),
});

export const createPayeeSchema = z.object({
  name: z.string().min(1, "Payee name is required"),
  phone: z.string().nullable().default(null),
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
// Form Schemas (coerce strings from HTML inputs)
// ---------------------------------------------------------------------------

export const expenseFormSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  category_id: z.coerce.number().int().positive("Category is required"),
  date: z.string().min(1, "Date is required"),
  payee_id: z.coerce.number().int().positive().nullable().default(null),
  payment_method: z.string().default("Cash"),
  notes: z.string().nullable().default(null),
  covered_by_loan: z.boolean().default(false),
});

export const loanFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  interest: z.coerce.number().positive("Interest must be greater than 0"),
  tenure: z.coerce.number().int().positive("Tenure must be at least 1 year"),
  start_date: z.string().min(1, "Start date is required"),
});

export const prepaymentFormSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  date: z.string().min(1, "Date is required"),
});

// ---------------------------------------------------------------------------
// Inferred Types
// ---------------------------------------------------------------------------

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreatePayeeInput = z.infer<typeof createPayeeSchema>;
export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type UpdateLoanNameInput = z.infer<typeof updateLoanNameSchema>;
export type TogglePaymentInput = z.infer<typeof togglePaymentSchema>;
export type AddPrepaymentInput = z.infer<typeof addPrepaymentSchema>;
export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;
export type LoanFormValues = z.infer<typeof loanFormSchema>;
export type PrepaymentFormValues = z.infer<typeof prepaymentFormSchema>;
