import type {
  OrderSource,
  PaperOrder,
  PaperOrderInput,
  PaperQuote,
  PaperTradingOverview,
  PaperTradingPolicy,
  PaperTradingPolicyUpdate,
} from "@/lib/trading-types"
import { buildMarketDataHeaders } from "@/lib/market-data-client"

const fetchJson = async <T>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const headers = new Headers(init?.headers ?? {})
  const marketDataHeaders = buildMarketDataHeaders()
  for (const [key, value] of Object.entries(marketDataHeaders as Record<string, string>)) {
    headers.set(key, value)
  }

  const response = await fetch(input, { ...init, headers })
  const text = await response.text()
  const payload = text ? (JSON.parse(text) as unknown) : null

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: unknown }).message)
        : `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return payload as T
}

export const getTradingOverview = async (): Promise<PaperTradingOverview> => {
  return fetchJson<PaperTradingOverview>("/api/trading/overview")
}

export const getTradingOrders = async (): Promise<PaperOrder[]> => {
  return fetchJson<PaperOrder[]>("/api/trading/orders")
}

export const placeTradingOrder = async (
  order: PaperOrderInput,
  options?: { idempotencyKey?: string; source?: OrderSource }
): Promise<PaperOrder> => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(buildMarketDataHeaders() as Record<string, string>),
  }
  if (options?.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey
  }
  if (options?.source) {
    headers["X-Order-Source"] = options.source
  }

  const response = await fetch("/api/trading/orders", {
    method: "POST",
    headers,
    body: JSON.stringify(order),
  })

  const text = await response.text()
  const payload = text ? (JSON.parse(text) as PaperOrder | { message?: string }) : null

  if (!response.ok && response.status !== 422) {
    const message =
      payload && typeof payload === "object" && "message" in payload && payload.message
        ? payload.message
        : `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return payload as PaperOrder
}

export const getTradingPolicy = async (): Promise<PaperTradingPolicy> => {
  return fetchJson<PaperTradingPolicy>("/api/trading/policy")
}

export const updateTradingPolicy = async (
  updates: PaperTradingPolicyUpdate
): Promise<PaperTradingPolicy> => {
  return fetchJson<PaperTradingPolicy>("/api/trading/policy", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  })
}

export const getTradingQuotes = async (symbols: string[]): Promise<PaperQuote[]> => {
  const encoded = encodeURIComponent(symbols.join(","))
  return fetchJson<PaperQuote[]>(`/api/trading/quotes?symbols=${encoded}`)
}
