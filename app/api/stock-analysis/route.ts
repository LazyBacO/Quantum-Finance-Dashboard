import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import {
  analyzeStock,
  buildActionableInsights,
  calculateTechnicalIndicators,
  generateAnalysisSummary,
  generateSyntheticMarketSnapshot,
  generateSyntheticPriceHistory,
  type FundamentalMetrics,
  type StockAIRecommendation,
  type StockAnalysisReport,
  type StockPrice,
} from "@/lib/stock-analysis-engine"
import { parseMarketDataRequestHeaders, type MarketDataRequestConfig } from "@/lib/market-data-config"
import { fetchPreferredMarketAnalysisContext } from "@/lib/market-data-router"

const analyzeStockRequestSchema = z.object({
  symbol: z.string().min(1).max(10),
  currentPrice: z.number().positive().optional(),
  high52week: z.number().positive().optional(),
  low52week: z.number().positive().optional(),
  avgVolume: z.number().nonnegative().optional(),
  marketCap: z.number().nonnegative().optional(),
  pe: z.number().nonnegative().optional(),
  dividend: z.number().nonnegative().optional(),
  beta: z.number().optional(),
  pb: z.number().nonnegative().optional(),
  ps: z.number().nonnegative().optional(),
  debt: z.number().nonnegative().optional(),
  roe: z.number().optional(),
  roic: z.number().optional(),
  fcf: z.number().optional(),
  growthRate: z.number().optional(),
  priceHistory: z.array(z.number().positive()).max(1200).optional(),
  action: z.enum(["buy", "sell"]).optional(),
  shares: z.number().positive().optional(),
  notes: z.string().max(500).optional(),
})

const localeSchema = z.enum(["fr", "en"]).default("fr")

const toPricePayload = async (
  symbol: string,
  data: z.infer<typeof analyzeStockRequestSchema>,
  marketDataConfig: MarketDataRequestConfig
): Promise<{
  prices: StockPrice
  fundamentals: FundamentalMetrics
  priceHistory: number[]
  dataSource: "twelvedata-live" | "massive-live" | "massive-delayed" | "synthetic"
}> => {
  const synthetic = generateSyntheticMarketSnapshot(symbol, data.currentPrice)
  const preferredContext = await fetchPreferredMarketAnalysisContext(symbol, marketDataConfig)
  const liveContext = preferredContext?.context

  const current = data.currentPrice ?? liveContext?.currentPrice ?? synthetic.currentPrice
  const high52week = data.high52week ?? liveContext?.high52week ?? synthetic.high52week
  const low52week = data.low52week ?? liveContext?.low52week ?? synthetic.low52week
  const liveFundamentals = liveContext?.fundamentals

  const prices: StockPrice = {
    symbol,
    current,
    high52week: Math.max(high52week, current),
    low52week: Math.min(low52week, current),
    avgVolume: data.avgVolume ?? liveContext?.avgVolume ?? synthetic.avgVolume,
    marketCap: data.marketCap ?? liveContext?.marketCap ?? synthetic.marketCap,
    pe: data.pe ?? liveFundamentals?.pe ?? synthetic.pe,
    dividend: data.dividend ?? synthetic.dividend,
    beta: data.beta ?? synthetic.beta,
  }

  const fundamentals: FundamentalMetrics = {
    pe: data.pe ?? liveFundamentals?.pe ?? synthetic.pe,
    pb: data.pb ?? liveFundamentals?.pb ?? synthetic.pb,
    ps: data.ps ?? liveFundamentals?.ps ?? synthetic.ps,
    debt: data.debt ?? liveFundamentals?.debt ?? synthetic.debt,
    roe: data.roe ?? liveFundamentals?.roe ?? synthetic.roe,
    roic: data.roic ?? liveFundamentals?.roic ?? synthetic.roic,
    fcf: data.fcf ?? liveFundamentals?.fcf ?? synthetic.fcf,
    growthRate: data.growthRate ?? liveFundamentals?.growthRate ?? synthetic.growthRate,
  }

  const priceHistory =
    data.priceHistory && data.priceHistory.length >= 30
      ? data.priceHistory
      : liveContext?.priceHistory && liveContext.priceHistory.length >= 30
        ? liveContext.priceHistory
        : generateSyntheticPriceHistory(symbol, current, 260)

  return {
    prices,
    fundamentals,
    priceHistory,
    dataSource: preferredContext?.source ?? "synthetic",
  }
}

const buildProactiveSignals = (
  symbol: string,
  recommendation: StockAIRecommendation,
  rsi: number
): Array<{ severity: "info" | "warning" | "critical"; headline: string; recommendation: string }> => {
  const signals: Array<{ severity: "info" | "warning" | "critical"; headline: string; recommendation: string }> = []

  if (recommendation.signal === "strong-buy" || recommendation.signal === "buy") {
    signals.push({
      severity: recommendation.riskScore >= 70 ? "warning" : "info",
      headline: `${symbol}: setup haussier detecte`,
      recommendation: `Entrer progressivement, cible ${recommendation.priceTarget.toFixed(2)}, stop ${recommendation.stopLoss?.toFixed(2)}.`,
    })
  }

  if (recommendation.signal === "sell" || recommendation.signal === "strong-sell") {
    signals.push({
      severity: recommendation.signal === "strong-sell" ? "critical" : "warning",
      headline: `${symbol}: risque de baisse`,
      recommendation: `Verifier un allegement de position. Score risque ${recommendation.riskScore.toFixed(0)}/100.`,
    })
  }

  if (rsi <= 30 || rsi >= 70) {
    signals.push({
      severity: "warning",
      headline: `${symbol}: extremum RSI`,
      recommendation: `RSI ${rsi.toFixed(1)}. Reevaluer timing d'entree/sortie.`,
    })
  }

  return signals
}

export const POST = async (request: Request) => {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON payload." }, { status: 400 })
  }

  const parsed = analyzeStockRequestSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid stock analysis payload.",
        details: parsed.error.issues.slice(0, 3).map((issue) => issue.message),
      },
      { status: 400 }
    )
  }

  const symbol = parsed.data.symbol.trim().toUpperCase()
  const marketDataConfig = parseMarketDataRequestHeaders(request)
  const { prices, fundamentals, priceHistory, dataSource } = await toPricePayload(
    symbol,
    parsed.data,
    marketDataConfig
  )
  const technical = calculateTechnicalIndicators(priceHistory, prices.current)
  const recommendation = analyzeStock(symbol, prices, technical, fundamentals)

  const report: StockAnalysisReport = {
    symbol,
    analyzedAt: new Date(),
    prices,
    technical,
    fundamental: fundamentals,
    recommendation,
    sentiment: {
      score: Number((((recommendation.confidence - 50) / 50) * 0.6).toFixed(2)),
      source: ["technical-indicators", "fundamental-metrics", "risk-model"],
    },
    newsImpact: recommendation.riskScore > 70 ? ["elevated-volatility-regime"] : ["stable-market-regime"],
    correlations: [
      {
        symbol: "SPY",
        correlation: Number((0.55 + prices.beta * 0.2).toFixed(2)),
        meaning: "Market beta proxy",
      },
      {
        symbol: "QQQ",
        correlation: Number((0.45 + prices.beta * 0.15).toFixed(2)),
        meaning: "Growth factor proxy",
      },
    ],
  }

  const locale = localeSchema.parse(new URL(request.url).searchParams.get("locale") ?? "fr")
  const summary = generateAnalysisSummary(report, locale)
  const actionableInsights = buildActionableInsights(report, locale)
  const proactiveSignals = buildProactiveSignals(symbol, recommendation, technical.rsi14)

  const entry =
    parsed.data.action && parsed.data.shares
      ? {
          id: `analysis-${randomUUID()}`,
          status: parsed.data.action === "buy" ? "active" : "closed",
        }
      : undefined

  return NextResponse.json({
    success: true,
    data: {
      report,
      recommendation,
      summary,
      dataSource,
      proactiveSignals,
      actionableInsights,
      entryId: entry?.id,
      entry,
    },
  })
}

export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")

  if (action === "health" || !action) {
    return NextResponse.json({
      success: true,
      data: {
        status: "ok",
        engine: "stock-analysis",
        timestamp: new Date().toISOString(),
      },
    })
  }

  if (action === "sample") {
    const symbol = (searchParams.get("symbol") ?? "AAPL").trim().toUpperCase()
    const sample = generateSyntheticMarketSnapshot(symbol)
    return NextResponse.json({
      success: true,
      data: sample,
    })
  }

  if (action === "portfolio") {
    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalInvested: 0,
          totalRealizedGainLoss: 0,
          totalRealizedReturnPct: 0,
          avgReturnClosed: 0,
          activePositions: 0,
          closedPositions: 0,
          totalTrades: 0,
          winRate: 0,
          bestTrade: null,
          worstTrade: null,
        },
        activePositions: [],
        note: "Portfolio registry is client-side and must be read from local storage.",
      },
    })
  }

  if (action === "analyses") {
    const symbol = (searchParams.get("symbol") ?? "").trim().toUpperCase()
    return NextResponse.json({
      success: true,
      data: {
        symbol,
        analyses: [],
        note: "Symbol analysis history is client-side and must be read from local storage.",
      },
    })
  }

  return NextResponse.json(
    {
      success: false,
      error: "Unsupported action. Use `health`, `sample`, `portfolio`, or `analyses`.",
    },
    { status: 400 }
  )
}
