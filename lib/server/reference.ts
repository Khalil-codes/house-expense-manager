import { db } from "@/lib/db";
import { payees, tags } from "@/lib/schema";
import { sql } from "drizzle-orm";

// Collapses whitespace and trims so free-typed names consolidate consistently.
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

// Resolves a free-form payee name to an id, reusing an existing payee
// (case-insensitive) or creating one so typed names consolidate over time.
export async function getOrCreatePayee(
  rawName: string | null | undefined
): Promise<number | null> {
  if (!rawName) return null;
  const name = normalizeName(rawName);
  if (!name) return null;

  const [existing] = await db
    .select({ id: payees.id })
    .from(payees)
    .where(sql`lower(${payees.name}) = lower(${name})`)
    .limit(1);
  if (existing) return existing.id;

  const [created] = await db
    .insert(payees)
    .values({ name })
    .onConflictDoNothing()
    .returning({ id: payees.id });
  if (created) return created.id;

  const [fallback] = await db
    .select({ id: payees.id })
    .from(payees)
    .where(sql`lower(${payees.name}) = lower(${name})`)
    .limit(1);
  return fallback?.id ?? null;
}

// Same get-or-create behaviour for tags.
export async function getOrCreateTag(rawName: string): Promise<number | null> {
  const name = normalizeName(rawName);
  if (!name) return null;

  const [existing] = await db
    .select({ id: tags.id })
    .from(tags)
    .where(sql`lower(${tags.name}) = lower(${name})`)
    .limit(1);
  if (existing) return existing.id;

  const [created] = await db
    .insert(tags)
    .values({ name })
    .onConflictDoNothing()
    .returning({ id: tags.id });
  if (created) return created.id;

  const [fallback] = await db
    .select({ id: tags.id })
    .from(tags)
    .where(sql`lower(${tags.name}) = lower(${name})`)
    .limit(1);
  return fallback?.id ?? null;
}

export async function resolveTagIds(names: string[]): Promise<number[]> {
  const ids: number[] = [];
  for (const n of names) {
    const id = await getOrCreateTag(n);
    if (id !== null && !ids.includes(id)) ids.push(id);
  }
  return ids;
}
