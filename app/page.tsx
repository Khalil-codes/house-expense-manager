"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  PieChart,
  BarChart,
  Home,
  Building,
  Landmark,
  Download,
  Upload,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

import Dashboard from "@/components/dashboard";
import LoanTracker from "@/components/loan-tracker";
import ConstructionExpenses from "@/components/construction-expenses";
import PropertyExpenses from "@/components/property-expenses";
import MonthlyAnalytics from "@/components/monthly-analytics";
import { useExpenseData } from "@/hooks/use-expense-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export default function HouseExpenseTracker() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isLoaded, setIsLoaded] = useState(false);
  const { exportData, importData } = useExpenseData();

  useEffect(() => {
    // Initialize localStorage if needed
    if (!localStorage.getItem("houseExpenseData")) {
      localStorage.setItem(
        "houseExpenseData",
        JSON.stringify({
          construction: [],
          property: [],
          loan: {
            amount: 0,
            interest: 0,
            tenure: 0,
            payments: [],
          },
        })
      );
    }

    // Register service worker for PWA
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").then(
          (registration) => {
            console.log(
              "ServiceWorker registration successful with scope: ",
              registration.scope
            );
          },
          (err) => {
            console.log("ServiceWorker registration failed: ", err);
          }
        );
      });
    }

    setIsLoaded(true);
  }, []);

  const handleExport = () => {
    const jsonData = exportData();
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `house-expenses-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Data exported successfully", {
      description: "Your expense data has been exported to a JSON file.",
    });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = e.target?.result as string;
        importData(jsonData);
        toast.success("Data imported successfully", {
          description:
            "Your expense data has been imported from the JSON file.",
        });
      } catch (error) {
        toast.error("Import failed", {
          description:
            "There was an error importing your data. Please check the file format.",
        });
      }
    };
    reader.readAsText(file);

    // Reset the input
    event.target.value = "";
  };

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-full max-w-md mx-auto p-4">
          <h2 className="text-xl font-semibold mb-4 text-center">
            Loading House Expense Tracker
          </h2>
          <Progress value={40} className="h-2 mb-2" />
          <p className="text-sm text-center text-muted-foreground">
            Initializing application...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              House Expense Tracker
            </h1>
            <p className="text-muted-foreground">
              Track and manage all expenses related to your house project
            </p>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Options
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Data
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    document.getElementById("import-file")?.click()
                  }
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import Data
                </DropdownMenuItem>
                <input
                  id="import-file"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImport}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Tabs
          defaultValue="dashboard"
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="grid grid-cols-5 md:w-[600px]">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="loan" className="flex items-center gap-2">
              <Landmark className="h-4 w-4" />
              <span className="hidden sm:inline">Loan</span>
            </TabsTrigger>
            <TabsTrigger
              value="construction"
              className="flex items-center gap-2"
            >
              <Building className="h-4 w-4" />
              <span className="hidden sm:inline">Construction</span>
            </TabsTrigger>
            <TabsTrigger value="property" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Property</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <Dashboard />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <MonthlyAnalytics />
          </TabsContent>

          <TabsContent value="loan" className="space-y-4">
            <LoanTracker />
          </TabsContent>

          <TabsContent value="construction" className="space-y-4">
            <ConstructionExpenses />
          </TabsContent>

          <TabsContent value="property" className="space-y-4">
            <PropertyExpenses />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
