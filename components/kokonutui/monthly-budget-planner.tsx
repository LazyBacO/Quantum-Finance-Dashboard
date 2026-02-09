"use client"

import { useEffect, useMemo, useState } from "react"
import { WalletCards } from "lucide-react"
import { usePortfolio } from "@/lib/portfolio-context"
import { cn } from "@/lib/utils"

type MonthlyBudgetEntry = {
  id: string
  label: string
  allocation: number
  planned: number
  spent: number
}

type MonthlyBudgetStore = Record<string, MonthlyBudgetEntry[]>

const STORAGE_KEY = "opennova.monthly-budgets.v1"

const currentMonth = () => new Date().toISOString().slice(0, 7)

const formatCurrency = (value: number) =>
  value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  })

const readStore = (): MonthlyBudgetStore => {
  if (typeof window === "undefined") {
    return {}
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return {}
  }

  try {
    const parsed = JSON.parse(raw) as MonthlyBudgetStore
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

const writeStore = (store: MonthlyBudgetStore) => {
  if (typeof window === "undefined") {
    return
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

interface MonthlyBudgetPlannerProps {
  className?: string
}

export default function MonthlyBudgetPlanner({ className }: MonthlyBudgetPlannerProps) {
  const { budgets } = usePortfolio()
  const [month, setMonth] = useState(currentMonth())
  const [entries, setEntries] = useState<MonthlyBudgetEntry[]>([])

  useEffect(() => {
    const store = readStore()
    const monthEntries = store[month]

    if (Array.isArray(monthEntries) && monthEntries.length > 0) {
      setEntries(monthEntries)
      return
    }

    setEntries(
      budgets.map((budget) => ({
        id: budget.id,
        label: budget.label,
        allocation: budget.allocation,
        planned: budget.planned,
        spent: budget.spent,
      }))
    )
  }, [budgets, month])

  useEffect(() => {
    if (entries.length === 0) {
      return
    }

    const store = readStore()
    store[month] = entries
    writeStore(store)
  }, [entries, month])

  const totals = useMemo(() => {
    const planned = entries.reduce((sum, item) => sum + item.planned, 0)
    const spent = entries.reduce((sum, item) => sum + item.spent, 0)
    const remaining = planned - spent
    return {
      planned,
      spent,
      remaining,
      completion: planned > 0 ? Math.min(100, (spent / planned) * 100) : 0,
    }
  }, [entries])

  const updateEntry = (id: string, updates: Partial<MonthlyBudgetEntry>) => {
    setEntries((current) =>
      current.map((entry) => {
        if (entry.id !== id) {
          return entry
        }
        return {
          ...entry,
          ...updates,
        }
      })
    )
  }

  return (
    <div className={cn("w-full fx-panel", className)}>
      <div className="border-b border-border/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Budget mensuel</p>
            <h3 className="text-base font-semibold text-foreground">Pilotage par catégorie</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <WalletCards className="h-3.5 w-3.5 text-primary" />
                <span>{formatCurrency(totals.spent)} dépensés</span>
              </div>
            </div>
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              aria-label="Sélectionner le mois budgétaire"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {entries.map((entry) => {
          const progress = entry.planned > 0 ? Math.min(120, (entry.spent / entry.planned) * 100) : 0
          const remaining = entry.planned - entry.spent
          return (
            <div key={entry.id} className="rounded-lg border border-border/60 bg-background/60 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">{entry.label}</p>
                <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                  {entry.allocation}%
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-xs text-muted-foreground">
                  Prévu
                  <input
                    type="number"
                    min="0"
                    value={entry.planned}
                    onChange={(event) =>
                      updateEntry(entry.id, { planned: Number.parseInt(event.target.value, 10) || 0 })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  />
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                  Dépensé
                  <input
                    type="number"
                    min="0"
                    value={entry.spent}
                    onChange={(event) =>
                      updateEntry(entry.id, { spent: Number.parseInt(event.target.value, 10) || 0 })
                    }
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  />
                </label>
              </div>
              <div className="mt-3 h-2 rounded-full bg-muted">
                <div
                  className={cn(
                    "h-2 rounded-full",
                    progress > 100 ? "bg-rose-500" : progress > 80 ? "bg-amber-500" : "bg-emerald-500"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {remaining >= 0
                  ? `Reste ${formatCurrency(remaining)}`
                  : `Dépassement de ${formatCurrency(Math.abs(remaining))}`}
              </p>
            </div>
          )
        })}

        <div className="rounded-lg border border-border/60 bg-background/60 p-3">
          <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
            <p>
              Prévu total: <span className="font-semibold text-foreground">{formatCurrency(totals.planned)}</span>
            </p>
            <p>
              Dépensé total: <span className="font-semibold text-foreground">{formatCurrency(totals.spent)}</span>
            </p>
            <p>
              Taux d&apos;exécution: <span className="font-semibold text-foreground">{totals.completion.toFixed(1)}%</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
