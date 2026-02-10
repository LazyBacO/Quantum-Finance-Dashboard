import { NextResponse } from "next/server"
import { parseMarketDataRequestHeaders } from "@/lib/market-data-config"
import { getTradingOverview } from "@/lib/trading-storage"

export const GET = async (request: Request) => {
  const marketDataConfig = parseMarketDataRequestHeaders(request)
  const overview = await getTradingOverview(marketDataConfig)
  return NextResponse.json(overview)
}
