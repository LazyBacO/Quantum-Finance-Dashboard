"use client"

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react"
import {
  ACCOUNTS as DEFAULT_ACCOUNTS,
  ALLOCATION_ACTUAL as DEFAULT_ALLOCATION_ACTUAL,
  ALLOCATION_TARGETS as DEFAULT_ALLOCATION_TARGETS,
  ASSET_BREAKDOWN as DEFAULT_ASSET_BREAKDOWN,
  BUDGETS as DEFAULT_BUDGETS,
  CASHFLOW_FORECAST as DEFAULT_CASHFLOW_FORECAST,
  PERFORMANCE_METRICS as DEFAULT_PERFORMANCE_METRICS,
  RISK_METRICS as DEFAULT_RISK_METRICS,
  LIABILITY_BREAKDOWN as DEFAULT_LIABILITY_BREAKDOWN,
  NET_WORTH_HISTORY as DEFAULT_NET_WORTH_HISTORY,
  TRANSACTIONS as DEFAULT_TRANSACTIONS,
  FINANCIAL_GOALS as DEFAULT_GOALS,
  STOCK_ACTIONS as DEFAULT_STOCK_ACTIONS,
  ALERTS_THRESHOLDS as DEFAULT_ALERTS_THRESHOLDS,
  PLANNING_SCENARIOS as DEFAULT_PLANNING_SCENARIOS,
  type AllocationActual,
  type AllocationTarget,
  type NetWorthBreakdownItem,
  type NetWorthHistoryPoint,
  type PerformanceMetric,
  type RiskMetric,
  type AccountItem,
  type Transaction,
  type FinancialGoal,
  type StockAction,
  type BudgetCategory,
  type CashflowForecastPoint,
  type AlertThreshold,
  type PlanningScenario,
} from "./portfolio-data"

// LocalStorage keys for persistence
const STORAGE_KEYS = {
  STATE: "portfolio_state_v1",
  BACKUP: "portfolio_state_backup_v1",
  LEGACY_ACCOUNTS: "portfolio_accounts",
  LEGACY_TRANSACTIONS: "portfolio_transactions",
  LEGACY_GOALS: "portfolio_goals",
  LEGACY_STOCK_ACTIONS: "portfolio_stock_actions",
  LAST_SAVED: "portfolio_last_saved",
}

const canUseStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined"

type PortfolioState = {
  version: 1
  accounts: AccountItem[]
  transactions: Transaction[]
  goals: FinancialGoal[]
  stockActions: StockAction[]
  lastSaved: string
}

const isPortfolioState = (value: unknown): value is PortfolioState => {
  if (!value || typeof value !== "object") return false
  const data = value as PortfolioState
  return (
    data.version === 1 &&
    Array.isArray(data.accounts) &&
    Array.isArray(data.transactions) &&
    Array.isArray(data.goals) &&
    Array.isArray(data.stockActions) &&
    typeof data.lastSaved === "string"
  )
}

const loadJson = <T,>(key: string): { exists: boolean; value: T | null } => {
  if (!canUseStorage()) return { exists: false, value: null }
  try {
    const stored = window.localStorage.getItem(key)
    if (!stored) return { exists: false, value: null }
    return { exists: true, value: JSON.parse(stored) as T }
  } catch (error) {
    console.error(`Failed to load ${key} from localStorage:`, error)
    return { exists: true, value: null }
  }
}

const savePortfolioState = (state: PortfolioState) => {
  if (!canUseStorage()) return
  try {
    const previous = window.localStorage.getItem(STORAGE_KEYS.STATE)
    if (previous) {
      window.localStorage.setItem(STORAGE_KEYS.BACKUP, previous)
    }
    window.localStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(state))
    window.localStorage.setItem(STORAGE_KEYS.LAST_SAVED, state.lastSaved)
  } catch (error) {
    console.error("Failed to save portfolio state to localStorage:", error)
  }
}

const loadPortfolioState = () => {
  const stored = loadJson<PortfolioState>(STORAGE_KEYS.STATE)
  if (stored.exists && stored.value && isPortfolioState(stored.value)) {
    return stored.value
  }

  const backup = loadJson<PortfolioState>(STORAGE_KEYS.BACKUP)
  if (backup.exists && backup.value && isPortfolioState(backup.value)) {
    return backup.value
  }

  const legacyAccounts = loadJson<AccountItem[]>(STORAGE_KEYS.LEGACY_ACCOUNTS)
  const legacyTransactions = loadJson<Transaction[]>(STORAGE_KEYS.LEGACY_TRANSACTIONS)
  const legacyGoals = loadJson<FinancialGoal[]>(STORAGE_KEYS.LEGACY_GOALS)
  const legacyStockActions = loadJson<StockAction[]>(STORAGE_KEYS.LEGACY_STOCK_ACTIONS)
  const legacyLastSaved = loadJson<string>(STORAGE_KEYS.LAST_SAVED)

  if (
    legacyAccounts.exists ||
    legacyTransactions.exists ||
    legacyGoals.exists ||
    legacyStockActions.exists
  ) {
    return {
      version: 1,
      accounts: legacyAccounts.value ?? DEFAULT_ACCOUNTS,
      transactions: legacyTransactions.value ?? DEFAULT_TRANSACTIONS,
      goals: legacyGoals.value ?? DEFAULT_GOALS,
      stockActions: legacyStockActions.value ?? DEFAULT_STOCK_ACTIONS,
      lastSaved: legacyLastSaved.value ?? new Date().toISOString(),
    }
  }

  return null
}

interface PortfolioContextType {
  // Accounts
  accounts: AccountItem[]
  addAccount: (account: Omit<AccountItem, "id">) => void
  updateAccount: (id: string, account: Partial<AccountItem>) => void
  deleteAccount: (id: string) => void
  adjustAccountBalance: (id: string, amount: number, type: "deposit" | "withdraw") => void
  transferBetweenAccounts: (fromId: string, toId: string, amount: number) => void

  // Transactions
  transactions: Transaction[]
  addTransaction: (transaction: Omit<Transaction, "id">) => void
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void
  deleteTransaction: (id: string) => void

  // Financial Goals
  goals: FinancialGoal[]
  addGoal: (goal: Omit<FinancialGoal, "id">) => void
  updateGoal: (id: string, goal: Partial<FinancialGoal>) => void
  deleteGoal: (id: string) => void

  // Stock Actions
  stockActions: StockAction[]
  addStockAction: (action: Omit<StockAction, "id">) => void
  updateStockAction: (id: string, action: Partial<StockAction>) => void
  deleteStockAction: (id: string) => void

  // Allocation + KPIs
  allocationActual: AllocationActual[]
  allocationTargets: AllocationTarget[]
  performanceMetrics: PerformanceMetric[]
  riskMetrics: RiskMetric[]
  netWorthHistory: NetWorthHistoryPoint[]
  assetBreakdown: NetWorthBreakdownItem[]
  liabilityBreakdown: NetWorthBreakdownItem[]
  budgets: BudgetCategory[]
  cashflowForecast: CashflowForecastPoint[]
  alertsThresholds: AlertThreshold[]
  planningScenarios: PlanningScenario[]

  // Computed values
  totalBalance: string

  // Save status
  lastSaved: string | null
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined)

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const initialState = useMemo(() => loadPortfolioState(), [])
  const [accounts, setAccounts] = useState<AccountItem[]>(() => initialState?.accounts ?? DEFAULT_ACCOUNTS)
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    initialState?.transactions ?? DEFAULT_TRANSACTIONS
  )
  const [goals, setGoals] = useState<FinancialGoal[]>(() => initialState?.goals ?? DEFAULT_GOALS)
  const [stockActions, setStockActions] = useState<StockAction[]>(() =>
    initialState?.stockActions ?? DEFAULT_STOCK_ACTIONS
  )

  // Track last saved time from localStorage
  const [lastSaved, setLastSaved] = useState<string | null>(() =>
    initialState?.lastSaved ?? (canUseStorage() ? window.localStorage.getItem(STORAGE_KEYS.LAST_SAVED) : null)
  )

  // Auto-save combined state to localStorage whenever any data changes
  useEffect(() => {
    const savedAt = new Date().toISOString()
    const state: PortfolioState = {
      version: 1,
      accounts,
      transactions,
      goals,
      stockActions,
      lastSaved: savedAt,
    }
    savePortfolioState(state)
    setLastSaved(savedAt)
  }, [accounts, transactions, goals, stockActions])

  const formatCurrency = useCallback(
    (value: number) =>
      `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    []
  )

  // Account operations
  const addAccount = useCallback((account: Omit<AccountItem, "id">) => {
    const newAccount: AccountItem = {
      ...account,
      id: Date.now().toString(),
    }
    setAccounts((prev) => [...prev, newAccount])
  }, [])

  const updateAccount = useCallback((id: string, updates: Partial<AccountItem>) => {
    setAccounts((prev) =>
      prev.map((account) => (account.id === id ? { ...account, ...updates } : account))
    )
  }, [])

  const deleteAccount = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((account) => account.id !== id))
  }, [])

  const adjustAccountBalance = useCallback(
    (id: string, amount: number, type: "deposit" | "withdraw") => {
      setAccounts((prev) =>
        prev.map((account) => {
          if (account.id !== id) return account
          const current = parseFloat(account.balance.replace(/[$,]/g, ""))
          const next = type === "deposit" ? current + amount : current - amount
          return { ...account, balance: formatCurrency(next) }
        })
      )
    },
    [formatCurrency]
  )

  const transferBetweenAccounts = useCallback(
    (fromId: string, toId: string, amount: number) => {
      setAccounts((prev) =>
        prev.map((account) => {
          if (account.id !== fromId && account.id !== toId) return account
          const current = parseFloat(account.balance.replace(/[$,]/g, ""))
          const next = account.id === fromId ? current - amount : current + amount
          return { ...account, balance: formatCurrency(next) }
        })
      )
    },
    [formatCurrency]
  )

  // Transaction operations
  const addTransaction = useCallback((transaction: Omit<Transaction, "id">) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
    }
    setTransactions((prev) => [newTransaction, ...prev])
  }, [])

  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    setTransactions((prev) =>
      prev.map((transaction) =>
        transaction.id === id ? { ...transaction, ...updates } : transaction
      )
    )
  }, [])

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((transaction) => transaction.id !== id))
  }, [])

  // Goal operations
  const addGoal = useCallback((goal: Omit<FinancialGoal, "id">) => {
    const newGoal: FinancialGoal = {
      ...goal,
      id: Date.now().toString(),
    }
    setGoals((prev) => [...prev, newGoal])
  }, [])

  const updateGoal = useCallback((id: string, updates: Partial<FinancialGoal>) => {
    setGoals((prev) =>
      prev.map((goal) => (goal.id === id ? { ...goal, ...updates } : goal))
    )
  }, [])

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((goal) => goal.id !== id))
  }, [])

  // Stock actions operations
  const addStockAction = useCallback((action: Omit<StockAction, "id">) => {
    const newAction: StockAction = {
      ...action,
      id: Date.now().toString(),
    }
    setStockActions((prev) => [newAction, ...prev])
  }, [])

  const updateStockAction = useCallback((id: string, updates: Partial<StockAction>) => {
    setStockActions((prev) =>
      prev.map((action) => (action.id === id ? { ...action, ...updates } : action))
    )
  }, [])

  const deleteStockAction = useCallback((id: string) => {
    setStockActions((prev) => prev.filter((action) => action.id !== id))
  }, [])

  // Computed total balance
  const totalBalance = useMemo(() => {
    const total = accounts.reduce((sum, account) => {
      const amount = parseFloat(account.balance.replace(/[$,]/g, ""))
      if (account.type === "debt") {
        return sum - amount
      }
      return sum + amount
    }, 0)
    return `$${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }, [accounts])

  const value = useMemo(
    () => ({
      accounts,
      addAccount,
      updateAccount,
      deleteAccount,
      adjustAccountBalance,
      transferBetweenAccounts,
      transactions,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      goals,
      addGoal,
      updateGoal,
      deleteGoal,
      stockActions,
      addStockAction,
      updateStockAction,
      deleteStockAction,
      allocationActual: DEFAULT_ALLOCATION_ACTUAL,
      allocationTargets: DEFAULT_ALLOCATION_TARGETS,
      performanceMetrics: DEFAULT_PERFORMANCE_METRICS,
      riskMetrics: DEFAULT_RISK_METRICS,
      netWorthHistory: DEFAULT_NET_WORTH_HISTORY,
      assetBreakdown: DEFAULT_ASSET_BREAKDOWN,
      liabilityBreakdown: DEFAULT_LIABILITY_BREAKDOWN,
      budgets: DEFAULT_BUDGETS,
      cashflowForecast: DEFAULT_CASHFLOW_FORECAST,
      alertsThresholds: DEFAULT_ALERTS_THRESHOLDS,
      planningScenarios: DEFAULT_PLANNING_SCENARIOS,
      totalBalance,
      lastSaved,
    }),
    [
      accounts,
      addAccount,
      updateAccount,
      deleteAccount,
      adjustAccountBalance,
      transferBetweenAccounts,
      transactions,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      goals,
      addGoal,
      updateGoal,
      deleteGoal,
      stockActions,
      addStockAction,
      updateStockAction,
      deleteStockAction,
      totalBalance,
      lastSaved,
    ]
  )

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>
}

export function usePortfolio() {
  const context = useContext(PortfolioContext)
  if (context === undefined) {
    throw new Error("usePortfolio must be used within a PortfolioProvider")
  }
  return context
}
