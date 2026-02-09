"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, Download, Target, Upload } from "lucide-react"
import { usePortfolio } from "@/lib/portfolio-context"
import {
  formatCurrencyFromCents,
  parseCurrencyToCents,
  type AccountItem,
  type Transaction,
} from "@/lib/portfolio-data"
import { cn } from "@/lib/utils"

interface SmartFinanceToolsProps {
  className?: string
}

type SmartAlert = {
  id: string
  level: "warning" | "critical"
  title: string
  description: string
}

const splitCsvLine = (line: string) => line.split(",").map((value) => value.trim())

const downloadTextFile = (filename: string, content: string) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

const toIsoDateTime = (value: string): string => {
  if (!value) return new Date().toISOString()
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString()
  return parsed.toISOString()
}

const toAccountType = (value: string): AccountItem["type"] => {
  if (value === "savings" || value === "checking" || value === "investment" || value === "debt") {
    return value
  }
  return "checking"
}

const toTransactionType = (value: string): Transaction["type"] =>
  value === "incoming" ? "incoming" : "outgoing"

const toTransactionStatus = (value: string): Transaction["status"] => {
  if (value === "completed" || value === "pending" || value === "failed") {
    return value
  }
  return "completed"
}

const parseCsv = (text: string): string[][] =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(splitCsvLine)

const stringifyCsv = (rows: string[][]): string => rows.map((row) => row.join(",")).join("\n")

export default function SmartFinanceTools({ className }: SmartFinanceToolsProps) {
  const {
    accounts,
    transactions,
    goals,
    addAccount,
    addTransaction,
  } = usePortfolio()

  const [targetAmount, setTargetAmount] = useState("50000")
  const [initialCapital, setInitialCapital] = useState("5000")
  const [monthlyContribution, setMonthlyContribution] = useState("750")
  const [annualReturn, setAnnualReturn] = useState("6")
  const [importStatus, setImportStatus] = useState<string>("")

  const smartAlerts = useMemo<SmartAlert[]>(() => {
    const debtCents = accounts
      .filter((account) => account.type === "debt")
      .reduce((sum, account) => sum + account.balanceCents, 0)
    const assetsCents = accounts
      .filter((account) => account.type !== "debt")
      .reduce((sum, account) => sum + account.balanceCents, 0)
    const debtRatio = assetsCents > 0 ? debtCents / assetsCents : 0

    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1_000
    const recent = transactions.filter((transaction) => {
      const timestamp = new Date(transaction.timestampIso).getTime()
      return Number.isFinite(timestamp) && timestamp >= thirtyDaysAgo
    })

    const recentIncoming = recent
      .filter((transaction) => transaction.type === "incoming")
      .reduce((sum, transaction) => sum + transaction.amountCents, 0)
    const recentOutgoing = recent
      .filter((transaction) => transaction.type === "outgoing")
      .reduce((sum, transaction) => sum + transaction.amountCents, 0)

    const pendingCount = transactions.filter((transaction) => transaction.status === "pending").length
    const failedCount = transactions.filter((transaction) => transaction.status === "failed").length

    const generated: SmartAlert[] = []

    if (debtRatio >= 0.35) {
      generated.push({
        id: "debt-ratio",
        level: debtRatio > 0.5 ? "critical" : "warning",
        title: "Ratio de dette élevé",
        description: `La dette représente ${(debtRatio * 100).toFixed(1)}% des actifs.`,
      })
    }

    if (recentOutgoing > recentIncoming) {
      generated.push({
        id: "cashflow-negative",
        level: recentOutgoing > recentIncoming * 1.2 ? "critical" : "warning",
        title: "Flux net négatif sur 30 jours",
        description: `Sorties ${formatCurrencyFromCents(recentOutgoing)} vs entrées ${formatCurrencyFromCents(recentIncoming)}.`,
      })
    }

    if (pendingCount + failedCount >= 3) {
      generated.push({
        id: "ops-risks",
        level: failedCount > 0 ? "critical" : "warning",
        title: "Transactions à surveiller",
        description: `${pendingCount} en attente et ${failedCount} échouées nécessitent une revue.`,
      })
    }

    if (goals.some((goal) => (goal.progress ?? 0) < 30 && goal.status !== "completed")) {
      generated.push({
        id: "goals-lagging",
        level: "warning",
        title: "Objectifs en retard",
        description: "Au moins un objectif est sous 30% de progression.",
      })
    }

    if (generated.length === 0) {
      generated.push({
        id: "healthy",
        level: "warning",
        title: "Aucune alerte critique",
        description: "Les indicateurs clés sont actuellement sous contrôle.",
      })
    }

    return generated
  }, [accounts, goals, transactions])

  const projection = useMemo(() => {
    const target = Number.parseFloat(targetAmount)
    const principal = Number.parseFloat(initialCapital)
    const monthly = Number.parseFloat(monthlyContribution)
    const yearlyRate = Number.parseFloat(annualReturn) / 100

    if (!Number.isFinite(target) || !Number.isFinite(principal) || !Number.isFinite(monthly)) {
      return null
    }

    if (target <= 0 || monthly <= 0 || principal >= target) {
      return {
        months: 0,
        projected: principal,
      }
    }

    const monthlyRate = Number.isFinite(yearlyRate) ? yearlyRate / 12 : 0

    let balance = Math.max(0, principal)
    let months = 0

    while (balance < target && months < 600) {
      balance = balance * (1 + monthlyRate) + monthly
      months += 1
    }

    return {
      months,
      projected: balance,
    }
  }, [annualReturn, initialCapital, monthlyContribution, targetAmount])

  const handleExportAccounts = () => {
    const rows = [
      ["title", "description", "balance", "type"],
      ...accounts.map((account) => [
        account.title,
        account.description ?? "",
        (account.balanceCents / 100).toString(),
        account.type,
      ]),
    ]
    downloadTextFile("opennova-accounts.csv", stringifyCsv(rows))
  }

  const handleExportTransactions = () => {
    const rows = [
      ["title", "amount", "type", "category", "status", "timestamp"],
      ...transactions.map((transaction) => [
        transaction.title,
        (transaction.amountCents / 100).toString(),
        transaction.type,
        transaction.category,
        transaction.status,
        transaction.timestampIso,
      ]),
    ]
    downloadTextFile("opennova-transactions.csv", stringifyCsv(rows))
  }

  const handleImportTransactions = async (file: File) => {
    const content = await file.text()
    const rows = parseCsv(content)
    if (rows.length <= 1) {
      setImportStatus("CSV transactions vide.")
      return
    }

    const dataRows = rows.slice(1)
    let imported = 0

    for (const row of dataRows) {
      const [title, amount, type, category, status, timestamp] = row
      if (!title) {
        continue
      }

      addTransaction({
        title,
        amountCents: parseCurrencyToCents(amount),
        type: toTransactionType(type),
        category: category || "autre",
        timestampIso: toIsoDateTime(timestamp),
        status: toTransactionStatus(status),
      })
      imported += 1
    }

    setImportStatus(`${imported} transaction(s) importée(s).`)
  }

  const handleImportAccounts = async (file: File) => {
    const content = await file.text()
    const rows = parseCsv(content)
    if (rows.length <= 1) {
      setImportStatus("CSV comptes vide.")
      return
    }

    const dataRows = rows.slice(1)
    let imported = 0

    for (const row of dataRows) {
      const [title, description, balance, type] = row
      if (!title) {
        continue
      }

      addAccount({
        title,
        description: description || "",
        balanceCents: parseCurrencyToCents(balance),
        type: toAccountType(type),
      })
      imported += 1
    }

    setImportStatus(`${imported} compte(s) importé(s).`)
  }

  return (
    <div className={cn("grid gap-4 xl:grid-cols-[1.1fr_0.9fr]", className)}>
      <div className="fx-panel p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Alertes intelligentes</p>
            <h3 className="text-base font-semibold text-foreground">Détection proactive des risques</h3>
          </div>
          <AlertTriangle className="h-5 w-5 text-amber-500" />
        </div>

        <div className="space-y-2">
          {smartAlerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "rounded-lg border p-3",
                alert.level === "critical"
                  ? "border-rose-500/40 bg-rose-500/10"
                  : "border-amber-500/40 bg-amber-500/10"
              )}
            >
              <p className="text-sm font-semibold text-foreground">{alert.title}</p>
              <p className="text-xs text-muted-foreground">{alert.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="fx-panel p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Simulateur d&apos;objectifs</p>
              <h3 className="text-base font-semibold text-foreground">Projection d&apos;atteinte</h3>
            </div>
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-xs text-muted-foreground">
              Objectif (USD)
              <input
                value={targetAmount}
                onChange={(event) => setTargetAmount(event.target.value)}
                type="number"
                min="0"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Capital initial (USD)
              <input
                value={initialCapital}
                onChange={(event) => setInitialCapital(event.target.value)}
                type="number"
                min="0"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Versement mensuel (USD)
              <input
                value={monthlyContribution}
                onChange={(event) => setMonthlyContribution(event.target.value)}
                type="number"
                min="0"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Rendement annuel (%)
              <input
                value={annualReturn}
                onChange={(event) => setAnnualReturn(event.target.value)}
                type="number"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
          </div>

          <div className="rounded-lg border border-border/60 bg-background/60 p-3 text-xs text-muted-foreground">
            {projection ? (
              <>
                <p>
                  Délai estimé: <span className="font-semibold text-foreground">{projection.months} mois</span>
                </p>
                <p>
                  Capital projeté: <span className="font-semibold text-foreground">{projection.projected.toLocaleString("en-US", { style: "currency", currency: "USD" })}</span>
                </p>
              </>
            ) : (
              <p>Renseignez des valeurs valides pour lancer la simulation.</p>
            )}
          </div>
        </div>

        <div className="fx-panel p-4 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Import / Export CSV</p>
            <h3 className="text-base font-semibold text-foreground">Interopérabilité des données</h3>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <button
              type="button"
              onClick={handleExportAccounts}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-sm font-medium hover:bg-accent/60"
            >
              <Download className="h-4 w-4" />
              Export comptes
            </button>
            <button
              type="button"
              onClick={handleExportTransactions}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-sm font-medium hover:bg-accent/60"
            >
              <Download className="h-4 w-4" />
              Export transactions
            </button>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border/60 bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Upload className="h-4 w-4" />
              Import comptes
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    void handleImportAccounts(file)
                  }
                  event.currentTarget.value = ""
                }}
              />
            </label>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border/60 bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Upload className="h-4 w-4" />
              Import transactions
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    void handleImportTransactions(file)
                  }
                  event.currentTarget.value = ""
                }}
              />
            </label>
          </div>

          {importStatus && <p className="text-xs text-emerald-600">{importStatus}</p>}
        </div>
      </div>
    </div>
  )
}
