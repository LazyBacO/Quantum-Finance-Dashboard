import type { FundamentalMetrics } from "@/lib/stock-analysis-engine"
import type { MarketDataRequestConfig } from "@/lib/market-data-config"

export type TwelveDataMarketStatus = "live"

export interface TwelveDataAnalysisContext {
  symbol: string
  status: TwelveDataMarketStatus
  lastUpdatedIso: string
  priceHistory: number[]
  currentPrice: number
  high52week: number
  low52week: number
  avgVolume: number
  fundamentals?: Partial<FundamentalMetrics>
}

type MarketConnectionFailureReason = "missing-key" | "disabled" | "no-data" | "provider-error"

export interface TwelveDataConnectionTestResult {
  success: boolean
  symbol: string
  status?: TwelveDataMarketStatus
  currentPrice?: number
  lastUpdatedIso?: string
  reason?: MarketConnectionFailureReason
  message: string
}

interface QuoteCacheEntry {
  priceCents: number
  asOf: string
  expiresAt: number
}

const quoteCache = new Map<string, QuoteCacheEntry>()
const analysisCache = new Map<string, { expiresAt: number; context: TwelveDataAnalysisContext }>()

const DEFAULT_BASE_URL = "https://api.twelvedata.com"
const DEFAULT_TIMEOUT_MS = 8_000
const DEFAULT_QUOTE_TTL_MS = 15_000
const DEFAULT_ANALYSIS_TTL_MS = 60_000

const toPositiveInt = (value: string | undefined, fallback: number) => {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const toUpperSymbol = (symbol: string) => symbol.trim().toUpperCase()

const round2 = (value: number) => Number(value.toFixed(2))

const getBaseUrl = () => process.env.TWELVEDATA_API_BASE_URL?.trim() || DEFAULT_BASE_URL
const getTimeoutMs = () => toPositiveInt(process.env.TWELVEDATA_HTTP_TIMEOUT_MS, DEFAULT_TIMEOUT_MS)
const getQuoteTtlMs = () => toPositiveInt(process.env.TWELVEDATA_QUOTE_TTL_MS, DEFAULT_QUOTE_TTL_MS)
const getAnalysisTtlMs = () =>
  toPositiveInt(process.env.TWELVEDATA_ANALYSIS_TTL_MS, DEFAULT_ANALYSIS_TTL_MS)

const getApiKey = (config?: MarketDataRequestConfig) => {
  const override = config?.twelveDataApiKey?.trim()
  if (override) return override

  const fromEnv = process.env.TWELVEDATA_API_KEY?.trim()
  return fromEnv && fromEnv.length > 0 ? fromEnv : null
}

const parseNumber = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const parseDateToIso = (value: unknown) => {
  if (typeof value !== "string" || value.trim().length === 0) return new Date().toISOString()
  const raw = value.includes("T") ? value : value.replace(" ", "T")
  const withZone = /Z$|[+-]\d\d:\d\d$/.test(raw) ? raw : `${raw}Z`
  const parsed = new Date(withZone)
  if (!Number.isFinite(parsed.getTime())) return new Date().toISOString()
  return parsed.toISOString()
}

const fetchTwelveDataJson = async <T>(
  path: string,
  params: Record<string, string | number | boolean>,
  config?: MarketDataRequestConfig
): Promise<T> => {
  const apiKey = getApiKey(config)
  if (!apiKey) {
    throw new Error("TwelveData API key is not configured.")
  }

  const url = new URL(path, getBaseUrl())
  url.searchParams.set("apikey", apiKey)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value))
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs())
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    })
    const payload = (await response.json()) as Record<string, unknown>
    if (!response.ok) {
      const message =
        typeof payload?.message === "string" ? payload.message : `TwelveData HTTP ${response.status}`
      throw new Error(message)
    }
    if (
      (typeof payload?.code === "number" && payload.code >= 400) ||
      payload?.status === "error"
    ) {
      const message = typeof payload?.message === "string" ? payload.message : "TwelveData error"
      throw new Error(message)
    }
    return payload as T
  } finally {
    clearTimeout(timeout)
  }
}

export const isTwelveDataLiveModeEnabled = (config?: MarketDataRequestConfig) => {
  const enabled = process.env.TWELVEDATA_LIVE_DATA
  if (enabled?.toLowerCase() === "false") return false
  return Boolean(getApiKey(config))
}

export const getCachedTwelveDataQuote = (symbolInput: string) => {
  const symbol = toUpperSymbol(symbolInput)
  const cached = quoteCache.get(symbol)
  if (!cached) return null
  if (cached.expiresAt <= Date.now()) {
    quoteCache.delete(symbol)
    return null
  }
  return cached.priceCents
}

export const __setCachedTwelveDataQuoteForTests = (
  symbolInput: string,
  value: { priceCents: number; asOf?: string; expiresAt: number } | null
) => {
  const symbol = toUpperSymbol(symbolInput)
  if (!value) {
    quoteCache.delete(symbol)
    return
  }

  quoteCache.set(symbol, {
    priceCents: value.priceCents,
    asOf: value.asOf ?? new Date().toISOString(),
    expiresAt: value.expiresAt,
  })
}

export async function testTwelveDataConnection(
  config?: MarketDataRequestConfig,
  symbolInput = "AAPL"
): Promise<TwelveDataConnectionTestResult> {
  const symbol = toUpperSymbol(symbolInput)

  if (!getApiKey(config)) {
    return {
      success: false,
      symbol,
      reason: "missing-key",
      message: "Cle TwelveData manquante.",
    }
  }

  if (process.env.TWELVEDATA_LIVE_DATA?.toLowerCase() === "false") {
    return {
      success: false,
      symbol,
      reason: "disabled",
      message: "Source TwelveData desactivee par configuration serveur.",
    }
  }

  try {
    const response = await fetchTwelveDataJson<{
      close?: string
      datetime?: string
    }>("/quote", { symbol }, config)
    const close = parseNumber(response.close)
    if (close === null || close <= 0) {
      return {
        success: false,
        symbol,
        reason: "no-data",
        message: "Aucune cotation exploitable retournee par TwelveData.",
      }
    }

    return {
      success: true,
      symbol,
      status: "live",
      currentPrice: round2(close),
      lastUpdatedIso: parseDateToIso(response.datetime),
      message: "Connexion TwelveData validee.",
    }
  } catch (error) {
    return {
      success: false,
      symbol,
      reason: "provider-error",
      message: error instanceof Error ? error.message : "Erreur TwelveData inconnue.",
    }
  }
}

export async function prefetchTwelveDataQuotes(symbolsInput: string[], config?: MarketDataRequestConfig) {
  if (!isTwelveDataLiveModeEnabled(config)) return

  const now = Date.now()
  const symbols = Array.from(new Set(symbolsInput.map(toUpperSymbol).filter(Boolean)))
  if (symbols.length === 0) return

  const missing = symbols.filter((symbol) => {
    const cached = quoteCache.get(symbol)
    return !cached || cached.expiresAt <= now
  })
  if (missing.length === 0) return

  await Promise.allSettled(
    missing.map(async (symbol) => {
      const response = await fetchTwelveDataJson<{
        close?: string
        datetime?: string
      }>("/quote", { symbol }, config)

      const close = parseNumber(response.close)
      if (close === null || close <= 0) return
      const asOf = parseDateToIso(response.datetime)
      quoteCache.set(symbol, {
        priceCents: Math.max(1, Math.round(close * 100)),
        asOf,
        expiresAt: now + getQuoteTtlMs(),
      })
    })
  )
}

export async function fetchTwelveDataAnalysisContext(
  symbolInput: string,
  config?: MarketDataRequestConfig
): Promise<TwelveDataAnalysisContext | null> {
  if (!isTwelveDataLiveModeEnabled(config)) return null

  const symbol = toUpperSymbol(symbolInput)
  const now = Date.now()
  const cached = analysisCache.get(symbol)
  if (cached && cached.expiresAt > now) {
    return cached.context
  }

  try {
    const response = await fetchTwelveDataJson<{
      values?: Array<{
        datetime?: string
        close?: string
        high?: string
        low?: string
        volume?: string
      }>
    }>(
      "/time_series",
      {
        symbol,
        interval: "1day",
        outputsize: 320,
        format: "JSON",
      },
      config
    )

    const bars = (response.values ?? [])
      .map((value) => {
        const close = parseNumber(value.close)
        const high = parseNumber(value.high)
        const low = parseNumber(value.low)
        const volume = parseNumber(value.volume)
        if (close === null || high === null || low === null || volume === null) return null
        if (close <= 0 || high <= 0 || low <= 0 || volume < 0) return null
        return {
          datetime: parseDateToIso(value.datetime),
          close,
          high,
          low,
          volume,
        }
      })
      .filter(
        (bar): bar is { datetime: string; close: number; high: number; low: number; volume: number } =>
          Boolean(bar)
      )
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())

    if (bars.length < 30) return null

    const priceHistory = bars.map((bar) => round2(bar.close))
    const current = bars[bars.length - 1].close
    const recentBars = bars.slice(-252)
    const high52week = Math.max(...recentBars.map((bar) => bar.high))
    const low52week = Math.min(...recentBars.map((bar) => bar.low))
    const volumeWindow = recentBars.slice(-20)
    const avgVolume =
      volumeWindow.reduce((sum, bar) => sum + bar.volume, 0) / Math.max(1, volumeWindow.length)

    const context: TwelveDataAnalysisContext = {
      symbol,
      status: "live",
      lastUpdatedIso: bars[bars.length - 1].datetime,
      priceHistory,
      currentPrice: round2(current),
      high52week: round2(high52week),
      low52week: round2(low52week),
      avgVolume: round2(avgVolume),
      fundamentals: {},
    }

    quoteCache.set(symbol, {
      priceCents: Math.max(1, Math.round(current * 100)),
      asOf: context.lastUpdatedIso,
      expiresAt: now + getQuoteTtlMs(),
    })

    analysisCache.set(symbol, {
      expiresAt: now + getAnalysisTtlMs(),
      context,
    })

    return context
  } catch {
    return null
  }
}
