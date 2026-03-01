"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import {
  Edit,
  Trash,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Expense } from "@/lib/api/expense-service";
import { ExpenseFilters, type ViewMode } from "@/components/expense-filters";
import { ExpenseCard } from "@/components/expense-card";

interface ExpenseListProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => Promise<void>;
}

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ArrowUp className="ml-1 h-3 w-3 inline" />;
  if (sorted === "desc") return <ArrowDown className="ml-1 h-3 w-3 inline" />;
  return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30 inline" />;
}

function SortableHeader({
  label,
  column,
}: {
  label: string;
  column: {
    toggleSorting: () => void;
    getIsSorted: () => false | "asc" | "desc";
  };
}) {
  return (
    <button
      className="flex items-center text-xs font-medium hover:text-foreground transition-colors"
      onClick={() => column.toggleSorting()}
    >
      {label}
      <SortIcon sorted={column.getIsSorted()} />
    </button>
  );
}

export function ExpenseList({ expenses, onEdit, onDelete }: ExpenseListProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [loanOnly, setLoanOnly] = useState(false);

  const uniquePayees = useMemo(() => {
    const set = new Set(expenses.map((e) => e.paid_to).filter(Boolean));
    return Array.from(set).sort();
  }, [expenses]);

  const uniqueCategories = useMemo(() => {
    const set = new Set(expenses.map((e) => e.category).filter(Boolean));
    return Array.from(set).sort();
  }, [expenses]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleLoanOnlyChange = (value: boolean) => {
    setLoanOnly(value);
    table.getColumn("covered_by_loan")?.setFilterValue(value ? "yes" : "all");
  };

  const hasActiveFilters =
    globalFilter !== "" || columnFilters.length > 0 || loanOnly;

  const clearAllFilters = () => {
    setGlobalFilter("");
    setColumnFilters([]);
    setSorting([]);
    setLoanOnly(false);
  };

  const columns = useMemo<ColumnDef<Expense>[]>(
    () => [
      {
        accessorKey: "date",
        header: ({ column }) => (
          <SortableHeader label="Date" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm whitespace-nowrap">
            {new Date(row.original.date).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}
          </span>
        ),
        enableGlobalFilter: false,
      },
      {
        accessorKey: "description",
        header: ({ column }) => (
          <SortableHeader label="Description" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm font-medium">
            {row.original.description}
          </span>
        ),
      },
      {
        accessorKey: "category",
        header: ({ column }) => (
          <SortableHeader label="Category" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.category}
          </span>
        ),
        filterFn: "equals",
        meta: { className: "hidden md:table-cell" },
      },
      {
        accessorKey: "paid_to",
        header: "Payee",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.paid_to || "\u2014"}
          </span>
        ),
        filterFn: "equals",
        meta: { className: "hidden lg:table-cell" },
      },
      {
        accessorKey: "amount",
        header: ({ column }) => (
          <SortableHeader label="Amount" column={column} />
        ),
        cell: ({ row }) => (
          <span className="text-sm font-semibold tabular-nums whitespace-nowrap">
            {"\u20B9"}{row.original.amount.toLocaleString()}
          </span>
        ),
        enableGlobalFilter: false,
      },
      {
        accessorKey: "covered_by_loan",
        header: "Loan",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.covered_by_loan ? "Yes" : "No"}
          </span>
        ),
        filterFn: (row, _columnId, filterValue) => {
          if (filterValue === "all") return true;
          if (filterValue === "yes")
            return row.original.covered_by_loan === true;
          if (filterValue === "no")
            return row.original.covered_by_loan === false;
          return true;
        },
        enableGlobalFilter: false,
        meta: { className: "hidden lg:table-cell" },
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={deletingId !== null}
              onClick={() => onEdit(row.original)}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              disabled={deletingId !== null}
              onClick={() => handleDelete(row.original.id)}
            >
              {deletingId === row.original.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        ),
        size: 70,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deletingId]
  );

  const table = useReactTable({
    data: expenses,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableSortingRemoval: true,
  });

  const filteredRows = table.getFilteredRowModel().rows;
  const filteredTotal = filteredRows.reduce(
    (sum, row) => sum + row.original.amount,
    0
  );

  if (expenses.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        No expenses recorded
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <ExpenseFilters
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        categoryFilter={
          table.getColumn("category")?.getFilterValue() as string | undefined
        }
        onCategoryFilterChange={(v) =>
          table.getColumn("category")?.setFilterValue(v)
        }
        payeeFilter={
          table.getColumn("paid_to")?.getFilterValue() as string | undefined
        }
        onPayeeFilterChange={(v) =>
          table.getColumn("paid_to")?.setFilterValue(v)
        }
        loanOnly={loanOnly}
        onLoanOnlyChange={handleLoanOnlyChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        uniqueCategories={uniqueCategories}
        uniquePayees={uniquePayees}
        filteredCount={filteredRows.length}
        filteredTotal={filteredTotal}
        onClearAll={clearAllFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {viewMode === "table" ? (
        <TableView
          table={table}
          columns={columns}
        />
      ) : (
        <GridView
          rows={filteredRows.map((r) => r.original)}
          onEdit={onEdit}
          onDelete={handleDelete}
          deletingId={deletingId}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Table View                                                         */
/* ------------------------------------------------------------------ */

function TableView({
  table,
  columns,
}: {
  table: ReturnType<typeof useReactTable<Expense>>;
  columns: ColumnDef<Expense>[];
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const meta = header.column.columnDef.meta as
                  | { className?: string }
                  | undefined;
                return (
                  <TableHead
                    key={header.id}
                    className={meta?.className}
                    style={{
                      width:
                        header.getSize() !== 150
                          ? header.getSize()
                          : undefined,
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-center py-8 text-muted-foreground text-sm"
              >
                No matching expenses
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as
                    | { className?: string }
                    | undefined;
                  return (
                    <TableCell
                      key={cell.id}
                      className={`py-2.5 ${meta?.className ?? ""}`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Grid / Card View                                                   */
/* ------------------------------------------------------------------ */

function GridView({
  rows,
  onEdit,
  onDelete,
  deletingId,
}: {
  rows: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => Promise<void>;
  deletingId: string | null;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        No matching expenses
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((expense) => (
        <ExpenseCard
          key={expense.id}
          expense={expense}
          onEdit={onEdit}
          onDelete={(id) => onDelete(id)}
          isDeleting={deletingId === expense.id}
          disabled={deletingId !== null}
        />
      ))}
    </div>
  );
}
