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

export const departments = pgTable("house_expense_manager__departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  created_at: timestamp("created_at").defaultNow(),
});

export const categories = pgTable("house_expense_manager__categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  type: text("type").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const payees = pgTable("house_expense_manager__payees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  phone: text("phone"),
  department_id: integer("department_id").references(() => departments.id),
  created_at: timestamp("created_at").defaultNow(),
});

export const expenses = pgTable("house_expense_manager___expenses", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  category_id: integer("category_id")
    .notNull()
    .references(() => categories.id),
  date: text("date").notNull(),
  payee_id: integer("payee_id").references(() => payees.id),
  department_id: integer("department_id").references(() => departments.id),
  payment_method: text("payment_method").default("Cash"),
  notes: text("notes"),
  covered_by_loan: boolean("covered_by_loan").default(false),
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
