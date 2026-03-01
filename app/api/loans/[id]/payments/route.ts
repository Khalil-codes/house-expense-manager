import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loanPayments } from "@/lib/schema";
import { eq, and, asc } from "drizzle-orm";
import { togglePaymentSchema } from "@/lib/validations";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const p = await params;

  const payments = await db
    .select()
    .from(loanPayments)
    .where(eq(loanPayments.loan_id, p.id))
    .orderBy(asc(loanPayments.month));

  return NextResponse.json(payments);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const body = await request.json();
  const parsed = togglePaymentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await db
    .update(loanPayments)
    .set({ paid: parsed.data.paid })
    .where(and(eq(loanPayments.id, parsed.data.paymentId), eq(loanPayments.loan_id, p.id)));

  return NextResponse.json({ success: true });
}
