"use client"

import { useMemo, useState } from "react"
import { exportPlanningScenariosCsv, exportPlanningScenariosPng } from "@/lib/planning-scenarios-export"
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

export default function PlanningScenarios({ className }: PlanningScenariosProps) {
  const { planningScenarios } = usePortfolio()
  const [age, setAge] = useState(34)
  const [income, setIncome] = useState(58000)
  const [savings, setSavings] = useState(12000)
  const [returnRate, setReturnRate] = useState(6)
  const [sortKey, setSortKey] = useState<"label" | "value-desc" | "value-asc">("value-desc")
  const [highlightBaseline, setHighlightBaseline] = useState(true)

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
  const bestScenario = results.reduce<ProjectionResult | undefined>(
    (best, scenario) => (!best || scenario.finalValue > best.finalValue ? scenario : best),
    undefined,
  )
  const worstScenario = results.reduce<ProjectionResult | undefined>(
    (worst, scenario) => (!worst || scenario.finalValue < worst.finalValue ? scenario : worst),
    undefined,
  )
  const sortedResults = useMemo(() => {
    const copy = [...results]
    if (sortKey === "label") {
      return copy.sort((a, b) => a.label.localeCompare(b.label))
    }
    if (sortKey === "value-asc") {
      return copy.sort((a, b) => a.finalValue - b.finalValue)
    }
    return copy.sort((a, b) => b.finalValue - a.finalValue)
  }, [results, sortKey])
  const handleExportCsv = () => {
    exportPlanningScenariosCsv({
      age,
      income,
      savings,
      returnRate,
      projectionYears,
      results,
    })
  }

  const handleExportPng = () => {
    exportPlanningScenariosPng({
      results,
      baselineId: baseline?.id ?? "",
      projectionYears,
      formatCurrency,
      formatPercent,
    })
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
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border/60 bg-background/60 p-3">
            <p className="text-[11px] text-muted-foreground">Scénario gagnant</p>
            <p className="text-sm font-semibold text-foreground">{bestScenario?.label ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              {bestScenario ? formatCurrency(bestScenario.finalValue) : "Non disponible"}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/60 p-3">
            <p className="text-[11px] text-muted-foreground">Scénario prudent</p>
            <p className="text-sm font-semibold text-foreground">{worstScenario?.label ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              {worstScenario ? formatCurrency(worstScenario.finalValue) : "Non disponible"}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/60 p-3">
            <p className="text-[11px] text-muted-foreground">Référence (base)</p>
            <p className="text-sm font-semibold text-foreground">{baseline?.label ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              {baseline ? formatCurrency(baseline.finalValue) : "Non disponible"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide">Affichage</span>
            <select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as "label" | "value-desc" | "value-asc")}
              className="rounded-md border border-border/60 bg-background/60 px-2 py-1 text-xs text-foreground"
            >
              <option value="value-desc">Trier par valeur (desc)</option>
              <option value="value-asc">Trier par valeur (asc)</option>
              <option value="label">Trier par nom</option>
            </select>
            <label className="flex items-center gap-2 rounded-md border border-border/60 bg-background/60 px-2 py-1">
              <input
                type="checkbox"
                checked={highlightBaseline}
                onChange={(event) => setHighlightBaseline(event.target.checked)}
                className="h-3 w-3 rounded border-border/60"
              />
              Mettre en avant la base
            </label>
          </div>
          <span className="text-[11px]">Scénarios: {results.length}</span>
        </div>

        <div className="mt-3 overflow-hidden rounded-lg border border-border/60">
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
              {sortedResults.map((scenario) => {
                const diff = baseline ? scenario.finalValue - baseline.finalValue : 0
                const isBaseline = highlightBaseline && scenario.id === baseline?.id
                const isBest = scenario.id === bestScenario?.id
                const isWorst = scenario.id === worstScenario?.id
                return (
                  <tr
                    key={scenario.id}
                    className={cn(
                      "border-t border-border/60 bg-background/60 align-top transition-colors",
                      isBaseline && "bg-primary/5",
                    )}
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        {scenario.label}
                        {isBest ? (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                            Meilleur
                          </span>
                        ) : null}
                        {isWorst ? (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
                            Prudent
                          </span>
                        ) : null}
                        {isBaseline ? (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            Base
                          </span>
                        ) : null}
                      </div>
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
