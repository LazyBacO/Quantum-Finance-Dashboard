import { afterEach, describe, expect, it } from "vitest"
import {
  fetchTwelveDataAnalysisContext,
  getCachedTwelveDataQuote,
  isTwelveDataLiveModeEnabled,
} from "@/lib/twelvedata-market-data"

const previousKey = process.env.TWELVEDATA_API_KEY
const previousEnabled = process.env.TWELVEDATA_LIVE_DATA

describe("twelvedata market data", () => {
  afterEach(() => {
    process.env.TWELVEDATA_API_KEY = previousKey
    process.env.TWELVEDATA_LIVE_DATA = previousEnabled
  })

  it("is disabled and returns null when key is missing", async () => {
    delete process.env.TWELVEDATA_API_KEY
    delete process.env.TWELVEDATA_LIVE_DATA

    expect(isTwelveDataLiveModeEnabled()).toBe(false)
    await expect(fetchTwelveDataAnalysisContext("AAPL")).resolves.toBeNull()
  })

  it("returns null for unknown cached quote", () => {
    expect(getCachedTwelveDataQuote("UNKNOWN-TICKER")).toBeNull()
  })
})
