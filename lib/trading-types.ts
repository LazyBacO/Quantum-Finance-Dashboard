import { z } from "zod"

export const tradeSideSchema = z.enum(["buy", "sell"])
export const orderTypeSchema = z.enum(["market", "limit"])
export const orderStatusSchema = z.enum(["filled", "rejected", "cancelled", "open"])
export const orderSourceSchema = z.enum(["ui", "api", "ai"])

export const paperOrderInputSchema = z.object({
  symbol: z.string().min(1).max(12),
  side: tradeSideSchema,
  quantity: z.number().positive(),
  type: orderTypeSchema,
  limitPriceCents: z.number().int().positive().optional(),
})

export const paperOrderSchema = paperOrderInputSchema.extend({
  id: z.string().min(1).max(120),
  status: orderStatusSchema,
  requestedAt: z.string().datetime({ offset: true }),
  executedAt: z.string().datetime({ offset: true }).nullable(),
  fillPriceCents: z.number().int().positive().nullable(),
  notionalCents: z.number().int().nonnegative(),
  reason: z.string().max(400).optional(),
  idempotencyKey: z.string().min(1).max(120).optional(),
  source: orderSourceSchema.optional(),
})

export const paperPositionSchema = z.object({
  symbol: z.string().min(1).max(12),
  quantity: z.number(),
  avgPriceCents: z.number().int().nonnegative(),
})

export const paperTradingPolicySchema = z.object({
  maxPositionPct: z.number().min(1).max(100),
  maxOrderNotionalCents: z.number().int().positive(),
  allowShort: z.boolean(),
  blockedSymbols: z.array(z.string().min(1).max(12)).max(200),
  maxOpenPositions: z.number().int().min(1).max(200),
  maxDailyLossCents: z.number().int().nonnegative(),
  maxDrawdownPct: z.number().min(5).max(90),
  killSwitchEnabled: z.boolean(),
})

export const paperTradingPolicyUpdateSchema = paperTradingPolicySchema
  .partial()
  .refine(
    (value) =>
      value.maxPositionPct !== undefined ||
      value.maxOrderNotionalCents !== undefined ||
      value.allowShort !== undefined ||
      value.blockedSymbols !== undefined ||
      value.maxOpenPositions !== undefined ||
      value.maxDailyLossCents !== undefined ||
      value.maxDrawdownPct !== undefined ||
      value.killSwitchEnabled !== undefined,
    {
      message: "At least one policy field must be provided.",
    }
  )

export const paperEquityPointSchema = z.object({
  at: z.string().datetime({ offset: true }),
  equityCents: z.number().int(),
})

export const paperTradingStoreSchema = z.object({
  version: z.literal(1),
  cashCents: z.number().int(),
  realizedPnlCents: z.number().int(),
  policy: paperTradingPolicySchema,
  positions: z.array(paperPositionSchema).max(500),
  orders: z.array(paperOrderSchema).max(5000),
  equityHistory: z.array(paperEquityPointSchema).max(5000),
  updatedAt: z.string().datetime({ offset: true }),
})

export const paperQuoteSchema = z.object({
  symbol: z.string().min(1).max(12),
  priceCents: z.number().int().positive(),
  asOf: z.string().datetime({ offset: true }),
})

export const paperAccountSummarySchema = z.object({
  cashCents: z.number().int(),
  positionsValueCents: z.number().int(),
  equityCents: z.number().int(),
  realizedPnlCents: z.number().int(),
  buyingPowerCents: z.number().int(),
})

export const paperPositionWithMarketSchema = paperPositionSchema.extend({
  marketPriceCents: z.number().int().positive(),
  marketValueCents: z.number().int(),
  unrealizedPnlCents: z.number().int(),
})

export const paperTradingRiskSignalSchema = z.object({
  code: z.string().min(1).max(64),
  severity: z.enum(["info", "warning", "critical"]),
  message: z.string().min(1).max(400),
})

export const paperTradingRiskSnapshotSchema = z.object({
  level: z.enum(["ok", "watch", "restrict", "halt"]),
  canTrade: z.boolean(),
  canOpenNewRisk: z.boolean(),
  killSwitch: z.boolean(),
  peakEquityCents: z.number().int(),
  currentEquityCents: z.number().int(),
  drawdownPct: z.number().min(0).max(100),
  rejectedOrders24h: z.number().int().nonnegative(),
  signals: z.array(paperTradingRiskSignalSchema).max(20),
})

export const paperTradingOverviewSchema = z.object({
  account: paperAccountSummarySchema,
  policy: paperTradingPolicySchema,
  positions: z.array(paperPositionWithMarketSchema),
  recentOrders: z.array(paperOrderSchema).max(100),
  risk: paperTradingRiskSnapshotSchema,
})

export type TradeSide = z.infer<typeof tradeSideSchema>
export type OrderType = z.infer<typeof orderTypeSchema>
export type OrderStatus = z.infer<typeof orderStatusSchema>
export type OrderSource = z.infer<typeof orderSourceSchema>
export type PaperOrderInput = z.infer<typeof paperOrderInputSchema>
export type PaperOrder = z.infer<typeof paperOrderSchema>
export type PaperPosition = z.infer<typeof paperPositionSchema>
export type PaperTradingPolicy = z.infer<typeof paperTradingPolicySchema>
export type PaperTradingPolicyUpdate = z.infer<typeof paperTradingPolicyUpdateSchema>
export type PaperEquityPoint = z.infer<typeof paperEquityPointSchema>
export type PaperTradingStore = z.infer<typeof paperTradingStoreSchema>
export type PaperQuote = z.infer<typeof paperQuoteSchema>
export type PaperAccountSummary = z.infer<typeof paperAccountSummarySchema>
export type PaperPositionWithMarket = z.infer<typeof paperPositionWithMarketSchema>
export type PaperTradingRiskSignal = z.infer<typeof paperTradingRiskSignalSchema>
export type PaperTradingRiskSnapshot = z.infer<typeof paperTradingRiskSnapshotSchema>
export type PaperTradingOverview = z.infer<typeof paperTradingOverviewSchema>
