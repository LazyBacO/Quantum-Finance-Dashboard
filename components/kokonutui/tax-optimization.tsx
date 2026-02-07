"use client"

import { cn } from "@/lib/utils"
import { usePortfolio } from "@/lib/portfolio-context"

interface TaxOptimizationProps {
  className?: string
}

const formatCurrency = (value: number) =>
  value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  })

const formatPercent = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(1)}%`

export default function TaxOptimization({ className }: TaxOptimizationProps) {
  const { taxOptimization } = usePortfolio()
  const { unrealizedGains, realizedGains, dividendTaxEstimate, peaAdvice, lifeInsuranceAdvice } =
    taxOptimization

  const trendClass = (value: number) => (value >= 0 ? "text-emerald-600" : "text-rose-600")

  return (
    <div className={cn("w-full fx-panel", className)}>
      <div className="border-b border-border/60 p-4">
        <p className="text-xs text-muted-foreground">Optimisation fiscale</p>
        <h3 className="text-base font-semibold text-foreground">
          Plus/moins-values &amp; impacts dividendes
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Synthèse des gains latents, réalisés et conseils fiscaux associés.
        </p>
      </div>

      <div className="grid gap-4 border-b border-border/60 p-4 md:grid-cols-2">
        {[{ title: "Plus-values latentes", data: unrealizedGains }].map((item) => (
          <div key={item.title} className="rounded-lg border border-border/60 bg-background/60 p-4">
            <p className="text-xs text-muted-foreground">{item.title}</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xl font-semibold text-foreground">
                {formatCurrency(item.data.amount)}
              </span>
              <span className={cn("text-xs font-semibold", trendClass(item.data.change))}>
                {formatPercent(item.data.change)}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{item.data.note}</p>
          </div>
        ))}

        <div className="rounded-lg border border-border/60 bg-background/60 p-4">
          <p className="text-xs text-muted-foreground">Plus-values réalisées</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-semibold text-foreground">
              {formatCurrency(realizedGains.amount)}
            </span>
            <span className={cn("text-xs font-semibold", trendClass(realizedGains.change))}>
              {formatPercent(realizedGains.change)}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">{realizedGains.note}</p>
        </div>
      </div>

      <div className="grid gap-4 border-b border-border/60 p-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-lg border border-border/60 bg-background/60 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-foreground">Estimation impôts dividendes</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{dividendTaxEstimate.note}</p>
            </div>
            <div className="rounded-full border border-border/60 bg-background/80 px-2 py-1 text-[10px] text-muted-foreground">
              PFU {formatPercent(dividendTaxEstimate.flatTaxRate * 100)}
            </div>
          </div>
          <div className="mt-4 grid gap-3 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Dividendes bruts</span>
              <span className="font-medium text-foreground">
                {formatCurrency(dividendTaxEstimate.grossDividends)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Assiette taxable</span>
              <span className="font-medium text-foreground">
                {formatCurrency(dividendTaxEstimate.taxableBase)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Impôt estimé</span>
              <span className="font-medium text-foreground">
                {formatCurrency(dividendTaxEstimate.estimatedTax)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Mode de paiement</span>
              <span className="text-[11px] text-muted-foreground">
                {dividendTaxEstimate.paymentSchedule}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-background/60 p-4">
          <p className="text-xs font-semibold text-foreground">Conseils ciblés</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                PEA
              </p>
              <ul className="space-y-2 text-[11px] text-muted-foreground">
                {peaAdvice.map((item) => (
                  <li key={item} className="rounded-md border border-border/60 bg-background/80 p-2">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Assurance-vie
              </p>
              <ul className="space-y-2 text-[11px] text-muted-foreground">
                {lifeInsuranceAdvice.map((item) => (
                  <li key={item} className="rounded-md border border-border/60 bg-background/80 p-2">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
