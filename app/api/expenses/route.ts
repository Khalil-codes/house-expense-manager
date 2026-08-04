import { NextRequest, NextResponse } from "next/server";
import {
  expenses,
  payees,
  areas,
  fundingSources,
  expenseTags,
  tags,
} from "@/lib/schema";
import { db } from "@/lib/db";
import { eq, desc, inArray } from "drizzle-orm";
import { createExpenseSchema, expenseTypeSchema } from "@/lib/validations";
import { getOrCreatePayee } from "@/lib/server/reference";
import { isLoanFundingSource, syncExpenseTags } from "@/lib/server/expenses";

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
      area: areas.name,
      area_id: expenses.area_id,
      date: expenses.date,
      paid_to: payees.name,
      payee_id: expenses.payee_id,
      funding_source: fundingSources.name,
      funding_source_id: expenses.funding_source_id,
      funding_source_kind: fundingSources.kind,
      payment_method: expenses.payment_method,
      notes: expenses.notes,
      covered_by_loan: expenses.covered_by_loan,
    })
    .from(expenses)
    .leftJoin(areas, eq(expenses.area_id, areas.id))
    .leftJoin(payees, eq(expenses.payee_id, payees.id))
    .leftJoin(fundingSources, eq(expenses.funding_source_id, fundingSources.id))
    .orderBy(desc(expenses.date));

  const rows = parsed?.data
    ? await baseQuery.where(eq(expenses.type, parsed.data))
    : await baseQuery;

  const ids = rows.map((r) => r.id);
  const tagRows = ids.length
    ? await db
        .select({
          expense_id: expenseTags.expense_id,
          name: tags.name,
        })
        .from(expenseTags)
        .innerJoin(tags, eq(expenseTags.tag_id, tags.id))
        .where(inArray(expenseTags.expense_id, ids))
    : [];

  const tagsByExpense = new Map<string, string[]>();
  for (const t of tagRows) {
    const arr = tagsByExpense.get(t.expense_id) ?? [];
    arr.push(t.name);
    tagsByExpense.set(t.expense_id, arr);
  }

  const mapped = rows.map((r) => ({
    id: r.id,
    type: r.type,
    description: r.description,
    amount: r.amount,
    area: r.area ?? "",
    area_id: r.area_id,
    date: r.date,
    paid_to: r.paid_to ?? "",
    payee_id: r.payee_id,
    funding_source: r.funding_source ?? "",
    funding_source_id: r.funding_source_id,
    funding_source_kind: r.funding_source_kind ?? "",
    payment_method: r.payment_method ?? "Cash",
    notes: r.notes,
    covered_by_loan: r.covered_by_loan,
    tags: tagsByExpense.get(r.id) ?? [],
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

  const {
    id,
    type,
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

  await db.insert(expenses).values({
    id,
    type,
    description,
    amount,
    area_id,
    date,
    payee_id,
    funding_source_id,
    payment_method,
    notes,
    covered_by_loan,
  });

  await syncExpenseTags(id, tagNames);

  return NextResponse.json({ success: true }, { status: 201 });
}
