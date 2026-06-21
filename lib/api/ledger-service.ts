// Types and query keys for the ledger feature.
// Data access lives in server actions at app/ledger/actions.ts.

export interface LedgerPerson {
  id: number;
  name: string;
  phone: string | null;
  created_at: string | null;
}

export interface LedgerInstallment {
  id: number;
  ledger_id: string;
  due_date: string;
  amount: number;
  paid: boolean;
  paid_date: string | null;
}

export interface LedgerPayment {
  id: number;
  ledger_id: string;
  amount: number;
  date: string;
  payment_method: string | null;
  created_at: string | null;
}

export interface LedgerEntry {
  id: string;
  person_id: number;
  person: string | null;
  amount: number;
  date_lent: string;
  date_paid_off: string | null;
  recurring: boolean;
  payment_method: string | null;
  notes: string | null;
  created_at: string | null;
  status: "Outstanding" | "Partial" | "Paid";
  paid_off_display: string | null;
  paid_count: number;
  installment_total: number;
  installments: LedgerInstallment[];
  amount_paid: number;
  outstanding_amount: number;
  payments: LedgerPayment[];
}

export const ledgerQueryKeys = {
  persons: ["ledger-persons"] as const,
  entries: ["ledger-entries"] as const,
};
