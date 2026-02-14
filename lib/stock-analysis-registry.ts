import { z } from "zod"
import type {
  StockAnalysisReport,
  StockAIRecommendation,
  StockPortfolioAnalysis,
} from "@/lib/stock-analysis-engine"
import type { StockAction } from "@/lib/portfolio-data"
import { createPrefixedId } from "@/lib/random-id"

export interface StockAnalysisEntry {
  id: string
  action: StockAction
  analysis: StockAnalysisReport
  recommendation: StockAIRecommendation
  createdAt: string
  updatedAt: string
  status: "active" | "closed" | "archived"
  notes?: string
  exitPrice?: number
  exitDate?: string
  realizedGainLoss?: number
  realizedGainLossPercent?: number
}

export interface StockAnalysisRegistry {
  entries: StockAnalysisEntry[]
  portfolioAnalysis?: StockPortfolioAnalysis
  lastUpdated: string
}

export interface StockPerformanceStats {
  totalInvested: number
  totalRealizedGainLoss: number
  totalRealizedReturnPct: number
  avgReturnClosed: number
  activePositions: number
  closedPositions: number
  totalTrades: number
  winRate: number
  bestTrade: StockAnalysisEntry | null
  worstTrade: StockAnalysisEntry | null
}

export interface StockAnalysisContextSnapshot {
  stats: StockPerformanceStats
  activePositions: Array<{
    id: string
    symbol: string
    side: "buy" | "sell"
    shares: number
    entryPrice: number
    signal: StockAIRecommendation["signal"]
    confidence: number
    riskScore: number
    targetPrice: number
    stopLoss: number | null
    potentialReturn: number
  }>
  recentAnalyses: Array<{
    id: string
    symbol: string
    signal: StockAIRecommendation["signal"]
    confidence: number
    createdAt: string
    status: StockAnalysisEntry["status"]
    potentialReturn: number
  }>
}

const STORAGE_KEY = "stock_analysis_registry_v2"
const LEGACY_STORAGE_KEY = "stock_analysis_registry_v1"

const canUseStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined"

const nowIso = () => new Date().toISOString()

const createId = () => {
  return createPrefixedId("analysis")
}

const stockActionSchema = z.object({
  id: z.string().min(1),
  symbol: z.string().min(1).max(20),
  action: z.enum(["buy", "sell"]),
  shares: z.number().positive(),
  priceCents: z.number().int().positive(),
  tradeDateIso: z.string().min(1),
  status: z.enum(["executed", "pending", "cancelled"]),
})

const stockRecommendationSchema = z.object({
  symbol: z.string().min(1).max(20),
  signal: z.enum(["strong-buy", "buy", "hold", "sell", "strong-sell"]),
  confidence: z.number().min(0).max(100),
  reasonTechnical: z.string(),
  reasonFundamental: z.string(),
  priceTarget: z.number().positive(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  timeframe: z.enum(["short-term", "medium-term", "long-term"]),
  riskScore: z.number().min(0).max(100),
  potentialReturn: z.number(),
})

const stockAnalysisReportSchema = z.object({
  symbol: z.string().min(1).max(20),
  analyzedAt: z.coerce.date(),
  prices: z.object({
    symbol: z.string().min(1).max(20),
    current: z.number().positive(),
    high52week: z.number().positive(),
    low52week: z.number().positive(),
    avgVolume: z.number().nonnegative(),
    marketCap: z.number().nonnegative(),
    pe: z.number(),
    dividend: z.number().nonnegative(),
    beta: z.number(),
  }),
  technical: z.object({
    sma20: z.number().positive(),
    sma50: z.number().positive(),
    sma200: z.number().positive(),
    rsi14: z.number().min(0).max(100),
    macd: z.object({
      line: z.number(),
      signal: z.number(),
      histogram: z.number(),
    }),
    bollinger: z.object({
      upper: z.number().positive(),
      middle: z.number().positive(),
      lower: z.number().positive(),
    }),
    atr: z.number().nonnegative(),
    adx: z.number().min(0).max(100),
  }),
  fundamental: z.object({
    pe: z.number(),
    pb: z.number(),
    ps: z.number(),
    debt: z.number().nonnegative(),
    roe: z.number(),
    roic: z.number(),
    fcf: z.number(),
    growthRate: z.number(),
  }),
  recommendation: stockRecommendationSchema,
  sentiment: z.object({
    score: z.number().min(-1).max(1),
    source: z.array(z.string()),
  }),
  newsImpact: z.array(z.string()),
  correlations: z.array(
    z.object({
      symbol: z.string(),
      correlation: z.number().min(-1).max(1),
      meaning: z.string(),
    })
  ),
})

const stockAnalysisEntrySchema = z.object({
  id: z.string().min(1),
  action: stockActionSchema,
  analysis: stockAnalysisReportSchema,
  recommendation: stockRecommendationSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  status: z.enum(["active", "closed", "archived"]),
  notes: z.string().optional(),
  exitPrice: z.number().positive().optional(),
  exitDate: z.string().optional(),
  realizedGainLoss: z.number().optional(),
  realizedGainLossPercent: z.number().optional(),
})

const stockAnalysisRegistrySchema = z.object({
  entries: z.array(stockAnalysisEntrySchema),
  portfolioAnalysis: z
    .object({
      totalValue: z.number(),
      gainLoss: z.number(),
      gainLossPercent: z.number(),
      diversificationScore: z.number(),
      concentration: z.array(
        z.object({
          symbol: z.string(),
          percent: z.number(),
          weight: z.enum(["heavy", "moderate", "light"]),
        })
      ),
      beta: z.number(),
      sharpeRatio: z.number(),
      recommendations: z.array(stockRecommendationSchema),
    })
    .optional(),
  lastUpdated: z.string().min(1),
})

const normalizeDate = (value: string | undefined) => {
  if (!value) return nowIso()
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return nowIso()
  return parsed.toISOString()
}

const normalizeEntry = (entry: StockAnalysisEntry): StockAnalysisEntry => ({
  ...entry,
  action: {
    ...entry.action,
    symbol: entry.action.symbol.trim().toUpperCase(),
    shares: Math.max(0.0001, Number(entry.action.shares.toFixed(8))),
    priceCents: Math.max(1, Math.round(entry.action.priceCents)),
    tradeDateIso: normalizeDate(entry.action.tradeDateIso),
  },
  analysis: {
    ...entry.analysis,
    symbol: entry.analysis.symbol.trim().toUpperCase(),
    analyzedAt: new Date(entry.analysis.analyzedAt),
    prices: {
      ...entry.analysis.prices,
      symbol: entry.analysis.prices.symbol.trim().toUpperCase(),
      current: Math.max(0.01, entry.analysis.prices.current),
      high52week: Math.max(0.01, entry.analysis.prices.high52week),
      low52week: Math.max(0.01, entry.analysis.prices.low52week),
      avgVolume: Math.max(0, entry.analysis.prices.avgVolume),
      marketCap: Math.max(0, entry.analysis.prices.marketCap),
      dividend: Math.max(0, entry.analysis.prices.dividend),
    },
  },
  recommendation: {
    ...entry.recommendation,
    symbol: entry.recommendation.symbol.trim().toUpperCase(),
    confidence: Math.max(0, Math.min(100, entry.recommendation.confidence)),
    riskScore: Math.max(0, Math.min(100, entry.recommendation.riskScore)),
  },
  createdAt: normalizeDate(entry.createdAt),
  updatedAt: normalizeDate(entry.updatedAt),
  exitDate: entry.exitDate ? normalizeDate(entry.exitDate) : undefined,
})

const emptyRegistry = (): StockAnalysisRegistry => ({
  entries: [],
  lastUpdated: nowIso(),
})

const migrateLegacyKey = () => {
  if (!canUseStorage()) return
  const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!legacy) return
  if (!window.localStorage.getItem(STORAGE_KEY)) {
    window.localStorage.setItem(STORAGE_KEY, legacy)
  }
}

export function loadStockAnalysisRegistry(): StockAnalysisRegistry {
  if (!canUseStorage()) {
    return emptyRegistry()
  }

  migrateLegacyKey()

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return emptyRegistry()
    }

    const parsed = stockAnalysisRegistrySchema.safeParse(JSON.parse(raw))
    if (!parsed.success) {
      return emptyRegistry()
    }

    const normalizedEntries = parsed.data.entries
      .map((entry) => normalizeEntry(entry))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return {
      ...parsed.data,
      entries: normalizedEntries,
      lastUpdated: normalizeDate(parsed.data.lastUpdated),
    }
  } catch (error) {
    console.warn("Failed to load stock analysis registry:", error)
    return emptyRegistry()
  }
}

export function saveStockAnalysisRegistry(registry: StockAnalysisRegistry): void {
  if (!canUseStorage()) return
  try {
    const payload: StockAnalysisRegistry = {
      ...registry,
      entries: registry.entries.map((entry) => normalizeEntry(entry)),
      lastUpdated: nowIso(),
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (error) {
    console.error("Failed to save stock analysis registry:", error)
  }
}

export function addAnalysisEntry(
  action: StockAction,
  analysis: StockAnalysisReport,
  recommendation: StockAIRecommendation,
  notes?: string
): StockAnalysisEntry {
  const registry = loadStockAnalysisRegistry()
  const entry: StockAnalysisEntry = normalizeEntry({
    id: createId(),
    action,
    analysis,
    recommendation,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    status: action.action === "buy" ? "active" : "closed",
    notes,
    exitPrice: action.action === "sell" ? action.priceCents / 100 : undefined,
    exitDate: action.action === "sell" ? action.tradeDateIso : undefined,
    realizedGainLoss: action.action === "sell" ? 0 : undefined,
    realizedGainLossPercent: action.action === "sell" ? 0 : undefined,
  })

  registry.entries = [entry, ...registry.entries].slice(0, 5000)
  saveStockAnalysisRegistry(registry)
  return entry
}

export function updateAnalysisEntry(
  entryId: string,
  updates: Partial<StockAnalysisEntry>
): StockAnalysisEntry | null {
  const registry = loadStockAnalysisRegistry()
  const index = registry.entries.findIndex((entry) => entry.id === entryId)
  if (index < 0) return null

  const current = registry.entries[index]
  const next = normalizeEntry({
    ...current,
    ...updates,
    updatedAt: nowIso(),
  })
  registry.entries[index] = next
  saveStockAnalysisRegistry(registry)
  return next
}

export function closePosition(
  entryId: string,
  exitPrice: number,
  exitDate?: string,
  notes?: string
): StockAnalysisEntry | null {
  const registry = loadStockAnalysisRegistry()
  const index = registry.entries.findIndex((entry) => entry.id === entryId)
  if (index < 0) return null

  const entry = registry.entries[index]
  if (entry.status !== "active") return entry

  const cleanExitPrice = Math.max(0.01, exitPrice)
  const entryPrice = entry.action.priceCents / 100
  const direction = entry.action.action === "buy" ? 1 : -1
  const pnl = (cleanExitPrice - entryPrice) * entry.action.shares * direction
  const pnlPct = safeDivide(cleanExitPrice - entryPrice, entryPrice) * 100 * direction

  const closed = normalizeEntry({
    ...entry,
    status: "closed",
    exitPrice: Number(cleanExitPrice.toFixed(2)),
    exitDate: exitDate ?? nowIso(),
    realizedGainLoss: Number(pnl.toFixed(2)),
    realizedGainLossPercent: Number(pnlPct.toFixed(2)),
    notes: notes ?? entry.notes,
    updatedAt: nowIso(),
  })

  registry.entries[index] = closed
  saveStockAnalysisRegistry(registry)
  return closed
}

export function closePositionBySymbol(symbolInput: string, exitPrice: number, notes?: string) {
  const symbol = symbolInput.trim().toUpperCase()
  const active = getActivePositions().find((entry) => entry.action.symbol === symbol)
  if (!active) return null
  return closePosition(active.id, exitPrice, nowIso(), notes)
}

export function getAnalysesBySymbol(symbolInput: string): StockAnalysisEntry[] {
  const symbol = symbolInput.trim().toUpperCase()
  return loadStockAnalysisRegistry().entries.filter((entry) => entry.action.symbol === symbol)
}

export function getActivePositions(): StockAnalysisEntry[] {
  return loadStockAnalysisRegistry().entries.filter((entry) => entry.status === "active")
}

export function getClosedPositions(): StockAnalysisEntry[] {
  return loadStockAnalysisRegistry().entries.filter((entry) => entry.status === "closed")
}

export function calculatePortfolioStats(): StockPerformanceStats {
  const entries = loadStockAnalysisRegistry().entries
  const buyTrades = entries.filter((entry) => entry.action.action === "buy")
  const closed = entries.filter((entry) => entry.status === "closed")

  const totalInvested = buyTrades.reduce(
    (sum, entry) => sum + (entry.action.priceCents / 100) * entry.action.shares,
    0
  )
  const totalRealizedGainLoss = closed.reduce(
    (sum, entry) => sum + (entry.realizedGainLoss ?? 0),
    0
  )
  const totalRealizedReturnPct = totalInvested > 0 ? (totalRealizedGainLoss / totalInvested) * 100 : 0
  const avgReturnClosed =
    closed.length > 0
      ? closed.reduce((sum, entry) => sum + (entry.realizedGainLossPercent ?? 0), 0) / closed.length
      : 0
  const winners = closed.filter((entry) => (entry.realizedGainLoss ?? 0) > 0).length
  const winRate = closed.length > 0 ? (winners / closed.length) * 100 : 0

  const sortedByPnl = [...closed].sort(
    (a, b) => (b.realizedGainLoss ?? 0) - (a.realizedGainLoss ?? 0)
  )

  return {
    totalInvested: Number(totalInvested.toFixed(2)),
    totalRealizedGainLoss: Number(totalRealizedGainLoss.toFixed(2)),
    totalRealizedReturnPct: Number(totalRealizedReturnPct.toFixed(2)),
    avgReturnClosed: Number(avgReturnClosed.toFixed(2)),
    activePositions: entries.filter((entry) => entry.status === "active").length,
    closedPositions: closed.length,
    totalTrades: entries.length,
    winRate: Number(winRate.toFixed(2)),
    bestTrade: sortedByPnl[0] ?? null,
    worstTrade: sortedByPnl.length ? sortedByPnl[sortedByPnl.length - 1] : null,
  }
}

export function buildStockAnalysisContextSnapshot(): StockAnalysisContextSnapshot {
  const registry = loadStockAnalysisRegistry()
  const stats = calculatePortfolioStats()

  const activePositions = registry.entries
    .filter((entry) => entry.status === "active")
    .slice(0, 10)
    .map((entry) => ({
      id: entry.id,
      symbol: entry.action.symbol,
      side: entry.action.action,
      shares: entry.action.shares,
      entryPrice: entry.action.priceCents / 100,
      signal: entry.recommendation.signal,
      confidence: entry.recommendation.confidence,
      riskScore: entry.recommendation.riskScore,
      targetPrice: entry.recommendation.priceTarget,
      stopLoss: entry.recommendation.stopLoss ?? null,
      potentialReturn: entry.recommendation.potentialReturn,
    }))

  const recentAnalyses = registry.entries.slice(0, 20).map((entry) => ({
    id: entry.id,
    symbol: entry.action.symbol,
    signal: entry.recommendation.signal,
    confidence: entry.recommendation.confidence,
    createdAt: entry.createdAt,
    status: entry.status,
    potentialReturn: entry.recommendation.potentialReturn,
  }))

  return {
    stats,
    activePositions,
    recentAnalyses,
  }
}

export function generatePortfolioSummary(locale: "fr" | "en" = "fr"): string {
  const stats = calculatePortfolioStats()

  if (locale === "en") {
    return [
      "Stock Analysis Registry",
      `Invested capital: $${stats.totalInvested.toFixed(2)}`,
      `Realized PnL: $${stats.totalRealizedGainLoss.toFixed(2)} (${stats.totalRealizedReturnPct.toFixed(2)}%)`,
      `Average closed return: ${stats.avgReturnClosed.toFixed(2)}%`,
      `Active positions: ${stats.activePositions} | Closed positions: ${stats.closedPositions}`,
      `Win rate: ${stats.winRate.toFixed(1)}% | Total trades: ${stats.totalTrades}`,
      `Best trade: ${stats.bestTrade?.action.symbol ?? "N/A"} | Worst trade: ${stats.worstTrade?.action.symbol ?? "N/A"}`,
    ].join("\n")
  }

  return [
    "Registre des analyses boursieres",
    `Capital investi: $${stats.totalInvested.toFixed(2)}`,
    `PnL realise: $${stats.totalRealizedGainLoss.toFixed(2)} (${stats.totalRealizedReturnPct.toFixed(2)}%)`,
    `Rendement moyen positions fermees: ${stats.avgReturnClosed.toFixed(2)}%`,
    `Positions actives: ${stats.activePositions} | Positions fermees: ${stats.closedPositions}`,
    `Taux de gain: ${stats.winRate.toFixed(1)}% | Total trades: ${stats.totalTrades}`,
    `Meilleure position: ${stats.bestTrade?.action.symbol ?? "N/A"} | Pire position: ${stats.worstTrade?.action.symbol ?? "N/A"}`,
  ].join("\n")
}

export function exportRegistry(): string {
  return JSON.stringify(loadStockAnalysisRegistry(), null, 2)
}

export function importRegistry(jsonData: string): boolean {
  try {
    const parsed = stockAnalysisRegistrySchema.safeParse(JSON.parse(jsonData))
    if (!parsed.success) return false

    saveStockAnalysisRegistry(parsed.data)
    return true
  } catch (error) {
    console.error("Failed to import registry:", error)
    return false
  }
}

export function deleteAnalysisEntry(entryId: string): boolean {
  const registry = loadStockAnalysisRegistry()
  const previous = registry.entries.length
  registry.entries = registry.entries.filter((entry) => entry.id !== entryId)
  if (registry.entries.length === previous) return false
  saveStockAnalysisRegistry(registry)
  return true
}

export function archiveAnalysisEntry(entryId: string): StockAnalysisEntry | null {
  return updateAnalysisEntry(entryId, { status: "archived" })
}

export function getRegistrySnapshot(): StockAnalysisRegistry {
  return loadStockAnalysisRegistry()
}

function safeDivide(num: number, den: number) {
  if (Math.abs(den) < 1e-8) return 0
  return num / den
}
