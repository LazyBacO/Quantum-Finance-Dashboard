"use client"

import { useMemo } from "react"
import { ArrowDownUp, Flame, Snowflake } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePortfolio } from "@/lib/portfolio-context"

interface DebtPlanProps {
  className?: string
}

const debtTypeLabels = {
  "credit-card": "Carte",
  loan: "Prêt",
  auto: "Auto",
  student: "Étudiant",
}

export default function DebtPlan({ className }: DebtPlanProps) {
  const { debtItems, debtStrategyComparison, debtInterestProjection } = usePortfolio()

  const sortedDebts = useMemo(
    () => [...debtItems].sort((a, b) => b.apr - a.apr),
    [debtItems]
  )

  const maxInterest = Math.max(...debtInterestProjection.map((point) => point.interest))
  const formatCurrency = (value: number) =>
    `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`

  return (
    <div className={cn("w-full fx-panel", className)}>
      <div className="p-4 border-b border-border/60">
        <p className="text-xs text-muted-foreground">Plan de désendettement</p>
        <h3 className="text-base font-semibold text-foreground">
          Comparaison snowball vs avalanche et intérêts projetés
        </h3>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-background/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Stratégies comparées</p>
                <p className="text-[11px] text-muted-foreground">
                  Même mensualité, impact différent sur les intérêts.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <ArrowDownUp className="h-3.5 w-3.5" />
                Comparatif
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {debtStrategyComparison.map((strategy) => (
                <div
                  key={strategy.id}
                  className="rounded-lg border border-border/60 bg-background/80 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      {strategy.id === "snowball" ? (
                        <Snowflake className="h-3.5 w-3.5 text-sky-500" />
                      ) : (
                        <Flame className="h-3.5 w-3.5 text-rose-500" />
                      )}
                      {strategy.label}
                    </div>
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {strategy.payoffMonths} mois
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{strategy.description}</p>
                  <div className="grid gap-2 text-[11px] text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Intérêts totaux</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(strategy.totalInterest)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Mensualité</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(strategy.monthlyPayment)}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-md border border-border/60 bg-muted/50 px-2 py-1 text-[10px] text-foreground">
                    {strategy.highlight}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-background/60 p-4 space-y-3">
            <div>
              <p className="text-xs font-semibold text-foreground">Projection intérêts futurs</p>
              <p className="text-[11px] text-muted-foreground">
                Estimation des intérêts sur 6 mois avec plan actuel.
              </p>
            </div>
            <div className="space-y-3">
              {debtInterestProjection.map((point) => (
                <div key={point.id} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{point.label}</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(point.interest)}
                    </span>
                  </div>
                  <div className="relative h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${(point.interest / maxInterest) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/60 bg-background/80 px-3 py-2 text-[11px]">
              <span className="text-muted-foreground">Cumul estimé</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(debtInterestProjection.at(-1)?.cumulative ?? 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-background/60 p-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-foreground">Priorisation automatique</p>
            <p className="text-[11px] text-muted-foreground">
              Classement par taux annuel pour réduire les coûts d&apos;intérêts.
            </p>
          </div>
          <div className="space-y-3">
            {sortedDebts.map((debt, index) => (
              <div
                key={debt.id}
                className="rounded-lg border border-border/60 bg-background/80 p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{debt.label}</p>
                    <p className="text-[11px] text-muted-foreground">{debt.lender}</p>
                  </div>
                  <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-semibold text-foreground">
                    Priorité {index + 1}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="rounded-full border border-border/60 px-2 py-0.5">
                    {debtTypeLabels[debt.type]}
                  </span>
                  <span>Taux {debt.apr}%</span>
                  <span>Solde {formatCurrency(debt.balance)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Minimum {formatCurrency(debt.minPayment)}</span>
                  <span>Prochaine échéance {debt.nextPaymentDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
