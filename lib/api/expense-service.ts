import axios from "axios";
import type {
  CreateExpenseInput,
  UpdateExpenseInput,
  CreateLoanInput,
  AddPrepaymentInput,
  CreateCategoryInput,
  CreatePayeeInput,
} from "@/lib/validations";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// ---------------------------------------------------------------------------
// Response Types (what the API returns)
// ---------------------------------------------------------------------------

export interface Category {
  id: number;
  name: string;
  type: "construction" | "property" | "both";
  created_at: string | null;
}

export interface Payee {
  id: number;
  name: string;
  phone: string | null;
  created_at: string | null;
}

export interface Expense {
  id: string;
  type: "construction" | "property";
  description: string;
  amount: number;
  category: string;
  category_id: number | null;
  date: string;
  paid_to: string;
  payee_id: number | null;
  payment_method: string;
  notes: string | null;
  covered_by_loan: boolean;
}

export interface LoanPayment {
  id: number;
  loan_id: string;
  month: number;
  amount: number;
  interest: number;
  principal: number;
  balance: number;
  date: string;
  paid: boolean;
}

export interface Prepayment {
  id: number;
  date: string;
  amount: number;
}

export interface LoanData {
  id: string;
  name: string;
  amount: number;
  interest: number;
  tenure: number;
  start_date: string | null;
  payments: LoanPayment[];
  prepayments: Prepayment[];
}

interface LoanApiRow {
  id: string;
  name: string;
  amount: number;
  interest: number;
  tenure: number;
  start_date: string | null;
  created_at?: string | null;
  payments?: Array<{
    id: number;
    loan_id: string;
    month: number;
    amount: number;
    interest: number;
    principal: number;
    balance: number;
    date: string;
    paid: boolean | number;
  }>;
  prepayments?: Array<{
    id: number;
    loan_id?: string;
    date: string;
    amount: number;
  }>;
}

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

export const queryKeys = {
  expenses: ["expenses"] as const,
  loans: ["loans"] as const,
  categories: ["categories"] as const,
  payees: ["payees"] as const,
};

// ---------------------------------------------------------------------------
// Category Service
// ---------------------------------------------------------------------------

export const categoryService = {
  getAll: async (type?: string): Promise<Category[]> => {
    const params = type ? { type } : {};
    const { data } = await api.get<Category[]>("/categories", { params });
    return data;
  },

  create: async (payload: CreateCategoryInput): Promise<Category> => {
    const { data } = await api.post<Category>("/categories", payload);
    return data;
  },
};

// ---------------------------------------------------------------------------
// Payee Service
// ---------------------------------------------------------------------------

export const payeeService = {
  getAll: async (): Promise<Payee[]> => {
    const { data } = await api.get<Payee[]>("/payees");
    return data;
  },

  create: async (payload: CreatePayeeInput): Promise<Payee> => {
    const { data } = await api.post<Payee>("/payees", payload);
    return data;
  },
};

// ---------------------------------------------------------------------------
// Expense Service
// ---------------------------------------------------------------------------

export const expenseService = {
  getAll: async (): Promise<Expense[]> => {
    const { data } = await api.get<Expense[]>("/expenses");
    return data;
  },

  create: async (payload: CreateExpenseInput): Promise<void> => {
    await api.post("/expenses", payload);
  },

  update: async (id: string, payload: UpdateExpenseInput): Promise<void> => {
    await api.put(`/expenses/${id}`, payload);
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/expenses/${id}`);
  },
};

// ---------------------------------------------------------------------------
// Loan Service
// ---------------------------------------------------------------------------

export const loanService = {
  getAll: async (): Promise<LoanData[]> => {
    const { data } = await api.get<LoanApiRow[]>("/loans");
    return data.map(mapLoan);
  },

  create: async (payload: CreateLoanInput): Promise<LoanData> => {
    const { data } = await api.post<LoanApiRow>("/loans", payload);
    return mapLoan(data);
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/loans/${id}`);
  },

  updateName: async (id: string, name: string): Promise<void> => {
    await api.put(`/loans/${id}`, { name });
  },

  togglePayment: async (
    loanId: string,
    paymentId: number,
    paid: boolean
  ): Promise<void> => {
    await api.patch(`/loans/${loanId}/payments`, { paymentId, paid });
  },

  addPrepayment: async (
    loanId: string,
    payload: AddPrepaymentInput
  ): Promise<void> => {
    await api.post(`/loans/${loanId}/prepayments`, payload);
  },
};

// ---------------------------------------------------------------------------
// Data Service (export / migrate)
// ---------------------------------------------------------------------------

export const dataService = {
  exportData: async (): Promise<string> => {
    const { data } = await api.get<string>("/export", {
      responseType: "text",
    });
    return data;
  },

};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PAYMENT_METHODS = [
  "Cash",
  "UPI",
  "Bank Transfer",
  "Cheque",
  "Credit Card",
  "Other",
] as const;

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function mapLoan(row: LoanApiRow): LoanData {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    interest: row.interest,
    tenure: row.tenure,
    start_date: row.start_date,
    payments: (row.payments ?? []).map((p) => ({
      id: p.id,
      loan_id: p.loan_id,
      month: p.month,
      amount: p.amount,
      interest: p.interest,
      principal: p.principal,
      balance: p.balance,
      date: p.date,
      paid: Boolean(p.paid),
    })),
    prepayments: (row.prepayments ?? []).map((p) => ({
      id: p.id,
      date: p.date,
      amount: p.amount,
    })),
  };
}
