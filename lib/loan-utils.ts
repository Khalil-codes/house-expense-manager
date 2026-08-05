import type { LoanData } from "@/lib/api/expense-service";

export interface LoanStats {
  borrowed: number;
  amountPaid: number;
  interestPaid: number;
  principalPaid: number;
  outstanding: number;
  totalPayable: number;
  progressPercent: number;
  principalPercent: number;
}

export function computeLoanStats(loan: LoanData): LoanStats {
  const borrowed = loan.amount;
  const amountPaid = loan.payments.reduce(
    (sum, p) => sum + (p.paid ? p.amount : 0),
    0
  );
  const interestPaid = loan.payments.reduce(
    (sum, p) => sum + (p.paid ? p.interest : 0),
    0
  );
  const principalPaid = loan.payments.reduce(
    (sum, p) => sum + (p.paid ? p.principal : 0),
    0
  );
  const outstanding = Math.max(0, borrowed - principalPaid);
  const totalPayable = loan.payments.reduce((sum, p) => sum + p.amount, 0);
  const progressPercent =
    totalPayable > 0 ? (amountPaid / totalPayable) * 100 : 0;
  const principalPercent = borrowed > 0 ? (principalPaid / borrowed) * 100 : 0;

  return {
    borrowed,
    amountPaid,
    interestPaid,
    principalPaid,
    outstanding,
    totalPayable,
    progressPercent,
    principalPercent,
  };
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}
