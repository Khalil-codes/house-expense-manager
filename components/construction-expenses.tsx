"use client";

import { ExpenseSection } from "@/components/expense-section";

export default function ConstructionExpenses({
  autoOpenAdd,
  onAutoOpenHandled,
}: {
  autoOpenAdd?: boolean;
  onAutoOpenHandled?: () => void;
}) {
  return (
    <ExpenseSection
      type="construction"
      title="Construction"
      autoOpenAdd={autoOpenAdd}
      onAutoOpenHandled={onAutoOpenHandled}
    />
  );
}
