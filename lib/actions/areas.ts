"use server";

import { db } from "@/lib/db";
import { areas, expenses } from "@/lib/schema";
import { asc, eq, count, sql } from "drizzle-orm";
import {
  createAreaSchema,
  updateAreaSchema,
  type CreateAreaInput,
  type UpdateAreaInput,
} from "@/lib/validations";
import { normalizeName } from "@/lib/server/reference";
import type { Area } from "@/lib/api/expense-service";

export async function listAreas(): Promise<Area[]> {
  const rows = await db
    .select()
    .from(areas)
    .orderBy(asc(areas.sort_order), asc(areas.name));
  return rows as Area[];
}

export async function createArea(input: CreateAreaInput): Promise<Area> {
  const data = createAreaSchema.parse(input);
  const name = normalizeName(data.name);

  const [existing] = await db
    .select()
    .from(areas)
    .where(sql`lower(${areas.name}) = lower(${name})`)
    .limit(1);
  if (existing) return existing as Area;

  const [row] = await db
    .insert(areas)
    .values({ name, sort_order: data.sort_order })
    .onConflictDoNothing()
    .returning();
  return row as Area;
}

export async function updateArea(
  id: number,
  input: UpdateAreaInput
): Promise<Area> {
  const data = updateAreaSchema.parse(input);
  const [row] = await db
    .update(areas)
    .set({ name: normalizeName(data.name), sort_order: data.sort_order })
    .where(eq(areas.id, id))
    .returning();
  if (!row) throw new Error("Area not found");
  return row as Area;
}

export async function deleteArea(id: number): Promise<void> {
  const [usage] = await db
    .select({ total: count() })
    .from(expenses)
    .where(eq(expenses.area_id, id));
  if ((usage?.total ?? 0) > 0) {
    throw new Error(
      `Area is used by ${usage.total} expense(s). Reassign them first.`
    );
  }
  await db.delete(areas).where(eq(areas.id, id));
}
