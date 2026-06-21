"use server";

import { db } from "@/lib/db";
import {
  ledgerEntries,
  ledgerPersons,
  ledgerInstallments,
  ledgerPayments,
} from "@/lib/schema";
import {
  createLedgerPersonSchema,
  updateLedgerPersonSchema,
  createLedgerEntrySchema,
  updateLedgerEntrySchema,
  toggleInstallmentSchema,
  createLedgerPaymentSchema,
  type CreateLedgerPersonInput,
  type UpdateLedgerPersonInput,
  type CreateLedgerEntryInput,
  type UpdateLedgerEntryInput,
  type CreateLedgerPaymentInput,
} from "@/lib/validations";
import type {
  LedgerEntry,
  LedgerPerson,
  LedgerInstallment,
  LedgerPayment,
} from "@/lib/api/ledger-service";
import { eq, and, asc, desc, count } from "drizzle-orm";
import { addMonths, addWeeks } from "date-fns";

function toIso(value: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

// ---------------------------------------------------------------------------
// Persons
// ---------------------------------------------------------------------------

export async function getLedgerPersons(): Promise<LedgerPerson[]> {
  const rows = await db
    .select()
    .from(ledgerPersons)
    .orderBy(asc(ledgerPersons.name));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    created_at: toIso(r.created_at),
  }));
}

export async function createLedgerPerson(
  input: CreateLedgerPersonInput
): Promise<LedgerPerson> {
  const parsed = createLedgerPersonSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid person data");
  }

  const [row] = await db
    .insert(ledgerPersons)
    .values({ name: parsed.data.name, phone: parsed.data.phone })
    .onConflictDoNothing()
    .returning();

  const person =
    row ??
    (
      await db
        .select()
        .from(ledgerPersons)
        .where(eq(ledgerPersons.name, parsed.data.name))
    )[0];

  return {
    id: person.id,
    name: person.name,
    phone: person.phone,
    created_at: toIso(person.created_at),
  };
}

export async function updateLedgerPerson(
  id: number,
  input: UpdateLedgerPersonInput
): Promise<LedgerPerson> {
  const parsed = updateLedgerPersonSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid person data");
  }

  const [row] = await db
    .update(ledgerPersons)
    .set({ name: parsed.data.name, phone: parsed.data.phone })
    .where(eq(ledgerPersons.id, id))
    .returning();

  if (!row) throw new Error("Person not found");

  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    created_at: toIso(row.created_at),
  };
}

export async function deleteLedgerPerson(id: number): Promise<void> {
  const [usage] = await db
    .select({ total: count() })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.person_id, id));

  if ((usage?.total ?? 0) > 0) {
    throw new Error(
      `Person is referenced by ${usage.total} ledger entry(ies). Remove them first.`
    );
  }

  await db.delete(ledgerPersons).where(eq(ledgerPersons.id, id));
}

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------

export async function getLedgerEntries(
  personId?: number | null
): Promise<LedgerEntry[]> {
  const baseQuery = db
    .select({
      id: ledgerEntries.id,
      person_id: ledgerEntries.person_id,
      person: ledgerPersons.name,
      amount: ledgerEntries.amount,
      date_lent: ledgerEntries.date_lent,
      date_paid_off: ledgerEntries.date_paid_off,
      recurring: ledgerEntries.recurring,
      payment_method: ledgerEntries.payment_method,
      notes: ledgerEntries.notes,
      created_at: ledgerEntries.created_at,
    })
    .from(ledgerEntries)
    .leftJoin(ledgerPersons, eq(ledgerEntries.person_id, ledgerPersons.id));

  const rows =
    personId && !isNaN(personId)
      ? await baseQuery
          .where(eq(ledgerEntries.person_id, personId))
          .orderBy(desc(ledgerEntries.created_at))
      : await baseQuery.orderBy(desc(ledgerEntries.created_at));

  return Promise.all(
    rows.map(async (entry) => {
      const rawInstallments = await db
        .select()
        .from(ledgerInstallments)
        .where(eq(ledgerInstallments.ledger_id, entry.id))
        .orderBy(asc(ledgerInstallments.due_date));

      const installments: LedgerInstallment[] = rawInstallments.map((i) => ({
        id: i.id,
        ledger_id: i.ledger_id,
        due_date: i.due_date,
        amount: i.amount,
        paid: Boolean(i.paid),
        paid_date: i.paid_date,
      }));

      const recurring = Boolean(entry.recurring);
      const paidCount = installments.filter((i) => i.paid).length;

      let status: "Outstanding" | "Partial" | "Paid";
      let paid_off_display: string | null = entry.date_paid_off;
      let amount_paid = 0;
      let outstanding_amount = 0;
      let payments: LedgerPayment[] = [];

      if (recurring && installments.length > 0) {
        // EMI: status & balance derive from the installment schedule.
        amount_paid = installments
          .filter((i) => i.paid)
          .reduce((sum, i) => sum + i.amount, 0);
        outstanding_amount = installments
          .filter((i) => !i.paid)
          .reduce((sum, i) => sum + i.amount, 0);
        status = paidCount === installments.length ? "Paid" : "Outstanding";
        if (status === "Paid") {
          const paidDates = installments
            .map((i) => i.paid_date)
            .filter((d): d is string => !!d)
            .sort();
          paid_off_display = paidDates[paidDates.length - 1] ?? null;
        } else {
          paid_off_display = null;
        }
      } else {
        // One-time: status & balance derive from ad-hoc partial payments.
        const rawPayments = await db
          .select()
          .from(ledgerPayments)
          .where(eq(ledgerPayments.ledger_id, entry.id))
          .orderBy(asc(ledgerPayments.date));

        payments = rawPayments.map((p) => ({
          id: p.id,
          ledger_id: p.ledger_id,
          amount: p.amount,
          date: p.date,
          payment_method: p.payment_method,
          created_at: toIso(p.created_at),
        }));

        amount_paid = payments.reduce((sum, p) => sum + p.amount, 0);

        const legacyPaid = payments.length === 0 && !!entry.date_paid_off;
        const fullyPaid = legacyPaid || amount_paid >= entry.amount;

        if (fullyPaid) {
          status = "Paid";
          outstanding_amount = 0;
          paid_off_display =
            payments.length > 0
              ? payments[payments.length - 1].date
              : entry.date_paid_off;
        } else if (amount_paid > 0) {
          status = "Partial";
          outstanding_amount = entry.amount - amount_paid;
          paid_off_display = null;
        } else {
          status = "Outstanding";
          outstanding_amount = entry.amount;
          paid_off_display = null;
        }
      }

      return {
        id: entry.id,
        person_id: entry.person_id,
        person: entry.person ?? null,
        amount: entry.amount,
        date_lent: entry.date_lent,
        date_paid_off: entry.date_paid_off,
        recurring,
        payment_method: entry.payment_method,
        notes: entry.notes,
        created_at: toIso(entry.created_at),
        status,
        paid_off_display,
        paid_count: paidCount,
        installment_total: installments.length,
        installments,
        amount_paid: Math.round(amount_paid * 100) / 100,
        outstanding_amount: Math.round(Math.max(outstanding_amount, 0) * 100) / 100,
        payments,
      };
    })
  );
}

export async function createLedgerEntry(
  input: CreateLedgerEntryInput
): Promise<void> {
  const parsed = createLedgerEntrySchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid ledger entry data");
  }

  const {
    id,
    person_id,
    amount,
    date_lent,
    date_paid_off,
    recurring,
    payment_method,
    notes,
    installment_count,
    frequency,
    first_due_date,
  } = parsed.data;

  await db.insert(ledgerEntries).values({
    id,
    person_id,
    amount,
    date_lent,
    date_paid_off: recurring ? null : date_paid_off,
    recurring,
    payment_method,
    notes,
  });

  if (recurring && installment_count && frequency && first_due_date) {
    const start = new Date(first_due_date);
    const perInstallment = Math.round((amount / installment_count) * 100) / 100;

    const rows = [];
    let allocated = 0;
    for (let i = 0; i < installment_count; i++) {
      const isLast = i === installment_count - 1;
      const installmentAmount = isLast
        ? Math.round((amount - allocated) * 100) / 100
        : perInstallment;
      allocated += installmentAmount;

      const dueDate =
        frequency === "weekly" ? addWeeks(start, i) : addMonths(start, i);

      rows.push({
        ledger_id: id,
        due_date: dueDate.toISOString(),
        amount: installmentAmount,
        paid: false,
      });
    }

    if (rows.length > 0) {
      await db.insert(ledgerInstallments).values(rows);
    }
  }
}

export async function updateLedgerEntry(
  id: string,
  input: UpdateLedgerEntryInput
): Promise<void> {
  const parsed = updateLedgerEntrySchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid ledger entry data");
  }

  // date_paid_off and payment_method are managed via partial payments
  // (syncEntryPaidOff), so they are intentionally not overwritten here.
  const [row] = await db
    .update(ledgerEntries)
    .set({
      person_id: parsed.data.person_id,
      amount: parsed.data.amount,
      date_lent: parsed.data.date_lent,
      notes: parsed.data.notes,
    })
    .where(eq(ledgerEntries.id, id))
    .returning();

  if (!row) throw new Error("Entry not found");

  // Editing the amount can change whether the entry is fully repaid.
  await syncEntryPaidOff(id);
}

export async function deleteLedgerEntry(id: string): Promise<void> {
  await db.delete(ledgerEntries).where(eq(ledgerEntries.id, id));
}

export async function toggleLedgerInstallment(
  ledgerId: string,
  installmentId: number,
  paid: boolean
): Promise<void> {
  const parsed = toggleInstallmentSchema.safeParse({ installmentId, paid });
  if (!parsed.success) {
    throw new Error("Invalid installment data");
  }

  await db
    .update(ledgerInstallments)
    .set({
      paid: parsed.data.paid,
      paid_date: parsed.data.paid ? new Date().toISOString() : null,
    })
    .where(
      and(
        eq(ledgerInstallments.id, parsed.data.installmentId),
        eq(ledgerInstallments.ledger_id, ledgerId)
      )
    );
}

// ---------------------------------------------------------------------------
// Partial payments (one-time entries)
// ---------------------------------------------------------------------------

// Recompute and persist date_paid_off for a one-time entry based on its
// recorded payments: set to the last payment date once fully repaid, else null.
async function syncEntryPaidOff(ledgerId: string): Promise<void> {
  const [entry] = await db
    .select({ amount: ledgerEntries.amount })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.id, ledgerId));

  if (!entry) return;

  const payments = await db
    .select()
    .from(ledgerPayments)
    .where(eq(ledgerPayments.ledger_id, ledgerId))
    .orderBy(asc(ledgerPayments.date));

  const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const fullyPaid = payments.length > 0 && amountPaid >= entry.amount;

  await db
    .update(ledgerEntries)
    .set({
      date_paid_off: fullyPaid
        ? payments[payments.length - 1].date
        : null,
    })
    .where(eq(ledgerEntries.id, ledgerId));
}

export async function addLedgerPayment(
  ledgerId: string,
  input: CreateLedgerPaymentInput
): Promise<void> {
  const parsed = createLedgerPaymentSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid payment data");
  }

  await db.insert(ledgerPayments).values({
    ledger_id: ledgerId,
    amount: parsed.data.amount,
    date: parsed.data.date,
    payment_method: parsed.data.payment_method,
  });

  await syncEntryPaidOff(ledgerId);
}

export async function deleteLedgerPayment(
  ledgerId: string,
  paymentId: number
): Promise<void> {
  await db
    .delete(ledgerPayments)
    .where(
      and(
        eq(ledgerPayments.id, paymentId),
        eq(ledgerPayments.ledger_id, ledgerId)
      )
    );

  await syncEntryPaidOff(ledgerId);
}
