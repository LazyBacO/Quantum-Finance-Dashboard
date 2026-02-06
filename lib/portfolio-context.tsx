"use client"

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react"
import {
  ACCOUNTS as DEFAULT_ACCOUNTS,
  TRANSACTIONS as DEFAULT_TRANSACTIONS,
  FINANCIAL_GOALS as DEFAULT_GOALS,
  STOCK_ACTIONS as DEFAULT_STOCK_ACTIONS,
  type AccountItem,
  type Transaction,
  type FinancialGoal,
  type StockAction,
} from "./portfolio-data"

// LocalStorage keys for persistence
const STORAGE_KEYS = {
  ACCOUNTS: "portfolio_accounts",
  TRANSACTIONS: "portfolio_transactions",
  GOALS: "portfolio_goals",
  STOCK_ACTIONS: "portfolio_stock_actions",
  LAST_SAVED: "portfolio_last_saved",
}

const canUseStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined"

// Helper functions for localStorage
const saveToStorage = (key: string, data: unknown) => {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(key, JSON.stringify(data))
    window.localStorage.setItem(STORAGE_KEYS.LAST_SAVED, new Date().toISOString())
  } catch (error) {
    console.error(`Failed to save ${key} to localStorage:`, error)
  }
}

const loadFromStorage = (key: string, fallback: unknown) => {
  if (!canUseStorage()) return fallback
  try {
    const stored = window.localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch (error) {
    console.error(`Failed to load ${key} from localStorage:`, error)
    return fallback
  }
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

  // Computed values
  totalBalance: string

  // Save status
  lastSaved: string | null
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined)

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<AccountItem[]>(() =>
    loadFromStorage(STORAGE_KEYS.ACCOUNTS, DEFAULT_ACCOUNTS)
  )
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    loadFromStorage(STORAGE_KEYS.TRANSACTIONS, DEFAULT_TRANSACTIONS)
  )
  const [goals, setGoals] = useState<FinancialGoal[]>(() =>
    loadFromStorage(STORAGE_KEYS.GOALS, DEFAULT_GOALS)
  )
  const [stockActions, setStockActions] = useState<StockAction[]>(() =>
    loadFromStorage(STORAGE_KEYS.STOCK_ACTIONS, DEFAULT_STOCK_ACTIONS)
  )

  // Auto-save accounts to localStorage whenever they change
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ACCOUNTS, accounts)
  }, [accounts])

  // Auto-save transactions to localStorage whenever they change
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, transactions)
  }, [transactions])

  // Auto-save goals to localStorage whenever they change
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.GOALS, goals)
  }, [goals])

  // Auto-save stock actions to localStorage whenever they change
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.STOCK_ACTIONS, stockActions)
  }, [stockActions])

  // Track last saved time from localStorage
  const [lastSaved, setLastSaved] = useState<string | null>(() =>
    canUseStorage() ? window.localStorage.getItem(STORAGE_KEYS.LAST_SAVED) : null
  )

  // Update lastSaved whenever any data changes
  useEffect(() => {
    if (!canUseStorage()) return
    const saved = window.localStorage.getItem(STORAGE_KEYS.LAST_SAVED)
    setLastSaved(saved)
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
