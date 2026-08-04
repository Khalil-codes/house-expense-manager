"use server";

import { db } from "@/lib/db";
import { tags, expenseTags } from "@/lib/schema";
import { asc, eq } from "drizzle-orm";
import { createTagSchema, type CreateTagInput } from "@/lib/validations";
import { getOrCreateTag } from "@/lib/server/reference";
import type { Tag } from "@/lib/api/expense-service";

export async function listTags(): Promise<Tag[]> {
  const rows = await db.select().from(tags).orderBy(asc(tags.name));
  return rows as Tag[];
}

export async function createTag(input: CreateTagInput): Promise<Tag> {
  const data = createTagSchema.parse(input);
  const id = await getOrCreateTag(data.name);
  if (id === null) throw new Error("Invalid tag name");
  const [row] = await db.select().from(tags).where(eq(tags.id, id)).limit(1);
  return row as Tag;
}

export async function deleteTag(id: number): Promise<void> {
  await db.delete(expenseTags).where(eq(expenseTags.tag_id, id));
  await db.delete(tags).where(eq(tags.id, id));
}
