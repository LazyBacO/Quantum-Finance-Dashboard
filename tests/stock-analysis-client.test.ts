import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/market-data-client", () => ({
  buildMarketDataHeaders: () => ({}),
}))

import { analyzeStock } from "@/lib/stock-analysis-client"

describe("stock-analysis-client", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("does not inject synthetic numeric defaults into API payload", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : {}

      expect(body).toEqual({ symbol: "AAPL" })
      expect(body.currentPrice).toBeUndefined()
      expect(body.pe).toBeUndefined()

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            report: {
              symbol: "AAPL",
              analyzedAt: new Date().toISOString(),
              prices: {
                symbol: "AAPL",
                current: 100,
                high52week: 110,
                low52week: 90,
                avgVolume: 1,
                marketCap: 1,
                pe: 1,
                dividend: 0,
                beta: 1,
              },
              technical: {
                rsi14: 50,
                sma20: 100,
                sma50: 100,
                ema12: 100,
                ema26: 100,
                macd: { line: 0, signal: 0, histogram: 0 },
                volatility: 0.1,
                support: [95],
                resistance: [105],
              },
              fundamental: {
                pe: 1,
                pb: 1,
                ps: 1,
                debt: 0,
                roe: 1,
                roic: 1,
                fcf: 1,
                growthRate: 1,
              },
              recommendation: {
                signal: "hold",
                confidence: 50,
                reason: "neutral",
                priceTarget: 100,
                stopLoss: 90,
                riskScore: 50,
                potentialReturn: 0,
              },
              sentiment: { score: 0, source: [] },
              newsImpact: [],
              correlations: [],
            },
            recommendation: {
              signal: "hold",
              confidence: 50,
              reason: "neutral",
              priceTarget: 100,
              stopLoss: 90,
              riskScore: 50,
              potentialReturn: 0,
            },
            summary: "ok",
            proactiveSignals: [],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    })

    vi.stubGlobal("fetch", fetchMock)

    const response = await analyzeStock({ symbol: "aapl" })
    expect(response.success).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
