import { NextResponse } from "next/server"
import { parseMarketDataRequestHeaders } from "@/lib/market-data-config"
import { getTradingQuotes } from "@/lib/trading-storage"

export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const symbolsParam = searchParams.get("symbols")
  if (!symbolsParam) {
    return NextResponse.json({ message: "Query parameter `symbols` is required." }, { status: 400 })
  }

  const symbols = symbolsParam
    .split(",")
    .map((symbol) => symbol.trim())
    .filter((symbol) => symbol.length > 0)

  if (symbols.length === 0 || symbols.length > 50) {
    return NextResponse.json({ message: "Provide between 1 and 50 symbols." }, { status: 400 })
  }

  const marketDataConfig = parseMarketDataRequestHeaders(request)
  const quotes = await getTradingQuotes(symbols, marketDataConfig)
  return NextResponse.json(quotes)
}
