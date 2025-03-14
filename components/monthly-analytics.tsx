"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useExpenseData } from "@/hooks/use-expense-data"
import { Label } from "@/components/ui/label"
import { useTheme } from "next-themes"

export default function MonthlyAnalytics() {
  const { data } = useExpenseData()
  const [timeRange, setTimeRange] = useState("6")
  const [chartData, setChartData] = useState<{
    labels: string[]
    construction: number[]
    property: number[]
    loan: number[]
    total: number[]
  }>({
    labels: [],
    construction: [],
    property: [],
    loan: [],
    total: [],
  })

  useEffect(() => {
    // Get current date and calculate start date based on time range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(endDate.getMonth() - Number.parseInt(timeRange))

    // Generate array of months between start and end date
    const months: Date[] = []
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      months.push(new Date(currentDate))
      currentDate.setMonth(currentDate.getMonth() + 1)
    }

    // Format month labels
    const labels = months.map((date) => {
      return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
    })

    // Calculate expenses for each month
    const constructionData: number[] = []
    const propertyData: number[] = []
    const loanData: number[] = []
    const totalData: number[] = []

    months.forEach((month) => {
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1)
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0)

      // Construction expenses for this month
      const constructionExpenses = data.construction
        .filter((expense) => {
          const expenseDate = new Date(expense.date)
          return expenseDate >= monthStart && expenseDate <= monthEnd
        })
        .reduce((sum, expense) => sum + expense.amount, 0)

      // Property expenses for this month
      const propertyExpenses = data.property
        .filter((expense) => {
          const expenseDate = new Date(expense.date)
          return expenseDate >= monthStart && expenseDate <= monthEnd
        })
        .reduce((sum, expense) => sum + expense.amount, 0)

      // Loan payments for this month
      const loanPayments = data.loan.payments
        .filter((payment) => {
          const paymentDate = new Date(payment.date)
          return payment.paid && paymentDate >= monthStart && paymentDate <= monthEnd
        })
        .reduce((sum, payment) => sum + payment.amount, 0)

      constructionData.push(constructionExpenses)
      propertyData.push(propertyExpenses)
      loanData.push(loanPayments)
      totalData.push(constructionExpenses + propertyExpenses + loanPayments)
    })

    setChartData({
      labels,
      construction: constructionData,
      property: propertyData,
      loan: loanData,
      total: totalData,
    })
  }, [data, timeRange])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Monthly Expenditure</CardTitle>
              <CardDescription>Breakdown of your expenses over time</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="time-range">Time Range:</Label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger id="time-range" className="w-[180px]">
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Last 3 months</SelectItem>
                  <SelectItem value="6">Last 6 months</SelectItem>
                  <SelectItem value="12">Last 12 months</SelectItem>
                  <SelectItem value="24">Last 24 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <MonthlyExpenseChart data={chartData} />
        </CardContent>
      </Card>
    </div>
  )
}

function MonthlyExpenseChart({
  data,
}: {
  data: {
    labels: string[]
    construction: number[]
    property: number[]
    loan: number[]
    total: number[]
  }
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { theme } = useTheme()
  const isDark = theme === "dark"

  useEffect(() => {
    if (!canvasRef.current) return

    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

    // Set dimensions
    const width = canvasRef.current.width
    const height = canvasRef.current.height
    const padding = 60
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    // Colors
    const colors = {
      construction: "#2563eb",
      property: "#16a34a",
      loan: "#d97706",
      grid: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
      text: isDark ? "#ffffff" : "#000000",
    }

    // Find max value for scaling
    const maxValue = Math.max(...data.construction, ...data.property, ...data.loan)

    // Round up to a nice number
    const yMax = Math.ceil(maxValue / 10000) * 10000

    // Draw grid and axes
    ctx.strokeStyle = colors.grid
    ctx.lineWidth = 1

    // Y-axis grid lines and labels
    ctx.textAlign = "right"
    ctx.textBaseline = "middle"
    ctx.font = "12px sans-serif"
    ctx.fillStyle = colors.text

    const ySteps = 5
    for (let i = 0; i <= ySteps; i++) {
      const y = padding + chartHeight - (i / ySteps) * chartHeight

      // Grid line
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(padding + chartWidth, y)
      ctx.stroke()

      // Label
      const value = (i / ySteps) * yMax
      ctx.fillText(`₹${value.toLocaleString()}`, padding - 10, y)
    }

    // X-axis labels
    ctx.textAlign = "center"
    ctx.textBaseline = "top"

    const barWidth = chartWidth / data.labels.length / 3 // 3 bars per month with spacing
    const groupWidth = barWidth * 3

    data.labels.forEach((label, i) => {
      const x = padding + (i + 0.5) * groupWidth
      ctx.fillText(label, x, padding + chartHeight + 10)
    })

    // Draw bars
    const drawBar = (values: number[], color: string, offset: number) => {
      ctx.fillStyle = color

      values.forEach((value, i) => {
        const barHeight = (value / yMax) * chartHeight
        const x = padding + i * groupWidth + offset * barWidth
        const y = padding + chartHeight - barHeight

        ctx.fillRect(x, y, barWidth * 0.8, barHeight)
      })
    }

    drawBar(data.construction, colors.construction, 0)
    drawBar(data.property, colors.property, 1)
    drawBar(data.loan, colors.loan, 2)

    // Draw legend
    const legendY = 30
    const legendX = width / 2
    const legendSpacing = 120

    ctx.textAlign = "left"
    ctx.textBaseline = "middle"

    // Construction
    ctx.fillStyle = colors.construction
    ctx.fillRect(legendX - 180, legendY, 15, 15)
    ctx.fillStyle = colors.text
    ctx.fillText("Construction", legendX - 160, legendY + 7)

    // Property
    ctx.fillStyle = colors.property
    ctx.fillRect(legendX - 60, legendY, 15, 15)
    ctx.fillStyle = colors.text
    ctx.fillText("Property", legendX - 40, legendY + 7)

    // Loan
    ctx.fillStyle = colors.loan
    ctx.fillRect(legendX + 60, legendY, 15, 15)
    ctx.fillStyle = colors.text
    ctx.fillText("Loan", legendX + 80, legendY + 7)
  }, [data, isDark])

  return (
    <div className="w-full h-[400px] relative">
      <canvas ref={canvasRef} width={800} height={400} className="w-full h-full" />
    </div>
  )
}

