"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ArrowUpRight, ArrowDownLeft, Plus, Pencil } from "lucide-react"
import { usePortfolio } from "@/lib/portfolio-context"
import { StockActionModal } from "./portfolio-modals"
import type { StockAction } from "@/lib/portfolio-data"

interface List04Props {
  className?: string
}

const statusStyles: Record<StockAction["status"], string> = {
  executed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  cancelled: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
}

export default function List04({ className }: List04Props) {
  const { stockActions, addStockAction, updateStockAction, deleteStockAction } = usePortfolio()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAction, setEditingAction] = useState<StockAction | undefined>(undefined)

  const handleAddAction = () => {
    setEditingAction(undefined)
    setIsModalOpen(true)
  }

  const handleEditAction = (action: StockAction) => {
    setEditingAction(action)
    setIsModalOpen(true)
  }

  const handleSaveAction = (actionData: Omit<StockAction, "id">) => {
    if (editingAction) {
      updateStockAction(editingAction.id, actionData)
    } else {
      addStockAction(actionData)
    }
  }

  const handleDeleteAction = () => {
    if (editingAction) {
      deleteStockAction(editingAction.id)
    }
  }

  return (
    <>
      <div
        className={cn(
          "w-full max-w-xl mx-auto",
          "bg-white dark:bg-zinc-900/70",
          "border border-zinc-100 dark:border-zinc-800",
          "rounded-xl shadow-sm backdrop-blur-xl",
          className
        )}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Stock Market Actions
              <span className="text-xs font-normal text-zinc-600 dark:text-zinc-400 ml-1">
                ({stockActions.length} trades)
              </span>
            </h2>
            <button
              type="button"
              onClick={handleAddAction}
              className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>

          <div className="space-y-2">
            {stockActions.length === 0 ? (
              <div className="p-3 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 text-center">
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  No trades yet. Add your first stock action to track it here.
                </p>
              </div>
            ) : (
              stockActions.map((action) => {
                const totalValue = action.shares * parseFloat(action.price.replace(/[$,]/g, ""))
                const Icon = action.action === "buy" ? ArrowDownLeft : ArrowUpRight
                return (
                  <div
                    key={action.id}
                    className={cn(
                      "group flex items-center justify-between",
                      "p-2 rounded-lg",
                      "hover:bg-zinc-100 dark:hover:bg-zinc-800/50",
                      "transition-all duration-200",
                      "cursor-pointer"
                    )}
                    onClick={() => handleEditAction(action)}
                    onKeyDown={(e) => e.key === "Enter" && handleEditAction(action)}
                    tabIndex={0}
                    role="button"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "p-2 rounded-lg",
                          action.action === "buy"
                            ? "bg-emerald-100 dark:bg-emerald-900/30"
                            : "bg-rose-100 dark:bg-rose-900/30"
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-4 h-4",
                            action.action === "buy"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          )}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            {action.symbol}
                          </h3>
                          <span
                            className={cn(
                              "text-[10px] font-medium uppercase px-2 py-0.5 rounded-full",
                              action.action === "buy"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                            )}
                          >
                            {action.action}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-medium px-2 py-0.5 rounded-full",
                              statusStyles[action.status]
                            )}
                          >
                            {action.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                          {action.shares} shares · {action.tradeDate}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          $
                          {(Number.isNaN(totalValue) ? 0 : totalValue).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {action.price}
                        </p>
                      </div>
                      <Pencil className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="p-2 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={handleAddAction}
            className={cn(
              "w-full flex items-center justify-center gap-2",
              "py-2 px-3 rounded-lg",
              "text-xs font-medium",
              "bg-gradient-to-r from-zinc-900 to-zinc-800",
              "dark:from-zinc-50 dark:to-zinc-200",
              "text-zinc-50 dark:text-zinc-900",
              "hover:from-zinc-800 hover:to-zinc-700",
              "dark:hover:from-zinc-200 dark:hover:to-zinc-300",
              "shadow-sm hover:shadow",
              "transform transition-all duration-200",
              "hover:-translate-y-0.5",
              "active:translate-y-0",
              "focus:outline-none focus:ring-2",
              "focus:ring-zinc-500 dark:focus:ring-zinc-400",
              "focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Trade</span>
          </button>
        </div>
      </div>

      <StockActionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveAction}
        onDelete={editingAction ? handleDeleteAction : undefined}
        initialData={editingAction}
      />
    </>
  )
}
