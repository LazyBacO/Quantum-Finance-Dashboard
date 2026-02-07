"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { usePortfolio } from "@/lib/portfolio-context"

interface PlanningScenariosProps {
  className?: string
}

const formatCurrency = (value: number) =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const formatPercent = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(1)}%`

const numberInputClasses =
  "w-full rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary"

type ProjectionResult = {
  id: string
  label: string
  description: string
  rate: number
  incomeDelta: number
  marketShock: number
  values: number[]
  finalValue: number
}

const buildSparkline = (values: number[], width = 120, height = 32) => {
  if (values.length === 0) return ""
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(max - min, 1)
  return values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * width
      const y = height - ((value - min) / range) * height
      return `${x},${y}`
    })
    .join(" ")
}

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

const escapeCsvValue = (value: string | number) => {
  const stringValue = String(value)
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

const downloadFile = (filename: string, content: Blob | string, type = "text/plain") => {
  const blob = typeof content === "string" ? new Blob([content], { type }) : content
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function PlanningScenarios({ className }: PlanningScenariosProps) {
  const { planningScenarios } = usePortfolio()
  const [age, setAge] = useState(34)
  const [income, setIncome] = useState(58000)
  const [savings, setSavings] = useState(12000)
  const [returnRate, setReturnRate] = useState(6)

  const projectionYears = Math.max(5, Math.min(30, 65 - age))

  const results = useMemo<ProjectionResult[]>(() => {
    return planningScenarios.map((scenario) => {
      const adjustedRate = Math.max(returnRate + scenario.rateDelta, 0.1)
      const adjustedIncome = income * (1 + scenario.incomeDelta)
      const adjustedSavings = Math.max(savings * (1 + scenario.incomeDelta), 0)

      let balance = Math.max(savings + adjustedIncome * 0.1, 0)
      if (scenario.marketShock !== 0) {
        balance *= 1 + scenario.marketShock
      }

      const values: number[] = []
      for (let year = 1; year <= projectionYears; year += 1) {
        balance = balance * (1 + adjustedRate / 100) + adjustedSavings
        values.push(balance)
      }

      return {
        id: scenario.id,
        label: scenario.label,
        description: scenario.description,
        rate: adjustedRate,
        incomeDelta: scenario.incomeDelta,
        marketShock: scenario.marketShock,
        values,
        finalValue: balance,
      }
    })
  }, [planningScenarios, income, savings, returnRate, projectionYears])

  const baseline = results.find((scenario) => scenario.id === "base") ?? results[0]
  const chartWidth = 640
  const chartHeight = 220

  const handleExportCsv = () => {
    const rows: string[][] = [
      ["Paramètre", "Valeur"],
      ["Âge", age],
      ["Revenu annuel", income],
      ["Épargne annuelle", savings],
      ["Rendement estimé (%)", returnRate],
      ["Horizon (années)", projectionYears],
      [],
      [
        "Scénario",
        "Description",
        "Rendement (%)",
        "Variation revenu (%)",
        "Choc marché (%)",
        "Valeur finale",
        "Série valeurs",
      ],
      ...results.map((scenario) => [
        scenario.label,
        scenario.description,
        scenario.rate.toFixed(2),
        (scenario.incomeDelta * 100).toFixed(2),
        (scenario.marketShock * 100).toFixed(2),
        Math.round(scenario.finalValue),
        scenario.values.map((value) => Math.round(value)).join(" | "),
      ]),
    ]

    const csv = rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n")
    downloadFile("scenarios-planning.csv", csv, "text/csv;charset=utf-8")
  }

  const handleExportPng = () => {
    const width = 1200
    const padding = 24
    const chartHeight = 220
    const rowHeight = 34
    const headerHeight = 36
    const tableHeight = headerHeight + results.length * rowHeight
    const height = padding * 3 + chartHeight + tableHeight + 16
    const pixelRatio = window.devicePixelRatio || 1
    const canvas = document.createElement("canvas")
    canvas.width = width * pixelRatio
    canvas.height = height * pixelRatio
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const context = canvas.getContext("2d")
    if (!context) return
    context.scale(pixelRatio, pixelRatio)

    const rootStyles = getComputedStyle(document.documentElement)
    const background = rootStyles.getPropertyValue("--background").trim() || "0 0% 100%"
    const foreground = rootStyles.getPropertyValue("--foreground").trim() || "222 47% 11%"
    const muted = rootStyles.getPropertyValue("--muted-foreground").trim() || "215 16% 47%"
    const border = rootStyles.getPropertyValue("--border").trim() || "214 32% 91%"
    const backgroundColor = `hsl(${background})`
    const foregroundColor = `hsl(${foreground})`
    const mutedColor = `hsl(${muted})`
    const borderColor = `hsl(${border})`

    context.fillStyle = backgroundColor
    context.fillRect(0, 0, width, height)

    context.fillStyle = mutedColor
    context.font = "12px system-ui, sans-serif"
    context.fillText("Graphique principal", padding, padding)
    context.fillStyle = foregroundColor
    context.font = "16px system-ui, sans-serif"
    context.fillText("Projection de l'épargne", padding, padding + 20)
    context.fillStyle = mutedColor
    context.font = "12px system-ui, sans-serif"
    const horizonLabel = `Horizon: ${projectionYears} ans`
    const horizonWidth = context.measureText(horizonLabel).width
    context.fillText(horizonLabel, width - padding - horizonWidth, padding + 4)

    const chartTop = padding + 36
    const chartLeft = padding
    const chartWidth = width - padding * 2
    const chartBottom = chartTop + chartHeight

    context.strokeStyle = borderColor
    context.lineWidth = 1
    context.strokeRect(chartLeft, chartTop, chartWidth, chartHeight)

    const allValues = results.flatMap((scenario) => scenario.values)
    if (allValues.length === 0) return
    const minValue = Math.min(...allValues)
    const maxValue = Math.max(...allValues)
    const range = Math.max(maxValue - minValue, 1)

    results.forEach((scenario, index) => {
      context.strokeStyle = chartColors[index % chartColors.length]
      context.globalAlpha = scenario.id === baseline?.id ? 1 : 0.7
      context.lineWidth = 2.5
      context.beginPath()
      const denominator = Math.max(scenario.values.length - 1, 1)
      scenario.values.forEach((value, valueIndex) => {
        const x = chartLeft + (valueIndex / denominator) * chartWidth
        const y = chartBottom - ((value - minValue) / range) * chartHeight
        if (valueIndex === 0) {
          context.moveTo(x, y)
        } else {
          context.lineTo(x, y)
        }
      })
      context.stroke()
    })
    context.globalAlpha = 1

    const tableTop = chartBottom + padding + 12
    const columnDefs = [
      { label: "Scénario", width: 0.28 },
      { label: "Ajustements", width: 0.32 },
      { label: `Projection ${projectionYears} ans`, width: 0.24 },
      { label: "Mini graphique", width: 0.16 },
    ]

    let currentX = padding
    context.fillStyle = borderColor
    context.fillRect(padding, tableTop, chartWidth, headerHeight)
    context.fillStyle = foregroundColor
    context.font = "12px system-ui, sans-serif"
    columnDefs.forEach((column) => {
      context.fillText(column.label, currentX + 8, tableTop + 22)
      currentX += chartWidth * column.width
    })

    results.forEach((scenario, rowIndex) => {
      const rowTop = tableTop + headerHeight + rowIndex * rowHeight
      context.strokeStyle = borderColor
      context.beginPath()
      context.moveTo(padding, rowTop)
      context.lineTo(padding + chartWidth, rowTop)
      context.stroke()

      let columnX = padding
      context.fillStyle = foregroundColor
      context.font = "12px system-ui, sans-serif"
      context.fillText(scenario.label, columnX + 8, rowTop + 20)

      columnX += chartWidth * columnDefs[0].width
      context.fillStyle = mutedColor
      context.fillText(
        `Rend: ${formatPercent(scenario.rate)}, Rev: ${formatPercent(scenario.incomeDelta * 100)}, Marché: ${formatPercent(
          scenario.marketShock * 100,
        )}`,
        columnX + 8,
        rowTop + 20,
      )

      columnX += chartWidth * columnDefs[1].width
      const diff = baseline ? scenario.finalValue - baseline.finalValue : 0
      context.fillStyle = foregroundColor
      context.fillText(
        `${formatCurrency(scenario.finalValue)} (Δ ${formatCurrency(diff)})`,
        columnX + 8,
        rowTop + 20,
      )

      columnX += chartWidth * columnDefs[2].width
      const miniWidth = chartWidth * columnDefs[3].width - 16
      const miniHeight = rowHeight - 12
      const miniLeft = columnX + 8
      const miniTop = rowTop + 6
      context.strokeStyle = "hsl(var(--primary))"
      context.lineWidth = 1.5
      context.beginPath()
      const miniDenominator = Math.max(scenario.values.length - 1, 1)
      scenario.values.forEach((value, valueIndex) => {
        const x = miniLeft + (valueIndex / miniDenominator) * miniWidth
        const y = miniTop + miniHeight - ((value - minValue) / range) * miniHeight
        if (valueIndex === 0) {
          context.moveTo(x, y)
        } else {
          context.lineTo(x, y)
        }
      })
      context.stroke()
    })

    const dataUrl = canvas.toDataURL("image/png")
    const link = document.createElement("a")
    link.href = dataUrl
    link.download = "scenarios-planning.png"
    link.click()
  }

  return (
    <div className={cn("w-full fx-panel", className)}>
      <div className="border-b border-border/60 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Scénarios de planification</p>
            <h3 className="text-base font-semibold text-foreground">Simulations what-if</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Ajustez vos hypothèses pour comparer les scénarios de croissance.
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
            <div>Horizon estimé: {projectionYears} ans</div>
            <div>Objectif retraite: 65 ans</div>
            <details className="relative mt-2">
              <summary className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-background/80 px-2 py-1 text-[11px] font-medium text-foreground transition hover:border-primary/60">
                Exporter
              </summary>
              <div className="absolute right-0 top-full z-10 mt-2 w-44 rounded-lg border border-border/60 bg-background/95 p-2 shadow-lg">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="w-full rounded-md px-2 py-1.5 text-left text-xs text-foreground transition hover:bg-muted/60"
                >
                  Exporter en CSV
                </button>
                <button
                  type="button"
                  onClick={handleExportPng}
                  className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-xs text-foreground transition hover:bg-muted/60"
                >
                  Exporter en PNG
                </button>
              </div>
            </details>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <label className="space-y-2 text-xs text-muted-foreground">
            <span>Âge</span>
            <input
              type="number"
              min={18}
              max={70}
              value={age}
              onChange={(event) => setAge(Number(event.target.value) || 0)}
              className={numberInputClasses}
            />
          </label>
          <label className="space-y-2 text-xs text-muted-foreground">
            <span>Revenu annuel</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={income}
              onChange={(event) => setIncome(Number(event.target.value) || 0)}
              className={numberInputClasses}
            />
          </label>
          <label className="space-y-2 text-xs text-muted-foreground">
            <span>Épargne annuelle</span>
            <input
              type="number"
              min={0}
              step={500}
              value={savings}
              onChange={(event) => setSavings(Number(event.target.value) || 0)}
              className={numberInputClasses}
            />
          </label>
          <label className="space-y-2 text-xs text-muted-foreground">
            <span>Rendement estimé (%)</span>
            <input
              type="number"
              min={0}
              max={20}
              step={0.1}
              value={returnRate}
              onChange={(event) => setReturnRate(Number(event.target.value) || 0)}
              className={numberInputClasses}
            />
          </label>
        </div>
      </div>

      <div className="p-4">
        <div className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-background/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Graphique principal</p>
                <h4 className="text-sm font-semibold text-foreground">Projection de l'épargne</h4>
              </div>
              <div className="text-xs text-muted-foreground">Horizon: {projectionYears} ans</div>
            </div>
            <svg
              width="100%"
              height="220"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              role="img"
              aria-label="Projection des scénarios"
              className="mt-3"
            >
              {results.map((scenario, index) => (
                <polyline
                  key={scenario.id}
                  fill="none"
                  stroke={chartColors[index % chartColors.length]}
                  strokeWidth="2.5"
                  points={buildSparkline(scenario.values, chartWidth, chartHeight)}
                  opacity={scenario.id === baseline?.id ? 1 : 0.7}
                />
              ))}
            </svg>
            <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              {results.map((scenario, index) => (
                <span key={`${scenario.id}-legend`} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: chartColors[index % chartColors.length] }}
                  />
                  {scenario.label}
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Scénario</th>
                  <th className="px-3 py-2 font-medium">Ajustements</th>
                  <th className="px-3 py-2 font-medium">Projection {projectionYears} ans</th>
                  <th className="px-3 py-2 font-medium">Mini graphique</th>
                </tr>
              </thead>
              <tbody>
                {results.map((scenario) => {
                  const diff = baseline ? scenario.finalValue - baseline.finalValue : 0
                  return (
                    <tr
                      key={scenario.id}
                      className="border-t border-border/60 bg-background/60 align-top"
                    >
                      <td className="px-3 py-3">
                        <div className="text-sm font-semibold text-foreground">{scenario.label}</div>
                        <p className="mt-1 text-[11px] text-muted-foreground">{scenario.description}</p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="space-y-1 text-[11px] text-muted-foreground">
                          <div>Rendement: {formatPercent(scenario.rate)}</div>
                          <div>Revenu: {formatPercent(scenario.incomeDelta * 100)}</div>
                          <div>Marché: {formatPercent(scenario.marketShock * 100)}</div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-sm font-semibold text-foreground">
                          {formatCurrency(scenario.finalValue)}
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Écart vs base: {formatCurrency(diff)}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <svg
                          width="120"
                          height="32"
                          viewBox="0 0 120 32"
                          role="img"
                          aria-label={`Projection ${scenario.label}`}
                          className="overflow-visible"
                        >
                          <polyline
                            fill="none"
                            stroke="hsl(var(--primary))"
                            strokeWidth="2"
                            points={buildSparkline(scenario.values)}
                          />
                        </svg>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Hypothèse: l'épargne annuelle alimente la croissance chaque année. Les scénarios "marché" appliquent
          un choc initial sur l'épargne existante.
        </p>
      </div>
    </div>
  )
}
