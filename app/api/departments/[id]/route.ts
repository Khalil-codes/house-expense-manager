import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { departments, payees, expenses } from "@/lib/schema";
import { updateDepartmentSchema } from "@/lib/validations";
import { eq, or, count } from "drizzle-orm";

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
  const parsed = updateDepartmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [row] = await db
    .update(departments)
    .set({ name: parsed.data.name })
    .where(eq(departments.id, id))
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
    .from(payees)
    .where(eq(payees.department_id, id));

  const [expUsage] = await db
    .select({ total: count() })
    .from(expenses)
    .where(eq(expenses.department_id, id));

  const totalUsage = (usage?.total ?? 0) + (expUsage?.total ?? 0);
  if (totalUsage > 0) {
    return NextResponse.json(
      {
        error: `Department is in use by ${totalUsage} record(s). Remove references first.`,
      },
      { status: 409 }
    );
  }

  await db.delete(departments).where(eq(departments.id, id));
  return NextResponse.json({ success: true });
}
