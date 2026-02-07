"use client"

import { cn } from "@/lib/utils"
import { usePortfolio } from "@/lib/portfolio-context"
import { ArrowDownRight, TrendingDown, Wallet } from "lucide-react"

interface AlertsProps {
  className?: string
}

const statusStyles = {
  actif: "border-blue-500/30 bg-blue-500/10 text-blue-600",
  résolu: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  critique: "border-rose-500/30 bg-rose-500/10 text-rose-600",
}

const statusLabels = {
  actif: "Actif",
  résolu: "Résolu",
  critique: "Critique",
}

const categoryMeta = {
  prix: {
    label: "Prix",
    icon: TrendingDown,
    styles: "bg-amber-500/10 text-amber-500",
  },
  "cash buffer": {
    label: "Cash buffer",
    icon: Wallet,
    styles: "bg-emerald-500/10 text-emerald-500",
  },
  drawdown: {
    label: "Drawdown",
    icon: ArrowDownRight,
    styles: "bg-rose-500/10 text-rose-500",
  },
}

export default function Alerts({ className }: AlertsProps) {
  const { alerts } = usePortfolio()
  const criticalCount = alerts.filter((alert) => alert.status === "critique").length
  const activeCount = alerts.filter((alert) => alert.status === "actif").length

  return (
    <div className={cn("w-full fx-panel", className)}>
      <div className="flex items-center justify-between border-b border-border/60 p-4">
        <div>
          <p className="text-xs text-muted-foreground">Alertes portefeuille</p>
          <h3 className="text-base font-semibold text-foreground">
            {alerts.length} alertes à surveiller
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
            {criticalCount} critique{criticalCount > 1 ? "s" : ""}
          </span>
          <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
            {activeCount} actif{activeCount > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {alerts.map((alert) => {
          const meta = categoryMeta[alert.category]
          const Icon = meta.icon
          return (
            <div
              key={alert.id}
              className="rounded-lg border border-border/60 bg-background/70 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={cn("rounded-lg p-2", meta.styles)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{alert.title}</p>
                    <p className="text-[11px] text-muted-foreground">{alert.description}</p>
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{meta.label}</span>
                      <span>•</span>
                      <span>{alert.updatedAt}</span>
                    </div>
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                    statusStyles[alert.status]
                  )}
                >
                  {statusLabels[alert.status]}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
