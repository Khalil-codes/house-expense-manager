"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { Payee } from "@/lib/api/expense-service";

interface PayeeComboboxProps {
  value: string | null;
  onChange: (value: string | null) => void;
  payees: Payee[];
  placeholder?: string;
}

// Free-form payee picker: type any name, pick an existing one, or keep the
// typed value. Consolidation into a canonical payee happens server-side on save.
export function PayeeCombobox({
  value,
  onChange,
  payees,
  placeholder = "Select or type a payee",
}: PayeeComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const query = search.trim();
  const matches = query
    ? payees.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase())
      )
    : payees;

  const hasExact = payees.some(
    (p) => p.name.toLowerCase() === query.toLowerCase()
  );

  const select = (name: string | null) => {
    onChange(name);
    setSearch("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or type a name..."
            value={search}
            onValueChange={setSearch}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query && !hasExact) {
                e.preventDefault();
                select(query);
              }
            }}
          />
          <CommandList>
            {query && !hasExact && (
              <CommandGroup>
                <CommandItem
                  value={`__new__${query}`}
                  onSelect={() => select(query)}
                  className="py-2.5 text-primary aria-selected:text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Use &ldquo;{query}&rdquo;
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {value && (
                <CommandItem
                  value="__none__"
                  onSelect={() => select(null)}
                  className="py-2.5"
                >
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  <span className="text-muted-foreground">Clear</span>
                </CommandItem>
              )}
              {matches.map((payee) => (
                <CommandItem
                  key={payee.id}
                  value={payee.name}
                  onSelect={() => select(payee.name)}
                  className="py-2.5"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.toLowerCase() === payee.name.toLowerCase()
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {payee.name}
                </CommandItem>
              ))}
              {matches.length === 0 && !query && (
                <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                  No payees yet. Start typing to add one.
                </p>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
