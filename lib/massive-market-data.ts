import type { FundamentalMetrics } from "@/lib/stock-analysis-engine"
import type { MarketDataRequestConfig } from "@/lib/market-data-config"

export type MassiveMarketStatus = "live" | "delayed"

export interface MassiveAnalysisContext {
  symbol: string
  status: MassiveMarketStatus
  lastUpdatedIso: string
  priceHistory: number[]
  currentPrice: number
  high52week: number
  low52week: number
  avgVolume: number
  marketCap?: number
  fundamentals?: Partial<FundamentalMetrics>
}

type MarketConnectionFailureReason = "missing-key" | "disabled" | "no-data" | "provider-error"

export interface MassiveConnectionTestResult {
  success: boolean
  symbol: string
  status?: MassiveMarketStatus
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
const analysisCache = new Map<string, { expiresAt: number; context: MassiveAnalysisContext }>()

const DEFAULT_BASE_URL = "https://api.massive.com"
const DEFAULT_TIMEOUT_MS = 8_000
const DEFAULT_QUOTE_TTL_MS = 60_000
const DEFAULT_ANALYSIS_TTL_MS = 5 * 60_000
const DEFAULT_FINANCIAL_TTL_MS = 12 * 60 * 60_000

const financialCache = new Map<
  string,
  {
    expiresAt: number
    fundamentals: Partial<FundamentalMetrics>
    marketCap?: number
  }
>()

const toPositiveInt = (value: string | undefined, fallback: number) => {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const toUpperSymbol = (symbol: string) => symbol.trim().toUpperCase()

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const round2 = (value: number) => Number(value.toFixed(2))

const getApiKey = (config?: MarketDataRequestConfig) => {
  const override = config?.massiveApiKey?.trim()
  if (override) return override

  const key = process.env.MASSIVE_API_KEY || process.env.POLYGON_API_KEY
  return key && key.trim().length > 0 ? key.trim() : null
}

export const isMassiveLiveModeEnabled = (config?: MarketDataRequestConfig) => {
  const enabled = process.env.MASSIVE_LIVE_DATA
  if (enabled?.toLowerCase() === "false") return false
  return Boolean(getApiKey(config))
}

const getBaseUrl = () => process.env.MASSIVE_API_BASE_URL?.trim() || DEFAULT_BASE_URL
const getTimeoutMs = () => toPositiveInt(process.env.MASSIVE_HTTP_TIMEOUT_MS, DEFAULT_TIMEOUT_MS)
const getQuoteTtlMs = () => toPositiveInt(process.env.MASSIVE_QUOTE_TTL_MS, DEFAULT_QUOTE_TTL_MS)
const getAnalysisTtlMs = () => toPositiveInt(process.env.MASSIVE_ANALYSIS_TTL_MS, DEFAULT_ANALYSIS_TTL_MS)
const getFinancialTtlMs = () => toPositiveInt(process.env.MASSIVE_FINANCIAL_TTL_MS, DEFAULT_FINANCIAL_TTL_MS)

const formatIsoDate = (date: Date) => date.toISOString().slice(0, 10)

const getNumeric = (value: unknown) => {
  if (typeof value !== "number") return null
  return Number.isFinite(value) ? value : null
}

const getObject = (value: unknown) => {
  if (typeof value !== "object" || value === null) return null
  return value as Record<string, unknown>
}

const readPathNumber = (value: unknown, path: string[]) => {
  let current: unknown = value
  for (const segment of path) {
    const asObject = getObject(current)
    if (!asObject) return null
    current = asObject[segment]
  }
  return getNumeric(current)
}

const fetchMassiveJson = async <T>(
  path: string,
  params?: Record<string, string | number | boolean>,
  config?: MarketDataRequestConfig
): Promise<T> => {
  const apiKey = getApiKey(config)
  if (!apiKey) {
    throw new Error("Massive API key is not configured.")
  }

  const url = new URL(path, getBaseUrl())
  url.searchParams.set("apiKey", apiKey)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value))
    }
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
        typeof payload?.message === "string" ? payload.message : `Massive HTTP ${response.status}`
      throw new Error(message)
    }

    if (payload?.status === "NOT_AUTHORIZED") {
      const message =
        typeof payload?.message === "string"
          ? payload.message
          : "Massive credentials are not entitled for this dataset."
      throw new Error(message)
    }

    return payload as T
  } finally {
    clearTimeout(timeout)
  }
}

export async function testMassiveConnection(
  config?: MarketDataRequestConfig,
  symbolInput = "AAPL"
): Promise<MassiveConnectionTestResult> {
  const symbol = toUpperSymbol(symbolInput)
  if (!getApiKey(config)) {
    return {
      success: false,
      symbol,
      reason: "missing-key",
      message: "Cle Massive manquante.",
    }
  }

  if (process.env.MASSIVE_LIVE_DATA?.toLowerCase() === "false") {
    return {
      success: false,
      symbol,
      reason: "disabled",
      message: "Source Massive desactivee par configuration serveur.",
    }
  }

  try {
    const response = await fetchMassiveJson<{
      status?: string
      results?: Array<{ c?: number; t?: number }>
    }>(`/v2/aggs/ticker/${symbol}/prev`, { adjusted: true }, config)
    const close = getNumeric(response.results?.[0]?.c)
    const timestamp = getNumeric(response.results?.[0]?.t)

    if (close === null || close <= 0) {
      return {
        success: false,
        symbol,
        reason: "no-data",
        message: "Aucune cotation exploitable retournee par Massive.",
      }
    }

    return {
      success: true,
      symbol,
      status: response.status === "DELAYED" ? "delayed" : "live",
      currentPrice: round2(close),
      lastUpdatedIso: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
      message: "Connexion Massive validee.",
    }
  } catch (error) {
    return {
      success: false,
      symbol,
      reason: "provider-error",
      message: error instanceof Error ? error.message : "Erreur Massive inconnue.",
    }
  }
}

export const getCachedMassiveQuote = (symbolInput: string) => {
  const symbol = toUpperSymbol(symbolInput)
  const cached = quoteCache.get(symbol)
  if (!cached) return null
  if (cached.expiresAt <= Date.now()) {
    quoteCache.delete(symbol)
    return null
  }
  return cached.priceCents
}

export const __setCachedMassiveQuoteForTests = (
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

export async function prefetchMassiveQuotes(
  symbolsInput: string[],
  config?: MarketDataRequestConfig
) {
  if (!isMassiveLiveModeEnabled(config)) return

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
      const response = await fetchMassiveJson<{
        status?: string
        results?: Array<{ c?: number; t?: number }>
      }>(`/v2/aggs/ticker/${symbol}/prev`, { adjusted: true }, config)

      const close = getNumeric(response.results?.[0]?.c)
      const timestamp = getNumeric(response.results?.[0]?.t)
      if (close === null || close <= 0) return

      quoteCache.set(symbol, {
        priceCents: Math.max(1, Math.round(close * 100)),
        asOf: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
        expiresAt: now + getQuoteTtlMs(),
      })
    })
  )
}

const deriveFundamentalsFromFinancials = (
  financials: unknown,
  marketCap: number | undefined
): Partial<FundamentalMetrics> => {
  const netIncome =
    readPathNumber(financials, ["income_statement", "net_income_loss", "value"]) ??
    readPathNumber(financials, ["income_statement", "net_income_loss_attributable_to_parent", "value"]) ??
    0

  const revenues = readPathNumber(financials, ["income_statement", "revenues", "value"]) ?? 0
  const equity =
    readPathNumber(financials, ["balance_sheet", "equity", "value"]) ??
    readPathNumber(financials, ["balance_sheet", "equity_attributable_to_parent", "value"]) ??
    0
  const longTermDebt = readPathNumber(financials, ["balance_sheet", "long_term_debt", "value"]) ?? 0
  const operatingCashFlow =
    readPathNumber(financials, ["cash_flow_statement", "net_cash_flow_from_operating_activities", "value"]) ??
    readPathNumber(financials, [
      "cash_flow_statement",
      "net_cash_flow_from_operating_activities_continuing",
      "value",
    ]) ??
    0

  const pe = marketCap && netIncome > 0 ? marketCap / netIncome : undefined
  const pb = marketCap && equity > 0 ? marketCap / equity : undefined
  const ps = marketCap && revenues > 0 ? marketCap / revenues : undefined
  const debtRatio = equity > 0 ? longTermDebt / equity : undefined
  const roe = equity > 0 ? (netIncome / equity) * 100 : undefined
  const roic = equity + longTermDebt > 0 ? (netIncome / (equity + longTermDebt)) * 100 : undefined

  return {
    pe: pe !== undefined ? round2(clamp(pe, 0, 300)) : undefined,
    pb: pb !== undefined ? round2(clamp(pb, 0, 80)) : undefined,
    ps: ps !== undefined ? round2(clamp(ps, 0, 80)) : undefined,
    debt: debtRatio !== undefined ? round2(clamp(debtRatio, 0, 20)) : undefined,
    roe: roe !== undefined ? round2(clamp(roe, -200, 300)) : undefined,
    roic: roic !== undefined ? round2(clamp(roic, -200, 300)) : undefined,
    fcf: Number.isFinite(operatingCashFlow) ? round2(operatingCashFlow) : undefined,
  }
}

const getGrowthRate = (latestFinancial: unknown, previousFinancial: unknown) => {
  const latestRevenue = readPathNumber(latestFinancial, ["income_statement", "revenues", "value"])
  const previousRevenue = readPathNumber(previousFinancial, ["income_statement", "revenues", "value"])

  if (latestRevenue === null || previousRevenue === null || Math.abs(previousRevenue) < 1e-8) {
    return undefined
  }

  return round2(clamp(((latestRevenue - previousRevenue) / previousRevenue) * 100, -300, 300))
}

const fetchMassiveFundamentals = async (
  symbolInput: string,
  config?: MarketDataRequestConfig
) => {
  const symbol = toUpperSymbol(symbolInput)
  const now = Date.now()
  const cached = financialCache.get(symbol)
  if (cached && cached.expiresAt > now) {
    return cached
  }

  const [referenceResult, financialResult] = await Promise.allSettled([
    fetchMassiveJson<{ results?: { market_cap?: number } }>(
      `/v3/reference/tickers/${symbol}`,
      undefined,
      config
    ),
    fetchMassiveJson<{ results?: Array<{ financials?: unknown }> }>(`/vX/reference/financials`, {
      ticker: symbol,
      timeframe: "annual",
      limit: 2,
      sort: "period_of_report_date",
    }, config),
  ])

  const marketCap =
    referenceResult.status === "fulfilled"
      ? getNumeric(referenceResult.value.results?.market_cap) ?? undefined
      : undefined

  const latestFinancial =
    financialResult.status === "fulfilled"
      ? getObject(financialResult.value.results?.[0]?.financials)
      : null
  const previousFinancial =
    financialResult.status === "fulfilled"
      ? getObject(financialResult.value.results?.[1]?.financials)
      : null

  const fundamentals = latestFinancial
    ? {
        ...deriveFundamentalsFromFinancials(latestFinancial, marketCap),
        growthRate:
          previousFinancial !== null ? getGrowthRate(latestFinancial, previousFinancial) : undefined,
      }
    : {}

  const payload = {
    expiresAt: now + getFinancialTtlMs(),
    fundamentals,
    marketCap: marketCap ?? undefined,
  }
  financialCache.set(symbol, payload)
  return payload
}

export async function fetchMassiveAnalysisContext(
  symbolInput: string,
  config?: MarketDataRequestConfig
): Promise<MassiveAnalysisContext | null> {
  if (!isMassiveLiveModeEnabled(config)) return null

  const symbol = toUpperSymbol(symbolInput)
  const now = Date.now()
  const cached = analysisCache.get(symbol)
  if (cached && cached.expiresAt > now) {
    return cached.context
  }

  try {
    const today = new Date()
    const from = new Date(today)
    from.setDate(today.getDate() - 420)

    const rangeResponse = await fetchMassiveJson<{
      status?: string
      results?: Array<{ c?: number; h?: number; l?: number; v?: number; t?: number }>
    }>(`/v2/aggs/ticker/${symbol}/range/1/day/${formatIsoDate(from)}/${formatIsoDate(today)}`, {
      adjusted: true,
      sort: "asc",
      limit: 5000,
    }, config)

    const bars = (rangeResponse.results ?? []).filter(
      (bar): bar is { c: number; h: number; l: number; v: number; t: number } =>
        typeof bar.c === "number" &&
        bar.c > 0 &&
        typeof bar.h === "number" &&
        bar.h > 0 &&
        typeof bar.l === "number" &&
        bar.l > 0 &&
        typeof bar.v === "number" &&
        bar.v >= 0 &&
        typeof bar.t === "number"
    )

    if (bars.length < 30) {
      return null
    }

    const priceHistory = bars.map((bar) => round2(bar.c))
    const current = bars[bars.length - 1].c
    const recentBars = bars.slice(-252)
    const high52week = Math.max(...recentBars.map((bar) => bar.h))
    const low52week = Math.min(...recentBars.map((bar) => bar.l))
    const volumeWindow = recentBars.slice(-20)
    const avgVolume =
      volumeWindow.reduce((sum, bar) => sum + bar.v, 0) / Math.max(1, volumeWindow.length)

    const fundamentalsSnapshot = await fetchMassiveFundamentals(symbol, config).catch(() => null)

    const context: MassiveAnalysisContext = {
      symbol,
      status: rangeResponse.status === "DELAYED" ? "delayed" : "live",
      lastUpdatedIso: new Date(bars[bars.length - 1].t).toISOString(),
      priceHistory,
      currentPrice: round2(current),
      high52week: round2(high52week),
      low52week: round2(low52week),
      avgVolume: round2(avgVolume),
      marketCap: fundamentalsSnapshot?.marketCap,
      fundamentals: fundamentalsSnapshot?.fundamentals,
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
