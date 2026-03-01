import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories } from "@/lib/schema";
import { createCategorySchema, expenseTypeSchema } from "@/lib/validations";
import { eq, asc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");

  const parsed = type ? expenseTypeSchema.safeParse(type) : null;

  let rows;
  if (parsed?.success) {
    rows = await db
      .select()
      .from(categories)
      .where(eq(categories.type, parsed.data))
      .orderBy(asc(categories.name));

    const bothRows = await db
      .select()
      .from(categories)
      .where(eq(categories.type, "both"))
      .orderBy(asc(categories.name));

    rows = [...rows, ...bothRows];
  } else {
    rows = await db.select().from(categories).orderBy(asc(categories.name));
  }

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createCategorySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [row] = await db
    .insert(categories)
    .values({ name: parsed.data.name, type: parsed.data.type })
    .onConflictDoNothing()
    .returning();

  if (!row) {
    const [existing] = await db
      .select()
      .from(categories)
      .where(eq(categories.name, parsed.data.name));
    return NextResponse.json(existing);
  }

  return NextResponse.json(row, { status: 201 });
}
