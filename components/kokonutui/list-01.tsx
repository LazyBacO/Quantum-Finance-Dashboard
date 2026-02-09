"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import {
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  SendHorizontal,
  QrCode,
  Plus,
  ArrowRight,
  CreditCard,
  Pencil,
} from "lucide-react"
import { usePortfolio } from "@/lib/portfolio-context"
import { AccountModal } from "./portfolio-modals"
import { formatCurrencyFromCents, type AccountItem } from "@/lib/portfolio-data"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface List01Props {
  className?: string
}

export default function List01({ className }: List01Props) {
  const {
    accounts,
    totalBalance,
    addAccount,
    updateAccount,
    deleteAccount,
    transferBetweenAccounts,
    adjustAccountBalance,
  } = usePortfolio()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<AccountItem | undefined>(undefined)
  const [isSendOpen, setIsSendOpen] = useState(false)
  const [isTopUpOpen, setIsTopUpOpen] = useState(false)
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const [sendForm, setSendForm] = useState({ fromId: "", toId: "", amount: "" })
  const [topUpForm, setTopUpForm] = useState({ accountId: "", amount: "" })
  const [withdrawForm, setWithdrawForm] = useState({ accountId: "", amount: "" })
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (accounts.length === 0) {
      setSendForm({ fromId: "", toId: "", amount: "" })
      setTopUpForm({ accountId: "", amount: "" })
      setWithdrawForm({ accountId: "", amount: "" })
      return
    }

    setTopUpForm((current) => ({
      accountId: current.accountId || accounts[0].id,
      amount: current.amount,
    }))
    setWithdrawForm((current) => ({
      accountId: current.accountId || accounts[0].id,
      amount: current.amount,
    }))

    if (accounts.length > 1) {
      setSendForm((current) => ({
        fromId: current.fromId || accounts[0].id,
        toId: current.toId || accounts[1].id,
        amount: current.amount,
      }))
    }
  }, [accounts])

  const accountTotals = accounts.reduce(
    (totals, account) => {
      totals[account.type] += account.balanceCents
      return totals
    },
    {
      savings: 0,
      checking: 0,
      investment: 0,
      debt: 0,
    }
  )

  const handleAddAccount = () => {
    setEditingAccount(undefined)
    setIsModalOpen(true)
  }

  const handleEditAccount = (account: AccountItem) => {
    setEditingAccount(account)
    setIsModalOpen(true)
  }

  const handleSaveAccount = (accountData: Omit<AccountItem, "id">) => {
    if (editingAccount) {
      updateAccount(editingAccount.id, accountData)
    } else {
      addAccount(accountData)
    }
  }

  const handleDeleteAccount = () => {
    if (editingAccount) {
      deleteAccount(editingAccount.id)
    }
  }

  const handleSendSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const amount = Number.parseFloat(sendForm.amount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setActionError("Le montant doit être supérieur à 0.")
      return
    }
    if (!sendForm.fromId || !sendForm.toId || sendForm.fromId === sendForm.toId) {
      setActionError("Sélectionnez deux comptes différents.")
      return
    }

    transferBetweenAccounts(sendForm.fromId, sendForm.toId, amount)
    setActionError(null)
    setSendForm((current) => ({ ...current, amount: "" }))
    setIsSendOpen(false)
  }

  const handleTopUpSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const amount = Number.parseFloat(topUpForm.amount)
    if (!topUpForm.accountId || !Number.isFinite(amount) || amount <= 0) {
      setActionError("Choisissez un compte et un montant valide.")
      return
    }

    adjustAccountBalance(topUpForm.accountId, amount, "deposit")
    setActionError(null)
    setTopUpForm((current) => ({ ...current, amount: "" }))
    setIsTopUpOpen(false)
  }

  const handleWithdrawSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const amount = Number.parseFloat(withdrawForm.amount)
    if (!withdrawForm.accountId || !Number.isFinite(amount) || amount <= 0) {
      setActionError("Choisissez un compte et un montant valide.")
      return
    }

    adjustAccountBalance(withdrawForm.accountId, amount, "withdraw")
    setActionError(null)
    setWithdrawForm((current) => ({ ...current, amount: "" }))
    setIsMoreOpen(false)
  }

  return (
    <>
      <div
        className={cn(
          "w-full",
          "fx-panel",
          className
        )}
      >
        {/* Total Balance Section */}
        <div className="p-4 border-b border-border/60">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Balance</p>
          <h1 className="text-3xl md:text-4xl font-semibold text-foreground leading-tight">{totalBalance}</h1>
          <p className="text-[11px] text-muted-foreground/80 mt-1">All accounts combined</p>
          <p className="text-[10px] uppercase tracking-wide text-emerald-500/90 mt-2">Net +2.4% vs last month</p>
        </div>

        <div className="px-4 py-3 border-b border-border/60">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/10 px-3 py-2">
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">Savings</p>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                {formatCurrencyFromCents(accountTotals.savings)}
              </p>
            </div>
            <div className="rounded-lg border border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/10 px-3 py-2">
              <p className="text-[11px] text-blue-700 dark:text-blue-300">Checking</p>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                {formatCurrencyFromCents(accountTotals.checking)}
              </p>
            </div>
            <div className="rounded-lg border border-purple-100 dark:border-purple-900/40 bg-purple-50 dark:bg-purple-900/10 px-3 py-2">
              <p className="text-[11px] text-purple-700 dark:text-purple-300">Investments</p>
              <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                {formatCurrencyFromCents(accountTotals.investment)}
              </p>
            </div>
            <div className="rounded-lg border border-rose-100 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-900/10 px-3 py-2">
              <p className="text-[11px] text-rose-700 dark:text-rose-300">Debt</p>
              <p className="text-sm font-semibold text-rose-900 dark:text-rose-100">
                {formatCurrencyFromCents(accountTotals.debt)}
              </p>
            </div>
          </div>
        </div>

        {/* Accounts List */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-medium text-foreground">Your Accounts</h2>
          </div>

          <div className="space-y-1">
            {accounts.map((account) => (
              <div
                key={account.id}
                className={cn(
                  "group flex items-center justify-between",
                  "p-2 rounded-lg",
                  "hover:bg-accent/60",
                  "transition-all duration-200",
                  "hover:-translate-y-0.5 hover:shadow-sm",
                  "active:translate-y-0",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  "cursor-pointer"
                )}
                onClick={() => handleEditAccount(account)}
                onKeyDown={(e) => e.key === "Enter" && handleEditAccount(account)}
                tabIndex={0}
                role="button"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn("p-1.5 rounded-lg", {
                      "bg-emerald-100 dark:bg-emerald-900/30": account.type === "savings",
                      "bg-blue-100 dark:bg-blue-900/30": account.type === "checking",
                      "bg-purple-100 dark:bg-purple-900/30": account.type === "investment",
                      "bg-red-100 dark:bg-red-900/30": account.type === "debt",
                    })}
                  >
                    {account.type === "savings" && (
                      <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    )}
                    {account.type === "checking" && (
                      <QrCode className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    )}
                    {account.type === "investment" && (
                      <ArrowUpRight className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    )}
                    {account.type === "debt" && (
                      <CreditCard className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-medium text-foreground">{account.title}</h3>
                    {account.description && (
                      <p className="text-[11px] text-muted-foreground">{account.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {formatCurrencyFromCents(account.balanceCents)}
                  </span>
                  <Pencil className="w-3 h-3 text-muted-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Updated footer with four buttons */}
        <div className="p-2 border-t border-border/60">
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={handleAddAccount}
              className={cn(
                "flex items-center justify-center gap-1.5",
                "py-2 px-2.5 rounded-lg",
                "text-[11px] font-semibold uppercase tracking-wide",
                "border border-border/60",
                "bg-primary text-primary-foreground",
                "hover:bg-primary/90",
                "shadow-sm hover:shadow",
                "transition-all duration-200"
              )}
              aria-label="Add account"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (accounts.length < 2) {
                  setActionError("Au moins deux comptes sont nécessaires pour envoyer un transfert.")
                  return
                }
                setActionError(null)
                setIsSendOpen(true)
              }}
              className={cn(
                "flex items-center justify-center gap-1.5",
                "py-2 px-2.5 rounded-lg",
                "text-[11px] font-semibold uppercase tracking-wide",
                "border border-border/60",
                "bg-background/40 text-foreground/80",
                "hover:bg-accent/60 hover:text-foreground",
                "shadow-sm hover:shadow",
                "transition-all duration-200"
              )}
              aria-label="Send money"
            >
              <SendHorizontal className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (accounts.length === 0) {
                  setActionError("Aucun compte disponible pour effectuer un top-up.")
                  return
                }
                setActionError(null)
                setIsTopUpOpen(true)
              }}
              className={cn(
                "flex items-center justify-center gap-1.5",
                "py-2 px-2.5 rounded-lg",
                "text-[11px] font-semibold uppercase tracking-wide",
                "border border-border/60",
                "bg-background/40 text-foreground/80",
                "hover:bg-accent/60 hover:text-foreground",
                "shadow-sm hover:shadow",
                "transition-all duration-200"
              )}
              aria-label="Top up account"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Top-up</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActionError(null)
                setIsMoreOpen(true)
              }}
              className={cn(
                "flex items-center justify-center gap-1.5",
                "py-2 px-2.5 rounded-lg",
                "text-[11px] font-semibold uppercase tracking-wide",
                "border border-border/60",
                "bg-background/40 text-foreground/80",
                "hover:bg-accent/60 hover:text-foreground",
                "shadow-sm hover:shadow",
                "transition-all duration-200"
              )}
              aria-label="More actions"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>More</span>
            </button>
          </div>
          {actionError && <p className="mt-2 text-[11px] text-rose-600">{actionError}</p>}
        </div>
      </div>

      <AccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveAccount}
        onDelete={editingAccount ? handleDeleteAccount : undefined}
        initialData={editingAccount}
      />

      <Dialog open={isSendOpen} onOpenChange={setIsSendOpen}>
        <DialogContent className="border-border/60 bg-background/95">
          <DialogHeader>
            <DialogTitle>Envoyer entre comptes</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleSendSubmit}>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Compte source</label>
              <select
                value={sendForm.fromId}
                onChange={(event) => setSendForm((current) => ({ ...current, fromId: event.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Compte destinataire</label>
              <select
                value={sendForm.toId}
                onChange={(event) => setSendForm((current) => ({ ...current, toId: event.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Montant (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={sendForm.amount}
                onChange={(event) => setSendForm((current) => ({ ...current, amount: event.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                placeholder="100.00"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md border border-border/60 bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Envoyer
            </button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
        <DialogContent className="border-border/60 bg-background/95">
          <DialogHeader>
            <DialogTitle>Top-up d&apos;un compte</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleTopUpSubmit}>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Compte</label>
              <select
                value={topUpForm.accountId}
                onChange={(event) =>
                  setTopUpForm((current) => ({ ...current, accountId: event.target.value }))
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Montant (USD)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={topUpForm.amount}
                onChange={(event) => setTopUpForm((current) => ({ ...current, amount: event.target.value }))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                placeholder="250.00"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md border border-border/60 bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Confirmer le top-up
            </button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <DialogContent className="border-border/60 bg-background/95">
          <DialogHeader>
            <DialogTitle>Actions supplémentaires</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <form className="space-y-3" onSubmit={handleWithdrawSubmit}>
              <p className="text-xs font-semibold text-foreground">Retrait rapide</p>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Compte</label>
                <select
                  value={withdrawForm.accountId}
                  onChange={(event) =>
                    setWithdrawForm((current) => ({ ...current, accountId: event.target.value }))
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Montant du retrait (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={withdrawForm.amount}
                  onChange={(event) =>
                    setWithdrawForm((current) => ({ ...current, amount: event.target.value }))
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  placeholder="120.00"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-md border border-border/60 bg-accent px-3 py-2 text-sm font-medium text-foreground hover:bg-accent/80"
              >
                Effectuer le retrait
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                addAccount({
                  title: "Nouveau compte épargne",
                  description: "Ajout rapide",
                  balanceCents: 0,
                  type: "savings",
                })
                setIsMoreOpen(false)
              }}
              className="w-full rounded-md border border-border/60 bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Créer un compte épargne rapide
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
