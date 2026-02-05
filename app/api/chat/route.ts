import { streamText, convertToModelMessages } from "ai"
import type { AccountItem, Transaction, FinancialGoal, StockAction } from "@/lib/portfolio-data"

interface PortfolioData {
  accounts: AccountItem[]
  transactions: Transaction[]
  goals: FinancialGoal[]
  stockActions: StockAction[]
  totalBalance: string
}

function calculateSummary(accounts: AccountItem[]) {
  const totalSavings = accounts
    .filter((a) => a.type === "savings")
    .reduce((sum, a) => sum + parseFloat(a.balance.replace(/[$,]/g, "")), 0)

  const totalInvestments = accounts
    .filter((a) => a.type === "investment")
    .reduce((sum, a) => sum + parseFloat(a.balance.replace(/[$,]/g, "")), 0)

  const totalDebt = accounts
    .filter((a) => a.type === "debt")
    .reduce((sum, a) => sum + parseFloat(a.balance.replace(/[$,]/g, "")), 0)

  const totalChecking = accounts
    .filter((a) => a.type === "checking")
    .reduce((sum, a) => sum + parseFloat(a.balance.replace(/[$,]/g, "")), 0)

  return {
    totalSavings,
    totalInvestments,
    totalDebt,
    totalChecking,
    netWorth: totalSavings + totalInvestments + totalChecking - totalDebt,
  }
}

export async function POST(req: Request) {
  const { messages, portfolioData } = await req.json()

  // Use dynamic portfolio data if provided, otherwise use defaults
  const portfolio: PortfolioData = portfolioData || {
    accounts: [],
    transactions: [],
    goals: [],
    stockActions: [],
    totalBalance: "$0.00",
  }

  const summary = calculateSummary(portfolio.accounts)

  const systemPrompt = `You are an expert financial advisor AI assistant integrated into the user's financial dashboard. You have access to their complete financial portfolio data and can provide personalized investment advice.

## Current Portfolio Data:

### Total Balance: ${portfolio.totalBalance}

### Accounts:
${portfolio.accounts.map((a: AccountItem) => `- ${a.title} (${a.type}): ${a.balance} - ${a.description || "N/A"}`).join("\n") || "No accounts found"}

### Financial Summary:
- Total Savings: $${summary.totalSavings.toFixed(2)}
- Total Investments: $${summary.totalInvestments.toFixed(2)}
- Total Checking: $${summary.totalChecking.toFixed(2)}
- Total Debt: $${summary.totalDebt.toFixed(2)}
- Net Worth: $${summary.netWorth.toFixed(2)}

### Recent Transactions:
${portfolio.transactions.map((t: Transaction) => `- ${t.title}: ${t.type === "incoming" ? "+" : "-"}${t.amount} (${t.status}) - ${t.timestamp}`).join("\n") || "No recent transactions"}

### Financial Goals:
${portfolio.goals.map((g: FinancialGoal) => `- ${g.title}: Target ${g.amount || "N/A"}, Progress: ${g.progress || 0}%, Status: ${g.status}, ${g.date}`).join("\n") || "No goals set"}

### Stock Market Actions:
${portfolio.stockActions.map((a: StockAction) => `- ${a.symbol} ${a.action.toUpperCase()}: ${a.shares} shares @ ${a.price} (${a.status}) - ${a.tradeDate}`).join("\n") || "No stock actions"}

## Your Role:
1. Analyze the user's portfolio and provide personalized investment advice
2. Identify opportunities for portfolio optimization
3. Suggest strategies to achieve their financial goals
4. Warn about potential risks in their current allocation
5. Recommend actions to reduce debt and increase savings
6. Provide insights on spending patterns based on transactions

## Guidelines:
- Be specific and refer to actual numbers from their portfolio
- Provide actionable recommendations
- Consider risk tolerance based on their current allocation
- Be encouraging but realistic about financial goals
- Use clear, simple language avoiding excessive jargon
- When asked about specific accounts or goals, reference the exact data
- Always consider the user's debt when making investment recommendations

Remember: You are their trusted financial advisor with full visibility into their finances. Provide personalized, data-driven advice.`

  const result = streamText({
    model: "openai/gpt-4o-mini",
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
