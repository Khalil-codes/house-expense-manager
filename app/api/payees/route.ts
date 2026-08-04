import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payees } from "@/lib/schema";
import { createPayeeSchema } from "@/lib/validations";
import { asc, sql } from "drizzle-orm";
import { normalizeName } from "@/lib/server/reference";

export async function GET() {
  const rows = await db
    .select({
      id: payees.id,
      name: payees.name,
      phone: payees.phone,
      created_at: payees.created_at,
    })
    .from(payees)
    .orderBy(asc(payees.name));

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

  const name = normalizeName(parsed.data.name);

  const [existing] = await db
    .select()
    .from(payees)
    .where(sql`lower(${payees.name}) = lower(${name})`)
    .limit(1);
  if (existing) {
    return NextResponse.json(existing);
  }

  const [row] = await db
    .insert(payees)
    .values({
      name,
      phone: parsed.data.phone,
    })
    .onConflictDoNothing()
    .returning();

  if (!row) {
    const [fallback] = await db
      .select()
      .from(payees)
      .where(sql`lower(${payees.name}) = lower(${name})`)
      .limit(1);
    return NextResponse.json(fallback);
  }

  return NextResponse.json(row, { status: 201 });
}
