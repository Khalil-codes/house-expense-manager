"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}

// Browsable free-form tags: pick from existing tags or type to create new ones.
export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Select or add tags",
}: TagInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const has = (name: string) =>
    value.some((v) => v.toLowerCase() === name.toLowerCase());

  const add = (raw: string) => {
    const name = raw.trim().replace(/\s+/g, " ");
    if (!name || has(name)) {
      setSearch("");
      return;
    }
    onChange([...value, name]);
    setSearch("");
  };

  const remove = (name: string) => {
    onChange(value.filter((v) => v !== name));
  };

  const query = search.trim();
  const matches = query
    ? suggestions.filter((s) => s.toLowerCase().includes(query.toLowerCase()))
    : suggestions;
  const hasExact = suggestions.some(
    (s) => s.toLowerCase() === query.toLowerCase()
  );

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge
              key={tag}
              className="gap-1 bg-primary/10 py-1 font-medium text-primary"
            >
              #{tag}
              <button
                type="button"
                onClick={() => remove(tag)}
                className="rounded-full outline-none transition-colors hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="truncate text-muted-foreground">
              {placeholder}
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
              placeholder="Search or type a tag..."
              value={search}
              onValueChange={setSearch}
              onKeyDown={(e) => {
                if (e.key === "Enter" && query && !hasExact) {
                  e.preventDefault();
                  add(query);
                }
              }}
            />
            <CommandList>
              {query && !hasExact && (
                <CommandGroup>
                  <CommandItem
                    value={`__new__${query}`}
                    onSelect={() => add(query)}
                    className="py-2.5 text-primary aria-selected:text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add &ldquo;{query}&rdquo;
                  </CommandItem>
                </CommandGroup>
              )}
              <CommandGroup>
                {matches.map((s) => (
                  <CommandItem
                    key={s}
                    value={s}
                    onSelect={() => (has(s) ? remove(s) : add(s))}
                    className="py-2.5"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        has(s) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {s}
                  </CommandItem>
                ))}
                {matches.length === 0 && !query && (
                  <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                    No tags yet. Start typing to add one.
                  </p>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
