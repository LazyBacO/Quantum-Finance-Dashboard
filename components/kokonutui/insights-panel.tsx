"use client"

import { cn } from "@/lib/utils"
import { useMemo } from "react"
import { AlertTriangle, Sparkles, Wallet } from "lucide-react"
import { usePortfolio } from "@/lib/portfolio-context"

interface InsightsPanelProps {
  className?: string
}

const parseMoney = (value: string) => {
  const numeric = parseFloat(value.replace(/[^0-9.-]/g, ""))
  return Number.isFinite(numeric) ? numeric : 0
}

const formatCurrency = (value: number) =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function InsightsPanel({ className }: InsightsPanelProps) {
  const { transactions, accounts } = usePortfolio()

  const insights = useMemo(() => {
    const outgoing = transactions.filter((t) => t.type !== "incoming")
    const incoming = transactions.filter((t) => t.type === "incoming")

    const topExpense = outgoing.reduce(
      (acc, t) => {
        const amount = parseMoney(t.amount)
        if (amount > acc.amount) return { title: t.title, amount }
        return acc
      },
      { title: "Aucune dépense", amount: 0 }
    )

    const totalOutgoing = outgoing.reduce((sum, t) => sum + parseMoney(t.amount), 0)
    const totalIncoming = incoming.reduce((sum, t) => sum + parseMoney(t.amount), 0)

    const liquid = accounts
      .filter((a) => a.type === "savings" || a.type === "checking")
      .reduce((sum, a) => sum + parseMoney(a.balance), 0)

    const monthlyBurn = totalOutgoing || 1
    const runwayMonths = Math.max(0.5, Math.round((liquid / monthlyBurn) * 10) / 10)

    const debt = accounts
      .filter((a) => a.type === "debt")
      .reduce((sum, a) => sum + parseMoney(a.balance), 0)

    return {
      topExpense,
      runwayMonths,
      liquid,
      cashDelta: totalIncoming - totalOutgoing,
      debt,
    }
  }, [accounts, transactions])

  return (
    <div className={cn("w-full fx-panel", className)}>
      <div className="p-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl border border-border/60 bg-primary/10">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Insights rapides</h3>
            <p className="text-xs text-muted-foreground">Aperçu instantané de ton flux financier.</p>
          </div>
        </div>
      </div>

      <div className="p-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/60 bg-background/40 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            Top dépense
          </div>
          <p className="text-sm font-semibold text-foreground mt-2">{insights.topExpense.title}</p>
          <p className="text-xs text-rose-500">-{formatCurrency(insights.topExpense.amount)}</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/40 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Wallet className="w-3.5 h-3.5 text-emerald-500" />
            Runway estimé
          </div>
          <p className="text-sm font-semibold text-foreground mt-2">{insights.runwayMonths} mois</p>
          <p className="text-xs text-muted-foreground">Liquidité: {formatCurrency(insights.liquid)}</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/40 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Solde net récent
          </div>
          <p
            className={cn(
              "text-sm font-semibold mt-2",
              insights.cashDelta >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            )}
          >
            {insights.cashDelta >= 0 ? "+" : "-"}
            {formatCurrency(Math.abs(insights.cashDelta))}
          </p>
          <p className="text-xs text-muted-foreground">Dette totale: {formatCurrency(insights.debt)}</p>
        </div>
      </div>
    </div>
  )
}
