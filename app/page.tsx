"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  PieChart,
  BarChart,
  Home,
  Building,
  Landmark,
  Download,
  Sun,
  Moon,
  LogOut,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

import Dashboard from "@/components/dashboard";
import LoanTracker from "@/components/loan-tracker";
import ConstructionExpenses from "@/components/construction-expenses";
import PropertyExpenses from "@/components/property-expenses";
import MonthlyAnalytics from "@/components/monthly-analytics";
import { useExpenseService } from "@/hooks/use-expense-service";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const TABS = [
  { value: "dashboard", label: "Home", icon: PieChart },
  { value: "analytics", label: "Analytics", icon: BarChart },
  { value: "loan", label: "Loans", icon: Landmark },
  { value: "construction", label: "Build", icon: Building },
  { value: "property", label: "Property", icon: Home },
] as const;

export default function HouseExpenseTracker() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isLoaded, setIsLoaded] = useState(false);
  const { exportData } = useExpenseService();
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      });
    }
    setIsLoaded(true);
  }, []);

  const handleExport = async () => {
    const jsonData = await exportData();
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `house-expenses-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Data exported successfully");
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16 bg-background">
      {/* Top header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-2.5">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold tracking-tight">Expense Tracker</h1>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="px-3 py-4">
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "analytics" && <MonthlyAnalytics />}
        {activeTab === "loan" && <LoanTracker />}
        {activeTab === "construction" && <ConstructionExpenses />}
        {activeTab === "property" && <PropertyExpenses />}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t safe-area-bottom">
        <div className="flex items-center justify-around h-14">
          {TABS.map(({ value, label, icon: Icon }) => {
            const isActive = activeTab === value;
            return (
              <button
                key={value}
                onClick={() => setActiveTab(value)}
                className={`flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
