import { z } from "zod"

export const accountItemSchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(160),
  description: z.string().max(240).optional(),
  balanceCents: z.number().int().safe(),
  type: z.enum(["savings", "checking", "investment", "debt"]),
})

export const transactionSchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(200),
  amountCents: z.number().int().safe(),
  type: z.enum(["incoming", "outgoing"]),
  category: z.string().min(1).max(100),
  timestampIso: z.string().datetime({ offset: true }),
  status: z.enum(["completed", "pending", "failed"]),
})

export const financialGoalSchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(160),
  subtitle: z.string().min(1).max(240),
  iconStyle: z.string().min(1).max(80),
  targetDateIso: z.string().datetime({ offset: true }),
  targetAmountCents: z.number().int().safe().optional(),
  status: z.enum(["pending", "in-progress", "completed"]),
  progress: z.number().min(0).max(100).optional(),
})

export const stockActionSchema = z.object({
  id: z.string().min(1).max(120),
  symbol: z.string().min(1).max(24),
  action: z.enum(["buy", "sell"]),
  shares: z.number().nonnegative(),
  priceCents: z.number().int().safe(),
  tradeDateIso: z.string().datetime({ offset: true }),
  status: z.enum(["executed", "pending", "cancelled"]),
})

export const portfolioSyncStateSchema = z.object({
  version: z.literal(2),
  accounts: z.array(accountItemSchema).max(500),
  transactions: z.array(transactionSchema).max(5000),
  goals: z.array(financialGoalSchema).max(500),
  stockActions: z.array(stockActionSchema).max(5000),
  lastSaved: z.string().datetime({ offset: true }),
})

export type PortfolioSyncState = z.infer<typeof portfolioSyncStateSchema>
