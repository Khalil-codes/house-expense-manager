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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Tags,
  Users,
  MapPin,
  Merge,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

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
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Payees</CardTitle>
            <span className="text-xs text-muted-foreground">({payees.length})</span>
          </div>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setAddOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {payees.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No payees yet
          </p>
        )}
        {payees.map((payee) => (
          <div
            key={payee.id}
            className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{payee.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {payee.phone || "No phone"}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setMergeItem(payee);
                  setMergeTarget(null);
                }}
              >
                <Merge className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setEditItem(payee);
                  setForm({
                    name: payee.name,
                    phone: payee.phone ?? "",
                  });
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                disabled={deletingId !== null}
                onClick={() => handleDelete(payee.id)}
              >
                {deletingId === payee.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      {/* Merge dialog */}
      <Dialog open={!!mergeItem} onOpenChange={(o) => !o && setMergeItem(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Merge Payee</DialogTitle>
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
              <SelectValue placeholder="Merge into..." />
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
            <DialogTitle>New Payee</DialogTitle>
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
            <DialogTitle>Edit Payee</DialogTitle>
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
    </Card>
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Areas</CardTitle>
            <span className="text-xs text-muted-foreground">({areas.length})</span>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setName("");
              setAddOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {areas.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No areas yet
          </p>
        )}
        {areas.map((area) => (
          <div
            key={area.id}
            className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
          >
            <span className="text-sm font-medium truncate">{area.name}</span>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setEditItem(area);
                  setName(area.name);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                disabled={deletingId !== null}
                onClick={() => handleDelete(area.id)}
              >
                {deletingId === area.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Area</DialogTitle>
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
            <DialogTitle>Edit Area</DialogTitle>
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
    </Card>
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Tags className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Tags</CardTitle>
          <span className="text-xs text-muted-foreground">({tags.length})</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="New tag"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd} disabled={saving || !name.trim()}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
        {tags.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            No tags yet
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs"
              >
                {tag.name}
                <button
                  type="button"
                  disabled={deletingId !== null}
                  onClick={() => handleDelete(tag.id)}
                  className="text-muted-foreground hover:text-destructive"
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
      </CardContent>
    </Card>
  );
}
