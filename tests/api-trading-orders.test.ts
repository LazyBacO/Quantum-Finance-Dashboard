import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  listTradingOrders: vi.fn(),
  placeTradingOrder: vi.fn(),
}))

vi.mock("@/lib/trading-storage", () => ({
  listTradingOrders: mocks.listTradingOrders,
  placeTradingOrder: mocks.placeTradingOrder,
}))

import { GET, POST } from "@/app/api/trading/orders/route"

describe("/api/trading/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns orders on GET", async () => {
    mocks.listTradingOrders.mockResolvedValueOnce([
      {
        id: "ord-1",
        symbol: "AAPL",
        side: "buy",
        quantity: 1,
        type: "market",
        status: "filled",
        requestedAt: "2026-01-01T00:00:00.000Z",
        executedAt: "2026-01-01T00:00:01.000Z",
        fillPriceCents: 19_000,
        notionalCents: 19_000,
      },
    ])

    const response = await GET()
    expect(response.status).toBe(200)
    const body = (await response.json()) as Array<{ id: string }>
    expect(body[0].id).toBe("ord-1")
  })

  it("validates POST payload", async () => {
    const response = await POST(
      new Request("http://localhost/api/trading/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ symbol: "", type: "market" }),
      })
    )

    expect(response.status).toBe(400)
    expect(mocks.placeTradingOrder).not.toHaveBeenCalled()
  })

  it("returns 422 when order is rejected by guardrails", async () => {
    mocks.placeTradingOrder.mockResolvedValueOnce({
      id: "ord-2",
      symbol: "TSLA",
      side: "buy",
      quantity: 100,
      type: "market",
      status: "rejected",
      requestedAt: "2026-01-01T00:00:00.000Z",
      executedAt: null,
      fillPriceCents: null,
      notionalCents: 2_000_000,
      reason: "Ordre rejeté",
    })

    const response = await POST(
      new Request("http://localhost/api/trading/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          symbol: "TSLA",
          side: "buy",
          quantity: 100,
          type: "market",
        }),
      })
    )

    expect(response.status).toBe(422)
  })

  it("returns 201 when order is accepted", async () => {
    mocks.placeTradingOrder.mockResolvedValueOnce({
      id: "ord-3",
      symbol: "MSFT",
      side: "buy",
      quantity: 1,
      type: "market",
      status: "filled",
      requestedAt: "2026-01-01T00:00:00.000Z",
      executedAt: "2026-01-01T00:00:01.000Z",
      fillPriceCents: 42_800,
      notionalCents: 42_800,
    })

    const response = await POST(
      new Request("http://localhost/api/trading/orders", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": "idem-123",
          "x-order-source": "ai",
        },
        body: JSON.stringify({
          symbol: "MSFT",
          side: "buy",
          quantity: 1,
          type: "market",
        }),
      })
    )

    expect(response.status).toBe(201)
    expect(response.headers.get("Idempotency-Key")).toBe("idem-123")
    expect(mocks.placeTradingOrder).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: "MSFT", side: "buy", quantity: 1, type: "market" }),
      { idempotencyKey: "idem-123", source: "ai" }
    )
  })
})
