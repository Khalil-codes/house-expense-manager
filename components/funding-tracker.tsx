"use client";

import { useState } from "react";
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

const KIND_LABELS: Record<string, string> = {
  sale_proceeds: "Sale proceeds",
  loan: "Loan",
  cash: "Cash",
  other: "Other",
};

function inr(n: number) {
  return `\u20B9${n.toLocaleString()}`;
}

export default function FundingTracker() {
  const {
    fundingSources,
    isLoading,
    createFundingSource,
    updateFundingSource,
    deleteFundingSource,
    addFundingEntry,
    deleteFundingEntry,
  } = useExpenseService();

  const [addOpen, setAddOpen] = useState(false);
  const [editSource, setEditSource] = useState<FundingSource | null>(null);

  const totalReceived = fundingSources.reduce((s, f) => s + f.received, 0);
  const totalBalance = fundingSources.reduce((s, f) => s + f.balance, 0);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Loading funding sources...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Funding Sources</CardTitle>
              <CardDescription className="text-xs">
                Received {inr(totalReceived)} · Balance {inr(totalBalance)}
              </CardDescription>
            </div>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-1 h-4 w-4" />
                  Add Source
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md">
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
              onEdit={() => setEditSource(source)}
              onDelete={() => deleteFundingSource(source.id)}
              onAddEntry={(v) =>
                addFundingEntry({ sourceId: source.id, ...v })
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
        <DialogContent className="max-w-[95vw] sm:max-w-md">
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

function Stat({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold tabular-nums" : "tabular-nums"}>
        {value}
      </span>
    </div>
  );
}

function FundingSourceCard({
  source,
  onEdit,
  onDelete,
  onAddEntry,
  onDeleteEntry,
}: {
  source: FundingSource;
  onEdit: () => void;
  onDelete: () => void;
  onAddEntry: (v: FundingEntryFormValues) => Promise<void>;
  onDeleteEntry: (entryId: number) => Promise<void>;
}) {
  const [showLedger, setShowLedger] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <Card className={source.archived ? "opacity-60" : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              {source.name}
              <Badge variant="outline" className="text-[10px] font-normal">
                {KIND_LABELS[source.kind] ?? source.kind}
              </Badge>
              {source.archived && (
                <Badge variant="secondary" className="text-[10px]">
                  Archived
                </Badge>
              )}
            </CardTitle>
            {source.notes && (
              <CardDescription className="text-xs mt-1">
                {source.notes}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-0.5">
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
              className="h-7 w-7 text-destructive hover:text-destructive"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  await onDelete();
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {source.total_value != null && (
          <Stat label="Total value" value={inr(source.total_value)} />
        )}
        <Stat label="Received" value={inr(source.received)} />
        {source.in_transit > 0 && (
          <Stat label="In transit" value={inr(source.in_transit)} />
        )}
        {source.remaining != null && (
          <Stat label="Yet to receive" value={inr(source.remaining)} />
        )}
        <Stat label="Spent from source" value={inr(source.outflows)} />
        <Stat label="Balance" value={inr(source.balance)} strong />

        <div className="flex items-center gap-2 pt-2">
          <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 text-xs">
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md">
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
            className="h-8 text-xs"
            onClick={() => setShowLedger((s) => !s)}
          >
            {showLedger ? (
              <ChevronDown className="mr-1 h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="mr-1 h-3.5 w-3.5" />
            )}
            Ledger ({source.ledger.length})
          </Button>
        </div>

        {showLedger && (
          <LedgerList items={source.ledger} onDeleteEntry={onDeleteEntry} />
        )}
      </CardContent>
    </Card>
  );
}

function LedgerList({
  items,
  onDeleteEntry,
}: {
  items: FundingLedgerItem[];
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
    <div className="mt-2 divide-y rounded-md border">
      {items.map((item) => {
        const isIn = item.direction === "in";
        const isManual = item.id.startsWith("entry-");
        return (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2 px-3 py-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              {isIn ? (
                <ArrowDownLeft className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{item.title}</p>
                <p className="text-[10px] text-muted-foreground">
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
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`text-xs tabular-nums ${
                  isIn ? "text-emerald-600" : "text-muted-foreground"
                }`}
              >
                {isIn ? "+" : "-"}
                {inr(item.amount)}
              </span>
              {isManual && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() =>
                    onDeleteEntry(parseInt(item.id.replace("entry-", "")))
                  }
                >
                  <Trash className="h-3 w-3" />
                </Button>
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

function FundingEntryForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (values: FundingEntryFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const form = useForm<FundingEntryFormValues>({
    resolver: zodResolver(fundingEntryFormSchema),
    defaultValues: {
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
            Add entry
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
