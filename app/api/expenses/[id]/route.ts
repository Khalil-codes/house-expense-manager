import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expenses } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { updateExpenseSchema } from "@/lib/validations";
import { getOrCreatePayee } from "@/lib/server/reference";
import { isLoanFundingSource, syncExpenseTags } from "@/lib/server/expenses";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const body = await request.json();
  const parsed = updateExpenseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const {
    description,
    amount,
    area_id,
    date,
    payee_name,
    funding_source_id,
    payment_method,
    notes,
    tags: tagNames,
  } = parsed.data;

  const payee_id = await getOrCreatePayee(payee_name);
  const covered_by_loan = await isLoanFundingSource(funding_source_id);

  await db
    .update(expenses)
    .set({
      description,
      amount,
      area_id,
      date,
      payee_id,
      funding_source_id,
      payment_method,
      notes,
      covered_by_loan,
    })
    .where(eq(expenses.id, p.id));

  await syncExpenseTags(p.id, tagNames);

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  await db.delete(expenses).where(eq(expenses.id, p.id));
  return NextResponse.json({ success: true });
}
