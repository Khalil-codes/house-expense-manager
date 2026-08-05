"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  PieChart,
  Home,
  Building,
  Landmark,
  HandCoins,
  Wallet,
  Download,
  Sun,
  Moon,
  LogOut,
  MoreVertical,
  Settings as SettingsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

import Dashboard from "@/components/dashboard";
import LoanTracker from "@/components/loan-tracker";
import ConstructionExpenses from "@/components/construction-expenses";
import PropertyExpenses from "@/components/property-expenses";
import LedgerTracker from "@/components/ledger-tracker";
import FundingTracker from "@/components/funding-tracker";
import Settings from "@/components/settings";
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
  { value: "loan", label: "Loans", icon: Landmark },
  { value: "construction", label: "Build", icon: Building },
  { value: "property", label: "Property", icon: Home },
  { value: "funding", label: "Funding", icon: Wallet },
] as const;

const TITLES: Record<string, string> = {
  dashboard: "Overview",
  loan: "Loans",
  construction: "Construction",
  property: "Property",
  funding: "Funding",
  ledger: "Ledger",
  settings: "Settings",
};

export default function HouseExpenseTracker() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
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

  const handleQuickAction = (tab: string, action?: string) => {
    setActiveTab(tab);
    setPendingAction(action ?? null);
  };

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
    <div className="min-h-screen pb-24 bg-background">
      {/* Top header */}
      <header className="glass-chrome sticky top-0 z-40 border-b border-border/50 bg-background/70 px-4 py-3 backdrop-blur-xl backdrop-saturate-150">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">
            {TITLES[activeTab] ?? "Overview"}
          </h1>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setActiveTab("ledger")}>
                  <HandCoins className="h-4 w-4 mr-2" />
                  Ledger
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("settings")}>
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
      <main className="px-4 py-5">
        {activeTab === "dashboard" && (
          <Dashboard onQuickAction={handleQuickAction} />
        )}
        {activeTab === "loan" && <LoanTracker />}
        {activeTab === "construction" && (
          <ConstructionExpenses
            autoOpenAdd={pendingAction === "add"}
            onAutoOpenHandled={() => setPendingAction(null)}
          />
        )}
        {activeTab === "property" && (
          <PropertyExpenses
            autoOpenAdd={pendingAction === "add"}
            onAutoOpenHandled={() => setPendingAction(null)}
          />
        )}
        {activeTab === "funding" && (
          <FundingTracker
            autoOpenAddSource={pendingAction === "add-source"}
            onAutoOpenHandled={() => setPendingAction(null)}
          />
        )}
        {activeTab === "ledger" && <LedgerTracker />}
        {activeTab === "settings" && <Settings />}
      </main>

      {/* Bottom navigation */}
      <nav className="glass-chrome fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/80 backdrop-blur-xl backdrop-saturate-150 safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {TABS.map(({ value, label, icon: Icon }) => {
            const isActive = activeTab === value;
            return (
              <button
                key={value}
                onClick={() => setActiveTab(value)}
                className={`flex h-full w-full flex-col items-center justify-center gap-1 transition-[color,transform] duration-150 active:scale-[0.92] ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className={`h-[22px] w-[22px] ${isActive ? "stroke-[2.4]" : ""}`} />
                <span className="text-[11px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
