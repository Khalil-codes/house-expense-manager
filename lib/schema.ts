// Has house_expense_manager__ prefix to avoid conflicts with other tables

import {
  pgTable,
  text,
  real,
  integer,
  boolean,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";

export const areas = pgTable("house_expense_manager__areas", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  sort_order: integer("sort_order").default(0),
  created_at: timestamp("created_at").defaultNow(),
});

export const tags = pgTable("house_expense_manager__tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  created_at: timestamp("created_at").defaultNow(),
});

// kind: 'sale_proceeds' | 'loan' | 'cash' | 'other'
export const fundingSources = pgTable("house_expense_manager__funding_sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  kind: text("kind").notNull().default("other"),
  total_value: real("total_value"),
  notes: text("notes"),
  archived: boolean("archived").default(false),
  sort_order: integer("sort_order").default(0),
  created_at: timestamp("created_at").defaultNow(),
});

// direction: 'in' | 'out'; status (for 'in'): 'received' | 'in_transit' | 'expected'
export const fundingEntries = pgTable("house_expense_manager__funding_entries", {
  id: serial("id").primaryKey(),
  source_id: integer("source_id")
    .notNull()
    .references(() => fundingSources.id, { onDelete: "cascade" }),
  direction: text("direction").notNull(),
  amount: real("amount").notNull(),
  title: text("title").notNull(),
  date: text("date").notNull(),
  status: text("status"),
  method: text("method"),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow(),
});

export const payees = pgTable("house_expense_manager__payees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  phone: text("phone"),
  created_at: timestamp("created_at").defaultNow(),
});

export const expenses = pgTable("house_expense_manager___expenses", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  area_id: integer("area_id")
    .notNull()
    .references(() => areas.id),
  date: text("date").notNull(),
  payee_id: integer("payee_id").references(() => payees.id),
  funding_source_id: integer("funding_source_id").references(
    () => fundingSources.id
  ),
  payment_method: text("payment_method").default("Cash"),
  notes: text("notes"),
  covered_by_loan: boolean("covered_by_loan").default(false),
});

export const expenseTags = pgTable("house_expense_manager__expense_tags", {
  id: serial("id").primaryKey(),
  expense_id: text("expense_id")
    .notNull()
    .references(() => expenses.id, { onDelete: "cascade" }),
  tag_id: integer("tag_id")
    .notNull()
    .references(() => tags.id, { onDelete: "cascade" }),
});

export const loans = pgTable("house_expense_manager__loans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  amount: real("amount").notNull(),
  interest: real("interest").notNull(),
  tenure: integer("tenure").notNull(),
  start_date: text("start_date"),
  created_at: timestamp("created_at").defaultNow(),
});

export const loanPayments = pgTable("house_expense_manager__loan_payments", {
  id: serial("id").primaryKey(),
  loan_id: text("loan_id")
    .notNull()
    .references(() => loans.id, { onDelete: "cascade" }),
  month: integer("month").notNull(),
  amount: real("amount").notNull(),
  interest: real("interest").notNull(),
  principal: real("principal").notNull(),
  balance: real("balance").notNull(),
  date: text("date").notNull(),
  paid: boolean("paid").default(false),
});

export const prepayments = pgTable("house_expense_manager__prepayments", {
  id: serial("id").primaryKey(),
  loan_id: text("loan_id")
    .notNull()
    .references(() => loans.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  amount: real("amount").notNull(),
});

export const ledgerPersons = pgTable("house_expense_manager__ledger_persons", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  phone: text("phone"),
  created_at: timestamp("created_at").defaultNow(),
});

export const ledgerEntries = pgTable("house_expense_manager__ledger_entries", {
  id: text("id").primaryKey(),
  person_id: integer("person_id")
    .notNull()
    .references(() => ledgerPersons.id),
  amount: real("amount").notNull(),
  date_lent: text("date_lent").notNull(),
  date_paid_off: text("date_paid_off"),
  recurring: boolean("recurring").default(false),
  payment_method: text("payment_method").default("Cash"),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow(),
});

export const ledgerInstallments = pgTable(
  "house_expense_manager__ledger_installments",
  {
    id: serial("id").primaryKey(),
    ledger_id: text("ledger_id")
      .notNull()
      .references(() => ledgerEntries.id, { onDelete: "cascade" }),
    due_date: text("due_date").notNull(),
    amount: real("amount").notNull(),
    paid: boolean("paid").default(false),
    paid_date: text("paid_date"),
  }
);

export const ledgerPayments = pgTable(
  "house_expense_manager__ledger_payments",
  {
    id: serial("id").primaryKey(),
    ledger_id: text("ledger_id")
      .notNull()
      .references(() => ledgerEntries.id, { onDelete: "cascade" }),
    amount: real("amount").notNull(),
    date: text("date").notNull(),
    payment_method: text("payment_method"),
    created_at: timestamp("created_at").defaultNow(),
  }
);
