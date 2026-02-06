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
