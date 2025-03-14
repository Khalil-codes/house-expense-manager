"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"

interface ChartData {
  name: string
  value: number
}

export function ExpenseChart({ data }: { data: ChartData[] }) {
  const chartRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()
  const isDark = theme === "dark"

  useEffect(() => {
    if (!chartRef.current) return

    // This is a simple canvas-based chart implementation
    // In a real app, you might want to use a library like Chart.js or Recharts
    const canvas = document.createElement("canvas")
    canvas.width = chartRef.current.clientWidth
    canvas.height = 300
    chartRef.current.innerHTML = ""
    chartRef.current.appendChild(canvas)

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const colors = ["#2563eb", "#16a34a", "#d97706", "#dc2626"]
    const total = data.reduce((sum, item) => sum + item.value, 0)

    if (total === 0) {
      ctx.font = "16px sans-serif"
      ctx.fillStyle = isDark ? "#fff" : "#000"
      ctx.textAlign = "center"
      ctx.fillText("No expense data available", canvas.width / 2, canvas.height / 2)
      return
    }

    // Draw pie chart
    let startAngle = 0
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(centerX, centerY) - 40

    // Draw slices
    data.forEach((item, index) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI

      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle)
      ctx.closePath()

      ctx.fillStyle = colors[index % colors.length]
      ctx.fill()

      // Draw labels
      const labelAngle = startAngle + sliceAngle / 2
      const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7)
      const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7)

      ctx.font = "14px sans-serif"
      ctx.fillStyle = "#fff"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      if (item.value / total > 0.05) {
        // Only show label if slice is big enough
        ctx.fillText(`${item.name}`, labelX, labelY)
        ctx.fillText(`${Math.round((item.value / total) * 100)}%`, labelX, labelY + 20)
      }

      startAngle += sliceAngle
    })

    // Draw legend
    const legendX = 20
    let legendY = canvas.height - 20 - data.length * 25

    data.forEach((item, index) => {
      // Color box
      ctx.fillStyle = colors[index % colors.length]
      ctx.fillRect(legendX, legendY, 20, 20)

      // Text
      ctx.font = "14px sans-serif"
      ctx.fillStyle = isDark ? "#fff" : "#000"
      ctx.textAlign = "left"
      ctx.textBaseline = "middle"
      ctx.fillText(`${item.name}: ₹${item.value.toLocaleString()}`, legendX + 30, legendY + 10)

      legendY += 25
    })
  }, [data, isDark])

  return <div ref={chartRef} className="w-full h-[300px]"></div>
}

