import type { StockAction } from "@/lib/portfolio-data"
import { buildMarketDataHeaders } from "@/lib/market-data-client"
import {
  generateSyntheticMarketSnapshot,
  type StockAnalysisReport,
  type StockAIRecommendation,
} from "@/lib/stock-analysis-engine"
import {
  buildStockAnalysisContextSnapshot,
  getAnalysesBySymbol,
  generatePortfolioSummary,
  type StockAnalysisContextSnapshot,
} from "@/lib/stock-analysis-registry"
import { getAlertsSnapshot, type ProactiveSignal } from "@/lib/stock-alerts"

export interface StockAnalysisRequest {
  symbol: string
  currentPrice?: number
  high52week?: number
  low52week?: number
  avgVolume?: number
  marketCap?: number
  pe?: number
  dividend?: number
  beta?: number
  pb?: number
  ps?: number
  debt?: number
  roe?: number
  roic?: number
  fcf?: number
  growthRate?: number
  priceHistory?: number[]
  action?: "buy" | "sell"
  shares?: number
  notes?: string
}

export interface StockAnalysisResponse {
  success: boolean
  data?: {
    report: StockAnalysisReport
    recommendation: StockAIRecommendation
    summary: string
    dataSource?: "twelvedata-live" | "massive-live" | "massive-delayed" | "synthetic"
    entryId?: string
    entry?: {
      id: string
      status: string
    }
    proactiveSignals: ProactiveSignal[]
  }
  error?: string
  details?: string[]
}

export interface StockAnalysisPortfolioResponse {
  success: boolean
  data?: {
    context: StockAnalysisContextSnapshot
    activePositions: StockAnalysisContextSnapshot["activePositions"]
    stats: StockAnalysisContextSnapshot["stats"]
  }
}

export interface StockIntelligenceContext {
  summary: string
  registry: StockAnalysisContextSnapshot
  alerts: ReturnType<typeof getAlertsSnapshot>
}

const fetchJson = async <T>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const headers = new Headers(init?.headers ?? {})
  const marketDataHeaders = buildMarketDataHeaders()
  if (marketDataHeaders && typeof marketDataHeaders === "object") {
    for (const [key, value] of Object.entries(marketDataHeaders as Record<string, string>)) {
      headers.set(key, value)
    }
  }

  const response = await fetch(input, { ...init, headers })
  const payload = (await response.json()) as T
  if (!response.ok) {
    throw payload
  }
  return payload
}

export async function analyzeStock(request: StockAnalysisRequest): Promise<StockAnalysisResponse> {
  try {
    const symbol = request.symbol.trim().toUpperCase()
    if (!symbol) {
      return { success: false, error: "Symbol is required." }
    }

    const synthetic = generateSyntheticMarketSnapshot(symbol, request.currentPrice)
    const mergedPayload = {
      symbol,
      currentPrice: request.currentPrice ?? synthetic.currentPrice,
      high52week: request.high52week ?? synthetic.high52week,
      low52week: request.low52week ?? synthetic.low52week,
      avgVolume: request.avgVolume ?? synthetic.avgVolume,
      marketCap: request.marketCap ?? synthetic.marketCap,
      pe: request.pe ?? synthetic.pe,
      dividend: request.dividend ?? synthetic.dividend,
      beta: request.beta ?? synthetic.beta,
      pb: request.pb ?? synthetic.pb,
      ps: request.ps ?? synthetic.ps,
      debt: request.debt ?? synthetic.debt,
      roe: request.roe ?? synthetic.roe,
      roic: request.roic ?? synthetic.roic,
      fcf: request.fcf ?? synthetic.fcf,
      growthRate: request.growthRate ?? synthetic.growthRate,
      priceHistory: request.priceHistory,
      action: request.action,
      shares: request.shares,
      notes: request.notes,
    }

    return await fetchJson<StockAnalysisResponse>("/api/stock-analysis", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(buildMarketDataHeaders() as Record<string, string>),
      },
      body: JSON.stringify(mergedPayload),
    })
  } catch (error) {
    const parsed = error as { error?: string; details?: string[] } | undefined
    return {
      success: false,
      error: parsed?.error ?? "Failed to analyze stock.",
      details: parsed?.details,
    }
  }
}

export async function analyzeStockAction(action: StockAction, notes?: string): Promise<StockAnalysisResponse> {
  return analyzeStock({
    symbol: action.symbol,
    currentPrice: action.priceCents / 100,
    action: action.action,
    shares: action.shares,
    notes,
  })
}

export async function analyzePortfolioStockActions(actions: StockAction[]): Promise<StockAnalysisResponse[]> {
  const executable = actions.filter((action) => action.status === "executed")
  const uniqueBySymbol = Array.from(
    new Map(executable.map((action) => [action.symbol.toUpperCase(), action])).values()
  )

  const results = await Promise.all(
    uniqueBySymbol.map((action) =>
      analyzeStockAction(action, `Auto-analysis refresh for ${action.symbol.toUpperCase()}`)
    )
  )

  return results
}

export async function getPortfolioAnalysis(): Promise<StockAnalysisPortfolioResponse["data"] | null> {
  const context = buildStockAnalysisContextSnapshot()
  return {
    context,
    activePositions: context.activePositions,
    stats: context.stats,
  }
}

export async function getSymbolAnalyses(symbol: string) {
  const normalized = symbol.trim().toUpperCase()
  const analyses = getAnalysesBySymbol(normalized)
  return {
    symbol: normalized,
    analyses: analyses.map((entry) => ({
      id: entry.id,
      createdAt: entry.createdAt,
      signal: entry.recommendation.signal,
      entryPrice: entry.action.priceCents / 100,
      shares: entry.action.shares,
      status: entry.status,
      confidence: entry.recommendation.confidence,
      riskScore: entry.recommendation.riskScore,
      potentialReturn: entry.recommendation.potentialReturn,
    })),
  }
}

export function getAnalysisContextForChat(locale: "fr" | "en" = "fr"): string {
  return generatePortfolioSummary(locale)
}

export function loadStockIntelligenceContext(locale: "fr" | "en" = "fr"): StockIntelligenceContext {
  return {
    summary: generatePortfolioSummary(locale),
    registry: buildStockAnalysisContextSnapshot(),
    alerts: getAlertsSnapshot(),
  }
}

export function extractSymbols(message: string): string[] {
  const matches = message.toUpperCase().match(/\b[A-Z]{1,5}\b/g) ?? []
  const stopWords = new Set(["THE", "AND", "FOR", "THAT", "WITH", "FROM", "TO", "OF", "IN", "IS", "BUY", "SELL"])
  return Array.from(new Set(matches.filter((token) => !stopWords.has(token))))
}

export function formatAnalysisSummary(analysis: StockAnalysisReport, locale: "fr" | "en" = "fr"): string {
  const { symbol, prices, technical, recommendation } = analysis
  if (locale === "en") {
    return [
      `${symbol}: ${recommendation.signal.toUpperCase()} (${recommendation.confidence.toFixed(0)}%)`,
      `Price ${prices.current.toFixed(2)} | Target ${recommendation.priceTarget.toFixed(2)}`,
      `Risk ${recommendation.riskScore.toFixed(0)}/100 | RSI ${technical.rsi14.toFixed(1)} | MACD ${technical.macd.histogram >= 0 ? "bullish" : "bearish"}`,
    ].join(" | ")
  }

  return [
    `${symbol}: ${recommendation.signal.toUpperCase()} (${recommendation.confidence.toFixed(0)}%)`,
    `Prix ${prices.current.toFixed(2)} | Cible ${recommendation.priceTarget.toFixed(2)}`,
    `Risque ${recommendation.riskScore.toFixed(0)}/100 | RSI ${technical.rsi14.toFixed(1)} | MACD ${technical.macd.histogram >= 0 ? "haussier" : "baissier"}`,
  ].join(" | ")
}
