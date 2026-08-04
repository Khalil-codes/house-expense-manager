// Local, reviewable migration: category -> area + tag, payee/funding backfill.
// Usage:
//   pnpm migrate:areas plan    generate scripts/migration-plan.json + print a log
//   (open the JSON and edit `area`, `tags`, `payee`, `fundingSource` per expense)
//   pnpm migrate:areas apply   seed areas/funding and apply the (edited) plan
// Run this BEFORE `pnpm db:push`. Requires DATABASE_URL (loaded via --env-file=.env).

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  serial,
} from "drizzle-orm/pg-core";
import { eq, sql } from "drizzle-orm";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { AREA_NAMES, categoryToArea } from "./area-map";

const db = drizzle(neon(process.env.DATABASE_URL!));
const PLAN_PATH = join(process.cwd(), "scripts", "migration-plan.json");

// ---- Minimal table refs for the CURRENT (pre-push) database ----

const areas = pgTable("house_expense_manager__areas", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  sort_order: integer("sort_order").default(0),
});

const tags = pgTable("house_expense_manager__tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

const expenseTags = pgTable("house_expense_manager__expense_tags", {
  id: serial("id").primaryKey(),
  expense_id: text("expense_id").notNull(),
  tag_id: integer("tag_id").notNull(),
});

const payees = pgTable("house_expense_manager__payees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

const categories = pgTable("house_expense_manager__categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

const fundingSources = pgTable("house_expense_manager__funding_sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  kind: text("kind").notNull().default("other"),
  total_value: real("total_value"),
});

const loans = pgTable("house_expense_manager__loans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  amount: real("amount").notNull(),
});

const expenses = pgTable("house_expense_manager___expenses", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  category_id: integer("category_id"),
  area_id: integer("area_id"),
  date: text("date").notNull(),
  payee_id: integer("payee_id"),
  funding_source_id: integer("funding_source_id"),
  covered_by_loan: boolean("covered_by_loan"),
  notes: text("notes"),
});

// ---- Seed config ----

const FUNDING_KEYWORDS =
  /(sales?\s*proceed|house\s*sell|sell\s*income|sale\s*proceed)/i;

// Construction expenses strictly after this date are interior finishing work.
const POST_SHELL_CUTOFF = Date.parse("2026-05-03T00:00:00.000Z");

// Pre-shell construction: small/incidental spend that is not real structural work.
const PRE_SHELL_MISC =
  /water tanker|water spraying|second\s*hand motor|\bmotor\b|snack|electricity connection/i;
// Pre-shell construction: interior finishing work (false ceiling / POP).
const PRE_SHELL_INTERIOR = /plaster of paris|\bpop\b/i;

// ---- Plan types ----

interface PlanExpense {
  id: string;
  type: string;
  date: string;
  amount: number;
  description: string;
  currentCategory: string;
  currentPayee: string | null;
  currentFunding: string | null;
  coveredByLoan: boolean;
  area: string;
  tags: string[];
  payee: string | null;
  fundingSource: string | null;
}

interface Plan {
  areasToSeed: string[];
  fundingSourcesToSeed: {
    name: string;
    kind: string;
    total_value: number | null;
  }[];
  expenses: PlanExpense[];
}

// Best-effort payee guess from notes only (descriptions are never payees).
function extractPayeeFromNotes(notes: string | null): string | null {
  if (!notes) return null;
  for (const line of notes.split(/\n+/)) {
    const cleaned = line
      .replace(/\(.*?\)/g, "")
      .replace(/covered from|from house sell income|from sales? proceeds?/gi, "")
      .trim();
    if (!cleaned) continue;
    const m =
      cleaned.match(/paid to\s+(.+)/i) ||
      cleaned.match(/^to\s+(.+)/i) ||
      cleaned.match(/^by\s+(.+)/i);
    if (m) {
      const name = m[1].replace(/[.,:;]+$/, "").trim();
      if (name.length >= 2 && !FUNDING_KEYWORDS.test(name)) return name;
    }
  }
  return null;
}

async function buildPlan(): Promise<Plan> {
  const [cats, payeeRows, areaRows, sourceRows, loanRows, exp] =
    await Promise.all([
      db.select().from(categories),
      db.select().from(payees),
      db.select().from(areas),
      db.select().from(fundingSources),
      db.select().from(loans),
      db.select().from(expenses),
    ]);

  const catById = new Map(cats.map((c) => [c.id, c.name]));
  const payeeById = new Map(payeeRows.map((p) => [p.id, p.name]));
  const areaById = new Map(areaRows.map((a) => [a.id, a.name]));
  const sourceById = new Map(sourceRows.map((s) => [s.id, s.name]));

  const existingSourceNames = new Set(
    sourceRows.map((s) => s.name.toLowerCase())
  );
  const seeds: Plan["fundingSourcesToSeed"] = [
    { name: "Home Sale Proceeds", kind: "sale_proceeds", total_value: null },
    { name: "Shop Sale Proceeds", kind: "sale_proceeds", total_value: null },
    { name: "Cash/Savings", kind: "cash", total_value: null },
    ...loanRows.map((l) => ({
      name: l.name,
      kind: "loan",
      total_value: l.amount,
    })),
  ].filter((s) => !existingSourceNames.has(s.name.toLowerCase()));

  // A covered-by-loan expense defaults to the first available loan source.
  const loanSourceName =
    sourceRows.find((s) => s.kind === "loan")?.name ??
    loanRows[0]?.name ??
    null;

  const planExpenses: PlanExpense[] = exp
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((e) => {
      const catName = e.category_id ? catById.get(e.category_id) ?? "" : "";
      const currentArea = e.area_id ? areaById.get(e.area_id) ?? null : null;
      const currentPayee = e.payee_id ? payeeById.get(e.payee_id) ?? null : null;
      const currentFunding = e.funding_source_id
        ? sourceById.get(e.funding_source_id) ?? null
        : null;
      const coveredByLoan = Boolean(e.covered_by_loan);

      let area = currentArea ?? categoryToArea(catName);
      if (e.type === "construction") {
        if (new Date(e.date).getTime() > POST_SHELL_CUTOFF) {
          // Everything built after the shell was done (post 03 May 2026) is interior.
          area = "Interior";
        } else if (PRE_SHELL_MISC.test(e.description)) {
          area = "Miscellaneous";
        } else if (PRE_SHELL_INTERIOR.test(e.description)) {
          area = "Interior";
        } else {
          // The rest of the pre-shell work (foundation, roofing, framing, plaster,
          // elevation, civil, luhar) is structural.
          area = "Structural";
        }
      }

      const tags = catName ? [catName] : [];
      // Anything tile-related gets a shared "Tiles" tag for easy filtering.
      if (/tile/i.test(e.description) && !tags.some((t) => t.toLowerCase() === "tiles")) {
        tags.push("Tiles");
      }

      return {
        id: e.id,
        type: e.type,
        date: e.date,
        amount: e.amount,
        description: e.description,
        currentCategory: catName,
        currentPayee,
        currentFunding,
        coveredByLoan,
        area,
        tags,
        payee: currentPayee ?? extractPayeeFromNotes(e.notes),
        fundingSource:
          currentFunding ?? (coveredByLoan ? loanSourceName : null),
      };
    });

  return {
    areasToSeed: [...AREA_NAMES],
    fundingSourcesToSeed: seeds,
    expenses: planExpenses,
  };
}

function printPlan(plan: Plan): void {
  console.log(
    `\nAreas to seed:    ${plan.areasToSeed.join(", ") || "(none)"}`
  );
  console.log(
    `Funding to seed:  ${
      plan.fundingSourcesToSeed.map((s) => s.name).join(", ") || "(none)"
    }\n`
  );
  console.log(`Expenses (${plan.expenses.length}):`);
  console.log("-".repeat(96));
  for (const e of plan.expenses) {
    const d = new Date(e.date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
    const amt = `\u20B9${e.amount.toLocaleString("en-IN")}`.padEnd(12);
    const desc = e.description.slice(0, 26).padEnd(26);
    const change = `${e.currentCategory || "\u2014"} \u2192 ${e.area}`;
    console.log(`${d.padEnd(11)} ${amt} ${desc} ${change}`);
    console.log(
      `${" ".repeat(11)} tags: [${e.tags.join(", ")}]  payee: ${
        e.payee ?? "\u2014"
      }  funding: ${e.fundingSource ?? "\u2014"}${
        e.coveredByLoan ? "  (loan)" : ""
      }`
    );
  }
  console.log("-".repeat(96));
}

async function getOrCreateName(
  table: typeof payees | typeof tags,
  rawName: string
): Promise<number> {
  const name = rawName.trim().replace(/\s+/g, " ");
  const [existing] = await db
    .select({ id: table.id })
    .from(table)
    .where(sql`lower(${table.name}) = lower(${name})`)
    .limit(1);
  if (existing) return existing.id;
  const [created] = await db
    .insert(table)
    .values({ name })
    .onConflictDoNothing()
    .returning({ id: table.id });
  if (created) return created.id;
  const [fallback] = await db
    .select({ id: table.id })
    .from(table)
    .where(sql`lower(${table.name}) = lower(${name})`)
    .limit(1);
  return fallback.id;
}

async function applyPlan(plan: Plan): Promise<void> {
  for (const [i, name] of plan.areasToSeed.entries()) {
    await db
      .insert(areas)
      .values({ name, sort_order: i })
      .onConflictDoNothing();
  }
  for (const s of plan.fundingSourcesToSeed) {
    await db
      .insert(fundingSources)
      .values({ name: s.name, kind: s.kind, total_value: s.total_value })
      .onConflictDoNothing();
  }

  const areaRows = await db.select().from(areas);
  const areaIdByName = new Map(
    areaRows.map((a) => [a.name.toLowerCase(), a.id])
  );
  const sourceRows = await db.select().from(fundingSources);
  const sourceByName = new Map(
    sourceRows.map((s) => [s.name.toLowerCase(), s])
  );

  let updated = 0;
  for (const e of plan.expenses) {
    if (!e.area || !e.area.trim()) {
      throw new Error(`Expense ${e.id} (${e.description}) has no area set`);
    }
    const areaId = areaIdByName.get(e.area.toLowerCase());
    if (!areaId) {
      throw new Error(
        `Area "${e.area}" for expense ${e.id} is not in areasToSeed`
      );
    }

    const set: Record<string, unknown> = { area_id: areaId };

    if (e.payee && e.payee.trim()) {
      set.payee_id = await getOrCreateName(payees, e.payee);
    }
    if (e.fundingSource && e.fundingSource.trim()) {
      const source = sourceByName.get(e.fundingSource.toLowerCase());
      if (!source) {
        throw new Error(
          `Funding source "${e.fundingSource}" for ${e.id} is not seeded`
        );
      }
      set.funding_source_id = source.id;
      set.covered_by_loan = source.kind === "loan";
    }

    await db.update(expenses).set(set).where(eq(expenses.id, e.id));

    // The JSON is the source of truth: reset this expense's tags to match it.
    await db.delete(expenseTags).where(eq(expenseTags.expense_id, e.id));
    const seenTags = new Set<string>();
    for (const tagName of e.tags) {
      const name = tagName.trim();
      if (!name || seenTags.has(name.toLowerCase())) continue;
      seenTags.add(name.toLowerCase());
      const tagId = await getOrCreateName(tags, name);
      await db.insert(expenseTags).values({ expense_id: e.id, tag_id: tagId });
    }
    updated++;
  }

  console.log(`\nApplied plan to ${updated} expense(s).`);
  console.log("Next: run `pnpm db:push` to drop category/department columns.\n");
}

async function main() {
  const cmd = process.argv[2];

  if (cmd === "plan") {
    const plan = await buildPlan();
    writeFileSync(PLAN_PATH, JSON.stringify(plan, null, 2));
    printPlan(plan);
    console.log(`\nPlan written to ${PLAN_PATH}`);
    console.log("Edit it if needed, then run: pnpm migrate:areas apply\n");
    return;
  }

  if (cmd === "apply") {
    if (!existsSync(PLAN_PATH)) {
      throw new Error("No plan found. Run `pnpm migrate:areas plan` first.");
    }
    const plan = JSON.parse(readFileSync(PLAN_PATH, "utf8")) as Plan;
    await applyPlan(plan);
    return;
  }

  console.log("Usage: pnpm migrate:areas <plan|apply>");
  process.exit(1);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
