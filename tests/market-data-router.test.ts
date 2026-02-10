import { describe, expect, it } from "vitest"
import {
  fetchPreferredMarketAnalysisContext,
  getCachedPreferredMarketQuote,
} from "@/lib/market-data-router"

describe("market data router", () => {
  it("returns null when no cached quote exists", () => {
    expect(getCachedPreferredMarketQuote("UNKNOWN", { provider: "auto" })).toBeNull()
  })

  it("returns null analysis context when no provider key is available", async () => {
    const previousMassive = process.env.MASSIVE_API_KEY
    const previousPolygon = process.env.POLYGON_API_KEY
    const previousTwelve = process.env.TWELVEDATA_API_KEY
    const previousMassiveFlag = process.env.MASSIVE_LIVE_DATA
    const previousTwelveFlag = process.env.TWELVEDATA_LIVE_DATA

    try {
      delete process.env.MASSIVE_API_KEY
      delete process.env.POLYGON_API_KEY
      delete process.env.TWELVEDATA_API_KEY
      process.env.MASSIVE_LIVE_DATA = "false"
      process.env.TWELVEDATA_LIVE_DATA = "false"

      await expect(
        fetchPreferredMarketAnalysisContext("AAPL", { provider: "auto" })
      ).resolves.toBeNull()
    } finally {
      process.env.MASSIVE_API_KEY = previousMassive
      process.env.POLYGON_API_KEY = previousPolygon
      process.env.TWELVEDATA_API_KEY = previousTwelve
      process.env.MASSIVE_LIVE_DATA = previousMassiveFlag
      process.env.TWELVEDATA_LIVE_DATA = previousTwelveFlag
    }
  })
})
