import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loans, loanPayments, prepayments } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";
import { addPrepaymentSchema } from "@/lib/validations";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const body = await request.json();
  const parsed = addPrepaymentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { amount, date } = parsed.data;

  const [loan] = await db.select().from(loans).where(eq(loans.id, p.id)).limit(1);
  if (!loan) {
    return NextResponse.json({ error: "Loan not found" }, { status: 404 });
  }

  const allPayments = await db
    .select()
    .from(loanPayments)
    .where(eq(loanPayments.loan_id, p.id))
    .orderBy(asc(loanPayments.month));

  const paidPrincipal = allPayments
    .filter((pay) => pay.paid)
    .reduce((sum, pay) => sum + pay.principal, 0);
  const currentBalance = loan.amount - paidPrincipal;

  if (amount > currentBalance) {
    return NextResponse.json(
      { error: "Prepayment amount exceeds remaining balance" },
      { status: 400 }
    );
  }

  const prepayDate = new Date(date);
  const firstUnpaidIndex = allPayments.findIndex(
    (pay) => !pay.paid && new Date(pay.date) >= prepayDate
  );

  if (firstUnpaidIndex === -1) {
    return NextResponse.json(
      { error: "No future payments found after the selected date" },
      { status: 400 }
    );
  }

  const monthlyInterest = loan.interest / 100 / 12;
  const remainingMonths = allPayments.length - firstUnpaidIndex;
  const newBalance = currentBalance - amount;

  const newMonthlyPayment =
    (newBalance * monthlyInterest * Math.pow(1 + monthlyInterest, remainingMonths)) /
    (Math.pow(1 + monthlyInterest, remainingMonths) - 1);

  await db.insert(prepayments).values({ loan_id: p.id, date, amount });

  const cutoffMonth = allPayments[firstUnpaidIndex - 1]?.month || 0;
  await db
    .delete(loanPayments)
    .where(eq(loanPayments.loan_id, p.id));

  const paidPayments = allPayments.filter((pay) => pay.month <= cutoffMonth);
  if (paidPayments.length > 0) {
    await db.insert(loanPayments).values(
      paidPayments.map((pay) => ({
        loan_id: pay.loan_id,
        month: pay.month,
        amount: pay.amount,
        interest: pay.interest,
        principal: pay.principal,
        balance: pay.balance,
        date: pay.date,
        paid: pay.paid,
      }))
    );
  }

  const newPaymentRows = [];
  let balance = newBalance;
  for (let i = 0; i < remainingMonths; i++) {
    const interestPayment = balance * monthlyInterest;
    const principalPayment = newMonthlyPayment - interestPayment;
    balance -= principalPayment;

    newPaymentRows.push({
      loan_id: p.id,
      month: firstUnpaidIndex + i + 1,
      amount: newMonthlyPayment,
      interest: interestPayment,
      principal: principalPayment,
      balance: balance > 0 ? balance : 0,
      date: allPayments[firstUnpaidIndex + i].date,
      paid: false,
    });
  }

  if (newPaymentRows.length > 0) {
    await db.insert(loanPayments).values(newPaymentRows);
  }

  const payments = await db
    .select()
    .from(loanPayments)
    .where(eq(loanPayments.loan_id, p.id))
    .orderBy(asc(loanPayments.month));
  const preps = await db
    .select()
    .from(prepayments)
    .where(eq(prepayments.loan_id, p.id))
    .orderBy(asc(prepayments.date));

  return NextResponse.json({ payments, prepayments: preps });
}
