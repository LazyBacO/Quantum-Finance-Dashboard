import { describe, expect, it } from "vitest"
import {
  analyzeStock,
  calculateTechnicalIndicators,
  generateSyntheticMarketSnapshot,
  generateSyntheticPriceHistory,
} from "@/lib/stock-analysis-engine"

describe("stock analysis engine", () => {
  it("computes technical indicators in valid ranges", () => {
    const history = generateSyntheticPriceHistory("AAPL", 190, 260)
    const technical = calculateTechnicalIndicators(history, 190)

    expect(technical.sma20).toBeGreaterThan(0)
    expect(technical.sma50).toBeGreaterThan(0)
    expect(technical.sma200).toBeGreaterThan(0)
    expect(technical.rsi14).toBeGreaterThanOrEqual(0)
    expect(technical.rsi14).toBeLessThanOrEqual(100)
    expect(technical.bollinger.upper).toBeGreaterThanOrEqual(technical.bollinger.middle)
    expect(technical.bollinger.middle).toBeGreaterThanOrEqual(technical.bollinger.lower)
  })

  it("returns bounded recommendation metrics", () => {
    const market = generateSyntheticMarketSnapshot("MSFT", 420)
    const history = generateSyntheticPriceHistory("MSFT", market.currentPrice, 260)
    const technical = calculateTechnicalIndicators(history, market.currentPrice)
    const recommendation = analyzeStock(
      "MSFT",
      {
        symbol: "MSFT",
        current: market.currentPrice,
        high52week: market.high52week,
        low52week: market.low52week,
        avgVolume: market.avgVolume,
        marketCap: market.marketCap,
        pe: market.pe,
        dividend: market.dividend,
        beta: market.beta,
      },
      technical,
      {
        pe: market.pe,
        pb: market.pb,
        ps: market.ps,
        debt: market.debt,
        roe: market.roe,
        roic: market.roic,
        fcf: market.fcf,
        growthRate: market.growthRate,
      }
    )

    expect(recommendation.confidence).toBeGreaterThanOrEqual(0)
    expect(recommendation.confidence).toBeLessThanOrEqual(100)
    expect(recommendation.riskScore).toBeGreaterThanOrEqual(0)
    expect(recommendation.riskScore).toBeLessThanOrEqual(100)
    expect(["strong-buy", "buy", "hold", "sell", "strong-sell"]).toContain(recommendation.signal)
    expect(recommendation.priceTarget).toBeGreaterThan(0)
  })

  it("sanitizes non-finite inputs into deterministic bounded outputs", () => {
    const recommendation = analyzeStock(
      "  nvda  ",
      {
        symbol: "NVDA",
        current: Number.NaN,
        high52week: Number.POSITIVE_INFINITY,
        low52week: Number.NaN,
        avgVolume: Number.NaN,
        marketCap: Number.NaN,
        pe: Number.NaN,
        dividend: Number.NaN,
        beta: Number.NaN,
      },
      {
        sma20: Number.NaN,
        sma50: Number.NaN,
        sma200: Number.NaN,
        rsi14: Number.NaN,
        macd: { line: Number.NaN, signal: Number.NaN, histogram: Number.NaN },
        bollinger: { upper: Number.NaN, middle: Number.NaN, lower: Number.NaN },
        atr: Number.NaN,
        adx: Number.NaN,
      },
      {
        pe: Number.NaN,
        pb: Number.NaN,
        ps: Number.NaN,
        debt: Number.NaN,
        roe: Number.NaN,
        roic: Number.NaN,
        fcf: Number.NaN,
        growthRate: Number.NaN,
      }
    )

    expect(recommendation.symbol).toBe("NVDA")
    expect(Number.isFinite(recommendation.confidence)).toBe(true)
    expect(Number.isFinite(recommendation.riskScore)).toBe(true)
    expect(Number.isFinite(recommendation.priceTarget)).toBe(true)
    expect(Number.isFinite(recommendation.potentialReturn)).toBe(true)
    expect(recommendation.confidence).toBeGreaterThanOrEqual(0)
    expect(recommendation.confidence).toBeLessThanOrEqual(100)
    expect(recommendation.riskScore).toBeGreaterThanOrEqual(0)
    expect(recommendation.riskScore).toBeLessThanOrEqual(100)
    expect(recommendation.priceTarget).toBeGreaterThan(0)
  })
})

