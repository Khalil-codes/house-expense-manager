import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expenses, categories, payees } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { createExpenseSchema, expenseTypeSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");

  const parsed = type ? expenseTypeSchema.safeParse(type) : null;
  if (type && !parsed?.success) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const baseQuery = db
    .select({
      id: expenses.id,
      type: expenses.type,
      description: expenses.description,
      amount: expenses.amount,
      category: categories.name,
      category_id: expenses.category_id,
      date: expenses.date,
      paid_to: payees.name,
      payee_id: expenses.payee_id,
      payment_method: expenses.payment_method,
      notes: expenses.notes,
      covered_by_loan: expenses.covered_by_loan,
    })
    .from(expenses)
    .innerJoin(categories, eq(expenses.category_id, categories.id))
    .leftJoin(payees, eq(expenses.payee_id, payees.id))
    .orderBy(desc(expenses.date));

  const rows = parsed?.data
    ? await baseQuery.where(eq(expenses.type, parsed.data))
    : await baseQuery;

  const mapped = rows.map((r) => ({
    id: r.id,
    type: r.type,
    description: r.description,
    amount: r.amount,
    category: r.category,
    category_id: r.category_id,
    date: r.date,
    paid_to: r.paid_to ?? "",
    payee_id: r.payee_id,
    payment_method: r.payment_method ?? "Cash",
    notes: r.notes,
    covered_by_loan: r.covered_by_loan,
  }));

  return NextResponse.json(mapped);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createExpenseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id, type, description, amount, category_id, date, payee_id, payment_method, notes, covered_by_loan } = parsed.data;

  await db.insert(expenses).values({
    id,
    type,
    description,
    amount,
    category_id,
    date,
    payee_id,
    payment_method,
    notes,
    covered_by_loan,
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
