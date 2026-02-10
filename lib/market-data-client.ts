import { DEFAULT_MARKET_DATA_PROVIDER } from "@/lib/market-data-config"
import { loadSettingsSnapshot } from "@/lib/settings-store"

const isNonEmpty = (value: string) => value.trim().length > 0

export const buildMarketDataHeaders = (): HeadersInit => {
  const snapshot = loadSettingsSnapshot()
  const provider = snapshot.marketData?.provider ?? DEFAULT_MARKET_DATA_PROVIDER

  const headers: Record<string, string> = {
    "x-market-provider": provider,
  }

  const massiveApiKey = snapshot.marketData?.massiveApiKey ?? ""
  const twelveDataApiKey = snapshot.marketData?.twelveDataApiKey ?? ""

  if (isNonEmpty(massiveApiKey)) {
    headers["x-massive-api-key"] = massiveApiKey.trim()
  }

  if (isNonEmpty(twelveDataApiKey)) {
    headers["x-twelvedata-api-key"] = twelveDataApiKey.trim()
  }

  return headers
}
