import { afterEach, describe, expect, it } from "vitest"
import {
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
})
