import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { GET, POST } from "@/app/api/stock-analysis/route"

describe("/api/stock-analysis", () => {
  const previousMassiveLiveData = process.env.MASSIVE_LIVE_DATA
  const previousMassiveApiKey = process.env.MASSIVE_API_KEY
  const previousPolygonApiKey = process.env.POLYGON_API_KEY
  const previousTwelveDataLiveData = process.env.TWELVEDATA_LIVE_DATA
  const previousTwelveDataApiKey = process.env.TWELVEDATA_API_KEY

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
        proactiveSignals?: unknown[]
        entryId?: string
      }
    }

    expect(payload.success).toBe(true)
    expect(payload.data?.report?.symbol).toBe("AAPL")
    expect(typeof payload.data?.report?.technical?.rsi14).toBe("number")
    expect(payload.data?.entryId).toBeTruthy()
    expect(Array.isArray(payload.data?.proactiveSignals)).toBe(true)
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
