import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  fetchMassiveAnalysisContextMock,
  fetchTwelveDataAnalysisContextMock,
  getCachedMassiveQuoteMock,
  getCachedTwelveDataQuoteMock,
  prefetchMassiveQuotesMock,
  prefetchTwelveDataQuotesMock,
} = vi.hoisted(() => ({
  fetchMassiveAnalysisContextMock: vi.fn(),
  fetchTwelveDataAnalysisContextMock: vi.fn(),
  getCachedMassiveQuoteMock: vi.fn(),
  getCachedTwelveDataQuoteMock: vi.fn(),
  prefetchMassiveQuotesMock: vi.fn(),
  prefetchTwelveDataQuotesMock: vi.fn(),
}))

vi.mock("@/lib/massive-market-data", () => ({
  fetchMassiveAnalysisContext: fetchMassiveAnalysisContextMock,
  getCachedMassiveQuote: getCachedMassiveQuoteMock,
  prefetchMassiveQuotes: prefetchMassiveQuotesMock,
}))

vi.mock("@/lib/twelvedata-market-data", () => ({
  fetchTwelveDataAnalysisContext: fetchTwelveDataAnalysisContextMock,
  getCachedTwelveDataQuote: getCachedTwelveDataQuoteMock,
  prefetchTwelveDataQuotes: prefetchTwelveDataQuotesMock,
}))

import {
  __resetMarketDataRouterStateForTests,
  fetchPreferredMarketAnalysisContext,
  getCachedPreferredMarketQuote,
} from "@/lib/market-data-router"

const liveContext = {
  symbol: "AAPL",
  status: "live" as const,
  lastUpdatedIso: "2025-01-01T00:00:00.000Z",
  priceHistory: [100, 101, 102],
  currentPrice: 102,
  high52week: 200,
  low52week: 80,
  avgVolume: 1_000_000,
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

describe("market data router", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    __resetMarketDataRouterStateForTests()

    getCachedMassiveQuoteMock.mockReturnValue(null)
    getCachedTwelveDataQuoteMock.mockReturnValue(null)
    fetchMassiveAnalysisContextMock.mockResolvedValue(null)
    fetchTwelveDataAnalysisContextMock.mockResolvedValue(null)
  })

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

  it("uses fallback provider when preferred provider fails", async () => {
    fetchTwelveDataAnalysisContextMock.mockResolvedValue(null)
    fetchMassiveAnalysisContextMock.mockResolvedValue(liveContext)

    const result = await fetchPreferredMarketAnalysisContext("AAPL", { provider: "auto" })

    expect(result?.source).toBe("massive-live")
    expect(fetchTwelveDataAnalysisContextMock).toHaveBeenCalledTimes(1)
    expect(fetchMassiveAnalysisContextMock).toHaveBeenCalledTimes(1)
  })

  it("caches context briefly to avoid duplicate upstream calls", async () => {
    fetchMassiveAnalysisContextMock.mockResolvedValue(liveContext)

    const first = await fetchPreferredMarketAnalysisContext("AAPL", { provider: "massive" })
    const second = await fetchPreferredMarketAnalysisContext("AAPL", { provider: "massive" })

    expect(first?.context.currentPrice).toBe(102)
    expect(second?.context.currentPrice).toBe(102)
    expect(fetchMassiveAnalysisContextMock).toHaveBeenCalledTimes(1)
  })

  it("deduplicates concurrent context requests for the same symbol/provider", async () => {
    const deferred = createDeferred<typeof liveContext | null>()
    fetchMassiveAnalysisContextMock.mockImplementation(() => deferred.promise)

    const firstPromise = fetchPreferredMarketAnalysisContext("AAPL", { provider: "massive" })
    const secondPromise = fetchPreferredMarketAnalysisContext(" aapl ", { provider: "massive" })

    expect(fetchMassiveAnalysisContextMock).toHaveBeenCalledTimes(1)

    deferred.resolve(liveContext)

    const [first, second] = await Promise.all([firstPromise, secondPromise])
    expect(first?.context.symbol).toBe("AAPL")
    expect(second?.context.symbol).toBe("AAPL")
    expect(fetchMassiveAnalysisContextMock).toHaveBeenCalledTimes(1)
  })

  it("normalizes symbol casing/spacing for cache and provider calls", async () => {
    fetchMassiveAnalysisContextMock.mockResolvedValue(liveContext)

    const first = await fetchPreferredMarketAnalysisContext(" aapl ", { provider: "massive" })
    const second = await fetchPreferredMarketAnalysisContext("AAPL", { provider: "massive" })

    expect(first?.context.symbol).toBe("AAPL")
    expect(second?.context.symbol).toBe("AAPL")
    expect(fetchMassiveAnalysisContextMock).toHaveBeenCalledTimes(1)
    expect(fetchMassiveAnalysisContextMock).toHaveBeenCalledWith(
      "AAPL",
      expect.objectContaining({ provider: "massive" })
    )
  })

  it("opens circuit breaker after repeated provider failures", async () => {
    fetchTwelveDataAnalysisContextMock.mockResolvedValue(null)
    fetchMassiveAnalysisContextMock.mockResolvedValue(null)

    await fetchPreferredMarketAnalysisContext("AAPL", { provider: "twelvedata" })
    await fetchPreferredMarketAnalysisContext("AAPL", { provider: "twelvedata" })
    await fetchPreferredMarketAnalysisContext("AAPL", { provider: "twelvedata" })
    await fetchPreferredMarketAnalysisContext("AAPL", { provider: "twelvedata" })

    expect(fetchTwelveDataAnalysisContextMock).toHaveBeenCalledTimes(3)
  })

  it("requires a fresh failure streak after cooldown expires", async () => {
    vi.useFakeTimers()

    try {
      fetchTwelveDataAnalysisContextMock.mockResolvedValue(null)
      fetchMassiveAnalysisContextMock.mockResolvedValue(null)

      await fetchPreferredMarketAnalysisContext("AAPL", { provider: "twelvedata" })
      await fetchPreferredMarketAnalysisContext("AAPL", { provider: "twelvedata" })
      await fetchPreferredMarketAnalysisContext("AAPL", { provider: "twelvedata" })
      await fetchPreferredMarketAnalysisContext("AAPL", { provider: "twelvedata" })

      expect(fetchTwelveDataAnalysisContextMock).toHaveBeenCalledTimes(3)

      vi.advanceTimersByTime(30_001)

      await fetchPreferredMarketAnalysisContext("AAPL", { provider: "twelvedata" })
      await fetchPreferredMarketAnalysisContext("AAPL", { provider: "twelvedata" })
      await fetchPreferredMarketAnalysisContext("AAPL", { provider: "twelvedata" })
      await fetchPreferredMarketAnalysisContext("AAPL", { provider: "twelvedata" })

      expect(fetchTwelveDataAnalysisContextMock).toHaveBeenCalledTimes(6)
    } finally {
      vi.useRealTimers()
    }
  })
})
