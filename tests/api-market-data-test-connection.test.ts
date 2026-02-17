import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "@/app/api/market-data/test-connection/route"

describe("/api/market-data/test-connection", () => {
  const originalFetch = global.fetch
  const previousMassiveLiveData = process.env.MASSIVE_LIVE_DATA
  const previousMassiveApiKey = process.env.MASSIVE_API_KEY
  const previousPolygonApiKey = process.env.POLYGON_API_KEY
  const previousTwelveDataLiveData = process.env.TWELVEDATA_LIVE_DATA
  const previousTwelveDataApiKey = process.env.TWELVEDATA_API_KEY

  beforeEach(() => {
    delete process.env.MASSIVE_LIVE_DATA
    delete process.env.MASSIVE_API_KEY
    delete process.env.POLYGON_API_KEY
    delete process.env.TWELVEDATA_LIVE_DATA
    delete process.env.TWELVEDATA_API_KEY
    global.fetch = originalFetch
  })

  afterEach(() => {
    process.env.MASSIVE_LIVE_DATA = previousMassiveLiveData
    process.env.MASSIVE_API_KEY = previousMassiveApiKey
    process.env.POLYGON_API_KEY = previousPolygonApiKey
    process.env.TWELVEDATA_LIVE_DATA = previousTwelveDataLiveData
    process.env.TWELVEDATA_API_KEY = previousTwelveDataApiKey
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it("returns validation error on invalid payload", async () => {
    const response = await POST(
      new Request("http://localhost/api/market-data/test-connection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: "invalid-provider" }),
      })
    )

    expect(response.status).toBe(400)
  })

  it("rejects symbols with unsupported characters", async () => {
    const response = await POST(
      new Request("http://localhost/api/market-data/test-connection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: "massive", symbol: "AAPL$" }),
      })
    )

    expect(response.status).toBe(400)
    const payload = (await response.json()) as { success: boolean; error?: string }
    expect(payload.success).toBe(false)
    expect(payload.error).toContain("Invalid symbol format")
  })

  it("returns missing key error for Massive without key", async () => {
    const response = await POST(
      new Request("http://localhost/api/market-data/test-connection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: "massive" }),
      })
    )

    expect(response.status).toBe(400)
    const payload = (await response.json()) as { success: boolean; error?: string }
    expect(payload.success).toBe(false)
    expect(payload.error).toContain("Cle Massive")
  })

  it("returns success for Massive with valid response", async () => {
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          status: "OK",
          results: [{ c: 198.21, t: 1_700_000_000_000 }],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    ) as unknown as typeof fetch

    const response = await POST(
      new Request("http://localhost/api/market-data/test-connection", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-massive-api-key": "massive_test_key",
        },
        body: JSON.stringify({ provider: "massive", symbol: "AAPL" }),
      })
    )

    expect(response.status).toBe(200)
    const payload = (await response.json()) as {
      success: boolean
      data?: { provider?: string; source?: string; symbol?: string; currentPrice?: number }
    }

    expect(payload.success).toBe(true)
    expect(payload.data?.provider).toBe("massive")
    expect(payload.data?.source).toBe("massive-live")
    expect(payload.data?.symbol).toBe("AAPL")
    expect(payload.data?.currentPrice).toBe(198.21)
  })

  it("returns success for TwelveData with valid response", async () => {
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          close: "421.55",
          datetime: "2026-02-10 21:00:00",
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    ) as unknown as typeof fetch

    const response = await POST(
      new Request("http://localhost/api/market-data/test-connection", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-twelvedata-api-key": "td_test_key",
        },
        body: JSON.stringify({ provider: "twelvedata", symbol: "MSFT" }),
      })
    )

    expect(response.status).toBe(200)
    const payload = (await response.json()) as {
      success: boolean
      data?: { provider?: string; source?: string; symbol?: string; currentPrice?: number }
    }

    expect(payload.success).toBe(true)
    expect(payload.data?.provider).toBe("twelvedata")
    expect(payload.data?.source).toBe("twelvedata-live")
    expect(payload.data?.symbol).toBe("MSFT")
    expect(payload.data?.currentPrice).toBe(421.55)
  })
})
