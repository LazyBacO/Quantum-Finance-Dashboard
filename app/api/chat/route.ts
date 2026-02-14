import { streamText, convertToModelMessages } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { z } from "zod"
import { chatRateLimiter, createClientIdentifier, rateLimitMaxRequests } from "@/lib/chat-rate-limiter"
import {
  centsToDollars,
  formatCurrencyFromCents,
  formatMonthYearFromIso,
  formatRelativeTimestampFromIso,
  formatShortDateFromIso,
  type AccountItem,
  type Transaction,
  type FinancialGoal,
  type StockAction,
} from "@/lib/portfolio-data"

interface PortfolioData {
  accounts: AccountItem[]
  transactions: Transaction[]
  goals: FinancialGoal[]
  stockActions: StockAction[]
  totalBalance: string
}

const accountSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().min(1).max(120),
  description: z.string().max(240).optional(),
  balanceCents: z.number().int().safe(),
  type: z.enum(["savings", "checking", "investment", "debt"]),
})

const transactionSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().min(1).max(160),
  amountCents: z.number().int().safe(),
  type: z.enum(["incoming", "outgoing"]),
  category: z.string().min(1).max(80),
  timestampIso: z.string().min(1).max(80),
  status: z.enum(["completed", "pending", "failed"]),
})

const goalSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().min(1).max(120),
  subtitle: z.string().min(1).max(180),
  iconStyle: z.string().min(1).max(40),
  targetDateIso: z.string().min(1).max(80),
  targetAmountCents: z.number().int().safe().optional(),
  status: z.enum(["pending", "in-progress", "completed"]),
  progress: z.number().min(0).max(100).optional(),
})

const stockActionSchema = z.object({
  id: z.string().min(1).max(100),
  symbol: z.string().min(1).max(20),
  action: z.enum(["buy", "sell"]),
  shares: z.number().nonnegative(),
  priceCents: z.number().int().safe(),
  tradeDateIso: z.string().min(1).max(80),
  status: z.enum(["executed", "pending", "cancelled"]),
})

const portfolioSchema = z.object({
  accounts: z.array(accountSchema).max(100),
  transactions: z.array(transactionSchema).max(500),
  goals: z.array(goalSchema).max(100),
  stockActions: z.array(stockActionSchema).max(500),
  totalBalance: z.string().min(1).max(40),
})

const allocationVectorSchema = z.object({
  equities: z.number().min(0).max(100),
  bonds: z.number().min(0).max(100),
  cash: z.number().min(0).max(100),
  alternatives: z.number().min(0).max(100),
})

const growthToolkitSchema = z.object({
  version: z.literal(1),
  riskProfile: z.enum(["conservative", "balanced", "growth", "aggressive"]),
  horizonYears: z.number().int().min(3).max(50),
  emergencyFundMonths: z.number().int().min(0).max(24),
  maxDrawdownPct: z.number().min(5).max(70),
  savingsRatePct: z.number().min(0).max(80),
  rebalanceThresholdPct: z.number().min(1).max(20),
  targetAllocation: allocationVectorSchema,
  currentAllocation: allocationVectorSchema,
  simulation: z.object({
    initialCapital: z.number().nonnegative(),
    annualContribution: z.number().nonnegative(),
    expectedReturnPct: z.number().min(-20).max(30),
    annualVolatilityPct: z.number().min(0).max(60),
    inflationPct: z.number().min(-5).max(20),
    targetCapital: z.number().positive(),
    simulations: z.number().int().min(100).max(10000),
  }),
})

const tradingOverviewSchema = z.object({
  account: z.object({
    cashCents: z.number().int(),
    positionsValueCents: z.number().int(),
    equityCents: z.number().int(),
    realizedPnlCents: z.number().int(),
    buyingPowerCents: z.number().int(),
  }),
  policy: z.object({
    maxPositionPct: z.number().min(1).max(100),
    maxOrderNotionalCents: z.number().int().positive(),
    allowShort: z.boolean(),
    blockedSymbols: z.array(z.string().min(1).max(12)).max(200),
    maxOpenPositions: z.number().int().min(1).max(200),
    maxDailyLossCents: z.number().int().nonnegative(),
    maxDrawdownPct: z.number().min(5).max(90),
    killSwitchEnabled: z.boolean(),
  }),
  positions: z
    .array(
      z.object({
        symbol: z.string().min(1).max(12),
        quantity: z.number(),
        avgPriceCents: z.number().int().nonnegative(),
        marketPriceCents: z.number().int().positive(),
        marketValueCents: z.number().int(),
        unrealizedPnlCents: z.number().int(),
      })
    )
    .max(500),
  recentOrders: z
    .array(
      z.object({
        id: z.string().min(1).max(120),
        symbol: z.string().min(1).max(12),
        side: z.enum(["buy", "sell"]),
        quantity: z.number().positive(),
        type: z.enum(["market", "limit"]),
        status: z.enum(["filled", "rejected", "cancelled", "open"]),
        requestedAt: z.string().datetime({ offset: true }),
        executedAt: z.string().datetime({ offset: true }).nullable(),
        fillPriceCents: z.number().int().positive().nullable(),
        notionalCents: z.number().int().nonnegative(),
        reason: z.string().max(400).optional(),
        idempotencyKey: z.string().min(1).max(120).optional(),
        source: z.enum(["ui", "api", "ai"]).optional(),
      })
    )
    .max(100),
  risk: z.object({
    level: z.enum(["ok", "watch", "restrict", "halt"]),
    canTrade: z.boolean(),
    canOpenNewRisk: z.boolean(),
    killSwitch: z.boolean(),
    peakEquityCents: z.number().int(),
    currentEquityCents: z.number().int(),
    drawdownPct: z.number().min(0).max(100),
    rejectedOrders24h: z.number().int().nonnegative(),
    signals: z
      .array(
        z.object({
          code: z.string().min(1).max(64),
          severity: z.enum(["info", "warning", "critical"]),
          message: z.string().min(1).max(400),
        })
      )
      .max(20),
  }),
})

const stockIntelligenceSchema = z.object({
  summary: z.string().max(6000),
  registry: z.object({
    stats: z.object({
      totalInvested: z.number(),
      totalRealizedGainLoss: z.number(),
      totalRealizedReturnPct: z.number(),
      avgReturnClosed: z.number(),
      activePositions: z.number().int().nonnegative(),
      closedPositions: z.number().int().nonnegative(),
      totalTrades: z.number().int().nonnegative(),
      winRate: z.number().min(0).max(100),
      bestTrade: z
        .object({
          action: z.object({
            symbol: z.string().min(1).max(20),
          }),
          realizedGainLossPercent: z.number().optional(),
        })
        .nullable(),
      worstTrade: z
        .object({
          action: z.object({
            symbol: z.string().min(1).max(20),
          }),
          realizedGainLossPercent: z.number().optional(),
        })
        .nullable(),
    }),
    activePositions: z
      .array(
        z.object({
          id: z.string().min(1).max(200),
          symbol: z.string().min(1).max(20),
          side: z.enum(["buy", "sell"]),
          shares: z.number().positive(),
          entryPrice: z.number().positive(),
          signal: z.enum(["strong-buy", "buy", "hold", "sell", "strong-sell"]),
          confidence: z.number().min(0).max(100),
          riskScore: z.number().min(0).max(100),
          targetPrice: z.number().positive(),
          stopLoss: z.number().positive().nullable(),
          potentialReturn: z.number(),
        })
      )
      .max(100),
    recentAnalyses: z
      .array(
        z.object({
          id: z.string().min(1).max(200),
          symbol: z.string().min(1).max(20),
          signal: z.enum(["strong-buy", "buy", "hold", "sell", "strong-sell"]),
          confidence: z.number().min(0).max(100),
          createdAt: z.string().min(1).max(80),
          status: z.enum(["active", "closed", "archived"]),
          potentialReturn: z.number(),
        })
      )
      .max(200),
  }),
  alerts: z.object({
    activeCount: z.number().int().nonnegative(),
    criticalCount: z.number().int().nonnegative(),
    warningCount: z.number().int().nonnegative(),
    active: z
      .array(
        z.object({
          id: z.string().min(1).max(200),
          symbol: z.string().min(1).max(20),
          type: z.enum(["price-target", "rsi-signal", "volatility", "trend", "news"]),
          severity: z.enum(["info", "warning", "critical"]),
          condition: z.string().max(400),
          message: z.string().max(400),
          createdAt: z.string().max(80),
        })
      )
      .max(100),
    recentTriggered: z
      .array(
        z.object({
          id: z.string().min(1).max(200),
          symbol: z.string().min(1).max(20),
          severity: z.enum(["info", "warning", "critical"]),
          message: z.string().max(400),
          triggeredAt: z.string().max(80).optional(),
          currentValue: z.number().optional(),
        })
      )
      .max(100),
  }),
})

const aiFinancePrioritySchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(200),
  reason: z.string().min(1).max(600),
  severity: z.enum(["critical", "high", "medium", "low"]),
  metricLabel: z.string().min(1).max(120),
  metricValue: z.string().min(1).max(120),
  nextAction: z.string().min(1).max(600),
})

const aiFinanceIntelligenceSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string().datetime({ offset: true }),
  scores: z.object({
    financialHealth: z.number().min(0).max(100),
    riskControl: z.number().min(0).max(100),
    executionConsistency: z.number().min(0).max(100),
  }),
  metrics: z.object({
    netWorthUsd: z.number(),
    cashUsd: z.number(),
    debtUsd: z.number(),
    monthlyIncomeUsd: z.number(),
    monthlyExpenseUsd: z.number(),
    monthlyNetUsd: z.number(),
    savingsRatePct: z.number(),
    debtToCashRatio: z.number().min(0),
    emergencyFundMonths: z.number().min(0),
    portfolioConcentrationPct: z.number().min(0).max(100),
    activeTradingPositions: z.number().int().nonnegative(),
    realizedTradingPnlUsd: z.number(),
    stockAlertsActive: z.number().int().nonnegative(),
    stockAlertsCritical: z.number().int().nonnegative(),
    goalsCompletionPct: z.number().min(0).max(100),
  }),
  priorities: z.array(aiFinancePrioritySchema).max(12),
  opportunities: z.array(z.string().min(1).max(600)).max(12),
  constraints: z.array(z.string().min(1).max(600)).max(12),
})

const messageSchema = z
  .object({
    id: z.string().min(1).max(100).optional(),
    role: z.enum(["system", "user", "assistant", "tool"]),
    parts: z
      .array(
        z
          .object({
            type: z.string().min(1).max(32),
          })
          .passthrough()
      )
      .max(50)
      .optional(),
    content: z.unknown().optional(),
  })
  .passthrough()
  .refine((message) => message.parts !== undefined || message.content !== undefined, {
    message: "Each message must include parts or content.",
  })

const requestSchema = z
  .object({
    id: z.string().min(1).max(100).optional(),
    messages: z.array(messageSchema).min(1).max(60),
    portfolioData: portfolioSchema.optional(),
    uiLocale: z.enum(["fr", "en"]).optional(),
    growthToolkit: growthToolkitSchema.optional(),
    tradingOverview: tradingOverviewSchema.optional(),
    stockIntelligence: stockIntelligenceSchema.optional(),
    aiFinanceIntelligence: aiFinanceIntelligenceSchema.optional(),
  })
  .strict()

const DEFAULT_PORTFOLIO: PortfolioData = {
  accounts: [],
  transactions: [],
  goals: [],
  stockActions: [],
  totalBalance: "$0.00",
}

function jsonResponse(payload: unknown, status: number, headers?: HeadersInit) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  })
}

function calculateSummary(accounts: AccountItem[]) {
  const totalSavings = centsToDollars(
    accounts
      .filter((a) => a.type === "savings")
      .reduce((sum, a) => sum + a.balanceCents, 0)
  )

  const totalInvestments = centsToDollars(
    accounts
      .filter((a) => a.type === "investment")
      .reduce((sum, a) => sum + a.balanceCents, 0)
  )

  const totalDebt = centsToDollars(
    accounts
      .filter((a) => a.type === "debt")
      .reduce((sum, a) => sum + a.balanceCents, 0)
  )

  const totalChecking = centsToDollars(
    accounts
      .filter((a) => a.type === "checking")
      .reduce((sum, a) => sum + a.balanceCents, 0)
  )

  return {
    totalSavings,
    totalInvestments,
    totalDebt,
    totalChecking,
    netWorth: totalSavings + totalInvestments + totalChecking - totalDebt,
  }
}

export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    return jsonResponse(
      {
        error:
          "Server is missing OPENAI_API_KEY. Configure it in environment variables before using /api/chat.",
      },
      500
    )
  }

  const rateLimit = chatRateLimiter.enforce(createClientIdentifier(req.headers))
  if (!rateLimit.allowed) {
    return jsonResponse(
      { error: "Too many AI requests. Please retry shortly." },
      429,
      {
        "Retry-After": String(rateLimit.retryAfterSeconds),
        "X-RateLimit-Limit": String(rateLimitMaxRequests),
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.resetAt),
      }
    )
  }

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: "Invalid JSON payload." }, 400)
  }

  const parsedPayload = requestSchema.safeParse(payload)
  if (!parsedPayload.success) {
    return jsonResponse(
      {
        error: "Invalid chat request payload.",
        details: parsedPayload.error.issues.slice(0, 3).map((issue) => issue.message),
      },
      400
    )
  }

  const {
    messages,
    portfolioData,
    uiLocale,
    growthToolkit,
    tradingOverview,
    stockIntelligence,
    aiFinanceIntelligence,
  } = parsedPayload.data
  const portfolio: PortfolioData = portfolioData || DEFAULT_PORTFOLIO
  const summary = calculateSummary(portfolio.accounts)
  const preferredLanguage = uiLocale === "en" ? "English" : "French"
  const languageRule =
    uiLocale === "en"
      ? "Respond in English unless the user explicitly asks for another language."
      : "Respond in French unless the user explicitly asks for another language."

  const growthToolkitSection = growthToolkit
    ? `\n### Long-Term Growth Toolkit:\n- Risk profile: ${growthToolkit.riskProfile}\n- Horizon: ${growthToolkit.horizonYears} years\n- Emergency fund: ${growthToolkit.emergencyFundMonths} months\n- Savings rate: ${growthToolkit.savingsRatePct}%\n- Max drawdown tolerance: ${growthToolkit.maxDrawdownPct}%\n- Rebalance threshold: ${growthToolkit.rebalanceThresholdPct}%\n- Target allocation: equities ${growthToolkit.targetAllocation.equities.toFixed(1)}%, bonds ${growthToolkit.targetAllocation.bonds.toFixed(1)}%, cash ${growthToolkit.targetAllocation.cash.toFixed(1)}%, alternatives ${growthToolkit.targetAllocation.alternatives.toFixed(1)}%\n- Current allocation: equities ${growthToolkit.currentAllocation.equities.toFixed(1)}%, bonds ${growthToolkit.currentAllocation.bonds.toFixed(1)}%, cash ${growthToolkit.currentAllocation.cash.toFixed(1)}%, alternatives ${growthToolkit.currentAllocation.alternatives.toFixed(1)}%\n- Simulation assumptions: initial capital ${growthToolkit.simulation.initialCapital.toFixed(0)}, annual contribution ${growthToolkit.simulation.annualContribution.toFixed(0)}, expected return ${growthToolkit.simulation.expectedReturnPct.toFixed(1)}%, volatility ${growthToolkit.simulation.annualVolatilityPct.toFixed(1)}%, inflation ${growthToolkit.simulation.inflationPct.toFixed(1)}%, target capital ${growthToolkit.simulation.targetCapital.toFixed(0)}\n`
    : "\n### Long-Term Growth Toolkit:\nNo long-term toolkit data provided.\n"
  const tradingOverviewSection = tradingOverview
    ? `\n### Paper Trading Desk:\n- Cash: ${formatCurrencyFromCents(tradingOverview.account.cashCents)}\n- Equity: ${formatCurrencyFromCents(tradingOverview.account.equityCents)}\n- Position value: ${formatCurrencyFromCents(tradingOverview.account.positionsValueCents)}\n- Realized PnL: ${formatCurrencyFromCents(tradingOverview.account.realizedPnlCents)}\n- Buying power: ${formatCurrencyFromCents(tradingOverview.account.buyingPowerCents)}\n- Policy: max position ${tradingOverview.policy.maxPositionPct.toFixed(1)}%, max order ${formatCurrencyFromCents(tradingOverview.policy.maxOrderNotionalCents)}, max open positions ${tradingOverview.policy.maxOpenPositions}, max daily loss ${formatCurrencyFromCents(tradingOverview.policy.maxDailyLossCents)}, max drawdown ${tradingOverview.policy.maxDrawdownPct.toFixed(1)}%, short allowed ${tradingOverview.policy.allowShort ? "yes" : "no"}, kill-switch ${tradingOverview.policy.killSwitchEnabled ? "enabled" : "disabled"}, blocked symbols ${tradingOverview.policy.blockedSymbols.join(", ") || "none"}\n- Risk state: level ${tradingOverview.risk.level.toUpperCase()}, canTrade ${tradingOverview.risk.canTrade ? "yes" : "no"}, canOpenNewRisk ${tradingOverview.risk.canOpenNewRisk ? "yes" : "no"}, drawdown ${tradingOverview.risk.drawdownPct.toFixed(2)}%, rejected24h ${tradingOverview.risk.rejectedOrders24h}\n- Risk signals:\n${tradingOverview.risk.signals.slice(0, 8).map((signal) => `  - [${signal.severity.toUpperCase()}] ${signal.message}`).join("\n") || "  - No active risk signal"}\n- Current positions:\n${tradingOverview.positions.slice(0, 8).map((position) => `  - ${position.symbol}: qty ${position.quantity}, avg ${formatCurrencyFromCents(position.avgPriceCents)}, market ${formatCurrencyFromCents(position.marketPriceCents)}, value ${formatCurrencyFromCents(position.marketValueCents)}, unrealized PnL ${formatCurrencyFromCents(position.unrealizedPnlCents)}`).join("\n") || "  - No open positions"}\n- Recent orders:\n${tradingOverview.recentOrders.slice(0, 8).map((order) => `  - ${order.side.toUpperCase()} ${order.quantity} ${order.symbol} (${order.type.toUpperCase()}) => ${order.status.toUpperCase()}${order.fillPriceCents ? ` @ ${formatCurrencyFromCents(order.fillPriceCents)}` : ""}${order.reason ? ` (${order.reason})` : ""}`).join("\n") || "  - No recent orders"}\n`
    : "\n### Paper Trading Desk:\nNo paper trading data provided.\n"
  const stockIntelligenceSection = stockIntelligence
    ? `\n### Stock Intelligence:\n- Summary:\n${stockIntelligence.summary}\n- Stats: invested ${stockIntelligence.registry.stats.totalInvested.toFixed(2)}, realizedPnL ${stockIntelligence.registry.stats.totalRealizedGainLoss.toFixed(2)}, realizedReturn ${stockIntelligence.registry.stats.totalRealizedReturnPct.toFixed(2)}%, active ${stockIntelligence.registry.stats.activePositions}, closed ${stockIntelligence.registry.stats.closedPositions}, winRate ${stockIntelligence.registry.stats.winRate.toFixed(1)}%\n- Active positions:\n${stockIntelligence.registry.activePositions.slice(0, 8).map((position) => `  - ${position.symbol} ${position.side.toUpperCase()} ${position.shares} @ ${position.entryPrice.toFixed(2)}, signal ${position.signal}, confidence ${position.confidence.toFixed(0)}%, risk ${position.riskScore.toFixed(0)}, target ${position.targetPrice.toFixed(2)}, stop ${position.stopLoss?.toFixed(2) ?? "n/a"}`).join("\n") || "  - No active analyzed position"}\n- Recent analyses:\n${stockIntelligence.registry.recentAnalyses.slice(0, 8).map((item) => `  - ${item.symbol} ${item.signal} (${item.confidence.toFixed(0)}%) status ${item.status}, expected ${item.potentialReturn.toFixed(2)}%`).join("\n") || "  - No recent stock analysis"}\n- Alerts: active ${stockIntelligence.alerts.activeCount}, critical ${stockIntelligence.alerts.criticalCount}, warning ${stockIntelligence.alerts.warningCount}\n- Recent triggered alerts:\n${stockIntelligence.alerts.recentTriggered.slice(0, 8).map((alert) => `  - ${alert.symbol} ${alert.severity.toUpperCase()}: ${alert.message}`).join("\n") || "  - No recently triggered alert"}\n`
    : "\n### Stock Intelligence:\nNo stock intelligence context provided.\n"
  const aiFinanceIntelligenceSection = aiFinanceIntelligence
    ? `\n### AI Finance Intelligence Layer:\n- Generated at: ${aiFinanceIntelligence.generatedAt}\n- Scores: financial health ${aiFinanceIntelligence.scores.financialHealth.toFixed(1)}/100, risk control ${aiFinanceIntelligence.scores.riskControl.toFixed(1)}/100, execution consistency ${aiFinanceIntelligence.scores.executionConsistency.toFixed(1)}/100\n- Core metrics: net worth ${aiFinanceIntelligence.metrics.netWorthUsd.toFixed(2)}, cash ${aiFinanceIntelligence.metrics.cashUsd.toFixed(2)}, debt ${aiFinanceIntelligence.metrics.debtUsd.toFixed(2)}, monthly net ${aiFinanceIntelligence.metrics.monthlyNetUsd.toFixed(2)}, savings rate ${aiFinanceIntelligence.metrics.savingsRatePct.toFixed(2)}%, emergency fund ${aiFinanceIntelligence.metrics.emergencyFundMonths.toFixed(2)} months, concentration ${aiFinanceIntelligence.metrics.portfolioConcentrationPct.toFixed(2)}%, critical alerts ${aiFinanceIntelligence.metrics.stockAlertsCritical}\n- Ranked priorities:\n${aiFinanceIntelligence.priorities.map((item) => `  - [${item.severity.toUpperCase()}] ${item.title} | ${item.metricLabel}: ${item.metricValue} | Why: ${item.reason} | Next: ${item.nextAction}`).join("\n") || "  - No active priority"}\n- Opportunities:\n${aiFinanceIntelligence.opportunities.map((item) => `  - ${item}`).join("\n") || "  - No identified opportunity"}\n- Constraints:\n${aiFinanceIntelligence.constraints.map((item) => `  - ${item}`).join("\n") || "  - No explicit constraint"}\n`
    : "\n### AI Finance Intelligence Layer:\nNo consolidated intelligence context provided.\n"

  const systemPrompt = `You are an expert financial advisor AI agent integrated into the user's financial dashboard. You have access to their complete financial portfolio data and can provide personalized investment advice and proactive guidance.

## Current Portfolio Data:

### Total Balance: ${portfolio.totalBalance}

### Accounts:
${portfolio.accounts.map((a: AccountItem) => `- ${a.title} (${a.type}): ${formatCurrencyFromCents(a.balanceCents)} - ${a.description || "N/A"}`).join("\n") || "No accounts found"}

### Financial Summary:
- Total Savings: $${summary.totalSavings.toFixed(2)}
- Total Investments: $${summary.totalInvestments.toFixed(2)}
- Total Checking: $${summary.totalChecking.toFixed(2)}
- Total Debt: $${summary.totalDebt.toFixed(2)}
- Net Worth: $${summary.netWorth.toFixed(2)}

### Recent Transactions:
${portfolio.transactions.map((t: Transaction) => `- ${t.title}: ${t.type === "incoming" ? "+" : "-"}${formatCurrencyFromCents(t.amountCents)} (${t.status}) - ${formatRelativeTimestampFromIso(t.timestampIso)}`).join("\n") || "No recent transactions"}

### Financial Goals:
${portfolio.goals.map((g: FinancialGoal) => `- ${g.title}: Target ${typeof g.targetAmountCents === "number" ? formatCurrencyFromCents(g.targetAmountCents) : "N/A"}, Progress: ${g.progress || 0}%, Status: ${g.status}, Target date ${formatMonthYearFromIso(g.targetDateIso)}`).join("\n") || "No goals set"}

### Stock Market Actions:
${portfolio.stockActions.map((a: StockAction) => `- ${a.symbol} ${a.action.toUpperCase()}: ${a.shares} shares @ ${formatCurrencyFromCents(a.priceCents)} (${a.status}) - ${formatShortDateFromIso(a.tradeDateIso)}`).join("\n") || "No stock actions"}
${growthToolkitSection}
${tradingOverviewSection}
${stockIntelligenceSection}
${aiFinanceIntelligenceSection}

## Your Role:
1. Analyze the user's portfolio and provide personalized investment advice
2. Identify opportunities for portfolio optimization
3. Suggest strategies to achieve their financial goals
4. Warn about potential risks in their current allocation
5. Recommend actions to reduce debt and increase savings
6. Provide insights on spending patterns based on transactions
7. Build a multi-year capital growth roadmap with annual reviews
8. Propose rebalancing actions whenever allocation drift exceeds threshold

## Guidelines:
- Preferred UI language: ${preferredLanguage}.
- ${languageRule}
- Be specific and refer to actual numbers from their portfolio
- Provide actionable recommendations
- Consider risk tolerance based on their current allocation
- Be encouraging but realistic about financial goals
- Use clear, simple language avoiding excessive jargon
- When asked about specific accounts or goals, reference the exact data
- Always consider the user's debt when making investment recommendations
- Prioritize capital preservation guardrails (emergency fund, debt, risk profile) before aggressive growth
- For long-term questions, present a yearly execution plan and measurable checkpoints
- If suggesting trades, include sizing rationale and risk controls from the paper trading policy
- Do not imply real brokerage execution; this environment uses paper trading simulation
- Always use the stock intelligence context (signals, RSI/MACD, registry performance, alerts) when giving equity advice
- If paper-trading risk level is RESTRICT or HALT, prioritize risk reduction and avoid suggesting new risk-increasing orders
- Use AI Finance Intelligence priorities as the default execution queue and explain which priority each recommendation addresses
- Proactively surface one to three high-impact actions when critical or warning alerts exist

Remember: You are their trusted financial advisor with full visibility into their finances. Provide personalized, data-driven advice.`

  const openai = createOpenAI({ apiKey: key })
  const modelId = process.env.OPENAI_MODEL || "gpt-5.3-codex"
  let modelMessages: Awaited<ReturnType<typeof convertToModelMessages>>

  try {
    modelMessages = await convertToModelMessages(
      messages as Parameters<typeof convertToModelMessages>[0]
    )
  } catch {
    return jsonResponse(
      {
        error: "Invalid message structure for model conversion.",
      },
      400
    )
  }

  try {
    const result = streamText({
      model: openai(modelId),
      system: systemPrompt,
      messages: modelMessages,
    })

    return result.toUIMessageStreamResponse({
      headers: createRateLimitHeaders(rateLimit),
    })
  } catch {
    return jsonResponse(
      { error: "Upstream AI provider is temporarily unavailable." },
      502,
      createRateLimitHeaders(rateLimit)
    )
  }
}

