"use client";

import { useState } from "react";
import { useExpenseService, type Category, type Payee, type Department } from "@/hooks/use-expense-service";
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
  Building2,
  Tag,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

export default function Settings() {
  const {
    departments,
    categories,
    payees,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    createCategory,
    updateCategory,
    deleteCategory,
    createPayee,
    updatePayee,
    deletePayee,
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
      <DepartmentSection
        departments={departments}
        onCreate={createDepartment}
        onUpdate={updateDepartment}
        onDelete={deleteDepartment}
      />
      <PayeeSection
        payees={payees}
        departments={departments}
        onCreate={createPayee}
        onUpdate={updatePayee}
        onDelete={deletePayee}
      />
      <CategorySection
        categories={categories}
        onCreate={createCategory}
        onUpdate={updateCategory}
        onDelete={deleteCategory}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Departments
   ═══════════════════════════════════════════════════════════════════════════ */

function DepartmentSection({
  departments,
  onCreate,
  onUpdate,
  onDelete,
}: {
  departments: Department[];
  onCreate: (data: { name: string }) => Promise<unknown>;
  onUpdate: (data: { id: number; name: string }) => Promise<unknown>;
  onDelete: (id: number) => Promise<unknown>;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<Department | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreate({ name: name.trim() });
      setName("");
      setAddOpen(false);
      toast.success("Department created");
    } catch {
      toast.error("Failed to create department");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editItem || !name.trim()) return;
    setSaving(true);
    try {
      await onUpdate({ id: editItem.id, name: name.trim() });
      setEditItem(null);
      setName("");
      toast.success("Department updated");
    } catch {
      toast.error("Failed to update department");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await onDelete(id);
      toast.success("Department deleted");
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error ?? "Failed to delete"
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
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Departments</CardTitle>
            <span className="text-xs text-muted-foreground">({departments.length})</span>
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
        {departments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No departments yet
          </p>
        )}
        {departments.map((dept) => (
          <div
            key={dept.id}
            className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
          >
            <span className="text-sm font-medium truncate">{dept.name}</span>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setEditItem(dept);
                  setName(dept.name);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                disabled={deletingId !== null}
                onClick={() => handleDelete(dept.id)}
              >
                {deletingId === dept.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Department</DialogTitle>
            <DialogDescription>Add a department to organise payees and expenses.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Department name"
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

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Department name"
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
   Payees
   ═══════════════════════════════════════════════════════════════════════════ */

function PayeeSection({
  payees,
  departments,
  onCreate,
  onUpdate,
  onDelete,
}: {
  payees: Payee[];
  departments: Department[];
  onCreate: (data: { name: string; phone: string | null; department_id: number | null }) => Promise<unknown>;
  onUpdate: (data: { id: number; name: string; phone: string | null; department_id: number | null }) => Promise<unknown>;
  onDelete: (id: number) => Promise<unknown>;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<Payee | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", department_id: null as number | null });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const resetForm = () => setForm({ name: "", phone: "", department_id: null });

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onCreate({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        department_id: form.department_id,
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
        department_id: form.department_id,
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
      <Select
        value={form.department_id?.toString() ?? "__none__"}
        onValueChange={(v) =>
          setForm((f) => ({
            ...f,
            department_id: v === "__none__" ? null : parseInt(v),
          }))
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Department (optional)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">No department</SelectItem>
          {departments.map((d) => (
            <SelectItem key={d.id} value={d.id.toString()}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
                {[payee.phone, payee.department].filter(Boolean).join(" \u00B7 ") || "No details"}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setEditItem(payee);
                  setForm({
                    name: payee.name,
                    phone: payee.phone ?? "",
                    department_id: payee.department_id,
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
   Categories
   ═══════════════════════════════════════════════════════════════════════════ */

function CategorySection({
  categories,
  onCreate,
  onUpdate,
  onDelete,
}: {
  categories: Category[];
  onCreate: (data: { name: string; type: "construction" | "property" | "both" }) => Promise<unknown>;
  onUpdate: (data: { id: number; name: string; type: "construction" | "property" | "both" }) => Promise<unknown>;
  onDelete: (id: number) => Promise<unknown>;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", type: "both" as "construction" | "property" | "both" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const resetForm = () => setForm({ name: "", type: "both" });

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onCreate({ name: form.name.trim(), type: form.type });
      resetForm();
      setAddOpen(false);
      toast.success("Category created");
    } catch {
      toast.error("Failed to create category");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editItem || !form.name.trim()) return;
    setSaving(true);
    try {
      await onUpdate({ id: editItem.id, name: form.name.trim(), type: form.type });
      setEditItem(null);
      resetForm();
      toast.success("Category updated");
    } catch {
      toast.error("Failed to update category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await onDelete(id);
      toast.success("Category deleted");
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error ?? "Failed to delete"
        : "Failed to delete";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const typeLabel = (t: string) =>
    t === "both" ? "Both" : t === "construction" ? "Construction" : "Property";

  const categoryFormFields = (
    <div className="space-y-3">
      <Input
        placeholder="Category name"
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
      />
      <Select
        value={form.type}
        onValueChange={(v) =>
          setForm((f) => ({
            ...f,
            type: v as "construction" | "property" | "both",
          }))
        }
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="both">Both</SelectItem>
          <SelectItem value="construction">Construction</SelectItem>
          <SelectItem value="property">Property</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Categories</CardTitle>
            <span className="text-xs text-muted-foreground">({categories.length})</span>
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
        {categories.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No categories yet
          </p>
        )}
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{cat.name}</p>
              <p className="text-xs text-muted-foreground">{typeLabel(cat.type)}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setEditItem(cat);
                  setForm({ name: cat.name, type: cat.type });
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                disabled={deletingId !== null}
                onClick={() => handleDelete(cat.id)}
              >
                {deletingId === cat.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Category</DialogTitle>
            <DialogDescription>Add a category for expenses.</DialogDescription>
          </DialogHeader>
          {categoryFormFields}
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
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          {categoryFormFields}
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
