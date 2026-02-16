import {
  fetchMassiveAnalysisContext,
  getCachedMassiveQuote,
  prefetchMassiveQuotes,
  type MassiveAnalysisContext,
} from "@/lib/massive-market-data"
import type { MarketDataProvider, MarketDataRequestConfig } from "@/lib/market-data-config"
import { normalizeMarketDataRequestConfig } from "@/lib/market-data-config"
import {
  fetchTwelveDataAnalysisContext,
  getCachedTwelveDataQuote,
  prefetchTwelveDataQuotes,
  type TwelveDataAnalysisContext,
} from "@/lib/twelvedata-market-data"

export interface MarketAnalysisContext {
  symbol: string
  status: "live" | "delayed"
  lastUpdatedIso: string
  priceHistory: number[]
  currentPrice: number
  high52week: number
  low52week: number
  avgVolume: number
  marketCap?: number
  fundamentals?: MassiveAnalysisContext["fundamentals"]
}

export type MarketDataSource =
  | "twelvedata-live"
  | "massive-live"
  | "massive-delayed"
  | "synthetic"

const CONTEXT_CACHE_TTL_MS = 10_000
const PROVIDER_FAILURE_THRESHOLD = 3
const PROVIDER_COOLDOWN_MS = 30_000

type ProviderName = "massive" | "twelvedata"

interface ProviderCircuitState {
  consecutiveFailures: number
  openedUntilMs: number
}

interface CachedContextEntry {
  expiresAtMs: number
  value: { source: MarketDataSource; context: MarketAnalysisContext }
}

const providerCircuitState: Record<ProviderName, ProviderCircuitState> = {
  massive: { consecutiveFailures: 0, openedUntilMs: 0 },
  twelvedata: { consecutiveFailures: 0, openedUntilMs: 0 },
}

const analysisContextCache = new Map<string, CachedContextEntry>()

const getProviderOrder = (provider: MarketDataProvider) => {
  if (provider === "twelvedata") return ["twelvedata", "massive"] as const
  if (provider === "massive") return ["massive", "twelvedata"] as const
  return ["twelvedata", "massive"] as const
}

const hasAnyQuote = (symbols: string[], provider: ProviderName) => {
  if (provider === "massive") {
    return symbols.some((symbol) => getCachedMassiveQuote(symbol) !== null)
  }
  return symbols.some((symbol) => getCachedTwelveDataQuote(symbol) !== null)
}

const toMarketAnalysisContext = (
  context: MassiveAnalysisContext | TwelveDataAnalysisContext
): MarketAnalysisContext => ({
  symbol: context.symbol,
  status: context.status,
  lastUpdatedIso: context.lastUpdatedIso,
  priceHistory: context.priceHistory,
  currentPrice: context.currentPrice,
  high52week: context.high52week,
  low52week: context.low52week,
  avgVolume: context.avgVolume,
  marketCap: "marketCap" in context ? context.marketCap : undefined,
  fundamentals: context.fundamentals,
})

const getContextCacheKey = (symbol: string, provider: MarketDataProvider) => `${provider}:${symbol}`

const readCachedContext = (symbol: string, provider: MarketDataProvider) => {
  const cacheKey = getContextCacheKey(symbol, provider)
  const entry = analysisContextCache.get(cacheKey)
  if (!entry) return null

  if (entry.expiresAtMs <= Date.now()) {
    analysisContextCache.delete(cacheKey)
    return null
  }

  return entry.value
}

const writeCachedContext = (
  symbol: string,
  provider: MarketDataProvider,
  value: { source: MarketDataSource; context: MarketAnalysisContext }
) => {
  analysisContextCache.set(getContextCacheKey(symbol, provider), {
    expiresAtMs: Date.now() + CONTEXT_CACHE_TTL_MS,
    value,
  })
}

const isCircuitOpen = (provider: ProviderName) => providerCircuitState[provider].openedUntilMs > Date.now()

const markProviderSuccess = (provider: ProviderName) => {
  providerCircuitState[provider] = {
    consecutiveFailures: 0,
    openedUntilMs: 0,
  }
}

const markProviderFailure = (provider: ProviderName) => {
  const nextFailures = providerCircuitState[provider].consecutiveFailures + 1
  providerCircuitState[provider].consecutiveFailures = nextFailures

  if (nextFailures >= PROVIDER_FAILURE_THRESHOLD) {
    providerCircuitState[provider] = {
      consecutiveFailures: nextFailures,
      openedUntilMs: Date.now() + PROVIDER_COOLDOWN_MS,
    }
  }
}

export const getCachedPreferredMarketQuote = (
  symbol: string,
  config?: MarketDataRequestConfig
) => {
  const normalized = normalizeMarketDataRequestConfig(config)
  const order = getProviderOrder(normalized.provider ?? "auto")
  for (const provider of order) {
    const quote =
      provider === "twelvedata" ? getCachedTwelveDataQuote(symbol) : getCachedMassiveQuote(symbol)
    if (quote !== null) return quote
  }
  return null
}

export async function prefetchPreferredMarketQuotes(
  symbolsInput: string[],
  config?: MarketDataRequestConfig
) {
  const normalized = normalizeMarketDataRequestConfig(config)
  const symbols = Array.from(new Set(symbolsInput.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)))
  if (symbols.length === 0) return

  const order = getProviderOrder(normalized.provider ?? "auto")
  for (const provider of order) {
    if (isCircuitOpen(provider)) {
      continue
    }

    const prefetchPromise =
      provider === "twelvedata" ? prefetchTwelveDataQuotes(symbols, normalized) : prefetchMassiveQuotes(symbols, normalized)

    await prefetchPromise
      .then(() => {
        markProviderSuccess(provider)
      })
      .catch(() => {
        markProviderFailure(provider)
      })

    if (hasAnyQuote(symbols, provider)) {
      return
    }
  }
}

export async function fetchPreferredMarketAnalysisContext(
  symbol: string,
  config?: MarketDataRequestConfig
): Promise<{ source: MarketDataSource; context: MarketAnalysisContext } | null> {
  const normalized = normalizeMarketDataRequestConfig(config)
  const order = getProviderOrder(normalized.provider ?? "auto")
  const cached = readCachedContext(symbol, normalized.provider ?? "auto")
  if (cached) {
    return cached
  }

  for (const provider of order) {
    if (isCircuitOpen(provider)) {
      continue
    }

    if (provider === "twelvedata") {
      const context = await fetchTwelveDataAnalysisContext(symbol, normalized).catch(() => null)
      if (context) {
        markProviderSuccess(provider)
        const value = {
          source: "twelvedata-live" as const,
          context: toMarketAnalysisContext(context),
        }
        writeCachedContext(symbol, normalized.provider ?? "auto", value)
        return value
      }
      markProviderFailure(provider)
      continue
    }

    const context = await fetchMassiveAnalysisContext(symbol, normalized).catch(() => null)
    if (context) {
      markProviderSuccess(provider)
      const value = {
        source: context.status === "delayed" ? ("massive-delayed" as const) : ("massive-live" as const),
        context: toMarketAnalysisContext(context),
      }
      writeCachedContext(symbol, normalized.provider ?? "auto", value)
      return value
    }

    markProviderFailure(provider)
  }

  return null
}

export const __resetMarketDataRouterStateForTests = () => {
  analysisContextCache.clear()
  providerCircuitState.massive = { consecutiveFailures: 0, openedUntilMs: 0 }
  providerCircuitState.twelvedata = { consecutiveFailures: 0, openedUntilMs: 0 }
}
