import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories, expenses } from "@/lib/schema";
import { updateCategorySchema } from "@/lib/validations";
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
  const parsed = updateCategorySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [row] = await db
    .update(categories)
    .set({ name: parsed.data.name, type: parsed.data.type })
    .where(eq(categories.id, id))
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
    .where(eq(expenses.category_id, id));

  if ((usage?.total ?? 0) > 0) {
    return NextResponse.json(
      {
        error: `Category is referenced by ${usage.total} expense(s). Remove references first.`,
      },
      { status: 409 }
    );
  }

  await db.delete(categories).where(eq(categories.id, id));
  return NextResponse.json({ success: true });
}
