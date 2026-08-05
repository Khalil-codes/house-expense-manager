"use server";

import { db } from "@/lib/db";
import {
  fundingSources,
  fundingEntries,
  expenses,
  loanPayments,
  loans,
} from "@/lib/schema";
import { asc, eq, count, sql } from "drizzle-orm";
import {
  createFundingSourceSchema,
  updateFundingSourceSchema,
  createFundingEntrySchema,
  type CreateFundingSourceInput,
  type UpdateFundingSourceInput,
  type CreateFundingEntryInput,
} from "@/lib/validations";
import { normalizeName } from "@/lib/server/reference";
import type {
  FundingSource,
  FundingLedgerItem,
} from "@/lib/api/expense-service";

export async function listFundingSources(): Promise<FundingSource[]> {
  const sources = await db
    .select()
    .from(fundingSources)
    .orderBy(asc(fundingSources.sort_order), asc(fundingSources.name));

  const entries = await db.select().from(fundingEntries);
  const linkedExpenses = await db
    .select({
      id: expenses.id,
      description: expenses.description,
      amount: expenses.amount,
      date: expenses.date,
      funding_source_id: expenses.funding_source_id,
    })
    .from(expenses)
    .where(sql`${expenses.funding_source_id} is not null`);

  // Paid loan EMIs always count as outflows from the primary Cash source.
  const paidEmis = await db
    .select({
      id: loanPayments.id,
      loan_id: loanPayments.loan_id,
      month: loanPayments.month,
      amount: loanPayments.amount,
      date: loanPayments.date,
    })
    .from(loanPayments)
    .where(eq(loanPayments.paid, true));
  const loanRows = await db
    .select({ id: loans.id, name: loans.name })
    .from(loans);
  const loanName = new Map(loanRows.map((l) => [l.id, l.name]));
  const cashSourceId = sources.find((s) => s.kind === "cash")?.id ?? null;

  return sources.map((s) => {
    const isCash = cashSourceId != null && s.id === cashSourceId;
    const sourceEntries = entries.filter((e) => e.source_id === s.id);
    const sourceExpenses = linkedExpenses.filter(
      (e) => e.funding_source_id === s.id
    );

    const received = sourceEntries
      .filter((e) => e.direction === "in" && e.status === "received")
      .reduce((sum, e) => sum + e.amount, 0);
    const inTransit = sourceEntries
      .filter((e) => e.direction === "in" && e.status === "in_transit")
      .reduce((sum, e) => sum + e.amount, 0);
    const manualOut = sourceEntries
      .filter((e) => e.direction === "out")
      .reduce((sum, e) => sum + e.amount, 0);
    const expenseOut = sourceExpenses.reduce((sum, e) => sum + e.amount, 0);
    const emiOut = isCash
      ? paidEmis.reduce((sum, p) => sum + p.amount, 0)
      : 0;
    const outflows = manualOut + expenseOut + emiOut;
    const remaining =
      s.total_value != null ? s.total_value - received - inTransit : null;

    const emiLedger: FundingLedgerItem[] = isCash
      ? paidEmis.map((p) => ({
          kind: "expense" as const,
          id: `emi-${p.id}`,
          amount: p.amount,
          direction: "out" as const,
          title: `EMI · ${loanName.get(p.loan_id) ?? "Loan"} (Month ${p.month})`,
          date: p.date,
          status: null,
          method: null,
          notes: null,
        }))
      : [];

    const ledger: FundingLedgerItem[] = [
      ...emiLedger,
      ...sourceEntries.map((e) => ({
        kind: (e.direction === "in" ? "receipt" : "payout") as
          | "receipt"
          | "payout",
        id: `entry-${e.id}`,
        amount: e.amount,
        direction: e.direction as "in" | "out",
        title: e.title,
        date: e.date,
        status: e.status,
        method: e.method,
        notes: e.notes,
      })),
      ...sourceExpenses.map((e) => ({
        kind: "expense" as const,
        id: `expense-${e.id}`,
        amount: e.amount,
        direction: "out" as const,
        title: e.description,
        date: e.date,
        status: null,
        method: null,
        notes: null,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      ...s,
      received,
      in_transit: inTransit,
      remaining,
      outflows,
      balance: received - outflows,
      ledger,
    } as FundingSource;
  });
}

export async function createFundingSource(
  input: CreateFundingSourceInput
): Promise<void> {
  const data = createFundingSourceSchema.parse(input);
  const name = normalizeName(data.name);

  const [existing] = await db
    .select({ id: fundingSources.id })
    .from(fundingSources)
    .where(sql`lower(${fundingSources.name}) = lower(${name})`)
    .limit(1);
  if (existing) return;

  await db
    .insert(fundingSources)
    .values({
      name,
      kind: data.kind,
      total_value: data.total_value,
      notes: data.notes,
    })
    .onConflictDoNothing();
}

export async function updateFundingSource(
  id: number,
  input: UpdateFundingSourceInput
): Promise<void> {
  const data = updateFundingSourceSchema.parse(input);
  await db
    .update(fundingSources)
    .set({
      name: normalizeName(data.name),
      kind: data.kind,
      total_value: data.total_value,
      notes: data.notes,
      archived: data.archived,
    })
    .where(eq(fundingSources.id, id));
}

export async function deleteFundingSource(id: number): Promise<void> {
  const [usage] = await db
    .select({ total: count() })
    .from(expenses)
    .where(eq(expenses.funding_source_id, id));
  if ((usage?.total ?? 0) > 0) {
    throw new Error(
      `Funding source is used by ${usage.total} expense(s). Reassign them or archive it instead.`
    );
  }
  await db.delete(fundingSources).where(eq(fundingSources.id, id));
}

export async function addFundingEntry(
  sourceId: number,
  input: CreateFundingEntryInput
): Promise<void> {
  const data = createFundingEntrySchema.parse(input);
  const [source] = await db
    .select({ id: fundingSources.id })
    .from(fundingSources)
    .where(eq(fundingSources.id, sourceId))
    .limit(1);
  if (!source) throw new Error("Funding source not found");

  await db.insert(fundingEntries).values({
    source_id: sourceId,
    direction: data.direction,
    amount: data.amount,
    title: data.title,
    date: data.date,
    status: data.direction === "in" ? data.status : null,
    method: data.method,
    notes: data.notes,
  });
}

export async function updateFundingEntry(
  entryId: number,
  input: CreateFundingEntryInput
): Promise<void> {
  const data = createFundingEntrySchema.parse(input);
  await db
    .update(fundingEntries)
    .set({
      direction: data.direction,
      amount: data.amount,
      title: data.title,
      date: data.date,
      status: data.direction === "in" ? data.status : null,
      method: data.method,
      notes: data.notes,
    })
    .where(eq(fundingEntries.id, entryId));
}

export async function deleteFundingEntry(entryId: number): Promise<void> {
  await db.delete(fundingEntries).where(eq(fundingEntries.id, entryId));
}
