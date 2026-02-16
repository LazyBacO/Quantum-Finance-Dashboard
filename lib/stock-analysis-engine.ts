import type { StockAction } from "@/lib/portfolio-data"

export interface StockPrice {
  symbol: string
  current: number
  high52week: number
  low52week: number
  avgVolume: number
  marketCap: number
  pe: number
  dividend: number
  beta: number
}

export interface TechnicalIndicators {
  sma20: number
  sma50: number
  sma200: number
  rsi14: number
  macd: {
    line: number
    signal: number
    histogram: number
  }
  bollinger: {
    upper: number
    middle: number
    lower: number
  }
  atr: number
  adx: number
}

export interface FundamentalMetrics {
  pe: number
  pb: number
  ps: number
  debt: number
  roe: number
  roic: number
  fcf: number
  growthRate: number
}

export interface StockAIRecommendation {
  symbol: string
  signal: "strong-buy" | "buy" | "hold" | "sell" | "strong-sell"
  confidence: number
  reasonTechnical: string
  reasonFundamental: string
  priceTarget: number
  stopLoss?: number
  takeProfit?: number
  timeframe: "short-term" | "medium-term" | "long-term"
  riskScore: number
  potentialReturn: number
}

export interface StockAnalysisReport {
  symbol: string
  analyzedAt: Date
  prices: StockPrice
  technical: TechnicalIndicators
  fundamental: FundamentalMetrics
  recommendation: StockAIRecommendation
  sentiment: {
    score: number
    source: string[]
  }
  newsImpact: string[]
  correlations: Array<{
    symbol: string
    correlation: number
    meaning: string
  }>
}

export interface StockPortfolioAnalysis {
  totalValue: number
  gainLoss: number
  gainLossPercent: number
  diversificationScore: number
  concentration: Array<{
    symbol: string
    percent: number
    weight: "heavy" | "moderate" | "light"
  }>
  beta: number
  sharpeRatio: number
  recommendations: StockAIRecommendation[]
}

export interface StockActionRecord extends StockAction {
  analysis?: StockAnalysisReport
  performanceMetrics?: {
    gainLossPercent: number
    daysSinceTrade: number
    avgPriceEntry: number
    currentPrice: number
  }
}

const finiteOr = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback)

const clamp = (value: number, min: number, max: number) => {
  const normalizedMin = finiteOr(min, 0)
  const normalizedMax = finiteOr(max, normalizedMin)
  const lower = Math.min(normalizedMin, normalizedMax)
  const upper = Math.max(normalizedMin, normalizedMax)
  const normalizedValue = finiteOr(value, lower)
  return Math.min(upper, Math.max(lower, normalizedValue))
}

const safeDivide = (num: number, den: number, fallback = 0) => {
  if (!Number.isFinite(num) || !Number.isFinite(den) || Math.abs(den) < 1e-8) return fallback
  const result = num / den
  return Number.isFinite(result) ? result : fallback
}

const normalizePrices = (raw: number[]): number[] =>
  raw.filter((value) => Number.isFinite(value) && value > 0).map((value) => Number(value.toFixed(4)))

const calculateSMA = (series: number[], period: number) => {
  if (series.length === 0) return 0
  const window = series.slice(-Math.max(1, period))
  return window.reduce((sum, value) => sum + value, 0) / window.length
}

const calculateEMA = (series: number[], period: number) => {
  if (series.length === 0) return 0
  const multiplier = 2 / (period + 1)
  let ema = series[0]
  for (let i = 1; i < series.length; i += 1) {
    ema = series[i] * multiplier + ema * (1 - multiplier)
  }
  return ema
}

const calculateRSI = (series: number[], period = 14) => {
  if (series.length < period + 1) return 50

  let gains = 0
  let losses = 0
  for (let i = 1; i <= period; i += 1) {
    const delta = series[i] - series[i - 1]
    if (delta >= 0) gains += delta
    else losses -= delta
  }

  let avgGain = gains / period
  let avgLoss = losses / period
  for (let i = period + 1; i < series.length; i += 1) {
    const delta = series[i] - series[i - 1]
    const gain = delta > 0 ? delta : 0
    const loss = delta < 0 ? -delta : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
  }

  if (avgLoss <= 1e-8) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

const calculateMACD = (series: number[]) => {
  if (series.length < 26) {
    return { line: 0, signal: 0, histogram: 0 }
  }

  const fast = calculateEMA(series, 12)
  const slow = calculateEMA(series, 26)
  const line = fast - slow
  const signalSeries = series.map((_, index) => {
    const subSeries = series.slice(0, index + 1)
    return calculateEMA(subSeries, 12) - calculateEMA(subSeries, 26)
  })
  const signal = calculateEMA(signalSeries, 9)

  return {
    line,
    signal,
    histogram: line - signal,
  }
}

const calculateBollinger = (series: number[], period = 20) => {
  const window = series.slice(-Math.max(1, period))
  const middle = calculateSMA(window, window.length)
  const variance = window.reduce((sum, value) => sum + (value - middle) ** 2, 0) / window.length
  const std = Math.sqrt(variance)

  return {
    upper: middle + std * 2,
    middle,
    lower: Math.max(0.01, middle - std * 2),
  }
}

const calculateATRFromClose = (series: number[], period = 14) => {
  if (series.length < 2) return 0
  const changes: number[] = []
  for (let i = 1; i < series.length; i += 1) {
    changes.push(Math.abs(series[i] - series[i - 1]))
  }
  const window = changes.slice(-Math.max(1, period))
  return window.reduce((sum, value) => sum + value, 0) / window.length
}

const calculateADXFromClose = (series: number[], period = 14) => {
  if (series.length < period + 1) return 20

  let positive = 0
  let negative = 0
  for (let i = series.length - period; i < series.length; i += 1) {
    if (i <= 0) continue
    const delta = series[i] - series[i - 1]
    if (delta > 0) positive += delta
    else negative -= delta
  }

  const total = positive + negative
  if (total <= 1e-8) return 20

  return clamp((Math.abs(positive - negative) / total) * 100, 0, 100)
}

const hashSymbol = (symbol: string) => {
  let hash = 0
  for (const char of symbol.toUpperCase()) {
    hash = (hash * 33 + char.charCodeAt(0)) >>> 0
  }
  return hash
}

export const generateSyntheticPriceHistory = (
  symbol: string,
  currentPrice: number,
  days = 260
): number[] => {
  const seed = hashSymbol(symbol)
  const driftPct = ((seed % 12) - 4) / 1000
  const volPct = 0.006 + (seed % 7) / 1000

  const history: number[] = []
  let price = Math.max(1, currentPrice * 0.85)
  for (let i = 0; i < days - 1; i += 1) {
    const cycle = Math.sin((i + (seed % 37)) / 11) * volPct
    const noise = Math.sin((i + 1) * ((seed % 5) + 1)) * (volPct / 2)
    price = Math.max(1, price * (1 + driftPct + cycle + noise * 0.15))
    history.push(Number(price.toFixed(2)))
  }
  history.push(Number(currentPrice.toFixed(2)))
  return history
}

export const generateSyntheticMarketSnapshot = (symbolInput: string, hintPrice?: number) => {
  const symbol = symbolInput.trim().toUpperCase()
  const seed = hashSymbol(symbol)
  const base = hintPrice && hintPrice > 0 ? hintPrice : 40 + (seed % 900) / 5
  const spread = base * (0.15 + (seed % 20) / 100)
  const low52 = Math.max(1, base - spread)
  const high52 = base + spread

  return {
    symbol,
    currentPrice: Number(base.toFixed(2)),
    high52week: Number(high52.toFixed(2)),
    low52week: Number(low52.toFixed(2)),
    avgVolume: 500_000 + (seed % 5_000_000),
    marketCap: 1_000_000_000 + (seed % 800) * 1_000_000_000,
    pe: Number((10 + (seed % 50) * 0.6).toFixed(2)),
    dividend: Number(((seed % 35) / 10).toFixed(2)),
    beta: Number((0.6 + (seed % 140) / 100).toFixed(2)),
    pb: Number((1 + (seed % 40) / 10).toFixed(2)),
    ps: Number((1 + (seed % 30) / 10).toFixed(2)),
    debt: Number(((seed % 22) / 10).toFixed(2)),
    roe: Number((7 + (seed % 30)).toFixed(2)),
    roic: Number((5 + (seed % 24)).toFixed(2)),
    fcf: ((seed % 2 === 0 ? 1 : -1) * (100_000_000 + (seed % 20) * 50_000_000)),
    growthRate: Number((-3 + (seed % 28)).toFixed(2)),
  }
}

export function calculateTechnicalIndicators(pricesRaw: number[], currentPrice: number): TechnicalIndicators {
  let prices = normalizePrices(pricesRaw)
  if (prices.length < 30) {
    prices = generateSyntheticPriceHistory("SYNTH", Math.max(1, currentPrice), 260)
  }

  const sma20 = calculateSMA(prices, 20)
  const sma50 = calculateSMA(prices, 50)
  const sma200 = calculateSMA(prices, 200)
  const rsi14 = clamp(calculateRSI(prices, 14), 0, 100)
  const macd = calculateMACD(prices)
  const bollinger = calculateBollinger(prices, 20)
  const atr = calculateATRFromClose(prices, 14)
  const adx = calculateADXFromClose(prices, 14)

  return {
    sma20,
    sma50,
    sma200,
    rsi14,
    macd,
    bollinger,
    atr,
    adx,
  }
}

const getTechnicalReason = (technical: TechnicalIndicators, currentPrice: number) => {
  const reasons: string[] = []

  if (technical.rsi14 <= 30) reasons.push("RSI survendu")
  else if (technical.rsi14 >= 70) reasons.push("RSI surachete")
  else reasons.push("RSI neutre")

  if (technical.macd.histogram >= 0) reasons.push("MACD haussier")
  else reasons.push("MACD baissier")

  if (currentPrice >= technical.sma200) reasons.push("prix au-dessus de la SMA200")
  else reasons.push("prix sous la SMA200")

  if (technical.adx >= 35) reasons.push("tendance solide")
  else reasons.push("tendance faible a moderee")

  return reasons.join(", ")
}

const getFundamentalReason = (fundamental: FundamentalMetrics) => {
  const reasons: string[] = []
  if (fundamental.pe > 0 && fundamental.pe < 20) reasons.push("valorisation raisonnable")
  if (fundamental.pe > 35) reasons.push("valorisation elevee")
  if (fundamental.roe >= 15) reasons.push("ROE robuste")
  if (fundamental.debt >= 1.5) reasons.push("levier financier eleve")
  if (fundamental.fcf > 0) reasons.push("flux de tresorerie positifs")
  else reasons.push("flux de tresorerie negatifs")
  if (fundamental.growthRate >= 10) reasons.push("croissance favorable")
  return reasons.join(", ")
}

const computeTechnicalScore = (technical: TechnicalIndicators, currentPrice: number) => {
  let score = 50

  score += clamp((technical.sma20 - technical.sma50) / Math.max(technical.sma50, 0.01) * 400, -10, 10)
  score += currentPrice >= technical.sma200 ? 10 : -10

  if (technical.rsi14 < 30) score += 14
  else if (technical.rsi14 > 70) score -= 14
  else score += (50 - technical.rsi14) * 0.25

  score += technical.macd.histogram >= 0 ? 10 : -10
  score += clamp((technical.adx - 20) * 0.35, -5, 10)

  return clamp(score, 0, 100)
}

const computeFundamentalScore = (fundamental: FundamentalMetrics) => {
  let score = 50

  if (fundamental.pe > 0 && fundamental.pe < 18) score += 12
  else if (fundamental.pe > 40) score -= 12

  if (fundamental.pb > 0 && fundamental.pb < 3.5) score += 6
  else if (fundamental.pb > 8) score -= 6

  if (fundamental.debt < 1) score += 10
  else if (fundamental.debt > 2) score -= 14

  if (fundamental.roe > 15) score += 10
  else if (fundamental.roe < 8) score -= 8

  if (fundamental.roic > 10) score += 8
  else if (fundamental.roic < 5) score -= 6

  if (fundamental.fcf > 0) score += 8
  else score -= 10

  score += clamp(fundamental.growthRate * 0.7, -12, 14)

  return clamp(score, 0, 100)
}

const computeRiskScore = (technical: TechnicalIndicators, fundamental: FundamentalMetrics, prices: StockPrice) => {
  const atrRatio = safeDivide(technical.atr, Math.max(prices.current, 0.01))
  let risk = 40

  risk += clamp(atrRatio * 1200, 0, 30)
  risk += clamp((prices.beta - 1) * 20, -8, 20)
  risk += clamp((fundamental.debt - 1) * 18, -8, 25)
  if (fundamental.fcf < 0) risk += 10
  if (technical.rsi14 > 78 || technical.rsi14 < 22) risk += 8

  return clamp(risk, 0, 100)
}

const signalFromScore = (score: number): StockAIRecommendation["signal"] => {
  if (score >= 76) return "strong-buy"
  if (score >= 60) return "buy"
  if (score >= 42) return "hold"
  if (score >= 26) return "sell"
  return "strong-sell"
}

const timeframeFromContext = (fundamental: FundamentalMetrics, technical: TechnicalIndicators) => {
  if (fundamental.growthRate >= 14 && technical.adx >= 30) return "short-term" as const
  if (fundamental.growthRate >= 6) return "medium-term" as const
  return "long-term" as const
}

export function analyzeStock(
  symbolInput: string,
  prices: StockPrice,
  technical: TechnicalIndicators,
  fundamental: FundamentalMetrics
): StockAIRecommendation {
  const symbol = symbolInput.trim().toUpperCase()
  const currentPrice = clamp(finiteOr(prices.current, 0.01), 0.01, Number.MAX_SAFE_INTEGER)
  const high52week = clamp(finiteOr(prices.high52week, currentPrice), currentPrice, Number.MAX_SAFE_INTEGER)
  const low52week = clamp(finiteOr(prices.low52week, currentPrice), 0.01, currentPrice)

  const technicalScore = computeTechnicalScore(technical, currentPrice)
  const fundamentalScore = computeFundamentalScore(fundamental)
  const aiScore = technicalScore * 0.45 + fundamentalScore * 0.55
  const signal = signalFromScore(aiScore)
  const riskScore = computeRiskScore(technical, fundamental, prices)

  const meanReversionTarget = finiteOr(technical.bollinger.middle, currentPrice)
  const trendTarget = finiteOr(technical.sma200, currentPrice) * 0.2 + high52week * 0.25 + currentPrice * 0.55
  const rawTarget = signal === "sell" || signal === "strong-sell" ? currentPrice * 0.92 : (meanReversionTarget + trendTarget) / 2
  const priceTarget = Number(clamp(rawTarget, low52week * 0.85, high52week * 1.2).toFixed(2))

  const potentialReturn = safeDivide(priceTarget - currentPrice, currentPrice) * 100
  const stopBufferPct = clamp(0.05 + riskScore / 500, 0.05, 0.2)
  const stopLoss = Number((currentPrice * (1 - stopBufferPct)).toFixed(2))
  const takeProfit = Number((currentPrice * (1 + clamp(Math.abs(potentialReturn) / 100 + 0.04, 0.06, 0.3))).toFixed(2))

  const confidence = clamp(45 + Math.abs(aiScore - 50) * 0.9 - Math.abs(riskScore - 55) * 0.2, 35, 95)

  return {
    symbol,
    signal,
    confidence: Number(confidence.toFixed(1)),
    reasonTechnical: getTechnicalReason(technical, currentPrice),
    reasonFundamental: getFundamentalReason(fundamental),
    priceTarget,
    stopLoss,
    takeProfit,
    timeframe: timeframeFromContext(fundamental, technical),
    riskScore: Number(riskScore.toFixed(1)),
    potentialReturn: Number(potentialReturn.toFixed(2)),
  }
}

export function analyzeStockPortfolio(
  stocks: StockActionRecord[],
  recommendations: StockAIRecommendation[]
): StockPortfolioAnalysis {
  const snapshots = stocks.map((stock) => {
    const entry = stock.priceCents / 100
    const current = stock.performanceMetrics?.currentPrice ?? entry
    const qty = stock.shares
    const value = qty * current
    const pnl = qty * (current - entry)
    return {
      symbol: stock.symbol.toUpperCase(),
      value,
      pnl,
    }
  })

  const totalValue = snapshots.reduce((sum, snapshot) => sum + snapshot.value, 0)
  const gainLoss = snapshots.reduce((sum, snapshot) => sum + snapshot.pnl, 0)
  const gainLossPercent = totalValue > 0 ? (gainLoss / totalValue) * 100 : 0

  const concentration = snapshots
    .map((snapshot) => {
      const pct = totalValue > 0 ? (snapshot.value / totalValue) * 100 : 0
      return {
        symbol: snapshot.symbol,
        percent: Number(pct.toFixed(2)),
        weight: pct >= 25 ? ("heavy" as const) : pct >= 10 ? ("moderate" as const) : ("light" as const),
      }
    })
    .sort((a, b) => b.percent - a.percent)

  const unique = new Set(stocks.map((stock) => stock.symbol.toUpperCase())).size
  const concentrationPenalty = concentration.reduce((sum, item) => sum + Math.max(0, item.percent - 20), 0)
  const diversificationScore = clamp(35 + unique * 8 - concentrationPenalty * 0.7, 0, 100)

  const avgRisk = recommendations.length
    ? recommendations.reduce((sum, item) => sum + item.riskScore, 0) / recommendations.length
    : 55
  const beta = clamp(0.7 + avgRisk / 120, 0.5, 2.2)
  const annualizedReturn = clamp(gainLossPercent * 3.5, -35, 55)
  const riskFreeRate = 3.5
  const volatilityProxy = clamp(avgRisk / 2.8, 8, 45)
  const sharpeRatio = Number(safeDivide(annualizedReturn - riskFreeRate, volatilityProxy, 0).toFixed(2))

  return {
    totalValue: Number(totalValue.toFixed(2)),
    gainLoss: Number(gainLoss.toFixed(2)),
    gainLossPercent: Number(gainLossPercent.toFixed(2)),
    diversificationScore: Number(diversificationScore.toFixed(1)),
    concentration,
    beta: Number(beta.toFixed(2)),
    sharpeRatio,
    recommendations,
  }
}

const mapSignalToFrench = (signal: StockAIRecommendation["signal"]) => {
  if (signal === "strong-buy") return "Achat fort"
  if (signal === "buy") return "Achat"
  if (signal === "hold") return "Conserver"
  if (signal === "sell") return "Vente"
  return "Vente forte"
}

export function generateAnalysisSummary(report: StockAnalysisReport, locale: "fr" | "en" = "fr"): string {
  const { symbol, prices, technical, fundamental, recommendation, sentiment } = report

  if (locale === "en") {
    return [
      `Stock ${symbol}`,
      `Price ${prices.current.toFixed(2)} | Signal ${recommendation.signal.toUpperCase()} (${recommendation.confidence.toFixed(0)}%)`,
      `RSI ${technical.rsi14.toFixed(1)} | MACD ${technical.macd.histogram >= 0 ? "bullish" : "bearish"} | SMA200 ${technical.sma200.toFixed(2)}`,
      `P/E ${fundamental.pe.toFixed(1)} | ROE ${fundamental.roe.toFixed(1)}% | Growth ${fundamental.growthRate.toFixed(1)}% | FCF ${fundamental.fcf >= 0 ? "positive" : "negative"}`,
      `Target ${recommendation.priceTarget.toFixed(2)} | Stop ${recommendation.stopLoss?.toFixed(2)} | Risk ${recommendation.riskScore.toFixed(0)}/100`,
      `Sentiment ${sentiment.score.toFixed(2)}`,
    ].join("\n")
  }

  return [
    `Analyse ${symbol}`,
    `Prix ${prices.current.toFixed(2)} | Signal ${mapSignalToFrench(recommendation.signal)} (${recommendation.confidence.toFixed(0)}%)`,
    `RSI ${technical.rsi14.toFixed(1)} | MACD ${technical.macd.histogram >= 0 ? "haussier" : "baissier"} | SMA200 ${technical.sma200.toFixed(2)}`,
    `P/E ${fundamental.pe.toFixed(1)} | ROE ${fundamental.roe.toFixed(1)}% | Croissance ${fundamental.growthRate.toFixed(1)}% | FCF ${fundamental.fcf >= 0 ? "positif" : "negatif"}`,
    `Cible ${recommendation.priceTarget.toFixed(2)} | Stop ${recommendation.stopLoss?.toFixed(2)} | Risque ${recommendation.riskScore.toFixed(0)}/100`,
    `Sentiment ${sentiment.score.toFixed(2)}`,
  ].join("\n")
}

export function buildActionableInsights(report: StockAnalysisReport, locale: "fr" | "en" = "fr"): string[] {
  const signal = report.recommendation.signal
  const risk = report.recommendation.riskScore
  const current = report.prices.current
  const target = report.recommendation.priceTarget
  const stop = report.recommendation.stopLoss ?? current * 0.92

  if (locale === "en") {
    return [
      signal === "strong-buy" || signal === "buy"
        ? `Entry zone near ${current.toFixed(2)} with staged buying if spread allows.`
        : `Avoid new entry until signal improves from ${signal}.`,
      `Risk control: stop near ${stop.toFixed(2)} and max position sizing based on risk score ${risk.toFixed(0)}/100.`,
      `Upside scenario targets ${target.toFixed(2)} in ${report.recommendation.timeframe}.`,
    ]
  }

  return [
    signal === "strong-buy" || signal === "buy"
      ? `Zone d'entree proche de ${current.toFixed(2)} avec execution en plusieurs tranches.`
      : `Eviter une nouvelle entree tant que le signal reste ${mapSignalToFrench(signal).toLowerCase()}.`,
    `Controle du risque: stop vers ${stop.toFixed(2)} et taille de position adaptee au score de risque ${risk.toFixed(0)}/100.`,
    `Scenario haussier: objectif ${target.toFixed(2)} sur horizon ${report.recommendation.timeframe}.`,
  ]
}
