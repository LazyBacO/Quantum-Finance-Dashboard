import { NextResponse } from "next/server"
import { z } from "zod"
import { parseMarketDataRequestHeaders } from "@/lib/market-data-config"
import { listTradingOrders, placeTradingOrder } from "@/lib/trading-storage"
import { paperOrderInputSchema } from "@/lib/trading-types"

const orderPayloadSchema = paperOrderInputSchema.extend({
  symbol: z.string().min(1).max(12),
})

const idempotencyKeySchema = z.string().min(1).max(120)
const orderSourceSchema = z.enum(["ui", "api", "ai"])

export const GET = async () => {
  const orders = await listTradingOrders()
  return NextResponse.json(orders)
}

export const POST = async (request: Request) => {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 })
  }

  const parsed = orderPayloadSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid order payload",
        details: parsed.error.issues.slice(0, 3).map((issue) => issue.message),
      },
      { status: 400 }
    )
  }

  const rawIdempotencyKey = request.headers.get("idempotency-key")
  const idempotencyKey = rawIdempotencyKey
    ? idempotencyKeySchema.safeParse(rawIdempotencyKey.trim()).success
      ? rawIdempotencyKey.trim()
      : undefined
    : undefined

  const rawSource = request.headers.get("x-order-source")?.trim().toLowerCase()
  const sourceParsed = orderSourceSchema.safeParse(rawSource)
  const source = sourceParsed.success ? sourceParsed.data : "api"
  const marketDataConfig = parseMarketDataRequestHeaders(request)

  const order = await placeTradingOrder(parsed.data, {
    idempotencyKey,
    source,
    marketDataConfig,
  })

  if (order.status === "rejected") {
    return NextResponse.json(order, {
      status: 422,
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
    })
  }

  return NextResponse.json(order, {
    status: 201,
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
  })
}
