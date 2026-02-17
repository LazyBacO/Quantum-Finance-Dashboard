import { afterEach, describe, expect, it, vi } from "vitest"
import {
  __resetMassiveCachesForTests,
  __setCachedMassiveQuoteForTests,
  fetchMassiveAnalysisContext,
  getCachedMassiveQuote,
  isMassiveLiveModeEnabled,
} from "@/lib/massive-market-data"

const previousMassiveApiKey = process.env.MASSIVE_API_KEY
const previousPolygonApiKey = process.env.POLYGON_API_KEY
const previousMassiveLiveData = process.env.MASSIVE_LIVE_DATA

describe("massive market data", () => {
  afterEach(() => {
    process.env.MASSIVE_API_KEY = previousMassiveApiKey
    process.env.POLYGON_API_KEY = previousPolygonApiKey
    process.env.MASSIVE_LIVE_DATA = previousMassiveLiveData
    __resetMassiveCachesForTests()
  })

  it("stays disabled and returns null context when key is missing", async () => {
    delete process.env.MASSIVE_API_KEY
    delete process.env.POLYGON_API_KEY
    delete process.env.MASSIVE_LIVE_DATA

    expect(isMassiveLiveModeEnabled()).toBe(false)
    await expect(fetchMassiveAnalysisContext("AAPL")).resolves.toBeNull()
  })

  it("returns null cache when quote is unknown", () => {
    expect(getCachedMassiveQuote("UNKNOWN-TICKER")).toBeNull()
  })

  it("evicts expired cached quotes", () => {
    __setCachedMassiveQuoteForTests("AAPL", {
      priceCents: 12345,
      expiresAt: Date.now() - 1,
    })

    expect(getCachedMassiveQuote("AAPL")).toBeNull()
  })

  it("uses v3 financials endpoint to enrich fundamentals when live data is enabled", async () => {
    process.env.MASSIVE_API_KEY = "test-key"
    delete process.env.MASSIVE_LIVE_DATA

    const today = Date.now()
    const bars = Array.from({ length: 40 }, (_, index) => ({
      c: 100 + index,
      h: 101 + index,
      l: 99 + index,
      v: 1_000_000 + index,
      t: today - (40 - index) * 86_400_000,
    }))

    const fetchSpy = vi.fn(async (input: string | URL) => {
      const url = new URL(String(input))
      if (url.pathname.includes("/v2/aggs/ticker/AAPL/range/1/day")) {
        return new Response(JSON.stringify({ status: "OK", results: bars }), { status: 200 })
      }

      if (url.pathname === "/v3/reference/tickers/AAPL") {
        return new Response(JSON.stringify({ results: { market_cap: 1_000_000_000 } }), { status: 200 })
      }

      if (url.pathname === "/v3/reference/financials") {
        return new Response(
          JSON.stringify({
            results: [
              {
                financials: {
                  income_statement: {
                    net_income_loss: { value: 120_000_000 },
                    revenues: { value: 800_000_000 },
                  },
                  balance_sheet: {
                    equity: { value: 500_000_000 },
                    long_term_debt: { value: 100_000_000 },
                  },
                  cash_flow_statement: {
                    net_cash_flow_from_operating_activities: { value: 130_000_000 },
                  },
                },
              },
              {
                financials: {
                  income_statement: {
                    revenues: { value: 700_000_000 },
                  },
                },
              },
            ],
          }),
          { status: 200 }
        )
      }

      return new Response(JSON.stringify({ message: "not found" }), { status: 404 })
    })

    vi.stubGlobal("fetch", fetchSpy)

    try {
      const context = await fetchMassiveAnalysisContext("aapl")

      expect(context).not.toBeNull()
      expect(context?.fundamentals?.growthRate).toBeCloseTo(14.29, 2)
      expect(context?.fundamentals?.pe).toBeCloseTo(8.33, 2)
      expect(
        fetchSpy.mock.calls.some(([input]) =>
          String(input).includes("/v3/reference/financials")
        )
      ).toBe(true)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
