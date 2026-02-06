"use client"

import { cn } from "@/lib/utils"
import { usePortfolio } from "@/lib/portfolio-context"

interface PerformanceAllocationProps {
  className?: string
}

export default function PerformanceAllocation({ className }: PerformanceAllocationProps) {
  const { allocationActual, allocationTargets, performanceMetrics, riskMetrics } = usePortfolio()
  const targetMap = new Map(allocationTargets.map((item) => [item.id, item.target]))

  return (
    <div className={cn("w-full fx-panel", className)}>
      <div className="p-4 border-b border-border/60">
        <p className="text-xs text-muted-foreground">Performance & Allocation</p>
        <h3 className="text-base font-semibold text-foreground">
          Vue d&apos;ensemble du portefeuille
        </h3>
      </div>

      <div className="p-4 space-y-4 border-b border-border/60">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-foreground">Allocation réelle vs cible</span>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-foreground/80" />
              Réelle
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full border border-foreground/60" />
              Cible
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {allocationActual.map((item) => {
            const target = targetMap.get(item.id) ?? 0
            return (
              <div key={item.id} className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{item.label}</span>
                  <span className="text-muted-foreground">
                    {item.actual}% / cible {target}%
                  </span>
                </div>
                <div className="relative h-2 w-full rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", item.colorClass)}
                    style={{ width: `${item.actual}%` }}
                  />
                  <div
                    className="absolute top-0 h-full w-0.5 bg-foreground/70"
                    style={{ left: `${target}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="p-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-border/60 bg-background/60 p-3 space-y-3">
          <div>
            <p className="text-xs font-semibold text-foreground">KPIs de performance</p>
            <p className="text-[11px] text-muted-foreground">
              Rendements clés et comparaison benchmark
            </p>
          </div>
          <div className="space-y-2">
            {performanceMetrics.map((metric) => (
              <div key={metric.id} className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-foreground">{metric.label}</p>
                  {metric.note && (
                    <p className="text-[11px] text-muted-foreground">{metric.note}</p>
                  )}
                </div>
                <span className="text-xs font-semibold text-foreground">{metric.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-background/60 p-3 space-y-3">
          <div>
            <p className="text-xs font-semibold text-foreground">KPIs de risque</p>
            <p className="text-[11px] text-muted-foreground">
              Mesure de la stabilité et du risque
            </p>
          </div>
          <div className="space-y-2">
            {riskMetrics.map((metric) => (
              <div key={metric.id} className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-foreground">{metric.label}</p>
                  {metric.note && (
                    <p className="text-[11px] text-muted-foreground">{metric.note}</p>
                  )}
                </div>
                <span className="text-xs font-semibold text-foreground">{metric.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
