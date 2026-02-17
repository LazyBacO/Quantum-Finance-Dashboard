export type MarketDataProvider = "auto" | "massive" | "twelvedata"

export interface MarketDataRequestConfig {
  provider?: MarketDataProvider
  massiveApiKey?: string
  twelveDataApiKey?: string
}

export const DEFAULT_MARKET_DATA_PROVIDER: MarketDataProvider = "auto"

const normalizeKey = (value: string | undefined | null) => {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, 256)
}

export const normalizeMarketProvider = (value: unknown): MarketDataProvider => {
  if (typeof value !== "string") {
    return DEFAULT_MARKET_DATA_PROVIDER
  }

  const normalized = value.trim().toLowerCase()
  if (normalized === "auto" || normalized === "massive" || normalized === "twelvedata") {
    return normalized
  }

  return DEFAULT_MARKET_DATA_PROVIDER
}

export const normalizeMarketDataRequestConfig = (
  config: MarketDataRequestConfig | undefined | null
): MarketDataRequestConfig => {
  if (!config) {
    return { provider: DEFAULT_MARKET_DATA_PROVIDER }
  }

  return {
    provider: normalizeMarketProvider(config.provider),
    massiveApiKey: normalizeKey(config.massiveApiKey),
    twelveDataApiKey: normalizeKey(config.twelveDataApiKey),
  }
}

export const parseMarketDataRequestHeaders = (request: Request): MarketDataRequestConfig => {
  const provider = normalizeMarketProvider(request.headers.get("x-market-provider"))
  const massiveApiKey = normalizeKey(request.headers.get("x-massive-api-key"))
  const twelveDataApiKey = normalizeKey(request.headers.get("x-twelvedata-api-key"))

  return normalizeMarketDataRequestConfig({
    provider,
    massiveApiKey,
    twelveDataApiKey,
  })
}
