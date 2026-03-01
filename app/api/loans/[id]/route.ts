import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loans, loanPayments, prepayments } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";
import { updateLoanNameSchema } from "@/lib/validations";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const p = await params;

  const [loan] = await db.select().from(loans).where(eq(loans.id, p.id)).limit(1);

  if (!loan) {
    return NextResponse.json({ error: "Loan not found" }, { status: 404 });
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

  return NextResponse.json({ ...loan, payments, prepayments: preps });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const body = await request.json();
  const parsed = updateLoanNameSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await db.update(loans).set({ name: parsed.data.name }).where(eq(loans.id, p.id));
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  await db.delete(loans).where(eq(loans.id, p.id));
  return NextResponse.json({ success: true });
}
