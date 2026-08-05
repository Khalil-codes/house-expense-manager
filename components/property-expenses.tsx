"use client";

import { ExpenseSection } from "@/components/expense-section";

export default function PropertyExpenses({
  autoOpenAdd,
  onAutoOpenHandled,
}: {
  autoOpenAdd?: boolean;
  onAutoOpenHandled?: () => void;
}) {
  return (
    <ExpenseSection
      type="property"
      title="Property"
      autoOpenAdd={autoOpenAdd}
      onAutoOpenHandled={onAutoOpenHandled}
    />
  );
}
