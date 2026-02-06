// Centralized portfolio data that can be shared with AI advisor

export interface AccountItem {
  id: string
  title: string
  description?: string
  balance: string
  type: "savings" | "checking" | "investment" | "debt"
}

export interface Transaction {
  id: string
  title: string
  amount: string
  type: "incoming" | "outgoing"
  category: string
  timestamp: string
  status: "completed" | "pending" | "failed"
}

export interface FinancialGoal {
  id: string
  title: string
  subtitle: string
  iconStyle: string
  date: string
  amount?: string
  status: "pending" | "in-progress" | "completed"
  progress?: number
}

export interface StockAction {
  id: string
  symbol: string
  action: "buy" | "sell"
  shares: number
  price: string
  tradeDate: string
  status: "executed" | "pending" | "cancelled"
}

export interface AllocationActual {
  id: string
  label: string
  actual: number
  colorClass: string
}

export interface AllocationTarget {
  id: string
  label: string
  target: number
}

export interface PerformanceMetric {
  id: string
  label: string
  value: string
  note?: string
}

export interface RiskMetric {
  id: string
  label: string
  value: string
  note?: string
}

export interface NetWorthHistoryPoint {
  id: string
  label: string
  value: number
}

export interface NetWorthBreakdownItem {
  id: string
  label: string
  value: number
  description?: string
  colorClass?: string
}

export const ACCOUNTS: AccountItem[] = [
  {
    id: "1",
    title: "Main Savings",
    description: "Personal savings",
    balance: "$8,459.45",
    type: "savings",
  },
  {
    id: "2",
    title: "Checking Account",
    description: "Daily expenses",
    balance: "$2,850.00",
    type: "checking",
  },
  {
    id: "3",
    title: "Investment Portfolio",
    description: "Stock & ETFs",
    balance: "$15,230.80",
    type: "investment",
  },
  {
    id: "4",
    title: "Credit Card",
    description: "Pending charges",
    balance: "$1,200.00",
    type: "debt",
  },
  {
    id: "5",
    title: "Savings Account",
    description: "Emergency fund",
    balance: "$3,000.00",
    type: "savings",
  },
]

export const TRANSACTIONS: Transaction[] = [
  {
    id: "1",
    title: "Dividend Payment - AAPL",
    amount: "$125.50",
    type: "incoming",
    category: "investment",
    timestamp: "Today, 2:45 PM",
    status: "completed",
  },
  {
    id: "2",
    title: "Salary Deposit",
    amount: "$4,500.00",
    type: "incoming",
    category: "income",
    timestamp: "Today, 9:00 AM",
    status: "completed",
  },
  {
    id: "3",
    title: "Stock Purchase - NVDA",
    amount: "$850.00",
    type: "outgoing",
    category: "investment",
    timestamp: "Yesterday, 3:30 PM",
    status: "completed",
  },
  {
    id: "4",
    title: "Amazon Purchase",
    amount: "$156.99",
    type: "outgoing",
    category: "shopping",
    timestamp: "Yesterday, 11:20 AM",
    status: "completed",
  },
  {
    id: "5",
    title: "Electric Bill",
    amount: "$142.50",
    type: "outgoing",
    category: "utilities",
    timestamp: "Feb 2, 2026",
    status: "completed",
  },
  {
    id: "6",
    title: "Credit Card Payment",
    amount: "$500.00",
    type: "outgoing",
    category: "debt",
    timestamp: "Feb 1, 2026",
    status: "completed",
  },
]

export const FINANCIAL_GOALS: FinancialGoal[] = [
  {
    id: "1",
    title: "Emergency Fund",
    subtitle: "3 months of expenses saved",
    iconStyle: "savings",
    date: "Target: Dec 2026",
    amount: "$15,000",
    status: "in-progress",
    progress: 65,
  },
  {
    id: "2",
    title: "Stock Portfolio",
    subtitle: "Tech sector investment plan",
    iconStyle: "investment",
    date: "Target: Jun 2026",
    amount: "$50,000",
    status: "pending",
    progress: 30,
  },
  {
    id: "3",
    title: "Debt Repayment",
    subtitle: "Credit card payoff plan",
    iconStyle: "debt",
    date: "Target: Mar 2027",
    amount: "$25,000",
    status: "in-progress",
    progress: 45,
  },
]

export const STOCK_ACTIONS: StockAction[] = [
  {
    id: "1",
    symbol: "AAPL",
    action: "buy",
    shares: 12,
    price: "$182.45",
    tradeDate: "Mar 2, 2026",
    status: "executed",
  },
  {
    id: "2",
    symbol: "TSLA",
    action: "sell",
    shares: 6,
    price: "$236.10",
    tradeDate: "Feb 28, 2026",
    status: "pending",
  },
  {
    id: "3",
    symbol: "MSFT",
    action: "buy",
    shares: 4,
    price: "$413.22",
    tradeDate: "Feb 25, 2026",
    status: "executed",
  },
]

export const ALLOCATION_ACTUAL: AllocationActual[] = [
  {
    id: "equities",
    label: "Actions",
    actual: 48,
    colorClass: "bg-emerald-500",
  },
  {
    id: "bonds",
    label: "Obligations",
    actual: 24,
    colorClass: "bg-blue-500",
  },
  {
    id: "cash",
    label: "Cash",
    actual: 12,
    colorClass: "bg-amber-500",
  },
  {
    id: "crypto",
    label: "Crypto",
    actual: 8,
    colorClass: "bg-purple-500",
  },
  {
    id: "real-estate",
    label: "Immobilier",
    actual: 8,
    colorClass: "bg-rose-500",
  },
]

export const ALLOCATION_TARGETS: AllocationTarget[] = [
  {
    id: "equities",
    label: "Actions",
    target: 50,
  },
  {
    id: "bonds",
    label: "Obligations",
    target: 25,
  },
  {
    id: "cash",
    label: "Cash",
    target: 10,
  },
  {
    id: "crypto",
    label: "Crypto",
    target: 5,
  },
  {
    id: "real-estate",
    label: "Immobilier",
    target: 10,
  },
]

export const PERFORMANCE_METRICS: PerformanceMetric[] = [
  {
    id: "ytd",
    label: "YTD",
    value: "+8.4%",
    note: "vs bench +1.2%",
  },
  {
    id: "one-year",
    label: "1Y",
    value: "+14.6%",
    note: "vs bench +2.4%",
  },
  {
    id: "five-year",
    label: "5Y",
    value: "+42.3%",
    note: "annualisé 7.3%",
  },
  {
    id: "annualized",
    label: "Annualisée",
    value: "7.3%",
    note: "sur 5 ans",
  },
  {
    id: "benchmark",
    label: "Vs Benchmark",
    value: "+1.8%",
    note: "allocation cible",
  },
]

export const RISK_METRICS: RiskMetric[] = [
  {
    id: "volatility",
    label: "Volatilité",
    value: "11.4%",
    note: "12 mois glissants",
  },
  {
    id: "max-drawdown",
    label: "Drawdown max",
    value: "-9.2%",
    note: "depuis 3 ans",
  },
  {
    id: "sharpe",
    label: "Ratio de Sharpe",
    value: "0.86",
    note: "RF 2.1%",
  },
]

export const ASSET_BREAKDOWN: NetWorthBreakdownItem[] = [
  {
    id: "cash",
    label: "Cash",
    description: "Comptes courants & épargne",
    value: 12450,
    colorClass: "bg-emerald-500",
  },
  {
    id: "investments",
    label: "Investissements",
    description: "ETF, actions, obligations",
    value: 38400,
    colorClass: "bg-blue-500",
  },
  {
    id: "real-estate",
    label: "Immobilier",
    description: "Résidence principale",
    value: 185000,
    colorClass: "bg-purple-500",
  },
  {
    id: "other-assets",
    label: "Autres",
    description: "Véhicules, participations",
    value: 12500,
    colorClass: "bg-amber-500",
  },
]

export const LIABILITY_BREAKDOWN: NetWorthBreakdownItem[] = [
  {
    id: "mortgage",
    label: "Crédits",
    description: "Crédit immobilier",
    value: 142000,
    colorClass: "bg-rose-500",
  },
  {
    id: "credit-cards",
    label: "Cartes",
    description: "Cartes de crédit",
    value: 5200,
    colorClass: "bg-orange-500",
  },
  {
    id: "loans",
    label: "Prêts",
    description: "Prêt auto & personnel",
    value: 9800,
    colorClass: "bg-red-500",
  },
]

export const NET_WORTH_HISTORY: NetWorthHistoryPoint[] = [
  { id: "jan", label: "Jan", value: 82000 },
  { id: "feb", label: "Fév", value: 84500 },
  { id: "mar", label: "Mar", value: 87250 },
  { id: "apr", label: "Avr", value: 90500 },
  { id: "may", label: "Mai", value: 93200 },
  { id: "jun", label: "Juin", value: 96800 },
  { id: "jul", label: "Juil", value: 100400 },
  { id: "aug", label: "Août", value: 103250 },
  { id: "sep", label: "Sep", value: 108900 },
  { id: "oct", label: "Oct", value: 112600 },
  { id: "nov", label: "Nov", value: 116300 },
  { id: "dec", label: "Déc", value: 120150 },
]

export const TOTAL_BALANCE = "$26,540.25"

// Helper function to get portfolio summary for AI
export function getPortfolioSummary() {
  const totalSavings = ACCOUNTS.filter(a => a.type === "savings")
    .reduce((sum, a) => sum + parseFloat(a.balance.replace(/[$,]/g, "")), 0)
  
  const totalInvestments = ACCOUNTS.filter(a => a.type === "investment")
    .reduce((sum, a) => sum + parseFloat(a.balance.replace(/[$,]/g, "")), 0)
  
  const totalDebt = ACCOUNTS.filter(a => a.type === "debt")
    .reduce((sum, a) => sum + parseFloat(a.balance.replace(/[$,]/g, "")), 0)
  
  const totalChecking = ACCOUNTS.filter(a => a.type === "checking")
    .reduce((sum, a) => sum + parseFloat(a.balance.replace(/[$,]/g, "")), 0)

  const recentIncome = TRANSACTIONS.filter(t => t.type === "incoming")
    .reduce((sum, t) => sum + parseFloat(t.amount.replace(/[$,]/g, "")), 0)
  
  const recentExpenses = TRANSACTIONS.filter(t => t.type === "outgoing")
    .reduce((sum, t) => sum + parseFloat(t.amount.replace(/[$,]/g, "")), 0)

  return {
    totalBalance: TOTAL_BALANCE,
    accounts: ACCOUNTS,
    transactions: TRANSACTIONS,
    financialGoals: FINANCIAL_GOALS,
    summary: {
      totalSavings,
      totalInvestments,
      totalDebt,
      totalChecking,
      recentIncome,
      recentExpenses,
      netWorth: totalSavings + totalInvestments + totalChecking - totalDebt,
    }
  }
}
