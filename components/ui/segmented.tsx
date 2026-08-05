"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  className?: string;
  size?: "sm" | "default";
  "aria-label"?: string;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "default",
  ...props
}: SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={props["aria-label"]}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full bg-muted p-0.5",
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex-1 rounded-full px-3 font-medium text-muted-foreground transition-[color,background-color,transform] duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              size === "sm" ? "h-7 text-[12px]" : "h-8 text-[13px]",
              active &&
                "bg-background text-foreground shadow-sm dark:bg-secondary"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
