"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { usePortfolio } from "@/lib/portfolio-context"

interface NetWorthProps {
  className?: string
}

const formatCurrency = (value: number) =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function NetWorth({ className }: NetWorthProps) {
  const { netWorthHistory, assetBreakdown, liabilityBreakdown } = usePortfolio()

  const assetTotal = useMemo(
    () => assetBreakdown.reduce((sum, item) => sum + item.value, 0),
    [assetBreakdown]
  )
  const liabilityTotal = useMemo(
    () => liabilityBreakdown.reduce((sum, item) => sum + item.value, 0),
    [liabilityBreakdown]
  )
  const netWorthTotal = assetTotal - liabilityTotal

  const chart = useMemo(() => {
    const values = netWorthHistory.map((point) => point.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const height = 120
    const width = 320
    const range = Math.max(max - min, 1)
    const step = values.length > 1 ? width / (values.length - 1) : width

    const points = values
      .map((value, index) => {
        const x = index * step
        const y = height - ((value - min) / range) * height
        return `${x},${y}`
      })
      .join(" ")

    const area = `${points} ${width},${height} 0,${height}`

    return { points, area, width, height }
  }, [netWorthHistory])

  const sparkline = useMemo(() => {
    const values = netWorthHistory.slice(-6).map((point) => point.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const height = 32
    const width = 120
    const range = Math.max(max - min, 1)
    const step = values.length > 1 ? width / (values.length - 1) : width

    const points = values
      .map((value, index) => {
        const x = index * step
        const y = height - ((value - min) / range) * height
        return `${x},${y}`
      })
      .join(" ")

    return { points, width, height }
  }, [netWorthHistory])

  return (
    <div className={cn("w-full fx-panel", className)}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 p-4">
        <div>
          <p className="text-xs text-muted-foreground">Net worth</p>
          <h3 className="text-base font-semibold text-foreground">Vue d&apos;ensemble patrimoniale</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total net</p>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(netWorthTotal)}</p>
            <p className="text-[11px] text-emerald-500">+4.6% sur 30j</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/60 p-2">
            <svg
              width={sparkline.width}
              height={sparkline.height}
              viewBox={`0 0 ${sparkline.width} ${sparkline.height}`}
              className="text-emerald-500"
              aria-hidden="true"
            >
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                points={sparkline.points}
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-background/60 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Historique 12 mois</span>
              <span>Dernière mise à jour: aujourd&apos;hui</span>
            </div>
            <div className="mt-4">
              <svg
                width="100%"
                height={chart.height}
                viewBox={`0 0 ${chart.width} ${chart.height}`}
                className="overflow-visible"
                role="img"
                aria-label="Courbe d'évolution du net worth"
              >
                <polygon points={chart.area} fill="hsl(var(--primary) / 0.12)" />
                <polyline
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  points={chart.points}
                />
              </svg>
            </div>
            <div className="mt-3 grid grid-cols-6 gap-2 text-[11px] text-muted-foreground">
              {netWorthHistory.slice(-6).map((point) => (
                <div key={point.id} className="text-center">
                  {point.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-background/60 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">Actifs</span>
              <span className="text-muted-foreground">{formatCurrency(assetTotal)}</span>
            </div>
            <div className="mt-3 space-y-3">
              {assetBreakdown.map((item) => (
                <div key={item.id} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{item.label}</span>
                    <span className="text-muted-foreground">{formatCurrency(item.value)}</span>
                  </div>
                  {item.description && (
                    <p className="text-[11px] text-muted-foreground">{item.description}</p>
                  )}
                  <div className="h-1.5 w-full rounded-full bg-muted">
                    <div
                      className={cn("h-1.5 rounded-full", item.colorClass ?? "bg-emerald-500")}
                      style={{ width: `${(item.value / assetTotal) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-background/60 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">Passifs</span>
              <span className="text-muted-foreground">{formatCurrency(liabilityTotal)}</span>
            </div>
            <div className="mt-3 space-y-3">
              {liabilityBreakdown.map((item) => (
                <div key={item.id} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{item.label}</span>
                    <span className="text-muted-foreground">{formatCurrency(item.value)}</span>
                  </div>
                  {item.description && (
                    <p className="text-[11px] text-muted-foreground">{item.description}</p>
                  )}
                  <div className="h-1.5 w-full rounded-full bg-muted">
                    <div
                      className={cn("h-1.5 rounded-full", item.colorClass ?? "bg-rose-500")}
                      style={{ width: `${(item.value / liabilityTotal) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
