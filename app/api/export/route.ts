import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expenses, loans, loanPayments, prepayments } from "@/lib/schema";
import { eq, asc, desc } from "drizzle-orm";

export async function GET() {
  const allExpenses = await db.select().from(expenses).orderBy(desc(expenses.date));
  const allLoans = await db.select().from(loans).orderBy(desc(loans.created_at));

  const loansWithDetails = await Promise.all(
    allLoans.map(async (loan) => {
      const payments = await db
        .select()
        .from(loanPayments)
        .where(eq(loanPayments.loan_id, loan.id))
        .orderBy(asc(loanPayments.month));
      const preps = await db
        .select()
        .from(prepayments)
        .where(eq(prepayments.loan_id, loan.id))
        .orderBy(asc(prepayments.date));
      return { ...loan, payments, prepayments: preps };
    })
  );

  const data = {
    expenses: allExpenses,
    loans: loansWithDetails,
    exportedAt: new Date().toISOString(),
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="house-expenses-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}
