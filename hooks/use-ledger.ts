"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ledgerQueryKeys,
  type LedgerEntry,
  type LedgerPerson,
} from "@/lib/api/ledger-service";
import {
  getLedgerPersons,
  createLedgerPerson,
  updateLedgerPerson,
  deleteLedgerPerson,
  getLedgerEntries,
  createLedgerEntry,
  updateLedgerEntry,
  deleteLedgerEntry,
  toggleLedgerInstallment,
  addLedgerPayment,
  deleteLedgerPayment,
} from "@/app/ledger/actions";
import type {
  CreateLedgerPersonInput,
  UpdateLedgerPersonInput,
  CreateLedgerEntryInput,
  UpdateLedgerEntryInput,
  CreateLedgerPaymentInput,
} from "@/lib/validations";

export type {
  LedgerEntry,
  LedgerPerson,
  LedgerInstallment,
  LedgerPayment,
} from "@/lib/api/ledger-service";

export function useLedger(personFilter?: number | null) {
  const qc = useQueryClient();

  // ---- Queries ----

  const personsQuery = useQuery({
    queryKey: ledgerQueryKeys.persons,
    queryFn: () => getLedgerPersons(),
  });

  const entriesQuery = useQuery({
    queryKey: [...ledgerQueryKeys.entries, personFilter ?? null],
    queryFn: () => getLedgerEntries(personFilter ?? null),
  });

  const persons = (personsQuery.data ?? []) as LedgerPerson[];
  const entries = (entriesQuery.data ?? []) as LedgerEntry[];
  const isLoading = personsQuery.isLoading || entriesQuery.isLoading;

  const invalidateEntries = () =>
    qc.invalidateQueries({ queryKey: ledgerQueryKeys.entries });
  const invalidatePersons = () =>
    qc.invalidateQueries({ queryKey: ledgerQueryKeys.persons });

  // ---- Person Mutations ----

  const createPersonMutation = useMutation({
    mutationFn: (data: CreateLedgerPersonInput) => createLedgerPerson(data),
    onSuccess: invalidatePersons,
  });

  const updatePersonMutation = useMutation({
    mutationFn: ({ id, ...data }: UpdateLedgerPersonInput & { id: number }) =>
      updateLedgerPerson(id, data),
    onSuccess: () => {
      invalidatePersons();
      invalidateEntries();
    },
  });

  const deletePersonMutation = useMutation({
    mutationFn: (id: number) => deleteLedgerPerson(id),
    onSuccess: invalidatePersons,
  });

  // ---- Entry Mutations ----

  const createEntryMutation = useMutation({
    mutationFn: (data: CreateLedgerEntryInput) => createLedgerEntry(data),
    onSuccess: invalidateEntries,
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, ...data }: UpdateLedgerEntryInput & { id: string }) =>
      updateLedgerEntry(id, data),
    onSuccess: invalidateEntries,
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id: string) => deleteLedgerEntry(id),
    onSuccess: invalidateEntries,
  });

  const toggleInstallmentMutation = useMutation({
    mutationFn: ({
      ledgerId,
      installmentId,
      paid,
    }: {
      ledgerId: string;
      installmentId: number;
      paid: boolean;
    }) => toggleLedgerInstallment(ledgerId, installmentId, paid),
    onSuccess: invalidateEntries,
  });

  const addPaymentMutation = useMutation({
    mutationFn: ({
      ledgerId,
      ...data
    }: CreateLedgerPaymentInput & { ledgerId: string }) =>
      addLedgerPayment(ledgerId, data),
    onSuccess: invalidateEntries,
  });

  const deletePaymentMutation = useMutation({
    mutationFn: ({
      ledgerId,
      paymentId,
    }: {
      ledgerId: string;
      paymentId: number;
    }) => deleteLedgerPayment(ledgerId, paymentId),
    onSuccess: invalidateEntries,
  });

  return {
    persons,
    entries,
    isLoading,

    createPerson: createPersonMutation.mutateAsync,
    updatePerson: updatePersonMutation.mutateAsync,
    deletePerson: deletePersonMutation.mutateAsync,

    createEntry: createEntryMutation.mutateAsync,
    updateEntry: updateEntryMutation.mutateAsync,
    deleteEntry: deleteEntryMutation.mutateAsync,
    toggleInstallment: toggleInstallmentMutation.mutateAsync,
    addPayment: addPaymentMutation.mutateAsync,
    deletePayment: deletePaymentMutation.mutateAsync,

    ledgerQueryKeys,
  };
}
