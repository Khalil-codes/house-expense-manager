"use client"

import { useState, useEffect } from "react"

export interface Expense {
  id: string
  description: string
  amount: number
  category: string
  date: Date
  paidTo: string
  coveredByLoan: boolean
}

export interface LoanPayment {
  month: number
  amount: number
  interest: number
  principal: number
  balance: number
  date: Date
  paid: boolean
}

export interface LoanData {
  amount: number
  interest: number
  tenure: number
  startDate?: Date
  payments: LoanPayment[]
  prepayments?: {
    date: Date
    amount: number
  }[]
}

export interface ExpenseData {
  construction: Expense[]
  property: Expense[]
  loan: LoanData
}

export function useExpenseData() {
  const [data, setData] = useState<ExpenseData>({
    construction: [],
    property: [],
    loan: {
      amount: 0,
      interest: 0,
      tenure: 0,
      payments: [],
    },
  })

  const [isLoading, setIsLoading] = useState(true)

  // Load data from localStorage on initial render
  useEffect(() => {
    setIsLoading(true)
    const storedData = localStorage.getItem("houseExpenseData")
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData)

        // Convert date strings back to Date objects
        if (parsedData.construction) {
          parsedData.construction.forEach((expense: any) => {
            expense.date = new Date(expense.date)
            // Add missing fields for backward compatibility
            if (expense.paidTo === undefined) expense.paidTo = ""
            if (expense.coveredByLoan === undefined) expense.coveredByLoan = false
          })
        }

        if (parsedData.property) {
          parsedData.property.forEach((expense: any) => {
            expense.date = new Date(expense.date)
            // Add missing fields for backward compatibility
            if (expense.paidTo === undefined) expense.paidTo = ""
            if (expense.coveredByLoan === undefined) expense.coveredByLoan = false
          })
        }

        if (parsedData.loan && parsedData.loan.payments) {
          parsedData.loan.payments.forEach((payment: any) => {
            payment.date = new Date(payment.date)
          })
        }

        if (parsedData.loan && parsedData.loan.startDate) {
          parsedData.loan.startDate = new Date(parsedData.loan.startDate)
        }

        if (parsedData.loan && parsedData.loan.prepayments) {
          parsedData.loan.prepayments.forEach((prepayment: any) => {
            prepayment.date = new Date(prepayment.date)
          })
        }

        setData(parsedData)
      } catch (error) {
        console.error("Error parsing stored data:", error)
      }
    }
    setIsLoading(false)
  }, [])

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem("houseExpenseData", JSON.stringify(data))
    }
  }, [data, isLoading])

  // Add a new expense
  const addExpense = (type: "construction" | "property", expense: Expense) => {
    setData((prevData) => ({
      ...prevData,
      [type]: [...prevData[type], expense],
    }))
  }

  // Remove an expense
  const removeExpense = (type: "construction" | "property", id: string) => {
    setData((prevData) => ({
      ...prevData,
      [type]: prevData[type].filter((expense) => expense.id !== id),
    }))
  }

  // Edit an expense
  const editExpense = (type: "construction" | "property", id: string, updatedExpense: Expense) => {
    setData((prevData) => ({
      ...prevData,
      [type]: prevData[type].map((expense) => (expense.id === id ? updatedExpense : expense)),
    }))
  }

  // Update loan data
  const updateLoan = (loanData: LoanData) => {
    setData((prevData) => ({
      ...prevData,
      loan: loanData,
    }))
  }

  // Update loan payment status
  const updateLoanPayment = (index: number, paid: boolean) => {
    const newPayments = [...data.loan.payments]
    newPayments[index] = {
      ...newPayments[index],
      paid,
    }

    setData((prevData) => ({
      ...prevData,
      loan: {
        ...prevData.loan,
        payments: newPayments,
      },
    }))
  }

  // Get total expenses by category
  const getTotalsByCategory = (type: "construction" | "property") => {
    return data[type].reduce((total, expense) => total + expense.amount, 0)
  }

  // Get grand total of all expenses
  const getGrandTotal = () => {
    const constructionTotal = getTotalsByCategory("construction")
    const propertyTotal = getTotalsByCategory("property")
    const loanPaidTotal = data.loan.payments.reduce((total, payment) => total + (payment.paid ? payment.amount : 0), 0)

    return constructionTotal + propertyTotal + loanPaidTotal
  }

  // Get adjusted total (excluding expenses covered by loan to avoid double counting)
  const getAdjustedTotal = () => {
    const constructionTotal = data.construction
      .filter((expense) => !expense.coveredByLoan)
      .reduce((total, expense) => total + expense.amount, 0)

    const propertyTotal = data.property
      .filter((expense) => !expense.coveredByLoan)
      .reduce((total, expense) => total + expense.amount, 0)

    const loanPaidTotal = data.loan.payments.reduce((total, payment) => total + (payment.paid ? payment.amount : 0), 0)

    return constructionTotal + propertyTotal + loanPaidTotal
  }

  // Export data to JSON
  const exportData = () => {
    return JSON.stringify(data, null, 2)
  }

  // Import data from JSON
  const importData = (jsonData: string) => {
    try {
      const parsedData = JSON.parse(jsonData)

      // Validate data structure
      if (!parsedData.construction || !parsedData.property || !parsedData.loan) {
        throw new Error("Invalid data structure")
      }

      // Convert date strings to Date objects
      if (parsedData.construction) {
        parsedData.construction.forEach((expense: any) => {
          expense.date = new Date(expense.date)
          // Add missing fields for backward compatibility
          if (expense.paidTo === undefined) expense.paidTo = ""
          if (expense.coveredByLoan === undefined) expense.coveredByLoan = false
        })
      }

      if (parsedData.property) {
        parsedData.property.forEach((expense: any) => {
          expense.date = new Date(expense.date)
          // Add missing fields for backward compatibility
          if (expense.paidTo === undefined) expense.paidTo = ""
          if (expense.coveredByLoan === undefined) expense.coveredByLoan = false
        })
      }

      if (parsedData.loan && parsedData.loan.payments) {
        parsedData.loan.payments.forEach((payment: any) => {
          payment.date = new Date(payment.date)
        })
      }

      if (parsedData.loan && parsedData.loan.startDate) {
        parsedData.loan.startDate = new Date(parsedData.loan.startDate)
      }

      if (parsedData.loan && parsedData.loan.prepayments) {
        parsedData.loan.prepayments.forEach((prepayment: any) => {
          prepayment.date = new Date(prepayment.date)
        })
      }

      setData(parsedData)
      return true
    } catch (error) {
      console.error("Error importing data:", error)
      return false
    }
  }

  return {
    data,
    isLoading,
    addExpense,
    removeExpense,
    editExpense,
    updateLoan,
    updateLoanPayment,
    getTotalsByCategory,
    getGrandTotal,
    getAdjustedTotal,
    exportData,
    importData,
  }
}

