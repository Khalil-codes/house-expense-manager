"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useExpenseData } from "@/hooks/use-expense-data"
import { Progress } from "@/components/ui/progress"
import { Edit, RefreshCw } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function LoanTracker() {
  const { data, updateLoan, updateLoanPayment } = useExpenseData()

  const [loanAmount, setLoanAmount] = useState(data.loan.amount.toString())
  const [interestRate, setInterestRate] = useState(data.loan.interest.toString())
  const [loanTenure, setLoanTenure] = useState(data.loan.tenure.toString())
  const [startDate, setStartDate] = useState(
    data.loan.startDate
      ? new Date(data.loan.startDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
  )

  const [showLoanForm, setShowLoanForm] = useState(!data.loan.amount)

  const [prepaymentAmount, setPrepaymentAmount] = useState("")
  const [prepaymentDate, setPrepaymentDate] = useState(new Date().toISOString().split("T")[0])

  const [amountPaid, setAmountPaid] = useState(0)
  const [interestPaid, setInterestPaid] = useState(0)
  const [principalPaid, setPrincipalPaid] = useState(0)
  const [remainingBalance, setRemainingBalance] = useState(0)

  // Calculate loan details
  useEffect(() => {
    if (data.loan.payments.length > 0) {
      const totalPaid = data.loan.payments.reduce((sum, payment) => sum + (payment.paid ? payment.amount : 0), 0)

      const totalInterestPaid = data.loan.payments.reduce(
        (sum, payment) => sum + (payment.paid ? payment.interest : 0),
        0,
      )

      const totalPrincipalPaid = data.loan.payments.reduce(
        (sum, payment) => sum + (payment.paid ? payment.amount - payment.interest : 0),
        0,
      )

      setAmountPaid(totalPaid)
      setInterestPaid(totalInterestPaid)
      setPrincipalPaid(totalPrincipalPaid)
      setRemainingBalance(data.loan.amount - totalPrincipalPaid)
    } else {
      setAmountPaid(0)
      setInterestPaid(0)
      setPrincipalPaid(0)
      setRemainingBalance(Number.parseFloat(loanAmount) || 0)
    }
  }, [data.loan])

  const calculateLoan = () => {
    const amount = Number.parseFloat(loanAmount) || 0
    const interest = Number.parseFloat(interestRate) || 0
    const tenure = Number.parseInt(loanTenure) || 0

    if (amount <= 0 || interest <= 0 || tenure <= 0) {
      alert("Please enter valid loan details")
      return
    }

    // Calculate monthly payment
    const monthlyInterest = interest / 100 / 12
    const totalPayments = tenure * 12

    const monthlyPayment =
      (amount * monthlyInterest * Math.pow(1 + monthlyInterest, totalPayments)) /
      (Math.pow(1 + monthlyInterest, totalPayments) - 1)

    // Generate amortization schedule
    let balance = amount
    const payments = []
    const loanStartDate = new Date(startDate)

    for (let i = 1; i <= totalPayments; i++) {
      const interestPayment = balance * monthlyInterest
      const principalPayment = monthlyPayment - interestPayment
      balance -= principalPayment

      const paymentDate = new Date(loanStartDate)
      paymentDate.setMonth(loanStartDate.getMonth() + i - 1)

      payments.push({
        month: i,
        amount: monthlyPayment,
        interest: interestPayment,
        principal: principalPayment,
        balance: balance > 0 ? balance : 0,
        date: paymentDate,
        paid: false,
      })
    }

    // Update loan data
    updateLoan({
      amount,
      interest,
      tenure,
      startDate: loanStartDate,
      payments,
      prepayments: [],
    })

    setShowLoanForm(false)
  }

  const togglePaymentStatus = (index: number) => {
    const newStatus = !data.loan.payments[index].paid
    updateLoanPayment(index, newStatus)
  }

  const handlePrepayment = () => {
    const prepayAmount = Number.parseFloat(prepaymentAmount) || 0
    if (prepayAmount <= 0) {
      alert("Please enter a valid prepayment amount")
      return
    }

    if (prepayAmount > remainingBalance) {
      alert("Prepayment amount cannot exceed the remaining balance")
      return
    }

    // Find the first unpaid payment after the prepayment date
    const prepayDate = new Date(prepaymentDate)
    const firstUnpaidIndex = data.loan.payments.findIndex(
      (payment) => !payment.paid && new Date(payment.date) >= prepayDate,
    )

    if (firstUnpaidIndex === -1) {
      alert("No future payments found after the selected date")
      return
    }

    // Calculate new loan schedule
    const monthlyInterest = data.loan.interest / 100 / 12
    const remainingMonths = data.loan.payments.length - firstUnpaidIndex

    // New balance after prepayment
    const newBalance = remainingBalance - prepayAmount

    // Calculate new monthly payment
    const newMonthlyPayment =
      (newBalance * monthlyInterest * Math.pow(1 + monthlyInterest, remainingMonths)) /
      (Math.pow(1 + monthlyInterest, remainingMonths) - 1)

    // Generate new payment schedule
    let balance = newBalance
    const newPayments = [...data.loan.payments.slice(0, firstUnpaidIndex)]

    for (let i = 0; i < remainingMonths; i++) {
      const interestPayment = balance * monthlyInterest
      const principalPayment = newMonthlyPayment - interestPayment
      balance -= principalPayment

      const paymentDate = new Date(data.loan.payments[firstUnpaidIndex + i].date)

      newPayments.push({
        month: firstUnpaidIndex + i + 1,
        amount: newMonthlyPayment,
        interest: interestPayment,
        principal: principalPayment,
        balance: balance > 0 ? balance : 0,
        date: paymentDate,
        paid: false,
      })
    }

    // Add prepayment record
    const prepayments = data.loan.prepayments || []
    prepayments.push({
      date: prepayDate,
      amount: prepayAmount,
    })

    // Update loan data
    updateLoan({
      ...data.loan,
      payments: newPayments,
      prepayments,
    })

    // Reset prepayment form
    setPrepaymentAmount("")
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Amount Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{amountPaid.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <Progress value={data.loan.amount ? (amountPaid / data.loan.amount) * 100 : 0} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Interest Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{interestPaid.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {amountPaid ? ((interestPaid / amountPaid) * 100).toFixed(1) : 0}% of total paid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Principal Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{principalPaid.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.loan.amount ? ((principalPaid / data.loan.amount) * 100).toFixed(1) : 0}% of loan amount
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Remaining Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{remainingBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.loan.amount ? ((remainingBalance / data.loan.amount) * 100).toFixed(1) : 0}% of loan amount
            </p>
          </CardContent>
        </Card>
      </div>

      {data.loan.amount > 0 && !showLoanForm && (
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">Loan Details</h3>
            <p className="text-sm text-muted-foreground">
              ₹{data.loan.amount.toLocaleString()} at {data.loan.interest}% for {data.loan.tenure} years
              {data.loan.startDate && ` (starting ${new Date(data.loan.startDate).toLocaleDateString()})`}
            </p>
          </div>
          <Button variant="outline" onClick={() => setShowLoanForm(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Loan
          </Button>
        </div>
      )}

      {showLoanForm && (
        <Card>
          <CardHeader>
            <CardTitle>Loan Details</CardTitle>
            <CardDescription>Enter your loan information to generate a payment plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="loan-amount">Loan Amount (₹)</Label>
                <Input
                  id="loan-amount"
                  type="number"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  placeholder="e.g. 2500000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interest-rate">Interest Rate (%)</Label>
                <Input
                  id="interest-rate"
                  type="number"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  placeholder="e.g. 8.5"
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="loan-tenure">Loan Tenure (years)</Label>
                <Input
                  id="loan-tenure"
                  type="number"
                  value={loanTenure}
                  onChange={(e) => setLoanTenure(e.target.value)}
                  placeholder="e.g. 20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setShowLoanForm(false)} disabled={!data.loan.amount}>
              Cancel
            </Button>
            <Button onClick={calculateLoan}>Calculate Loan</Button>
          </CardFooter>
        </Card>
      )}

      {data.loan.amount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Loan Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="schedule">
              <TabsList className="mb-4">
                <TabsTrigger value="schedule">Payment Schedule</TabsTrigger>
                <TabsTrigger value="prepayment">Make Prepayment</TabsTrigger>
                {data.loan.prepayments && data.loan.prepayments.length > 0 && (
                  <TabsTrigger value="history">Prepayment History</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="schedule">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="hidden md:table-cell">Principal</TableHead>
                        <TableHead className="hidden md:table-cell">Interest</TableHead>
                        <TableHead className="hidden md:table-cell">Remaining</TableHead>
                        <TableHead>Paid</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.loan.payments.slice(0, 12).map((payment, index) => (
                        <TableRow key={index}>
                          <TableCell>{payment.month}</TableCell>
                          <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            ₹{payment.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            ₹{payment.principal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            ₹{payment.interest.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            ₹{payment.balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Checkbox
                              checked={payment.paid}
                              onCheckedChange={() => togglePaymentStatus(index)}
                              className="data-[state=checked]:bg-green-500"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {data.loan.payments.length > 12 && (
                  <div className="mt-2 text-center text-sm text-muted-foreground">
                    Showing first 12 months of {data.loan.payments.length} total payments
                  </div>
                )}
              </TabsContent>

              <TabsContent value="prepayment">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="prepayment-amount">Prepayment Amount (₹)</Label>
                    <Input
                      id="prepayment-amount"
                      type="number"
                      value={prepaymentAmount}
                      onChange={(e) => setPrepaymentAmount(e.target.value)}
                      placeholder="e.g. 100000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prepayment-date">Prepayment Date</Label>
                    <Input
                      id="prepayment-date"
                      type="date"
                      value={prepaymentDate}
                      onChange={(e) => setPrepaymentDate(e.target.value)}
                    />
                  </div>

                  <div className="flex items-end">
                    <Button onClick={handlePrepayment} className="mb-2">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Apply Prepayment
                    </Button>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-muted rounded-md">
                  <h4 className="font-medium mb-2">How Prepayment Works</h4>
                  <p className="text-sm text-muted-foreground">
                    Making a prepayment will reduce your loan principal and recalculate your remaining payments. This
                    can help you save on interest and potentially reduce your loan term.
                  </p>
                </div>
              </TabsContent>

              {data.loan.prepayments && data.loan.prepayments.length > 0 && (
                <TabsContent value="history">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.loan.prepayments.map((prepayment, index) => (
                          <TableRow key={index}>
                            <TableCell>{new Date(prepayment.date).toLocaleDateString()}</TableCell>
                            <TableCell>₹{prepayment.amount.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

