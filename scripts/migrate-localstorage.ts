/**
 * Standalone script to migrate legacy localStorage data into Vercel Postgres.
 *
 * Usage:
 *   1. Open the app in your browser, open DevTools Console, and run:
 *        copy(localStorage.getItem("houseExpenseData"))
 *      This copies the JSON to your clipboard.
 *
 *   2. Paste it into a file, e.g. `data.json`
 *
 *   3. Run this script:
 *        npx tsx scripts/migrate-localstorage.ts data.json
 *
 *      Make sure DATABASE_URL is set (reads from .env.local automatically).
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import {
  categories,
  payees,
  expenses,
  loans,
  loanPayments,
  prepayments,
} from "../lib/schema";
import { data } from "./data";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// ---- Types for the legacy localStorage format ----

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

// ---- Helpers ----

const categoryCache = new Map<string, number>();
const payeeCache = new Map<string, number>();

async function getOrCreateCategory(
  name: string,
  type: string
): Promise<number> {
  const key = name.toLowerCase();
  if (categoryCache.has(key)) return categoryCache.get(key)!;

  const [existing] = await db
    .select()
    .from(categories)
    .where(eq(categories.name, name));
  if (existing) {
    categoryCache.set(key, existing.id);
    return existing.id;
  }

  await db
    .insert(categories)
    .values({ name, type })
    .onConflictDoNothing();

  const [retry] = await db
    .select()
    .from(categories)
    .where(eq(categories.name, name));
  categoryCache.set(key, retry.id);
  return retry.id;
}

async function getOrCreatePayee(name: string): Promise<number> {
  const key = name.toLowerCase();
  if (payeeCache.has(key)) return payeeCache.get(key)!;

  const [existing] = await db
    .select()
    .from(payees)
    .where(eq(payees.name, name));
  if (existing) {
    payeeCache.set(key, existing.id);
    return existing.id;
  }

  await db
    .insert(payees)
    .values({ name })
    .onConflictDoNothing();

  const [retry] = await db
    .select()
    .from(payees)
    .where(eq(payees.name, name));
  payeeCache.set(key, retry.id);
  return retry.id;
}

// ---- Main ----

async function main() {

  const construction = data.construction ?? [];
  const property = data.property ?? [];
  const loan = data.loan;

  console.log(
    `Found: ${construction.length} construction, ${property.length} property expenses` +
      (loan ? `, 1 loan` : "")
  );

  // Clear existing data (order matters due to FK constraints)
  await db.delete(prepayments);
  await db.delete(loanPayments);
  await db.delete(loans);
  await db.delete(expenses);
  await db.delete(payees);
  await db.delete(categories);
  console.log("Cleared existing data");

  // Migrate expenses
  for (const exp of construction) {
    const categoryId = await getOrCreateCategory(exp.category, "construction");
    const payeeId = exp.paidTo ? await getOrCreatePayee(exp.paidTo) : null;

    await db.insert(expenses).values({
      id: exp.id,
      type: "construction",
      description: exp.description,
      amount: exp.amount,
      category_id: categoryId,
      date: new Date(exp.date).toISOString(),
      payee_id: payeeId,
      covered_by_loan: Boolean(exp.coveredByLoan),
    });
  }
  console.log(`Migrated ${construction.length} construction expenses`);

  for (const exp of property) {
    const categoryId = await getOrCreateCategory(exp.category, "property");
    const payeeId = exp.paidTo ? await getOrCreatePayee(exp.paidTo) : null;

    await db.insert(expenses).values({
      id: exp.id,
      type: "property",
      description: exp.description,
      amount: exp.amount,
      category_id: categoryId,
      date: new Date(exp.date).toISOString(),
      payee_id: payeeId,
      covered_by_loan: Boolean(exp.coveredByLoan),
    });
  }
  console.log(`Migrated ${property.length} property expenses`);

  // Migrate loan
  if (loan && loan.amount > 0) {
    const loanId = crypto.randomUUID();
    const payments = loan.payments ?? [];
    const preps = loan.prepayments ?? [];

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

    // if (preps.length > 0) {
    //   await db.insert(prepayments).values(
    //     preps.map((p) => ({
    //       loan_id: loanId,
    //       date: new Date(p.).toISOString(),
    //       amount: p.amount,
    //     }))
    //   );
    // }

    console.log(
      `Migrated loan: ${loan.amount} @ ${loan.interest}%, ${payments.length} payments, ${preps.length} prepayments`
    );
  }

  console.log("Migration complete!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
