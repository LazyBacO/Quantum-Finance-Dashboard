import { NextResponse } from "next/server"
import { z } from "zod"
import {
  parseMarketDataRequestHeaders,
  type MarketDataProvider,
  type MarketDataRequestConfig,
} from "@/lib/market-data-config"
import { testMassiveConnection } from "@/lib/massive-market-data"
import { testTwelveDataConnection } from "@/lib/twelvedata-market-data"

const requestSchema = z.object({
  provider: z.enum(["massive", "twelvedata"]),
  symbol: z.string().min(1).max(10).optional(),
})

const MAX_SYMBOL_LENGTH = 10
const SYMBOL_PATTERN = /^[A-Z0-9^][A-Z0-9.^-]{0,9}$/

const normalizeSymbol = (value: string | undefined) => {
  const normalized = (value?.trim().toUpperCase() || "AAPL").slice(0, MAX_SYMBOL_LENGTH)
  return SYMBOL_PATTERN.test(normalized) ? normalized : null
}

const statusFromReason = (reason: string | undefined) => {
  if (reason === "missing-key") return 400
  if (reason === "disabled") return 503
  return 502
}

const withProviderConfig = (
  config: MarketDataRequestConfig,
  provider: MarketDataProvider
): MarketDataRequestConfig => ({
  ...config,
  provider,
})

export const POST = async (request: Request) => {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON payload." }, { status: 400 })
  }

  const parsed = requestSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid test connection payload.",
        details: parsed.error.issues.slice(0, 3).map((issue) => issue.message),
      },
      { status: 400 }
    )
  }

  const symbol = normalizeSymbol(parsed.data.symbol)
  if (!symbol) {
    return NextResponse.json(
      { success: false, error: "Invalid symbol format. Use letters, numbers, ., -, or ^." },
      { status: 400 }
    )
  }

  const requestConfig = parseMarketDataRequestHeaders(request)

  if (parsed.data.provider === "massive") {
    const result = await testMassiveConnection(withProviderConfig(requestConfig, "massive"), symbol)
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
          reason: result.reason,
          provider: "massive",
          symbol: result.symbol,
        },
        { status: statusFromReason(result.reason) }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        provider: "massive",
        source: result.status === "delayed" ? "massive-delayed" : "massive-live",
        symbol: result.symbol,
        currentPrice: result.currentPrice,
        lastUpdatedIso: result.lastUpdatedIso,
      },
    })
  }

  const result = await testTwelveDataConnection(withProviderConfig(requestConfig, "twelvedata"), symbol)
  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.message,
        reason: result.reason,
        provider: "twelvedata",
        symbol: result.symbol,
      },
      { status: statusFromReason(result.reason) }
    )
  }

  return NextResponse.json({
    success: true,
    data: {
      provider: "twelvedata",
      source: "twelvedata-live",
      symbol: result.symbol,
      currentPrice: result.currentPrice,
      lastUpdatedIso: result.lastUpdatedIso,
    },
  })
}
