import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { GET, POST } from "@/app/api/stock-analysis/route"

describe("/api/stock-analysis", () => {
  const previousMassiveLiveData = process.env.MASSIVE_LIVE_DATA
  const previousMassiveApiKey = process.env.MASSIVE_API_KEY
  const previousPolygonApiKey = process.env.POLYGON_API_KEY
  const previousTwelveDataLiveData = process.env.TWELVEDATA_LIVE_DATA
  const previousTwelveDataApiKey = process.env.TWELVEDATA_API_KEY
  const previousFetch = global.fetch

  beforeEach(() => {
    // Keep tests deterministic and network-free
    process.env.MASSIVE_LIVE_DATA = "false"
    delete process.env.MASSIVE_API_KEY
    delete process.env.POLYGON_API_KEY
    process.env.TWELVEDATA_LIVE_DATA = "false"
    delete process.env.TWELVEDATA_API_KEY
  })

  afterEach(() => {
    process.env.MASSIVE_LIVE_DATA = previousMassiveLiveData
    process.env.MASSIVE_API_KEY = previousMassiveApiKey
    process.env.POLYGON_API_KEY = previousPolygonApiKey
    process.env.TWELVEDATA_LIVE_DATA = previousTwelveDataLiveData
    process.env.TWELVEDATA_API_KEY = previousTwelveDataApiKey
    global.fetch = previousFetch
    vi.restoreAllMocks()
  })

  it("returns validation error on invalid payload", async () => {
    const response = await POST(
      new Request("http://localhost/api/stock-analysis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ symbol: "" }),
      })
    )

    expect(response.status).toBe(400)
  })

  it("rejects blank or malformed symbols", async () => {
    const blankResponse = await POST(
      new Request("http://localhost/api/stock-analysis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ symbol: "   " }),
      })
    )

    expect(blankResponse.status).toBe(400)

    const malformedResponse = await POST(
      new Request("http://localhost/api/stock-analysis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ symbol: "AAPL<script>" }),
      })
    )

    expect(malformedResponse.status).toBe(400)
  })

  it("returns full analysis payload for valid request", async () => {
    const response = await POST(
      new Request("http://localhost/api/stock-analysis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          symbol: "AAPL",
          currentPrice: 191.4,
          pe: 27.5,
          roe: 32,
          growthRate: 9,
          action: "buy",
          shares: 10,
        }),
      })
    )

    expect(response.status).toBe(200)
    const payload = (await response.json()) as {
      success: boolean
      data?: {
        recommendation?: { signal?: string }
        report?: { symbol?: string; technical?: { rsi14?: number } }
        dataSource?: string
        uncertaintyMessages?: string[]
        proactiveSignals?: unknown[]
        entryId?: string
      }
    }

    expect(payload.success).toBe(true)
    expect(payload.data?.report?.symbol).toBe("AAPL")
    expect(typeof payload.data?.report?.technical?.rsi14).toBe("number")
    expect(payload.data?.dataSource).toBe("synthetic")
    expect(payload.data?.uncertaintyMessages?.length).toBeGreaterThan(0)
    expect(payload.data?.uncertaintyMessages?.[0]).toContain("estimations synthetiques")
    expect(payload.data?.entryId).toBeTruthy()
    expect(Array.isArray(payload.data?.proactiveSignals)).toBe(true)
  })

  it("accepts caret-prefixed index symbols", async () => {
    const response = await POST(
      new Request("http://localhost/api/stock-analysis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ symbol: "^gspc" }),
      })
    )

    expect(response.status).toBe(200)
    const payload = (await response.json()) as {
      success: boolean
      data?: { report?: { symbol?: string } }
    }

    expect(payload.success).toBe(true)
    expect(payload.data?.report?.symbol).toBe("^GSPC")
  })

  it("returns delayed-data uncertainty messaging when provider status is delayed", async () => {
    process.env.MASSIVE_LIVE_DATA = "true"
    process.env.MASSIVE_API_KEY = "test-key"

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes("/v2/aggs/ticker/AAPL/range/1/day")) {
        return new Response(
          JSON.stringify({
            status: "DELAYED",
            results: Array.from({ length: 35 }, (_, index) => ({
              c: 180 + index * 0.5,
              h: 181 + index * 0.5,
              l: 179 + index * 0.5,
              v: 1_000_000 + index * 1000,
              t: Date.UTC(2025, 0, index + 1),
            })),
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      }

      if (url.includes("/v3/reference/tickers/AAPL")) {
        return new Response(
          JSON.stringify({ results: { market_cap: 2_500_000_000_000 } }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      }

      if (url.includes("/v3/reference/financials")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                financials: {
                  income_statement: {
                    net_income_loss: { value: 100_000_000_000 },
                    revenues: { value: 500_000_000_000 },
                  },
                  balance_sheet: {
                    equity: { value: 700_000_000_000 },
                    long_term_debt: { value: 200_000_000_000 },
                  },
                  cash_flow_statement: {
                    net_cash_flow_from_operating_activities: { value: 120_000_000_000 },
                  },
                },
              },
              {
                financials: {
                  income_statement: {
                    revenues: { value: 450_000_000_000 },
                  },
                },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      }

      return new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }) as typeof fetch

    const response = await POST(
      new Request("http://localhost/api/stock-analysis?locale=en", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-market-provider": "massive",
          "x-massive-api-key": "test-key",
        },
        body: JSON.stringify({ symbol: "AAPL" }),
      })
    )

    expect(response.status).toBe(200)
    const payload = (await response.json()) as {
      success: boolean
      data?: { dataSource?: string; uncertaintyMessages?: string[] }
    }

    expect(payload.success).toBe(true)
    expect(payload.data?.dataSource).toBe("massive-delayed")
    expect(payload.data?.uncertaintyMessages?.[0]).toContain("Market data is delayed")
  })

  it("falls back to french locale when locale query param is unsupported", async () => {
    const response = await POST(
      new Request("http://localhost/api/stock-analysis?locale=es", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ symbol: "AAPL" }),
      })
    )

    expect(response.status).toBe(200)
    const payload = (await response.json()) as {
      success: boolean
      data?: { uncertaintyMessages?: string[] }
    }

    expect(payload.success).toBe(true)
    expect(payload.data?.uncertaintyMessages?.[0]).toContain("estimations synthetiques")
  })

  it("supports health and sample actions on GET", async () => {
    const health = await GET(new Request("http://localhost/api/stock-analysis?action=health"))
    expect(health.status).toBe(200)

    const sample = await GET(new Request("http://localhost/api/stock-analysis?action=sample&symbol=MSFT"))
    expect(sample.status).toBe(200)
    const payload = (await sample.json()) as { success: boolean; data?: { symbol?: string } }
    expect(payload.success).toBe(true)
    expect(payload.data?.symbol).toBe("MSFT")
  })

})
