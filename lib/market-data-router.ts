import { createHash } from "node:crypto"

import {
  fetchMassiveAnalysisContext,
  getCachedMassiveQuote,
  isMassiveLiveModeEnabled,
  prefetchMassiveQuotes,
  type MassiveAnalysisContext,
} from "@/lib/massive-market-data"
import type { MarketDataProvider, MarketDataRequestConfig } from "@/lib/market-data-config"
import { normalizeMarketDataRequestConfig } from "@/lib/market-data-config"
import {
  fetchTwelveDataAnalysisContext,
  getCachedTwelveDataQuote,
  isTwelveDataLiveModeEnabled,
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
const MAX_SYMBOL_LENGTH = 24
const SYMBOL_PATTERN = /^[A-Z0-9^][A-Z0-9.^-]{0,23}$/

type ProviderName = "massive" | "twelvedata"

const isProviderEnabled = (provider: ProviderName, config: MarketDataRequestConfig) => {
  if (provider === "massive") {
    return isMassiveLiveModeEnabled(config)
  }
  return isTwelveDataLiveModeEnabled(config)
}

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
const inflightContextRequests = new Map<string, Promise<{ source: MarketDataSource; context: MarketAnalysisContext } | null>>()

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

const normalizeSymbol = (symbol: unknown) => {
  if (typeof symbol !== "string") return ""

  const normalized = symbol.trim().toUpperCase()
  if (!normalized || normalized.length > MAX_SYMBOL_LENGTH) {
    return ""
  }

  if (!SYMBOL_PATTERN.test(normalized)) {
    return ""
  }

  return normalized
}

const hashConfigValue = (value: string | undefined) => {
  if (!value) return "none"
  return createHash("sha256").update(value).digest("hex").slice(0, 12)
}

const getContextCacheKey = (symbol: string, provider: MarketDataProvider, scopeKey: string) =>
  `${provider}:${symbol}:${scopeKey}`

const getRequestScopeKey = (config: MarketDataRequestConfig) => {
  const provider = config.provider ?? "auto"
  return [provider, hashConfigValue(config.massiveApiKey), hashConfigValue(config.twelveDataApiKey)].join(":")
}

const readCachedContext = (symbol: string, provider: MarketDataProvider, scopeKey: string) => {
  const cacheKey = getContextCacheKey(symbol, provider, scopeKey)
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
  scopeKey: string,
  value: { source: MarketDataSource; context: MarketAnalysisContext }
) => {
  analysisContextCache.set(getContextCacheKey(symbol, provider, scopeKey), {
    expiresAtMs: Date.now() + CONTEXT_CACHE_TTL_MS,
    value,
  })
}

const isCircuitOpen = (provider: ProviderName) => providerCircuitState[provider].openedUntilMs > Date.now()

const getFailureCountForProviderAttempt = (provider: ProviderName) => {
  const state = providerCircuitState[provider]
  if (state.openedUntilMs > 0 && state.openedUntilMs <= Date.now()) {
    providerCircuitState[provider] = { consecutiveFailures: 0, openedUntilMs: 0 }
    return 0
  }

  return state.consecutiveFailures
}

const markProviderSuccess = (provider: ProviderName) => {
  providerCircuitState[provider] = {
    consecutiveFailures: 0,
    openedUntilMs: 0,
  }
}

const markProviderFailure = (provider: ProviderName) => {
  const nextFailures = getFailureCountForProviderAttempt(provider) + 1
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
  const normalizedSymbol = normalizeSymbol(symbol)
  if (!normalizedSymbol) {
    return null
  }

  const order = getProviderOrder(normalized.provider ?? "auto")
  for (const provider of order) {
    const quote =
      provider === "twelvedata"
        ? getCachedTwelveDataQuote(normalizedSymbol)
        : getCachedMassiveQuote(normalizedSymbol)
    if (quote !== null) return quote
  }
  return null
}

export async function prefetchPreferredMarketQuotes(
  symbolsInput: string[],
  config?: MarketDataRequestConfig
) {
  if (!Array.isArray(symbolsInput) || symbolsInput.length === 0) {
    return
  }

  const normalized = normalizeMarketDataRequestConfig(config)
  const symbols = Array.from(new Set(symbolsInput.map((symbol) => normalizeSymbol(symbol)).filter(Boolean)))
  if (symbols.length === 0) return

  const order = getProviderOrder(normalized.provider ?? "auto")
  for (const provider of order) {
    if (!isProviderEnabled(provider, normalized)) {
      continue
    }

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
  const normalizedSymbol = normalizeSymbol(symbol)
  if (!normalizedSymbol) {
    return null
  }

  const preferredProvider = normalized.provider ?? "auto"
  const requestScopeKey = getRequestScopeKey(normalized)
  const cacheKey = getContextCacheKey(normalizedSymbol, preferredProvider, requestScopeKey)
  const inflightKey = cacheKey
  const order = getProviderOrder(preferredProvider)
  const cached = readCachedContext(normalizedSymbol, preferredProvider, requestScopeKey)
  if (cached) {
    return cached
  }

  const inflight = inflightContextRequests.get(inflightKey)
  if (inflight) {
    return inflight
  }

  const requestPromise = (async () => {
    for (const provider of order) {
      if (!isProviderEnabled(provider, normalized)) {
        continue
      }

      if (isCircuitOpen(provider)) {
        continue
      }

      if (provider === "twelvedata") {
        const context = await fetchTwelveDataAnalysisContext(normalizedSymbol, normalized).catch(() => null)
        if (context) {
          markProviderSuccess(provider)
          const value = {
            source: "twelvedata-live" as const,
            context: toMarketAnalysisContext(context),
          }
          writeCachedContext(normalizedSymbol, preferredProvider, requestScopeKey, value)
          return value
        }
        markProviderFailure(provider)
        continue
      }

      const context = await fetchMassiveAnalysisContext(normalizedSymbol, normalized).catch(() => null)
      if (context) {
        markProviderSuccess(provider)
        const value = {
          source: context.status === "delayed" ? ("massive-delayed" as const) : ("massive-live" as const),
          context: toMarketAnalysisContext(context),
        }
        writeCachedContext(normalizedSymbol, preferredProvider, requestScopeKey, value)
        return value
      }

      markProviderFailure(provider)
    }

    return null
  })()

  inflightContextRequests.set(inflightKey, requestPromise)
  try {
    return await requestPromise
  } finally {
    inflightContextRequests.delete(inflightKey)
  }
}

export const __resetMarketDataRouterStateForTests = () => {
  analysisContextCache.clear()
  inflightContextRequests.clear()
  providerCircuitState.massive = { consecutiveFailures: 0, openedUntilMs: 0 }
  providerCircuitState.twelvedata = { consecutiveFailures: 0, openedUntilMs: 0 }
}
