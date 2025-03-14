"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { DollarSign, Building, Home, Landmark, Loader2 } from "lucide-react"
import { useExpenseData } from "@/hooks/use-expense-data"
import { ExpenseChart } from "@/components/expense-chart"

export default function Dashboard() {
  const { data, isLoading, getTotalsByCategory, getGrandTotal, getAdjustedTotal } = useExpenseData()

  const totals = {
    construction: data.construction.reduce((sum, expense) => sum + expense.amount, 0),
    property: data.property.reduce((sum, expense) => sum + expense.amount, 0),
    loan: {
      paid: data.loan.payments.reduce((sum, payment) => sum + (payment.paid ? payment.amount : 0), 0),
      total: data.loan.amount,
    },
  }

  const grandTotal = getGrandTotal()
  const adjustedTotal = getAdjustedTotal()

  const constructionPercentage = grandTotal ? (totals.construction / grandTotal) * 100 : 0
  const propertyPercentage = grandTotal ? (totals.property / grandTotal) * 100 : 0
  const loanPercentage = grandTotal ? (totals.loan.paid / grandTotal) * 100 : 0

  // Count expenses covered by loan
  const coveredByLoanAmount =
    data.construction.filter((expense) => expense.coveredByLoan).reduce((sum, expense) => sum + expense.amount, 0) +
    data.property.filter((expense) => expense.coveredByLoan).reduce((sum, expense) => sum + expense.amount, 0)

  const chartData = [
    { name: "Construction", value: totals.construction },
    { name: "Property", value: totals.property },
    { name: "Loan Payments", value: totals.loan.paid },
  ]

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Loading dashboard data...</p>
        <Progress value={25} className="w-64 h-2 mt-4" />
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenditure</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{adjustedTotal.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Adjusted total (avoiding double counting)</p>
          {coveredByLoanAmount > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              ₹{coveredByLoanAmount.toLocaleString()} covered by loan
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Construction</CardTitle>
          <Building className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{totals.construction.toLocaleString()}</div>
          <Progress value={constructionPercentage} className="h-2 mt-2" />
          <p className="text-xs text-muted-foreground mt-1">{constructionPercentage.toFixed(1)}% of total expenses</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Property</CardTitle>
          <Home className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{totals.property.toLocaleString()}</div>
          <Progress value={propertyPercentage} className="h-2 mt-2" />
          <p className="text-xs text-muted-foreground mt-1">{propertyPercentage.toFixed(1)}% of total expenses</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Loan Paid</CardTitle>
          <Landmark className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{totals.loan.paid.toLocaleString()}</div>
          <Progress value={totals.loan.total ? (totals.loan.paid / totals.loan.total) * 100 : 0} className="h-2 mt-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {totals.loan.total
              ? `${((totals.loan.paid / totals.loan.total) * 100).toFixed(1)}% of loan amount`
              : "No loan configured"}
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle>Expense Breakdown</CardTitle>
          <CardDescription>Visual breakdown of your expenses by category</CardDescription>
        </CardHeader>
        <CardContent className="px-2">
          <ExpenseChart data={chartData} />
        </CardContent>
      </Card>
    </div>
  )
}

