import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payees } from "@/lib/schema";
import { createPayeeSchema } from "@/lib/validations";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(payees).orderBy(asc(payees.name));
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createPayeeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [row] = await db
    .insert(payees)
    .values({ name: parsed.data.name, phone: parsed.data.phone })
    .onConflictDoNothing()
    .returning();

  if (!row) {
    const [existing] = await db
      .select()
      .from(payees)
      .where(eq(payees.name, parsed.data.name));
    return NextResponse.json(existing);
  }

  return NextResponse.json(row, { status: 201 });
}
