"use client"

import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import {
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  ShoppingCart,
  CreditCard,
  ArrowRight,
  TrendingUp,
  Zap,
  Banknote,
  Plus,
  Pencil,
  Utensils,
  Car,
  Gamepad2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { usePortfolio } from "@/lib/portfolio-context"
import { TransactionModal } from "./portfolio-modals"
import type { Transaction } from "@/lib/portfolio-data"

interface List02Props {
  className?: string
}

// Map categories to icons
const categoryIcons: Record<string, LucideIcon> = {
  shopping: ShoppingCart,
  investment: TrendingUp,
  income: Banknote,
  utilities: Zap,
  debt: CreditCard,
  food: Utensils,
  transport: Car,
  entertainment: Gamepad2,
  default: Wallet,
}

export default function List02({ className }: List02Props) {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = usePortfolio()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined)
  const [filter, setFilter] = useState<"all" | "incoming" | "outgoing">("all")

  const formatCategory = (value: string) =>
    value
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (match) => match.toUpperCase())

  const handleAddTransaction = () => {
    setEditingTransaction(undefined)
    setIsModalOpen(true)
  }

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setIsModalOpen(true)
  }

  const handleSaveTransaction = (transactionData: Omit<Transaction, "id">) => {
    if (editingTransaction) {
      updateTransaction(editingTransaction.id, transactionData)
    } else {
      addTransaction(transactionData)
    }
  }

  const handleDeleteTransaction = () => {
    if (editingTransaction) {
      deleteTransaction(editingTransaction.id)
    }
  }

  const filteredTransactions = useMemo(() => {
    if (filter === "all") return transactions
    if (filter === "incoming") return transactions.filter((t) => t.type === "incoming")
    return transactions.filter((t) => t.type !== "incoming")
  }, [filter, transactions])

  return (
    <>
      <div
        className={cn(
          "w-full",
          "fx-panel",
          className
        )}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              Recent Activity
              <span className="text-xs font-normal text-muted-foreground ml-1">
                ({filteredTransactions.length} transactions)
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-full border border-border/60 bg-background/60 p-0.5 shadow-sm">
                {(
                  [
                    { key: "all", label: "All" },
                    { key: "incoming", label: "Income" },
                    { key: "outgoing", label: "Expense" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilter(item.key)}
                    className={cn(
                      "px-2 py-0.5 text-[10px] font-semibold rounded-full transition",
                      filter === item.key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <button
                onClick={handleAddTransaction}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>

          <div className="space-y-1">
            {filteredTransactions.map((transaction) => {
              const Icon = categoryIcons[transaction.category] || categoryIcons.default
              return (
                <div
                  key={transaction.id}
                  className={cn(
                    "group flex items-center gap-3",
                    "p-2 rounded-lg",
                    "hover:bg-accent/60",
                    "transition-all duration-200",
                    "hover:-translate-y-0.5 hover:shadow-sm",
                    "active:translate-y-0",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    "cursor-pointer"
                  )}
                  onClick={() => handleEditTransaction(transaction)}
                  onKeyDown={(e) => e.key === "Enter" && handleEditTransaction(transaction)}
                  tabIndex={0}
                  role="button"
                >
                  <div
                    className={cn(
                      "p-2 rounded-lg",
                      "bg-background/60",
                      "border border-border/60",
                      "shadow-[0_1px_0_rgba(255,255,255,0.05)]"
                    )}
                  >
                    <Icon className="w-4 h-4 text-foreground" />
                  </div>

                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <div className="space-y-0.5">
                      <h3 className="text-xs font-medium text-foreground">{transaction.title}</h3>
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] text-muted-foreground">{transaction.timestamp}</p>
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full border",
                            transaction.type === "incoming"
                              ? "border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-200"
                              : "border-rose-200/60 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-200"
                          )}
                        >
                          {transaction.type === "incoming" ? "Income" : "Expense"}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-border/60 text-muted-foreground">
                          {formatCategory(transaction.category)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pl-3">
                      <span
                        className={cn(
                          "text-xs font-semibold tabular-nums",
                          transaction.type === "incoming"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        )}
                      >
                        {transaction.type === "incoming" ? "+" : "-"}
                        {transaction.amount}
                      </span>
                      {transaction.type === "incoming" ? (
                        <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ArrowUpRight className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                      )}
                      <Pencil className="w-3 h-3 text-muted-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="p-2 border-t border-border/60">
          <button
            type="button"
            onClick={handleAddTransaction}
            className={cn(
              "w-full flex items-center justify-center gap-2",
              "py-2 px-3 rounded-lg",
              "text-xs font-medium",
              "border border-border/60",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90",
              "shadow-sm hover:shadow",
              "transform transition-all duration-200",
              "hover:-translate-y-0.5",
              "active:translate-y-0",
              "focus:outline-none focus:ring-2",
              "focus:ring-ring",
              "focus:ring-offset-2 focus:ring-offset-background"
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTransaction}
        onDelete={editingTransaction ? handleDeleteTransaction : undefined}
        initialData={editingTransaction}
      />
    </>
  )
}
