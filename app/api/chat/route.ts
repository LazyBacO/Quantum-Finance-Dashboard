import { streamText, convertToModelMessages } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { z } from "zod"
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

function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

const RATE_LIMIT_WINDOW_MS = parsePositiveInteger(process.env.AI_RATE_LIMIT_WINDOW_MS, 60_000)
const RATE_LIMIT_MAX_REQUESTS = parsePositiveInteger(process.env.AI_RATE_LIMIT_MAX_REQUESTS, 20)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

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

function getClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown"
  }

  const realIp = req.headers.get("x-real-ip")
  if (realIp) {
    return realIp.trim()
  }

  return "unknown"
}

function pruneRateLimitStore(now: number) {
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key)
    }
  }
}

function enforceRateLimit(ip: string, now = Date.now()) {
  if (rateLimitStore.size > 1000) {
    pruneRateLimitStore(now)
  }

  const current = rateLimitStore.get(ip)

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    })

    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt: Math.ceil((now + RATE_LIMIT_WINDOW_MS) / 1000),
      retryAfterSeconds: 0,
    }
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: Math.ceil(current.resetAt / 1000),
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    }
  }

  current.count += 1
  rateLimitStore.set(ip, current)

  return {
    allowed: true,
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - current.count),
    resetAt: Math.ceil(current.resetAt / 1000),
    retryAfterSeconds: 0,
  }
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

  const rateLimit = enforceRateLimit(getClientIp(req))
  if (!rateLimit.allowed) {
    return jsonResponse(
      { error: "Too many AI requests. Please retry shortly." },
      429,
      {
        "Retry-After": String(rateLimit.retryAfterSeconds),
        "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
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

  const { messages, portfolioData } = parsedPayload.data
  const portfolio: PortfolioData = portfolioData || DEFAULT_PORTFOLIO
  const summary = calculateSummary(portfolio.accounts)

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

## Your Role:
1. Analyze the user's portfolio and provide personalized investment advice
2. Identify opportunities for portfolio optimization
3. Suggest strategies to achieve their financial goals
4. Warn about potential risks in their current allocation
5. Recommend actions to reduce debt and increase savings
6. Provide insights on spending patterns based on transactions

## Guidelines:
- Respond in French unless the user explicitly asks for another language.
- Be specific and refer to actual numbers from their portfolio
- Provide actionable recommendations
- Consider risk tolerance based on their current allocation
- Be encouraging but realistic about financial goals
- Use clear, simple language avoiding excessive jargon
- When asked about specific accounts or goals, reference the exact data
- Always consider the user's debt when making investment recommendations

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

  const result = streamText({
    model: openai(modelId),
    system: systemPrompt,
    messages: modelMessages,
  })

  return result.toUIMessageStreamResponse()
}
