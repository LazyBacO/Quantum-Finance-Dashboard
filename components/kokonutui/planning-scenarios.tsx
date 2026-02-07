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
const chartColors = [
  "hsl(var(--primary))",
  "hsl(173 80% 34%)",
  "hsl(43 96% 56%)",
  "hsl(0 84% 60%)",
]

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

const buildLinePath = (values: number[], width: number, height: number, min: number, max: number) => {
  if (values.length === 0) return ""
  const range = Math.max(max - min, 1)
  return values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * width
      const y = height - ((value - min) / range) * height
      return `${index === 0 ? "M" : "L"}${x} ${y}`
    })
    .join(" ")
}

export default function PlanningScenarios({ className }: PlanningScenariosProps) {
  const { planningScenarios } = usePortfolio()
  const [age, setAge] = useState(34)
  const [income, setIncome] = useState(58000)
  const [savings, setSavings] = useState(12000)
  const [returnRate, setReturnRate] = useState(6)
  const [hiddenScenarioIds, setHiddenScenarioIds] = useState<Set<string>>(new Set())

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
  const visibleResults = results.filter((scenario) => !hiddenScenarioIds.has(scenario.id))
  const chartResults = visibleResults.length > 0 ? visibleResults : results
  const chartValues = chartResults.flatMap((scenario) => scenario.values)
  const chartMin = chartValues.length ? Math.min(...chartValues) : 0
  const chartMax = chartValues.length ? Math.max(...chartValues) : 0
  const chartWidth = 640
  const chartHeight = 220

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
        <div className="rounded-lg border border-border/60 bg-background/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Projection annuelle</p>
              <h4 className="text-sm font-semibold text-foreground">Évolution par scénario</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {results.map((scenario, index) => {
                const isHidden = hiddenScenarioIds.has(scenario.id)
                return (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() =>
                      setHiddenScenarioIds((prev) => {
                        const next = new Set(prev)
                        if (next.has(scenario.id)) {
                          next.delete(scenario.id)
                        } else {
                          next.add(scenario.id)
                        }
                        return next
                      })
                    }
                    aria-pressed={!isHidden}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium transition",
                      isHidden
                        ? "border-border/60 bg-background/40 text-muted-foreground"
                        : "border-transparent bg-muted text-foreground"
                    )}
                  >
                    <span
                      className={cn("h-2 w-2 rounded-full", isHidden && "opacity-40")}
                      style={{ backgroundColor: chartColors[index % chartColors.length] }}
                    />
                    {scenario.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="mt-4">
            <svg
              width="100%"
              height={chartHeight}
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              role="img"
              aria-label="Projection des scénarios"
              className="overflow-visible"
            >
              <defs>
                <linearGradient id="chartGrid" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--border))" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="hsl(var(--border))" stopOpacity="0" />
                </linearGradient>
              </defs>
              <rect width={chartWidth} height={chartHeight} fill="url(#chartGrid)" opacity="0.15" />
              <g stroke="hsl(var(--border))" strokeDasharray="4 6" strokeWidth="1">
                {[0.25, 0.5, 0.75].map((step) => (
                  <line key={step} x1="0" x2={chartWidth} y1={chartHeight * step} y2={chartHeight * step} />
                ))}
              </g>
              {chartResults.map((scenario, index) => (
                <path
                  key={scenario.id}
                  d={buildLinePath(scenario.values, chartWidth, chartHeight, chartMin, chartMax)}
                  fill="none"
                  stroke={chartColors[index % chartColors.length]}
                  strokeWidth="2.5"
                />
              ))}
            </svg>
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
        <p className="mt-3 text-[11px] text-muted-foreground">
          Hypothèse: l'épargne annuelle alimente la croissance chaque année. Les scénarios "marché" appliquent
          un choc initial sur l'épargne existante.
        </p>
      </div>
    </div>
  )
}
