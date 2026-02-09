"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  Calendar,
  ArrowRight,
  CheckCircle2,
  Timer,
  AlertCircle,
  PiggyBank,
  TrendingUp,
  CreditCard,
  Plus,
  Pencil,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import React from "react"
import { usePortfolio } from "@/lib/portfolio-context"
import { GoalModal } from "./portfolio-modals"
import {
  formatCurrencyFromCents,
  formatMonthYearFromIso,
  type FinancialGoal,
} from "@/lib/portfolio-data"

interface List03Props {
  className?: string
}

const iconStyles = {
  savings: "bg-background/40 border border-border/60 text-foreground",
  investment: "bg-background/40 border border-border/60 text-foreground",
  debt: "bg-background/40 border border-border/60 text-foreground",
}

const iconMap: Record<string, LucideIcon> = {
  savings: PiggyBank,
  investment: TrendingUp,
  debt: CreditCard,
}

const statusConfig = {
  pending: {
    icon: Timer,
    class: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  "in-progress": {
    icon: AlertCircle,
    class: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  completed: {
    icon: CheckCircle2,
    class: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
  },
}

export default function List03({ className }: List03Props) {
  const { goals, addGoal, updateGoal, deleteGoal } = usePortfolio()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | undefined>(undefined)

  const handleAddGoal = () => {
    setEditingGoal(undefined)
    setIsModalOpen(true)
  }

  const handleEditGoal = (goal: FinancialGoal) => {
    setEditingGoal(goal)
    setIsModalOpen(true)
  }

  const handleSaveGoal = (goalData: Omit<FinancialGoal, "id">) => {
    if (editingGoal) {
      updateGoal(editingGoal.id, goalData)
    } else {
      addGoal(goalData)
    }
  }

  const handleDeleteGoal = () => {
    if (editingGoal) {
      deleteGoal(editingGoal.id)
    }
  }

  return (
    <>
      <div className={cn("w-full overflow-x-auto scrollbar-none", className)}>
        <div className="flex gap-3 min-w-full p-1">
          {/* Add Goal Card */}
          <button
            onClick={handleAddGoal}
            className={cn(
              "flex flex-col items-center justify-center",
              "w-[280px] shrink-0 min-h-[280px]",
              "bg-background/40 backdrop-blur-xl",
              "rounded-2xl",
              "border-2 border-dashed border-border/60",
              "hover:border-primary/40",
              "transition-all duration-200",
              "cursor-pointer group"
            )}
          >
            <div className="p-3 rounded-full bg-accent/60 group-hover:bg-accent/80 transition-colors">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <span className="mt-3 text-sm font-medium text-muted-foreground">Add New Goal</span>
          </button>

          {goals.map((item) => {
            const Icon = iconMap[item.iconStyle] || PiggyBank
            return (
              <div
                key={item.id}
                className={cn(
                  "flex flex-col",
                  "w-[280px] shrink-0",
                  "fx-panel",
                  "hover:border-primary/30",
                  "transition-all duration-200",
                  "group cursor-pointer"
                )}
                onClick={() => handleEditGoal(item)}
                onKeyDown={(e) => e.key === "Enter" && handleEditGoal(item)}
                tabIndex={0}
                role="button"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div
                      className={cn(
                        "p-2 rounded-lg",
                        iconStyles[item.iconStyle as keyof typeof iconStyles]
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1.5",
                          statusConfig[item.status].bg,
                          statusConfig[item.status].class
                        )}
                      >
                        {React.createElement(statusConfig[item.status].icon, {
                          className: "w-3.5 h-3.5",
                        })}
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1).replace("-", " ")}
                      </div>
                      <Pencil className="w-3 h-3 text-muted-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-1">{item.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.subtitle}</p>
                  </div>

                  {typeof item.progress === "number" && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="text-foreground">{item.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-accent/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {typeof item.targetAmountCents === "number" && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground">
                        {formatCurrencyFromCents(item.targetAmountCents)}
                      </span>
                      <span className="text-xs text-muted-foreground">target</span>
                    </div>
                  )}

                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                    <span>{`Target: ${formatMonthYearFromIso(item.targetDateIso)}`}</span>
                  </div>
                </div>

                <div className="mt-auto border-t border-border/60">
                  <button
                    className={cn(
                      "w-full flex items-center justify-center gap-2",
                      "py-2.5 px-3",
                      "text-xs font-medium",
                      "text-muted-foreground",
                      "hover:text-foreground",
                      "hover:bg-accent/60",
                      "transition-colors duration-200"
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEditGoal(item)
                    }}
                  >
                    Edit Goal
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <GoalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveGoal}
        onDelete={editingGoal ? handleDeleteGoal : undefined}
        initialData={editingGoal}
      />
    </>
  )
}
