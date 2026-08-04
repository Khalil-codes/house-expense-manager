/**
 * Standalone importer for the legacy localStorage export in `scripts/data.ts`.
 * Maps each legacy `category` to a focused area and keeps the original category
 * as a tag. Run with: pnpm db:migrate-ls (reads DATABASE_URL from .env).
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import {
  payees,
  areas,
  tags,
  expenseTags,
  expenses,
  loans,
  loanPayments,
  prepayments,
} from "../lib/schema";
import { data } from "./data";
import { AREA_NAMES, categoryToArea } from "./area-map";

const db = drizzle(neon(process.env.DATABASE_URL!));

interface LegacyExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  paidTo?: string;
  coveredByLoan?: boolean;
}

interface LegacyPayment {
  month: number;
  amount: number;
  interest: number;
  principal: number;
  balance: number;
  date: string;
  paid?: boolean | number;
}

interface LegacyPrepayment {
  date: string;
  amount: number;
}

interface LegacyLoan {
  amount: number;
  interest: number;
  tenure: number;
  startDate?: string;
  payments?: LegacyPayment[];
  prepayments?: LegacyPrepayment[];
}

interface LegacyData {
  construction?: LegacyExpense[];
  property?: LegacyExpense[];
  loan?: LegacyLoan;
}

const payeeCache = new Map<string, number>();
const areaCache = new Map<string, number>();
const tagCache = new Map<string, number>();

async function getOrCreate(
  table: typeof payees | typeof areas | typeof tags,
  name: string,
  cache: Map<string, number>
): Promise<number> {
  const key = name.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  const [existing] = await db
    .select({ id: table.id })
    .from(table)
    .where(sql`lower(${table.name}) = lower(${name})`)
    .limit(1);
  if (existing) {
    cache.set(key, existing.id);
    return existing.id;
  }
  await db.insert(table).values({ name }).onConflictDoNothing();
  const [retry] = await db
    .select({ id: table.id })
    .from(table)
    .where(sql`lower(${table.name}) = lower(${name})`)
    .limit(1);
  cache.set(key, retry.id);
  return retry.id;
}

async function insertExpense(
  exp: LegacyExpense,
  type: "construction" | "property"
): Promise<void> {
  const areaId = await getOrCreate(
    areas,
    categoryToArea(exp.category),
    areaCache
  );
  const payeeId = exp.paidTo
    ? await getOrCreate(payees, exp.paidTo, payeeCache)
    : null;

  await db.insert(expenses).values({
    id: exp.id,
    type,
    description: exp.description,
    amount: exp.amount,
    area_id: areaId,
    date: new Date(exp.date).toISOString(),
    payee_id: payeeId,
    covered_by_loan: Boolean(exp.coveredByLoan),
  });

  if (exp.category) {
    const tagId = await getOrCreate(tags, exp.category, tagCache);
    await db
      .insert(expenseTags)
      .values({ expense_id: exp.id, tag_id: tagId })
      .onConflictDoNothing();
  }
}

async function main() {
  const legacy = data as LegacyData;
  const construction = legacy.construction ?? [];
  const property = legacy.property ?? [];
  const loan = legacy.loan;

  console.log(
    `Found: ${construction.length} construction, ${property.length} property expenses` +
      (loan ? `, 1 loan` : "")
  );

  await db.delete(expenseTags);
  await db.delete(prepayments);
  await db.delete(loanPayments);
  await db.delete(loans);
  await db.delete(expenses);
  await db.delete(payees);
  console.log("Cleared existing data");

  for (const name of AREA_NAMES) {
    await getOrCreate(areas, name, areaCache);
  }

  for (const exp of construction) await insertExpense(exp, "construction");
  console.log(`Migrated ${construction.length} construction expenses`);

  for (const exp of property) await insertExpense(exp, "property");
  console.log(`Migrated ${property.length} property expenses`);

  if (loan && loan.amount > 0) {
    const loanId = crypto.randomUUID();
    const payments = loan.payments ?? [];

    await db.insert(loans).values({
      id: loanId,
      name: "Home Loan",
      amount: loan.amount,
      interest: loan.interest,
      tenure: loan.tenure,
      start_date: loan.startDate
        ? new Date(loan.startDate).toISOString()
        : null,
    });

    if (payments.length > 0) {
      await db.insert(loanPayments).values(
        payments.map((p) => ({
          loan_id: loanId,
          month: p.month,
          amount: p.amount,
          interest: p.interest,
          principal: p.principal,
          balance: p.balance,
          date: new Date(p.date).toISOString(),
          paid: Boolean(p.paid),
        }))
      );
    }

    console.log(
      `Migrated loan: ${loan.amount} @ ${loan.interest}%, ${payments.length} payments`
    );
  }

  console.log("Migration complete!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
