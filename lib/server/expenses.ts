import { db } from "@/lib/db";
import { expenseTags, fundingSources } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { resolveTagIds } from "@/lib/server/reference";

// covered_by_loan is derived from the funding source kind so the existing
// dashboard "via loan" logic keeps working without a manual checkbox.
export async function isLoanFundingSource(
  fundingSourceId: number | null
): Promise<boolean> {
  if (!fundingSourceId) return false;
  const [row] = await db
    .select({ kind: fundingSources.kind })
    .from(fundingSources)
    .where(eq(fundingSources.id, fundingSourceId))
    .limit(1);
  return row?.kind === "loan";
}

export async function syncExpenseTags(
  expenseId: string,
  tagNames: string[]
): Promise<void> {
  await db.delete(expenseTags).where(eq(expenseTags.expense_id, expenseId));
  const tagIds = await resolveTagIds(tagNames);
  if (tagIds.length) {
    await db
      .insert(expenseTags)
      .values(tagIds.map((tag_id) => ({ expense_id: expenseId, tag_id })));
  }
}
