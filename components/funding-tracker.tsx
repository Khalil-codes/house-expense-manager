"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Loader2,
  Trash,
  Pencil,
  ChevronDown,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  MoreHorizontal,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  fundingSourceFormSchema,
  fundingEntryFormSchema,
  type FundingSourceFormValues,
  type FundingEntryFormValues,
  PAYMENT_METHODS,
} from "@/lib/validations";
import {
  useExpenseService,
  type FundingSource,
  type FundingLedgerItem,
} from "@/hooks/use-expense-service";
import { ExpenseChart } from "@/components/expense-chart";
import {
  computeLoanStats,
  normalizeName,
  type LoanStats,
} from "@/lib/loan-utils";

const KIND_LABELS: Record<string, string> = {
  sale_proceeds: "Sale proceeds",
  loan: "Loan",
  cash: "Cash",
  other: "Other",
};

function inr(n: number) {
  return `\u20B9${Math.round(n).toLocaleString("en-IN")}`;
}

function compact(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1e7) return `\u20B9${(n / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `\u20B9${(n / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `\u20B9${(n / 1e3).toFixed(0)}K`;
  return `\u20B9${Math.round(n)}`;
}

export default function FundingTracker({
  autoOpenAddSource,
  onAutoOpenHandled,
}: {
  autoOpenAddSource?: boolean;
  onAutoOpenHandled?: () => void;
} = {}) {
  const {
    fundingSources,
    loans,
    isLoading,
    createFundingSource,
    updateFundingSource,
    deleteFundingSource,
    addFundingEntry,
    updateFundingEntry,
    deleteFundingEntry,
  } = useExpenseService();

  const [addOpen, setAddOpen] = useState(false);
  const [editSource, setEditSource] = useState<FundingSource | null>(null);

  useEffect(() => {
    if (autoOpenAddSource) {
      setAddOpen(true);
      onAutoOpenHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenAddSource]);

  const active = fundingSources.filter((s) => !s.archived);
  const totalReceived = active.reduce((s, f) => s + f.received, 0);
  const totalInTransit = active.reduce((s, f) => s + f.in_transit, 0);
  const totalDeployed = active.reduce((s, f) => s + f.outflows, 0);
  // Cash is an untracked pool; its balance/received aren't meaningful.
  const totalBalance = active
    .filter((s) => s.kind !== "cash")
    .reduce((s, f) => s + f.balance, 0);
  const expectedTotal = active.reduce((s, f) => s + (f.total_value ?? 0), 0);
  const yetToReceive = active.reduce((s, f) => s + (f.remaining ?? 0), 0);
  const deployedRows = [...active]
    .filter((s) => s.outflows > 0)
    .sort((a, b) => b.outflows - a.outflows);

  // Sources still owing money in (in transit or not started yet).
  const incomingSources = active
    .map((s) => ({
      name: s.name,
      inTransit: s.in_transit,
      remaining: s.remaining ?? 0,
      outstanding: s.in_transit + (s.remaining ?? 0),
    }))
    .filter((s) => s.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding);

  // Auto-link loan-kind funding sources to Loans-tab loans by matching name.
  const loanStatsByName = new Map<string, LoanStats>(
    loans.map((l) => [normalizeName(l.name), computeLoanStats(l)])
  );
  const debtStats = loans.map(computeLoanStats);
  const totalBorrowed = debtStats.reduce((s, l) => s + l.borrowed, 0);
  const totalRepaidPrincipal = debtStats.reduce(
    (s, l) => s + l.principalPaid,
    0
  );
  const totalOutstanding = debtStats.reduce((s, l) => s + l.outstanding, 0);
  const totalInterestPaid = debtStats.reduce((s, l) => s + l.interestPaid, 0);
  const repaidPercent =
    totalBorrowed > 0 ? (totalRepaidPrincipal / totalBorrowed) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Loading funding sources...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Overview — the money story in plain language */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ArrowDownLeft className="h-3 w-3" />
                </span>
                Money in
              </div>
              <p className="mt-1.5 text-[26px] font-semibold leading-none tracking-tight tabular-nums">
                {compact(totalReceived)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                received so far
              </p>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <ArrowUpRight className="h-3 w-3" />
                </span>
                Money out
              </div>
              <p className="mt-1.5 text-[26px] font-semibold leading-none tracking-tight tabular-nums">
                {compact(totalDeployed)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                spent so far
              </p>
            </div>
          </div>

          {expectedTotal > 0 && (
            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-[12px]">
                <span className="text-muted-foreground">Funding progress</span>
                <span className="font-medium tabular-nums">
                  {compact(totalReceived)} of {compact(expectedTotal)}
                </span>
              </div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${Math.min(
                      100,
                      (totalReceived / expectedTotal) * 100
                    )}%`,
                  }}
                />
                <div
                  className="h-full bg-primary/35"
                  style={{
                    width: `${Math.min(
                      100 - (totalReceived / expectedTotal) * 100,
                      (totalInTransit / expectedTotal) * 100
                    )}%`,
                  }}
                />
              </div>
              {incomingSources.length > 0 && (
                <div className="mt-3">
                  <div className="mb-1.5 flex items-center justify-between text-[12px]">
                    <span className="font-medium">Still to come</span>
                    <span className="font-medium tabular-nums text-muted-foreground">
                      {compact(totalInTransit + yetToReceive)}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {incomingSources.map((s) => (
                      <PipelineRow
                        key={s.name}
                        swatch={
                          s.inTransit > 0
                            ? "bg-primary/35"
                            : "bg-muted-foreground/25"
                        }
                        label={s.name}
                        help={
                          s.inTransit > 0 && s.remaining > 0
                            ? "part in transit"
                            : s.inTransit > 0
                            ? "on its way"
                            : "not started yet"
                        }
                        value={compact(s.outstanding)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {totalBalance !== 0 && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/50 px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="text-[13px] font-medium">Unspent balance</p>
                <p className="text-[11px] text-muted-foreground">
                  received minus spent, tracked sources
                </p>
              </div>
              <span className="shrink-0 text-[17px] font-semibold tabular-nums">
                {compact(totalBalance)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Debt — repayment progress across all loans */}
      {totalBorrowed > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-muted-foreground">
                  Outstanding debt
                </p>
                <p className="mt-1 text-[28px] font-semibold leading-none tracking-tight tabular-nums">
                  {compact(totalOutstanding)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  across {loans.length} loan{loans.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[13px] font-medium text-muted-foreground">
                  Repaid
                </p>
                <p className="mt-1 text-[17px] font-semibold tabular-nums text-primary">
                  {compact(totalRepaidPrincipal)}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  of {compact(totalBorrowed)} borrowed
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, repaidPercent)}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{repaidPercent.toFixed(0)}% principal cleared</span>
                {totalInterestPaid > 0 && (
                  <span>{compact(totalInterestPaid)} interest paid</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Where the money went — donut by source */}
      {deployedRows.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Where the money went</CardTitle>
            <CardDescription>
              {compact(totalDeployed)} spent, split by source
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2">
            <ExpenseChart
              data={deployedRows.map((s) => ({
                name: s.name,
                value: s.outflows,
              }))}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-base">Funding sources</CardTitle>
              <CardDescription>
                Received {compact(totalReceived)} · Balance{" "}
                {compact(totalBalance)}
              </CardDescription>
            </div>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-full">
                  <Plus className="mr-1 h-4 w-4" />
                  Add source
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Funding Source</DialogTitle>
                  <DialogDescription className="text-xs">
                    Sale proceeds, a loan, cash savings, etc.
                  </DialogDescription>
                </DialogHeader>
                <FundingSourceForm
                  onSubmit={async (v) => {
                    await createFundingSource(v);
                    setAddOpen(false);
                  }}
                  onCancel={() => setAddOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {fundingSources.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          No funding sources yet
        </p>
      ) : (
        <div className="space-y-3">
          {fundingSources.map((source) => (
            <FundingSourceCard
              key={source.id}
              source={source}
              loanStats={
                source.kind === "loan"
                  ? loanStatsByName.get(normalizeName(source.name))
                  : undefined
              }
              onEdit={() => setEditSource(source)}
              onDelete={() => deleteFundingSource(source.id)}
              onAddEntry={(v) =>
                addFundingEntry({ sourceId: source.id, ...v })
              }
              onUpdateEntry={(entryId, v) =>
                updateFundingEntry({ entryId, ...v })
              }
              onDeleteEntry={deleteFundingEntry}
            />
          ))}
        </div>
      )}

      <Dialog
        open={!!editSource}
        onOpenChange={(open) => !open && setEditSource(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Funding Source</DialogTitle>
            <DialogDescription className="text-xs">
              Update details or archive it.
            </DialogDescription>
          </DialogHeader>
          {editSource && (
            <FundingSourceForm
              source={editSource}
              onSubmit={async (v) => {
                await updateFundingSource({
                  id: editSource.id,
                  ...v,
                  archived: editSource.archived ?? false,
                });
                setEditSource(null);
              }}
              onCancel={() => setEditSource(null)}
              onToggleArchive={async () => {
                await updateFundingSource({
                  id: editSource.id,
                  name: editSource.name,
                  kind: editSource.kind,
                  total_value: editSource.total_value,
                  notes: editSource.notes,
                  archived: !editSource.archived,
                });
                setEditSource(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PipelineRow({
  swatch,
  label,
  help,
  value,
}: {
  swatch: string;
  label: string;
  help: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className={`h-2 w-2 shrink-0 rounded-full ${swatch}`} />
      <span className="font-medium">{label}</span>
      <span className="truncate text-muted-foreground">{help}</span>
      <span className="ml-auto shrink-0 font-medium tabular-nums">{value}</span>
    </div>
  );
}

function MiniStat({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-0.5 truncate tabular-nums ${
          strong ? "text-[15px] font-semibold" : "text-[15px] font-medium"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function FundingSourceCard({
  source,
  loanStats,
  onEdit,
  onDelete,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
}: {
  source: FundingSource;
  loanStats?: LoanStats;
  onEdit: () => void;
  onDelete: () => void;
  onAddEntry: (v: FundingEntryFormValues) => Promise<void>;
  onUpdateEntry: (entryId: number, v: FundingEntryFormValues) => Promise<void>;
  onDeleteEntry: (entryId: number) => Promise<void>;
}) {
  const [showLedger, setShowLedger] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<FundingLedgerItem | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <Card className={source.archived ? "opacity-60" : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex flex-wrap items-center gap-2 text-[15px]">
              <span className="truncate">{source.name}</span>
              <Badge className="shrink-0 text-[10px] font-normal">
                {KIND_LABELS[source.kind] ?? source.kind}
              </Badge>
              {source.archived && (
                <Badge className="shrink-0 text-[10px]">Archived</Badge>
              )}
            </CardTitle>
            {source.notes && (
              <CardDescription className="mt-1">{source.notes}</CardDescription>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="-mr-1 h-9 w-9 shrink-0 rounded-full"
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={(e) => {
                  e.preventDefault();
                  setConfirmOpen(true);
                }}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {source.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the source and its manual entries. Linked expenses
              stay, but lose this funding tag. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault();
                setDeleting(true);
                try {
                  await onDelete();
                  setConfirmOpen(false);
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <CardContent className="space-y-3">
        {loanStats ? (
          <>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12px] font-medium">Loan repayment</span>
                <span className="text-[11px] text-muted-foreground">
                  {loanStats.principalPercent.toFixed(0)}% cleared
                </span>
              </div>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${Math.min(100, loanStats.principalPercent)}%`,
                  }}
                />
              </div>
              <div className="mt-2.5 grid grid-cols-3 gap-2">
                <MiniStat label="Borrowed" value={inr(loanStats.borrowed)} />
                <MiniStat label="Repaid" value={inr(loanStats.principalPaid)} />
                <MiniStat
                  label="Outstanding"
                  value={inr(loanStats.outstanding)}
                  strong
                />
              </div>
            </div>
            {source.outflows > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">Deployed into house</p>
                  <p className="text-[11px] text-muted-foreground">
                    spent from this loan
                  </p>
                </div>
                <span className="shrink-0 text-[15px] font-semibold tabular-nums">
                  {inr(source.outflows)}
                </span>
              </div>
            )}
          </>
        ) : source.kind === "cash" ? (
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Spent from cash
              </p>
              <p className="mt-0.5 text-[22px] font-semibold leading-none tabular-nums">
                {inr(source.outflows)}
              </p>
            </div>
            <p className="max-w-[45%] text-right text-[11px] text-muted-foreground">
              Cash is a pool — balance isn&apos;t tracked
            </p>
          </div>
        ) : (
          <>
            {source.total_value != null && source.total_value > 0 && (
              <div>
                <div className="mb-1.5 flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Received</span>
                  <span className="font-medium tabular-nums">
                    {inr(source.received)} of {inr(source.total_value)}
                  </span>
                </div>
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${Math.min(
                        100,
                        (source.received / source.total_value) * 100
                      )}%`,
                    }}
                  />
                  <div
                    className="h-full bg-primary/35"
                    style={{
                      width: `${Math.min(
                        100 - (source.received / source.total_value) * 100,
                        (source.in_transit / source.total_value) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <MiniStat label="Received" value={inr(source.received)} />
              <MiniStat label="Spent" value={inr(source.outflows)} />
              <MiniStat label="Balance" value={inr(source.balance)} strong />
            </div>
            {(source.in_transit > 0 ||
              (source.remaining != null && source.remaining > 0)) && (
              <p className="text-[11px] text-muted-foreground">
                {source.in_transit > 0 &&
                  `${inr(source.in_transit)} in transit`}
                {source.in_transit > 0 &&
                  source.remaining != null &&
                  source.remaining > 0 &&
                  " · "}
                {source.remaining != null &&
                  source.remaining > 0 &&
                  `${inr(source.remaining)} yet to receive`}
              </p>
            )}
          </>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="secondary" className="h-10 rounded-full">
                <Plus className="mr-1 h-4 w-4" />
                Add entry
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Entry — {source.name}</DialogTitle>
                <DialogDescription className="text-xs">
                  Record a receipt into or a payout from this source.
                </DialogDescription>
              </DialogHeader>
              <FundingEntryForm
                onSubmit={async (v) => {
                  await onAddEntry(v);
                  setEntryOpen(false);
                }}
                onCancel={() => setEntryOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <Button
            size="sm"
            variant="ghost"
            className="h-10 rounded-full"
            onClick={() => setShowLedger((s) => !s)}
          >
            {showLedger ? (
              <ChevronDown className="mr-1 h-4 w-4" />
            ) : (
              <ChevronRight className="mr-1 h-4 w-4" />
            )}
            Ledger ({source.ledger.length})
          </Button>
        </div>

        {showLedger && (
          <LedgerList
            items={source.ledger}
            onEditEntry={setEditEntry}
            onDeleteEntry={onDeleteEntry}
          />
        )}
      </CardContent>

      <Dialog
        open={!!editEntry}
        onOpenChange={(open) => !open && setEditEntry(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Entry — {source.name}</DialogTitle>
            <DialogDescription className="text-xs">
              Update this receipt or payout.
            </DialogDescription>
          </DialogHeader>
          {editEntry && (
            <FundingEntryForm
              entry={editEntry}
              onSubmit={async (v) => {
                const entryId = parseInt(editEntry.id.replace("entry-", ""), 10);
                await onUpdateEntry(entryId, v);
                setEditEntry(null);
              }}
              onCancel={() => setEditEntry(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function LedgerList({
  items,
  onEditEntry,
  onDeleteEntry,
}: {
  items: FundingLedgerItem[];
  onEditEntry: (item: FundingLedgerItem) => void;
  onDeleteEntry: (entryId: number) => Promise<void>;
}) {
  if (items.length === 0) {
    return (
      <p className="text-center text-xs text-muted-foreground py-4">
        No entries yet
      </p>
    );
  }
  return (
    <div className="mt-2 divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60">
      {items.map((item) => {
        const isIn = item.direction === "in";
        const isManual = item.id.startsWith("entry-");
        return (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2 px-3 py-2.5"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  isIn ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                {isIn ? (
                  <ArrowDownLeft className="h-4 w-4" />
                ) : (
                  <ArrowUpRight className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">{item.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(item.date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {item.status ? ` · ${item.status.replace("_", " ")}` : ""}
                  {item.kind === "expense" ? " · expense" : ""}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span
                className={`text-[13px] tabular-nums ${
                  isIn ? "font-semibold text-primary" : "text-muted-foreground"
                }`}
              >
                {isIn ? "+" : "−"}
                {inr(item.amount)}
              </span>
              {isManual && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEditEntry(item)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() =>
                        onDeleteEntry(parseInt(item.id.replace("entry-", "")))
                      }
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FundingSourceForm({
  source,
  onSubmit,
  onCancel,
  onToggleArchive,
}: {
  source?: FundingSource;
  onSubmit: (values: FundingSourceFormValues) => Promise<void>;
  onCancel: () => void;
  onToggleArchive?: () => Promise<void>;
}) {
  const form = useForm<FundingSourceFormValues>({
    resolver: zodResolver(fundingSourceFormSchema),
    defaultValues: source
      ? {
          name: source.name,
          kind: source.kind,
          total_value: source.total_value,
          notes: source.notes,
        }
      : { name: "", kind: "other", total_value: null, notes: null },
  });

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. Home Sale Proceeds" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(KIND_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="total_value"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expected total value (optional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="1500000"
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === "" ? null : e.target.valueAsNumber
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  className="min-h-[70px] resize-none"
                  placeholder="Optional notes..."
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter className="gap-2">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {source ? "Update" : "Add"}
          </Button>
          {onToggleArchive && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onToggleArchive}
            >
              {source?.archived ? "Unarchive" : "Archive"}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

export function FundingEntryForm({
  entry,
  onSubmit,
  onCancel,
}: {
  entry?: FundingLedgerItem;
  onSubmit: (values: FundingEntryFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const form = useForm<FundingEntryFormValues>({
    resolver: zodResolver(fundingEntryFormSchema),
    defaultValues: entry
      ? {
          direction: entry.direction,
          amount: entry.amount,
          title: entry.title,
          date: entry.date,
          status:
            entry.direction === "in"
              ? (entry.status as FundingEntryFormValues["status"]) ?? "received"
              : null,
          method: entry.method,
          notes: entry.notes,
        }
      : {
          direction: "in",
          amount: 0,
          title: "",
          date: new Date().toISOString().split("T")[0],
          status: "received",
          method: null,
          notes: null,
        },
  });

  const direction = form.watch("direction");
  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="direction"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Direction</FormLabel>
              <Select
                value={field.value}
                onValueChange={(v) => {
                  field.onChange(v);
                  form.setValue("status", v === "in" ? "received" : null);
                }}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="in">Receipt (money in)</SelectItem>
                  <SelectItem value="out">Payout (money out)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. First installment" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="50000"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {direction === "in" && (
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  value={field.value ?? "received"}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="in_transit">In transit</SelectItem>
                    <SelectItem value="expected">Expected</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Method</FormLabel>
              <Select
                value={field.value ?? "__none__"}
                onValueChange={(v) =>
                  field.onChange(v === "__none__" ? null : v)
                }
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  className="min-h-[60px] resize-none"
                  placeholder="Optional notes..."
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter className="gap-2">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {entry ? "Update entry" : "Add entry"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
