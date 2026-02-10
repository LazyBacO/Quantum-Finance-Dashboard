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

const getProviderOrder = (provider: MarketDataProvider) => {
  if (provider === "twelvedata") return ["twelvedata", "massive"] as const
  if (provider === "massive") return ["massive", "twelvedata"] as const
  return ["twelvedata", "massive"] as const
}

const hasAnyQuote = (symbols: string[], provider: "massive" | "twelvedata") => {
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
    if (provider === "twelvedata") {
      await prefetchTwelveDataQuotes(symbols, normalized).catch(() => {
        // ignore and try fallback
      })
    } else {
      await prefetchMassiveQuotes(symbols, normalized).catch(() => {
        // ignore and try fallback
      })
    }

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

  for (const provider of order) {
    if (provider === "twelvedata") {
      const context = await fetchTwelveDataAnalysisContext(symbol, normalized).catch(() => null)
      if (context) {
        return {
          source: "twelvedata-live",
          context: toMarketAnalysisContext(context),
        }
      }
      continue
    }

    const context = await fetchMassiveAnalysisContext(symbol, normalized).catch(() => null)
    if (context) {
      return {
        source: context.status === "delayed" ? "massive-delayed" : "massive-live",
        context: toMarketAnalysisContext(context),
      }
    }
  }

  return null
}
