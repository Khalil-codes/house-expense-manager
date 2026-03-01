"use client";

import { Search, X, LayoutList, LayoutGrid } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ViewMode = "table" | "grid";

interface ExpenseFiltersProps {
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  categoryFilter: string | undefined;
  onCategoryFilterChange: (value: string | undefined) => void;
  payeeFilter: string | undefined;
  onPayeeFilterChange: (value: string | undefined) => void;
  loanOnly: boolean;
  onLoanOnlyChange: (value: boolean) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  uniqueCategories: string[];
  uniquePayees: string[];
  filteredCount: number;
  filteredTotal: number;
  onClearAll: () => void;
  hasActiveFilters: boolean;
}

export function ExpenseFilters({
  globalFilter,
  onGlobalFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  payeeFilter,
  onPayeeFilterChange,
  loanOnly,
  onLoanOnlyChange,
  viewMode,
  onViewModeChange,
  uniqueCategories,
  uniquePayees,
  filteredCount,
  filteredTotal,
  onClearAll,
  hasActiveFilters,
}: ExpenseFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search expenses..."
          value={globalFilter}
          onChange={(e) => onGlobalFilterChange(e.target.value)}
          className="pl-9 h-10 text-sm"
        />
      </div>

      <div className="flex gap-2.5 flex-wrap items-center">
        <Select
          value={categoryFilter ?? "__all__"}
          onValueChange={(v) =>
            onCategoryFilterChange(v === "__all__" ? undefined : v)
          }
        >
          <SelectTrigger className="h-9 text-xs min-w-[120px] w-auto">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Categories</SelectItem>
            {uniqueCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={payeeFilter ?? "__all__"}
          onValueChange={(v) =>
            onPayeeFilterChange(v === "__all__" ? undefined : v)
          }
        >
          <SelectTrigger className="h-9 text-xs min-w-[110px] w-auto">
            <SelectValue placeholder="Paid To" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Payees</SelectItem>
            {uniquePayees.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-1">
          <Switch
            id="loan-filter"
            checked={loanOnly}
            onCheckedChange={onLoanOnlyChange}
          />
          <Label htmlFor="loan-filter" className="text-xs cursor-pointer whitespace-nowrap">
            Loan only
          </Label>
        </div>

        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={onClearAll}
          >
            <X className="mr-1.5 h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <FilterSummary count={filteredCount} total={filteredTotal} />

        <div className="flex items-center border rounded-lg overflow-hidden">
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8 rounded-none"
            onClick={() => onViewModeChange("table")}
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8 rounded-none"
            onClick={() => onViewModeChange("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function FilterSummary({ count, total }: { count: number; total: number }) {
  const label = count === 1 ? "expense" : "expenses";
  return (
    <span className="text-sm text-muted-foreground tabular-nums">
      <span className="font-medium text-foreground">{count}</span> {label}
      {" \u00B7 "}
      <span className="font-medium text-foreground">{"\u20B9"}{total.toLocaleString()}</span>
    </span>
  );
}
