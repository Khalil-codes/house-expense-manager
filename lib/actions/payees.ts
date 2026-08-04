"use server";

import { db } from "@/lib/db";
import { payees, expenses } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { mergePayeesSchema, type MergePayeesInput } from "@/lib/validations";

// Repoints every expense from `from_id` onto `into_id`, then deletes the
// now-unused duplicate payee.
export async function mergePayees(input: MergePayeesInput): Promise<void> {
  const { from_id, into_id } = mergePayeesSchema.parse(input);
  if (from_id === into_id) {
    throw new Error("Cannot merge a payee into itself");
  }

  const [target] = await db
    .select({ id: payees.id })
    .from(payees)
    .where(eq(payees.id, into_id))
    .limit(1);
  if (!target) throw new Error("Target payee not found");

  await db
    .update(expenses)
    .set({ payee_id: into_id })
    .where(eq(expenses.payee_id, from_id));

  await db.delete(payees).where(eq(payees.id, from_id));
}
