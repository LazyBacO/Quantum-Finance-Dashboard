import { describe, expect, it } from "vitest"
import { executePaperOrder, getPaperQuote } from "@/lib/trading-engine"
import type { PaperTradingStore } from "@/lib/trading-types"

const baseStore = (): PaperTradingStore => ({
  version: 1,
  cashCents: 1_000_000,
  realizedPnlCents: 0,
  policy: {
    maxPositionPct: 80,
    maxOrderNotionalCents: 500_000,
    allowShort: false,
    blockedSymbols: [],
    maxOpenPositions: 5,
    maxDailyLossCents: 100_000,
    maxDrawdownPct: 30,
    killSwitchEnabled: false,
  },
  positions: [],
  orders: [],
  equityHistory: [{ at: new Date().toISOString(), equityCents: 1_000_000 }],
  updatedAt: new Date().toISOString(),
})

describe("trading engine", () => {
  it("fills a market buy order and updates cash/position", () => {
    const store = baseStore()
    const result = executePaperOrder(store, {
      symbol: "AAPL",
      side: "buy",
      quantity: 1,
      type: "market",
    })

    expect(result.order.status).toBe("filled")
    expect(result.store.cashCents).toBeLessThan(store.cashCents)
    expect(result.store.positions.length).toBe(1)
    expect(result.store.positions[0].symbol).toBe("AAPL")
    expect(result.store.positions[0].quantity).toBeCloseTo(1, 8)
  })

  it("rejects orders above max notional", () => {
    const store = baseStore()
    const result = executePaperOrder(store, {
      symbol: "AAPL",
      side: "buy",
      quantity: 1000,
      type: "market",
    })

    expect(result.order.status).toBe("rejected")
    expect(result.order.reason?.toLowerCase()).toContain("nominal")
    expect(result.store.positions.length).toBe(0)
  })

  it("rejects blocked symbols from policy", () => {
    const store = baseStore()
    store.policy.blockedSymbols = ["AAPL"]

    const result = executePaperOrder(store, {
      symbol: "AAPL",
      side: "buy",
      quantity: 1,
      type: "market",
    })

    expect(result.order.status).toBe("rejected")
    expect(result.order.reason?.toLowerCase()).toContain("bloqu")
  })

  it("rejects selling more than available when shorting is disabled", () => {
    const store = baseStore()
    const result = executePaperOrder(store, {
      symbol: "MSFT",
      side: "sell",
      quantity: 2,
      type: "market",
    })

    expect(result.order.status).toBe("rejected")
    expect(result.order.reason?.toLowerCase()).toContain("vente")
  })

  it("allows short selling when policy allows it", () => {
    const store = baseStore()
    store.policy.allowShort = true

    const result = executePaperOrder(store, {
      symbol: "MSFT",
      side: "sell",
      quantity: 1,
      type: "market",
    })

    expect(result.order.status).toBe("filled")
    expect(result.store.positions.length).toBe(1)
    expect(result.store.positions[0].symbol).toBe("MSFT")
    expect(result.store.positions[0].quantity).toBeLessThan(0)
  })

  it("rejects a buy limit order below market", () => {
    const store = baseStore()
    const market = getPaperQuote("NVDA")
    const result = executePaperOrder(store, {
      symbol: "NVDA",
      side: "buy",
      quantity: 1,
      type: "limit",
      limitPriceCents: Math.max(1, market.priceCents - 50_000),
    })

    expect(result.order.status).toBe("rejected")
    expect(result.order.reason?.toLowerCase()).toContain("limit")
  })

  it("rejects all orders when kill-switch is enabled", () => {
    const store = baseStore()
    store.policy.killSwitchEnabled = true

    const result = executePaperOrder(store, {
      symbol: "AAPL",
      side: "buy",
      quantity: 1,
      type: "market",
    })

    expect(result.order.status).toBe("rejected")
    expect(result.order.reason?.toLowerCase()).toContain("suspendu")
  })

  it("rejects opening a new position when max open positions is reached", () => {
    const store = baseStore()
    store.policy.maxOpenPositions = 1
    store.positions = [
      { symbol: "AAPL", quantity: 1, avgPriceCents: 19_000 },
    ]

    const result = executePaperOrder(store, {
      symbol: "MSFT",
      side: "buy",
      quantity: 1,
      type: "market",
    })

    expect(result.order.status).toBe("rejected")
    expect(result.order.reason?.toLowerCase()).toContain("interdit d'ouvrir davantage de risque")
  })
})
