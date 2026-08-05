"use client";

import { useState } from "react";
import {
  useExpenseService,
  type Payee,
  type Area,
  type Tag as TagType,
} from "@/hooks/use-expense-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Pencil, Trash2, Loader2, Merge, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

function SectionHeader({
  title,
  count,
  onAdd,
}: {
  title: string;
  count: number;
  onAdd?: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-1">
      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title} · {count}
      </h3>
      {onAdd && (
        <Button
          variant="ghost"
          size="sm"
          className="-mr-2 h-8 rounded-full text-primary hover:text-primary"
          onClick={onAdd}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      )}
    </div>
  );
}

export default function Settings() {
  const {
    payees,
    areas,
    tags,
    createPayee,
    updatePayee,
    deletePayee,
    mergePayees,
    createArea,
    updateArea,
    deleteArea,
    createTag,
    deleteTag,
    isLoading,
  } = useExpenseService();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="mb-4 h-7 w-7 animate-spin" />
        <p className="text-sm">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <PayeeSection
        payees={payees}
        onCreate={createPayee}
        onUpdate={updatePayee}
        onDelete={deletePayee}
        onMerge={mergePayees}
      />
      <AreaSection
        areas={areas}
        onCreate={createArea}
        onUpdate={updateArea}
        onDelete={deleteArea}
      />
      <TagSection tags={tags} onCreate={createTag} onDelete={deleteTag} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Payees
   ═══════════════════════════════════════════════════════════════════════════ */

function PayeeSection({
  payees,
  onCreate,
  onUpdate,
  onDelete,
  onMerge,
}: {
  payees: Payee[];
  onCreate: (data: { name: string; phone: string | null }) => Promise<unknown>;
  onUpdate: (data: { id: number; name: string; phone: string | null }) => Promise<unknown>;
  onDelete: (id: number) => Promise<unknown>;
  onMerge: (data: { from_id: number; into_id: number }) => Promise<unknown>;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<Payee | null>(null);
  const [mergeItem, setMergeItem] = useState<Payee | null>(null);
  const [mergeTarget, setMergeTarget] = useState<number | null>(null);
  const [merging, setMerging] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleMerge = async () => {
    if (!mergeItem || mergeTarget === null) return;
    setMerging(true);
    try {
      await onMerge({ from_id: mergeItem.id, into_id: mergeTarget });
      setMergeItem(null);
      setMergeTarget(null);
      toast.success("Payees merged");
    } catch {
      toast.error("Failed to merge payees");
    } finally {
      setMerging(false);
    }
  };

  const resetForm = () => setForm({ name: "", phone: "" });

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onCreate({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
      });
      resetForm();
      setAddOpen(false);
      toast.success("Payee created");
    } catch {
      toast.error("Failed to create payee");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editItem || !form.name.trim()) return;
    setSaving(true);
    try {
      await onUpdate({
        id: editItem.id,
        name: form.name.trim(),
        phone: form.phone.trim() || null,
      });
      setEditItem(null);
      resetForm();
      toast.success("Payee updated");
    } catch {
      toast.error("Failed to update payee");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await onDelete(id);
      toast.success("Payee deleted");
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error ?? "Failed to delete"
        : "Failed to delete";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const payeeFormFields = (
    <div className="space-y-3">
      <Input
        placeholder="Payee name"
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
      />
      <Input
        placeholder="Phone (optional)"
        value={form.phone}
        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
      />
    </div>
  );

  return (
    <section className="space-y-2">
      <SectionHeader
        title="Payees"
        count={payees.length}
        onAdd={() => {
          resetForm();
          setAddOpen(true);
        }}
      />
      <Card className="overflow-hidden">
        {payees.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No payees yet
          </p>
        ) : (
          <div className="divide-y divide-border/60">
            {payees.map((payee) => (
              <div
                key={payee.id}
                className="flex min-h-[52px] items-center justify-between gap-2 px-4 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{payee.name}</p>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {payee.phone || "No phone"}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="-mr-1.5 h-9 w-9 shrink-0 rounded-full"
                      disabled={deletingId === payee.id}
                    >
                      {deletingId === payee.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreHorizontal className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditItem(payee);
                        setForm({ name: payee.name, phone: payee.phone ?? "" });
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setMergeItem(payee);
                        setMergeTarget(null);
                      }}
                    >
                      <Merge className="mr-2 h-4 w-4" />
                      Merge
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDelete(payee.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Merge dialog */}
      <Dialog open={!!mergeItem} onOpenChange={(o) => !o && setMergeItem(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Merge payee</DialogTitle>
            <DialogDescription>
              Move all expenses from{" "}
              <span className="font-medium">{mergeItem?.name}</span> into another
              payee, then delete the duplicate.
            </DialogDescription>
          </DialogHeader>
          <Select
            value={mergeTarget?.toString() ?? ""}
            onValueChange={(v) => setMergeTarget(parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Merge into…" />
            </SelectTrigger>
            <SelectContent>
              {payees
                .filter((p) => p.id !== mergeItem?.id)
                .map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              onClick={handleMerge}
              disabled={merging || mergeTarget === null}
              className="w-full"
            >
              {merging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New payee</DialogTitle>
            <DialogDescription>Add someone you make payments to.</DialogDescription>
          </DialogHeader>
          {payeeFormFields}
          <DialogFooter>
            <Button onClick={handleAdd} disabled={saving || !form.name.trim()} className="w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit payee</DialogTitle>
          </DialogHeader>
          {payeeFormFields}
          <DialogFooter>
            <Button onClick={handleEdit} disabled={saving || !form.name.trim()} className="w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Areas
   ═══════════════════════════════════════════════════════════════════════════ */

function AreaSection({
  areas,
  onCreate,
  onUpdate,
  onDelete,
}: {
  areas: Area[];
  onCreate: (data: { name: string; sort_order: number }) => Promise<unknown>;
  onUpdate: (data: { id: number; name: string; sort_order: number }) => Promise<unknown>;
  onDelete: (id: number) => Promise<unknown>;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<Area | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreate({ name: name.trim(), sort_order: areas.length });
      setName("");
      setAddOpen(false);
      toast.success("Area created");
    } catch {
      toast.error("Failed to create area");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editItem || !name.trim()) return;
    setSaving(true);
    try {
      await onUpdate({
        id: editItem.id,
        name: name.trim(),
        sort_order: editItem.sort_order ?? 0,
      });
      setEditItem(null);
      setName("");
      toast.success("Area updated");
    } catch {
      toast.error("Failed to update area");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await onDelete(id);
      toast.success("Area deleted");
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error ?? "Failed to delete"
        : err instanceof Error
        ? err.message
        : "Failed to delete";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="space-y-2">
      <SectionHeader
        title="Areas"
        count={areas.length}
        onAdd={() => {
          setName("");
          setAddOpen(true);
        }}
      />
      <Card className="overflow-hidden">
        {areas.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No areas yet
          </p>
        ) : (
          <div className="divide-y divide-border/60">
            {areas.map((area) => (
              <div
                key={area.id}
                className="flex min-h-[52px] items-center justify-between gap-2 px-4 py-2"
              >
                <span className="truncate text-sm font-medium">{area.name}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="-mr-1.5 h-9 w-9 shrink-0 rounded-full"
                      disabled={deletingId === area.id}
                    >
                      {deletingId === area.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreHorizontal className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditItem(area);
                        setName(area.name);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDelete(area.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New area</DialogTitle>
            <DialogDescription>
              Classify expenses by area of the house.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Area name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <DialogFooter>
            <Button onClick={handleAdd} disabled={saving || !name.trim()} className="w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit area</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Area name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleEdit()}
          />
          <DialogFooter>
            <Button onClick={handleEdit} disabled={saving || !name.trim()} className="w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Tags
   ═══════════════════════════════════════════════════════════════════════════ */

function TagSection({
  tags,
  onCreate,
  onDelete,
}: {
  tags: TagType[];
  onCreate: (name: string) => Promise<unknown>;
  onDelete: (id: number) => Promise<unknown>;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreate(name.trim());
      setName("");
      toast.success("Tag created");
    } catch {
      toast.error("Failed to create tag");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await onDelete(id);
      toast.success("Tag deleted");
    } catch {
      toast.error("Failed to delete tag");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="space-y-2">
      <SectionHeader title="Tags" count={tags.length} />
      <Card className="p-4">
        <div className="flex gap-2">
          <Input
            placeholder="New tag"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button
            onClick={handleAdd}
            disabled={saving || !name.trim()}
            size="icon"
            className="shrink-0"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
        {tags.length === 0 ? (
          <p className="pt-4 text-center text-sm text-muted-foreground">
            No tags yet
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5 pt-3">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[12px] font-medium text-primary"
              >
                #{tag.name}
                <button
                  type="button"
                  disabled={deletingId !== null}
                  onClick={() => handleDelete(tag.id)}
                  className="transition-colors hover:text-destructive"
                >
                  {deletingId === tag.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </button>
              </span>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
