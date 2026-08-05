"use client";

import { Search, X, LayoutList, LayoutGrid } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
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
  payeeFilter: string | undefined;
  onPayeeFilterChange: (value: string | undefined) => void;
  areaFilter: string | undefined;
  onAreaFilterChange: (value: string | undefined) => void;
  fundingFilter: string | undefined;
  onFundingFilterChange: (value: string | undefined) => void;
  loanOnly: boolean;
  onLoanOnlyChange: (value: boolean) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  uniquePayees: string[];
  uniqueAreas: string[];
  uniqueFundingSources: string[];
  filteredCount: number;
  filteredTotal: number;
  onClearAll: () => void;
  hasActiveFilters: boolean;
}

export function ExpenseFilters({
  globalFilter,
  onGlobalFilterChange,
  payeeFilter,
  onPayeeFilterChange,
  areaFilter,
  onAreaFilterChange,
  fundingFilter,
  onFundingFilterChange,
  loanOnly,
  onLoanOnlyChange,
  viewMode,
  onViewModeChange,
  uniquePayees,
  uniqueAreas,
  uniqueFundingSources,
  filteredCount,
  filteredTotal,
  onClearAll,
  hasActiveFilters,
}: ExpenseFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search expenses…"
          value={globalFilter}
          onChange={(e) => onGlobalFilterChange(e.target.value)}
          className="h-11 rounded-full border-transparent bg-muted pl-10 focus-visible:bg-background"
        />
        {globalFilter && (
          <button
            type="button"
            onClick={() => onGlobalFilterChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          aria-label="Loan filter"
          value={loanOnly ? "loan" : "all"}
          onChange={(v) => onLoanOnlyChange(v === "loan")}
          options={[
            { value: "all", label: "All" },
            { value: "loan", label: "Loan" },
          ]}
        />

        {uniqueAreas.length > 0 && (
          <Select
            value={areaFilter ?? "__all__"}
            onValueChange={(v) =>
              onAreaFilterChange(v === "__all__" ? undefined : v)
            }
          >
            <SelectTrigger className="h-9 w-auto min-w-[104px] rounded-full text-[13px]">
              <SelectValue placeholder="Area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All areas</SelectItem>
              {uniqueAreas.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={payeeFilter ?? "__all__"}
          onValueChange={(v) =>
            onPayeeFilterChange(v === "__all__" ? undefined : v)
          }
        >
          <SelectTrigger className="h-9 w-auto min-w-[104px] rounded-full text-[13px]">
            <SelectValue placeholder="Payee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All payees</SelectItem>
            {uniquePayees.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {uniqueFundingSources.length > 0 && (
          <Select
            value={fundingFilter ?? "__all__"}
            onValueChange={(v) =>
              onFundingFilterChange(v === "__all__" ? undefined : v)
            }
          >
            <SelectTrigger className="h-9 w-auto min-w-[112px] rounded-full text-[13px]">
              <SelectValue placeholder="Funding" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All funding</SelectItem>
              {uniqueFundingSources.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 rounded-full text-[13px] text-muted-foreground"
            onClick={onClearAll}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between pt-0.5">
        <FilterSummary count={filteredCount} total={filteredTotal} />

        <div className="hidden md:block">
          <Segmented
            aria-label="View mode"
            size="sm"
            value={viewMode}
            onChange={onViewModeChange}
            options={[
              {
                value: "grid",
                label: <LayoutGrid className="h-4 w-4" />,
              },
              {
                value: "table",
                label: <LayoutList className="h-4 w-4" />,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function FilterSummary({ count, total }: { count: number; total: number }) {
  const label = count === 1 ? "expense" : "expenses";
  return (
    <span className="text-[13px] text-muted-foreground tabular-nums">
      <span className="font-medium text-foreground">{count}</span> {label}
      {" · "}
      <span className="font-medium text-foreground">
        {"\u20B9"}
        {total.toLocaleString("en-IN")}
      </span>
    </span>
  );
}
