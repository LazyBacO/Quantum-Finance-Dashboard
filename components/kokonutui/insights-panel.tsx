"use client"

import { cn } from "@/lib/utils"
import { useMemo } from "react"
import { AlertTriangle, Sparkles, Wallet, TrendingUp } from "lucide-react"
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

    const trendSeries = outgoing
      .slice(0, 7)
      .map((t) => parseMoney(t.amount))
      .reverse()
    const trendMax = Math.max(1, ...trendSeries)

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
      trendSeries,
      trendMax,
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
        <div className="rounded-xl border border-border/60 bg-background/40 dark:bg-slate-900/40 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            Top dépense
          </div>
          <p className="text-sm font-semibold text-foreground mt-2">{insights.topExpense.title}</p>
          <p className="text-xs text-rose-500">-{formatCurrency(insights.topExpense.amount)}</p>
          <div className="mt-3 flex items-end gap-1 h-8">
            {insights.trendSeries.map((value, index) => (
              <span
                key={`${value}-${index}`}
                className="flex-1 rounded-sm bg-rose-500/60"
                style={{ height: `${Math.max(12, (value / insights.trendMax) * 100)}%` }}
              />
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Tendance 7 dernières sorties</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/40 dark:bg-slate-900/40 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Wallet className="w-3.5 h-3.5 text-emerald-500" />
            Runway estimé
          </div>
          <p className="text-sm font-semibold text-foreground mt-2">{insights.runwayMonths} mois</p>
          <p className="text-xs text-muted-foreground">Liquidité: {formatCurrency(insights.liquid)}</p>
          <div className="mt-2 inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-200">
            <TrendingUp className="w-3 h-3" />
            Projection stable
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/40 dark:bg-slate-900/40 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
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
          <div
            className={cn(
              "mt-2 inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border",
              insights.cashDelta >= 0
                ? "border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-200"
                : "border-rose-200/60 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-200"
            )}
          >
            {insights.cashDelta >= 0 ? "Excédent positif" : "Tension de cashflow"}
          </div>
        </div>
      </div>
    </div>
  )
}
