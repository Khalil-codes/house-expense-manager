import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loans, loanPayments, prepayments } from "@/lib/schema";
import { eq, asc, desc } from "drizzle-orm";
import { addMonths } from "date-fns";
import { createLoanSchema } from "@/lib/validations";

export async function GET() {
  const allLoans = await db.select().from(loans).orderBy(desc(loans.created_at));

  const result = await Promise.all(
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

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createLoanSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id, name, amount, interest, tenure, start_date } = parsed.data;

  const monthlyInterest = interest / 100 / 12;
  const totalPayments = tenure * 12;
  const monthlyPayment =
    (amount * monthlyInterest * Math.pow(1 + monthlyInterest, totalPayments)) /
    (Math.pow(1 + monthlyInterest, totalPayments) - 1);

  await db.insert(loans).values({
    id,
    name,
    amount,
    interest,
    tenure,
    start_date: start_date || null,
  });

  let balance = amount;
  const loanStartDate = start_date ? new Date(start_date) : new Date();
  const paymentRows = [];

  for (let i = 1; i <= totalPayments; i++) {
    const interestPayment = balance * monthlyInterest;
    const principalPayment = monthlyPayment - interestPayment;
    balance -= principalPayment;

    const paymentDate = addMonths(loanStartDate, i - 1);

    paymentRows.push({
      loan_id: id,
      month: i,
      amount: monthlyPayment,
      interest: interestPayment,
      principal: principalPayment,
      balance: balance > 0 ? balance : 0,
      date: paymentDate.toISOString(),
      paid: false,
    });
  }

  if (paymentRows.length > 0) {
    await db.insert(loanPayments).values(paymentRows);
  }

  const [loan] = await db.select().from(loans).where(eq(loans.id, id)).limit(1);
  const payments = await db
    .select()
    .from(loanPayments)
    .where(eq(loanPayments.loan_id, id))
    .orderBy(asc(loanPayments.month));

  return NextResponse.json({ ...loan, payments, prepayments: [] }, { status: 201 });
}
