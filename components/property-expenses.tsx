"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useExpenseData } from "@/hooks/use-expense-data"
import { Trash, Plus, Edit, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"

// Property expense categories
const PROPERTY_CATEGORIES = [
  "Land Purchase",
  "Property Tax",
  "Legal Fees",
  "Survey",
  "Permits",
  "Utilities Connection",
  "Insurance",
  "HOA Fees",
  "Realtor Fees",
  "Closing Costs",
  "Other",
]

export default function PropertyExpenses() {
  const { data, isLoading, addExpense, removeExpense, editExpense } = useExpenseData()
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("Other")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [paidTo, setPaidTo] = useState("")
  const [coveredByLoan, setCoveredByLoan] = useState(false)
  const [filterCategory, setFilterCategory] = useState("All")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false)
  const [editId, setEditId] = useState("")

  const propertyTotal = data.property.reduce((total, expense) => total + expense.amount, 0)

  const resetForm = () => {
    setDescription("")
    setAmount("")
    setCategory("Other")
    setDate(new Date().toISOString().split("T")[0])
    setPaidTo("")
    setCoveredByLoan(false)
    setIsEditMode(false)
    setEditId("")
  }

  const handleAddExpense = () => {
    if (!description || !amount || Number.parseFloat(amount) <= 0) {
      alert("Please enter a valid description and amount")
      return
    }

    const expenseData = {
      id: isEditMode ? editId : Date.now().toString(),
      description,
      amount: Number.parseFloat(amount),
      category,
      date: new Date(date),
      paidTo,
      coveredByLoan,
    }

    if (isEditMode) {
      editExpense("property", editId, expenseData)
    } else {
      addExpense("property", expenseData)
    }

    setIsAddDialogOpen(false)
    resetForm()
  }

  const handleRemoveExpense = (id: string) => {
    removeExpense("property", id)
  }

  const handleEditExpense = (expense: any) => {
    setDescription(expense.description)
    setAmount(expense.amount.toString())
    setCategory(expense.category)
    setDate(new Date(expense.date).toISOString().split("T")[0])
    setPaidTo(expense.paidTo || "")
    setCoveredByLoan(expense.coveredByLoan || false)
    setIsEditMode(true)
    setEditId(expense.id)
    setIsAddDialogOpen(true)
  }

  // Filter expenses by category
  const filteredExpenses =
    filterCategory === "All" ? data.property : data.property.filter((expense) => expense.category === filterCategory)

  // Group expenses by category for summary
  const expensesByCategory: Record<string, number> = {}
  data.property.forEach((expense) => {
    if (!expensesByCategory[expense.category]) {
      expensesByCategory[expense.category] = 0
    }
    expensesByCategory[expense.category] += expense.amount
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Loading property expenses...</p>
        <Progress value={65} className="w-64 h-2 mt-4" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Property Expenses</CardTitle>
          <CardDescription>Total spent: ₹{propertyTotal.toLocaleString()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(expensesByCategory).map(([category, total]) => (
              <Badge key={category} variant="outline" className="px-2 py-1">
                {category}: ₹{total.toLocaleString()}
              </Badge>
            ))}
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="mb-4"
                onClick={() => {
                  resetForm()
                  setIsAddDialogOpen(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isEditMode ? "Edit" : "Add"} Property Expense</DialogTitle>
                <DialogDescription>Enter the details of your property expense</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="expense-description">Description</Label>
                  <Input
                    id="expense-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Land purchase"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expense-amount">Amount (₹)</Label>
                  <Input
                    id="expense-amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 100000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expense-category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="expense-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expense-paid-to">Paid To</Label>
                  <Input
                    id="expense-paid-to"
                    value={paidTo}
                    onChange={(e) => setPaidTo(e.target.value)}
                    placeholder="e.g. Property Developer"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expense-date">Date</Label>
                  <Input id="expense-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="covered-by-loan"
                    checked={coveredByLoan}
                    onCheckedChange={(checked) => setCoveredByLoan(checked === true)}
                  />
                  <Label htmlFor="covered-by-loan">This expense is covered by loan money</Label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false)
                    resetForm()
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddExpense}>{isEditMode ? "Update" : "Add"} Expense</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="flex items-center space-x-2 mb-4">
            <Label htmlFor="filter-category" className="flex-shrink-0">
              Filter by:
            </Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger id="filter-category" className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                {PROPERTY_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Paid To</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Loan</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No expenses recorded
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense) => (
                    <TableRow key={expense.id} className={expense.coveredByLoan ? "bg-muted/50" : ""}>
                      <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell>{expense.paidTo || "-"}</TableCell>
                      <TableCell>{expense.category}</TableCell>
                      <TableCell>₹{expense.amount.toLocaleString()}</TableCell>
                      <TableCell>{expense.coveredByLoan ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditExpense(expense)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveExpense(expense.id)}>
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

