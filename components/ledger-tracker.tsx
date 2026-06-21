"use client";

import { useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ChevronDown,
  Repeat,
  HandCoins,
  CheckCircle2,
  Wallet,
  CircleDollarSign,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useLedger, type LedgerEntry } from "@/hooks/use-ledger";
import { LedgerEntryForm } from "@/components/ledger-entry-form";
import {
  LEDGER_PAYMENT_METHODS,
  type LedgerEntryFormValues,
} from "@/lib/validations";

const ALL = "all";

function fmtAmount(value: number) {
  return `\u20B9${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function fmtDate(value: string | null) {
  if (!value) return "—";
  try {
    return format(new Date(value), "dd MMM yyyy");
  } catch {
    return value;
  }
}

function initials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function LedgerTracker() {
  const {
    persons,
    entries,
    isLoading,
    createPerson,
    createEntry,
    updateEntry,
    deleteEntry,
    toggleInstallment,
    addPayment,
    deletePayment,
  } = useLedger();

  const [personFilter, setPersonFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "unpaid" | "paid">(
    "all"
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<LedgerEntry | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<LedgerEntry | null>(null);

  const totals = useMemo(() => {
    const lent = entries.reduce((sum, e) => sum + e.amount, 0);
    const outstanding = entries.reduce(
      (sum, e) => sum + e.outstanding_amount,
      0
    );
    return { lent, outstanding, settled: lent - outstanding };
  }, [entries]);

  // Outstanding amount per person, for the filter chips.
  const outstandingByPerson = useMemo(() => {
    const map = new Map<number, number>();
    for (const e of entries) {
      if (e.outstanding_amount > 0) {
        map.set(
          e.person_id,
          (map.get(e.person_id) ?? 0) + e.outstanding_amount
        );
      }
    }
    return map;
  }, [entries]);

  const visibleEntries = useMemo(
    () =>
      entries.filter((e) => {
        if (personFilter !== null && e.person_id !== personFilter) return false;
        if (statusFilter === "paid" && e.status !== "Paid") return false;
        if (statusFilter === "unpaid" && e.status === "Paid") return false;
        return true;
      }),
    [entries, personFilter, statusFilter]
  );

  // Group visible entries by person. Within a group, settled entries sink to
  // the bottom; groups with outstanding balances are listed before settled ones.
  const groups = useMemo(() => {
    const byPerson = new Map<
      number,
      { person: string | null; entries: LedgerEntry[] }
    >();
    for (const e of visibleEntries) {
      const g = byPerson.get(e.person_id);
      if (g) g.entries.push(e);
      else byPerson.set(e.person_id, { person: e.person, entries: [e] });
    }
    return Array.from(byPerson.entries())
      .map(([person_id, g]) => ({
        person_id,
        person: g.person,
        entries: [...g.entries].sort(
          (a, b) => Number(a.status === "Paid") - Number(b.status === "Paid")
        ),
        outstanding: g.entries.reduce((sum, e) => sum + e.outstanding_amount, 0),
      }))
      .sort((a, b) => Number(a.outstanding === 0) - Number(b.outstanding === 0));
  }, [visibleEntries]);

  const openAdd = () => {
    setEditEntry(null);
    setIsFormOpen(true);
  };

  const openEdit = (entry: LedgerEntry) => {
    setEditEntry(entry);
    setIsFormOpen(true);
  };

  const handleSubmit = async (values: LedgerEntryFormValues) => {
    try {
      if (editEntry) {
        await updateEntry({
          id: editEntry.id,
          person_id: values.person_id,
          amount: values.amount,
          date_lent: new Date(values.date_lent).toISOString(),
          date_paid_off: values.date_paid_off
            ? new Date(values.date_paid_off).toISOString()
            : null,
          payment_method: values.payment_method || null,
          notes: values.notes?.trim() || null,
        });
        toast.success("Entry updated");
      } else {
        await createEntry({
          id: crypto.randomUUID(),
          person_id: values.person_id,
          amount: values.amount,
          date_lent: new Date(values.date_lent).toISOString(),
          date_paid_off:
            !values.recurring && values.date_paid_off
              ? new Date(values.date_paid_off).toISOString()
              : null,
          recurring: values.recurring,
          payment_method: values.payment_method || null,
          notes: values.notes?.trim() || null,
          installment_count: values.recurring ? values.installment_count : null,
          frequency: values.recurring ? values.frequency : null,
          first_due_date:
            values.recurring && values.first_due_date
              ? new Date(values.first_due_date).toISOString()
              : null,
        });
        toast.success("Entry added");
      }
      setIsFormOpen(false);
      setEditEntry(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  };

  const handleCreatePerson = async (name: string) =>
    createPerson({ name, phone: null });

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteEntry(id);
      toast.success("Entry deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddPayment = async (
    ledgerId: string,
    data: { amount: number; date: string; payment_method: string | null }
  ) => {
    await addPayment({
      ledgerId,
      amount: data.amount,
      date: new Date(data.date).toISOString(),
      payment_method: data.payment_method,
    });
  };

  const handleSettleFull = async (entry: LedgerEntry) => {
    if (entry.outstanding_amount <= 0) return;
    setSettlingId(entry.id);
    try {
      await addPayment({
        ledgerId: entry.id,
        amount: entry.outstanding_amount,
        date: new Date().toISOString(),
        payment_method: null,
      });
      toast.success("Marked as fully paid");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to settle");
    } finally {
      setSettlingId(null);
    }
  };

  const handleDeletePayment = async (ledgerId: string, paymentId: number) => {
    try {
      await deletePayment({ ledgerId, paymentId });
      toast.success("Payment removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-sm text-muted-foreground">Loading ledger...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Ledger</h2>
          <p className="text-xs text-muted-foreground">Money you&apos;ve lent out</p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="mr-1 h-4 w-4" />
          Lend
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label="Lent"
          value={totals.lent}
          icon={<Wallet className="h-4 w-4" />}
          tone="neutral"
        />
        <StatCard
          label="Outstanding"
          value={totals.outstanding}
          icon={<CircleDollarSign className="h-4 w-4" />}
          tone="amber"
        />
        <StatCard
          label="Settled"
          value={totals.settled}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="green"
        />
      </div>

      {/* Filters */}
      {entries.length > 0 && (
        <div className="flex gap-2">
          <Select
            value={personFilter === null ? ALL : String(personFilter)}
            onValueChange={(v) =>
              setPersonFilter(v === ALL ? null : Number(v))
            }
          >
            <SelectTrigger className="h-9 flex-1 text-sm">
              <SelectValue placeholder="Everyone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Everyone</SelectItem>
              {persons.map((p) => {
                const outstanding = outstandingByPerson.get(p.id) ?? 0;
                return (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                    {outstanding > 0 ? ` · ${fmtAmount(outstanding)}` : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(v) =>
              setStatusFilter(v as "all" | "unpaid" | "paid")
            }
          >
            <SelectTrigger className="h-9 w-32 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Entries */}
      {entries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="rounded-full bg-muted p-3">
              <HandCoins className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">No entries yet</p>
              <p className="text-xs text-muted-foreground">
                Track money you lend to people
              </p>
            </div>
            <Button size="sm" onClick={openAdd}>
              <Plus className="mr-1 h-4 w-4" />
              Lend money
            </Button>
          </CardContent>
        </Card>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No entries match these filters
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.person_id} className="space-y-2">
              <div className="flex items-center gap-2 px-0.5">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[11px] font-semibold">
                    {initials(group.person)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-semibold truncate">
                  {group.person ?? "Unknown"}
                </span>
                {group.outstanding > 0 && (
                  <span className="ml-auto text-xs font-medium text-amber-600 dark:text-amber-500">
                    {fmtAmount(group.outstanding)} due
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {group.entries.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    expanded={expandedId === entry.id}
                    onToggleExpand={() =>
                      setExpandedId(
                        expandedId === entry.id ? null : entry.id
                      )
                    }
                    onEdit={() => openEdit(entry)}
                    onDelete={() => handleDelete(entry.id)}
                    onAddPayment={() => setPaymentTarget(entry)}
                    onSettleFull={() => handleSettleFull(entry)}
                    onDeletePayment={(paymentId) =>
                      handleDeletePayment(entry.id, paymentId)
                    }
                    onToggleInstallment={(installmentId, paid) =>
                      toggleInstallment({
                        ledgerId: entry.id,
                        installmentId,
                        paid,
                      }).catch(() =>
                        toast.error("Failed to update installment")
                      )
                    }
                    deleting={deletingId === entry.id}
                    settling={settlingId === entry.id}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={isFormOpen}
        onOpenChange={(o) => {
          setIsFormOpen(o);
          if (!o) setEditEntry(null);
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editEntry ? "Edit entry" : "Lend money"}</DialogTitle>
            <DialogDescription className="text-xs">
              Track money you have lent out.
            </DialogDescription>
          </DialogHeader>
          {/* Remount the form when switching between add/edit so defaults reset */}
          <LedgerEntryForm
            key={editEntry?.id ?? "new"}
            editEntry={editEntry}
            persons={persons}
            onSubmit={handleSubmit}
            onCancel={() => {
              setIsFormOpen(false);
              setEditEntry(null);
            }}
            onCreatePerson={handleCreatePerson}
          />
        </DialogContent>
      </Dialog>

      <PaymentDialog
        entry={paymentTarget}
        onClose={() => setPaymentTarget(null)}
        onSubmit={handleAddPayment}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "neutral" | "amber" | "green";
}) {
  const toneClasses = {
    neutral: "text-muted-foreground",
    amber: "text-amber-600 dark:text-amber-500",
    green: "text-emerald-600 dark:text-emerald-500",
  }[tone];

  return (
    <Card>
      <CardContent className="p-3">
        <div className={cn("flex items-center gap-1.5", toneClasses)}>
          {icon}
          <span className="text-[11px] font-medium">{label}</span>
        </div>
        <p className="mt-1 text-sm font-bold tabular-nums truncate">
          {fmtAmount(value)}
        </p>
      </CardContent>
    </Card>
  );
}

function EntryCard({
  entry,
  expanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddPayment,
  onSettleFull,
  onDeletePayment,
  onToggleInstallment,
  deleting,
  settling,
}: {
  entry: LedgerEntry;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddPayment: () => void;
  onSettleFull: () => void;
  onDeletePayment: (paymentId: number) => void;
  onToggleInstallment: (installmentId: number, paid: boolean) => void;
  deleting: boolean;
  settling: boolean;
}) {
  const isPaid = entry.status === "Paid";
  const hasInstallments = entry.recurring && entry.installment_total > 0;
  const installmentProgress = hasInstallments
    ? (entry.paid_count / entry.installment_total) * 100
    : 0;
  // One-time entries with at least one partial payment get the payments view.
  const hasPayments = !entry.recurring && entry.payments.length > 0;
  const paymentProgress =
    entry.amount > 0 ? (entry.amount_paid / entry.amount) * 100 : 0;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tabular-nums">
                {fmtAmount(entry.amount)}
              </span>
              {entry.recurring && (
                <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <StatusPill status={entry.status} />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Lent {fmtDate(entry.date_lent)}
              {isPaid && entry.paid_off_display
                ? ` · Paid ${fmtDate(entry.paid_off_display)}`
                : ""}
            </p>
            {entry.notes && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {entry.notes}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              disabled={deleting}
              onClick={onDelete}
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* One-time entries: partial payments + remaining balance */}
        {!entry.recurring && (
          <div className="mt-2.5 space-y-1.5">
            {(hasPayments || isPaid) && (
              <>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {fmtAmount(entry.amount_paid)} of {fmtAmount(entry.amount)}
                    {!isPaid && (
                      <span className="text-amber-600 dark:text-amber-500">
                        {" · "}
                        {fmtAmount(entry.outstanding_amount)} left
                      </span>
                    )}
                  </span>
                  {hasPayments && (
                    <button
                      type="button"
                      onClick={onToggleExpand}
                      className="flex items-center gap-0.5 hover:text-foreground"
                    >
                      {expanded ? "Hide" : "View"}
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 transition-transform",
                          expanded && "rotate-180"
                        )}
                      />
                    </button>
                  )}
                </div>
                <Progress value={paymentProgress} className="h-1.5" />
              </>
            )}

            {hasPayments && expanded && (
              <div className="mt-1 space-y-0.5 rounded-md bg-muted/40 p-1.5">
                {entry.payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 rounded px-1.5 py-1"
                  >
                    <span className="flex-1 text-xs">{fmtDate(p.date)}</span>
                    {p.payment_method && (
                      <span className="text-[11px] text-muted-foreground">
                        {p.payment_method}
                      </span>
                    )}
                    <span className="text-xs font-medium tabular-nums">
                      {fmtAmount(p.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeletePayment(p.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remove payment"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!isPaid && (
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 flex-1 text-xs"
                  onClick={onAddPayment}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add payment
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 flex-1 text-xs"
                  disabled={settling}
                  onClick={onSettleFull}
                >
                  {settling ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  )}
                  Settle {fmtAmount(entry.outstanding_amount)}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Recurring: progress + expandable installments */}
        {hasInstallments && (
          <Collapsible open={expanded} onOpenChange={onToggleExpand}>
            <div className="mt-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {entry.paid_count} of {entry.installment_total} paid
                </span>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-0.5 hover:text-foreground">
                    {expanded ? "Hide" : "View"}
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        expanded && "rotate-180"
                      )}
                    />
                  </button>
                </CollapsibleTrigger>
              </div>
              <Progress value={installmentProgress} className="h-1.5" />
            </div>

            <CollapsibleContent>
              <div className="mt-2 space-y-0.5 rounded-md bg-muted/40 p-1.5">
                {entry.installments.map((inst, idx) => (
                  <label
                    key={inst.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-background"
                  >
                    <Checkbox
                      checked={inst.paid}
                      onCheckedChange={(checked) =>
                        onToggleInstallment(inst.id, checked === true)
                      }
                    />
                    <span className="w-7 shrink-0 text-[11px] text-muted-foreground">
                      #{idx + 1}
                    </span>
                    <span className="flex-1 text-xs">
                      {fmtDate(inst.due_date)}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-medium tabular-nums",
                        inst.paid && "text-muted-foreground line-through"
                      )}
                    >
                      {fmtAmount(inst.amount)}
                    </span>
                  </label>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

function StatusPill({ status }: { status: LedgerEntry["status"] }) {
  const styles: Record<LedgerEntry["status"], string> = {
    Paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-500",
    Partial:
      "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-500",
    Outstanding:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-500",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "ml-auto px-1.5 py-0 text-[10px] font-semibold",
        styles[status]
      )}
    >
      {status}
    </Badge>
  );
}

function PaymentDialog({
  entry,
  onClose,
  onSubmit,
}: {
  entry: LedgerEntry | null;
  onClose: () => void;
  onSubmit: (
    ledgerId: string,
    data: { amount: number; date: string; payment_method: string | null }
  ) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [method, setMethod] = useState<string>("Cash");
  const [saving, setSaving] = useState(false);

  // Reset the form each time a new entry is targeted, defaulting the
  // amount to the full remaining balance (one tap to settle).
  const lastEntryId = useRef<string | null>(null);
  if (entry && entry.id !== lastEntryId.current) {
    lastEntryId.current = entry.id;
    setAmount(String(entry.outstanding_amount));
    setDate(format(new Date(), "yyyy-MM-dd"));
    setMethod("Cash");
  }
  if (!entry) {
    lastEntryId.current = null;
  }

  const handleSave = async () => {
    if (!entry) return;
    const amountNum = parseFloat(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!date) {
      toast.error("Select a date");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(entry.id, {
        amount: amountNum,
        date,
        payment_method: method || null,
      });
      toast.success("Payment recorded");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!entry} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription className="text-xs">
            {entry
              ? `${fmtAmount(entry.outstanding_amount)} remaining of ${fmtAmount(
                  entry.amount
                )}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Amount</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Paid via</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEDGER_PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
