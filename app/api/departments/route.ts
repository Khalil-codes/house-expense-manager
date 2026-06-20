import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { departments } from "@/lib/schema";
import { createDepartmentSchema } from "@/lib/validations";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  const rows = await db
    .select()
    .from(departments)
    .orderBy(asc(departments.name));
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createDepartmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [row] = await db
    .insert(departments)
    .values({ name: parsed.data.name })
    .onConflictDoNothing()
    .returning();

  if (!row) {
    const [existing] = await db
      .select()
      .from(departments)
      .where(eq(departments.name, parsed.data.name));
    return NextResponse.json(existing);
  }

  return NextResponse.json(row, { status: 201 });
}
