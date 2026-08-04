import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payees, expenses } from "@/lib/schema";
import { updatePayeeSchema } from "@/lib/validations";
import { eq, count } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const p = await params;
  const id = parseInt(p.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = updatePayeeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [row] = await db
    .update(payees)
    .set({
      name: parsed.data.name,
      phone: parsed.data.phone,
    })
    .where(eq(payees.id, id))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(row);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const p = await params;
  const id = parseInt(p.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const [usage] = await db
    .select({ total: count() })
    .from(expenses)
    .where(eq(expenses.payee_id, id));

  if ((usage?.total ?? 0) > 0) {
    return NextResponse.json(
      {
        error: `Payee is referenced by ${usage.total} expense(s). Remove references first.`,
      },
      { status: 409 }
    );
  }

  await db.delete(payees).where(eq(payees.id, id));
  return NextResponse.json({ success: true });
}
