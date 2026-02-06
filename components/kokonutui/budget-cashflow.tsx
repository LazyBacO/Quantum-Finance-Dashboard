"use client"

import { useMemo } from "react"
import { AlertTriangle, ArrowDownRight, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePortfolio } from "@/lib/portfolio-context"

interface BudgetCashflowProps {
  className?: string
}

const formatCurrency = (value: number) =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const statusStyles = {
  ok: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  critical: "border-rose-500/30 bg-rose-500/10 text-rose-500",
} as const

export default function BudgetCashflow({ className }: BudgetCashflowProps) {
  const { budgets, cashflowForecast, alertsThresholds } = usePortfolio()

  const cashflowChart = useMemo(() => {
    const values = cashflowForecast.flatMap((point) => [point.income, point.expenses])
    const min = Math.min(...values)
    const max = Math.max(...values)
    const height = 120
    const width = 300
    const range = Math.max(max - min, 1)
    const step = values.length > 1 ? width / (cashflowForecast.length - 1) : width

    const buildPoints = (key: "income" | "expenses") =>
      cashflowForecast
        .map((point, index) => {
          const x = index * step
          const y = height - ((point[key] - min) / range) * height
          return `${x},${y}`
        })
        .join(" ")

    return {
      income: buildPoints("income"),
      expenses: buildPoints("expenses"),
      width,
      height,
    }
  }, [cashflowForecast])

  const totals = useMemo(() => {
    const totalPlanned = budgets.reduce((sum, item) => sum + item.planned, 0)
    const totalSpent = budgets.reduce((sum, item) => sum + item.spent, 0)
    return { totalPlanned, totalSpent }
  }, [budgets])

  return (
    <div className={cn("w-full fx-panel", className)}>
      <div className="border-b border-border/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Budget & cashflow</p>
            <h3 className="text-base font-semibold text-foreground">
              Répartition budgétaire et prévisions
            </h3>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
              <span>Revenus prévus: {formatCurrency(cashflowForecast.at(-1)?.income ?? 0)}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <ArrowDownRight className="h-3.5 w-3.5 text-rose-500" />
              <span>Dépenses prévues: {formatCurrency(cashflowForecast.at(-1)?.expenses ?? 0)}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border/60 bg-background/60 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Projection 6 mois</span>
            <span>Revenus vs dépenses</span>
          </div>
          <div className="mt-4">
            <svg
              width="100%"
              height={cashflowChart.height}
              viewBox={`0 0 ${cashflowChart.width} ${cashflowChart.height}`}
              className="overflow-visible"
              role="img"
              aria-label="Projection des revenus et dépenses"
            >
              <polyline
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                points={cashflowChart.income}
              />
              <polyline
                fill="none"
                stroke="hsl(var(--destructive))"
                strokeWidth="2"
                points={cashflowChart.expenses}
              />
            </svg>
          </div>
          <div className="mt-3 grid grid-cols-6 gap-2 text-[11px] text-muted-foreground">
            {cashflowForecast.map((point) => (
              <div key={point.id} className="text-center">
                {point.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-background/60 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">Répartition 50 / 30 / 20</span>
              <span className="text-muted-foreground">
                {formatCurrency(totals.totalSpent)} / {formatCurrency(totals.totalPlanned)}
              </span>
            </div>
            <div className="mt-4 space-y-4">
              {budgets.map((budget) => {
                const percent = Math.min((budget.spent / budget.planned) * 100, 100)
                return (
                  <div key={budget.id} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{budget.label}</span>
                        <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                          {budget.allocation}%
                        </span>
                      </div>
                      <span className="text-muted-foreground">
                        {formatCurrency(budget.spent)} / {formatCurrency(budget.planned)}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className={cn("h-2 rounded-full", budget.colorClass)}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {percent > 100
                        ? "Seuil dépassé"
                        : `Reste ${formatCurrency(Math.max(budget.planned - budget.spent, 0))}`}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-background/60 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">Alertes seuils</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-4 space-y-3">
              {alertsThresholds.map((alert) => {
                const progress = Math.min((alert.current / alert.threshold) * 100, 120)
                return (
                  <div key={alert.id} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{alert.label}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(alert.current)} / {formatCurrency(alert.threshold)}
                      </span>
                    </div>
                    {alert.description && (
                      <p className="text-[11px] text-muted-foreground">{alert.description}</p>
                    )}
                    <div className="h-1.5 w-full rounded-full bg-muted">
                      <div
                        className={cn("h-1.5 rounded-full", statusStyles[alert.status])}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>
                        {alert.status === "critical"
                          ? "Dépassement"
                          : alert.status === "warning"
                            ? "Proche du seuil"
                            : "Sous contrôle"}
                      </span>
                      <span className={cn("rounded-full border px-2 py-0.5", statusStyles[alert.status])}>
                        {alert.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
